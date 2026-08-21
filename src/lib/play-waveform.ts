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
