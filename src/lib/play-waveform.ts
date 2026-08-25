export interface WaveformPeaks {
  durationSec: number;
  sampleRate: number;
  left: Float32Array;
  right: Float32Array;
}

const MAX_CACHE = 8;
const cache = new Map<string, WaveformPeaks>();

function touch(key: string, value: WaveformPeaks) {
  cache.delete(key);
  cache.set(key, value);
  while (cache.size > MAX_CACHE) cache.delete(cache.keys().next().value as string);
}

function keyFor(url: string, samples: number): string {
  return `${samples}:${url}`;
}

function maxAbs(data: Float32Array, start: number, end: number, stride: number): number {
  let peak = 0;
  for (let i = start; i < end; i += stride) peak = Math.max(peak, Math.abs(data[i] ?? 0));
  return Math.min(1, peak);
}

function envelope(data: Float32Array, samples: number): Float32Array {
  const out = new Float32Array(samples);
  const bucket = Math.max(1, Math.floor(data.length / samples));
  const stride = Math.max(1, Math.floor(bucket / 128));
  for (let i = 0; i < samples; i++) {
    const start = Math.min(data.length, i * bucket);
    const end = Math.min(data.length, start + bucket);
    out[i] = maxAbs(data, start, Math.max(start + 1, end), stride);
  }
  return out;
}

export function getCachedWaveform(url: string, samples = 1600): WaveformPeaks | undefined {
  const key = keyFor(url, samples);
  const value = cache.get(key);
  if (!value) return undefined;
  touch(key, value);
  return value;
}

export function clearWaveformCache(): void {
  cache.clear();
}

/**
 * Decodifica a mídia em memória e devolve envelopes L/R compactos para canvas.
 * O arquivo original nunca é regravado e os picos são mantidos em cache LRU.
 */
export async function analyzeWaveform(url: string, samples = 1600): Promise<WaveformPeaks | null> {
  if (!url || typeof window === "undefined") return null;
  const count = Math.max(128, Math.min(8000, Math.round(samples)));
  const cached = getCachedWaveform(url, count);
  if (cached) return cached;
  try {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return null;
    const response = await fetch(url);
    const bytes = await response.arrayBuffer();
    const ctx = new Ctx({ latencyHint: "playback" });
    const buffer = await ctx.decodeAudioData(bytes);
    const leftData = buffer.getChannelData(0);
    const rightData = buffer.numberOfChannels > 1 ? buffer.getChannelData(1) : leftData;
    const peaks: WaveformPeaks = {
      durationSec: buffer.duration,
      sampleRate: buffer.sampleRate,
      left: envelope(leftData, count),
      right: envelope(rightData, count),
    };
    touch(keyFor(url, count), peaks);
    void ctx.close().catch(() => undefined);
    return peaks;
  } catch {
    return null;
  }
}

/**
 * Estima os pontos de mix-in e mix-out a partir do envelope do waveform.
 * A janela exige atividade sustentada, evitando que um pico isolado mova a
 * passagem e mantendo o comportamento determinístico do editor v3.
 */
export function detectMixPoints(
  peaks: Float32Array,
  durationSec: number,
  threshold = 0.12,
  windowMs = 250,
): { mixInSec: number; mixOutSec: number } {
  if (!peaks.length || !Number.isFinite(durationSec) || durationSec <= 0) {
    return { mixInSec: 0, mixOutSec: 0 };
  }

  const count = peaks.length;
  const safeThreshold = Math.max(0, Math.min(1, Number.isFinite(threshold) ? threshold : 0.12));
  const safeWindowMs = Math.max(20, Number.isFinite(windowMs) ? windowMs : 250);
  const smoothBins = Math.max(1, Math.round((safeWindowMs / 1000 / durationSec) * count));
  const prefix = new Float64Array(count + 1);
  for (let i = 0; i < count; i++) prefix[i + 1] = prefix[i] + Math.abs(peaks[i] || 0);

  const smoothed = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    let start = Math.max(0, i - Math.floor(smoothBins / 2));
    let end = Math.min(count, start + smoothBins);
    if (end - start < smoothBins) start = Math.max(0, end - smoothBins);
    smoothed[i] = (prefix[end] - prefix[start]) / Math.max(1, end - start);
  }

  const holdBins = Math.max(1, Math.floor(smoothBins / 2));
  const findSustained = (startIndex: number, step: 1 | -1): number | null => {
    let run = 0;
    for (let i = startIndex; step > 0 ? i < count : i >= 0; i += step) {
      if (smoothed[i] >= safeThreshold) {
        run++;
        if (run >= holdBins) return step > 0 ? i - holdBins + 1 : i + holdBins - 1;
      } else {
        run = 0;
      }
    }
    return null;
  };

  let first = findSustained(0, 1);
  let last = findSustained(count - 1, -1);
  if (first === null || last === null) {
    let peakIndex = 0;
    for (let i = 1; i < count; i++) if (smoothed[i] > smoothed[peakIndex]) peakIndex = i;
    first ??= peakIndex;
    last ??= peakIndex;
  }
  if (last < first) [first, last] = [last, first];
  const scale = durationSec / Math.max(1, count - 1);
  return { mixInSec: first * scale, mixOutSec: last * scale };
}
