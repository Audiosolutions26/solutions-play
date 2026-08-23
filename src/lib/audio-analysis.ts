/**
 * Audio analysis utilities for BPM detection and Loudness normalization.
 */

export interface AnalysisResult {
  bpm: number;
  loudness: number; // dBFS (RMS-based estimation of LUFS)
  peaks: number[]; // beat timestamps
}

/**
 * Detects BPM using a simplified energy-based beat detection algorithm.
 * It uses a low-pass filter (approximate) and peak detection.
 */
export function detectBPM(buffer: AudioBuffer): number {
  const data = buffer.getChannelData(0); // Use mono for analysis
  const sampleRate = buffer.sampleRate;
  
  // 1. Simple low-pass filter (running average) to isolate the bass/kicks
  // A window of ~0.01s (10ms)
  const windowSize = Math.floor(sampleRate * 0.01);
  const filtered = new Float32Array(data.length);
  let sum = 0;
  for (let i = 0; i < data.length; i++) {
    sum += Math.abs(data[i]);
    if (i >= windowSize) sum -= Math.abs(data[i - windowSize]);
    filtered[i] = sum / windowSize;
  }

  // 2. Peak detection
  const threshold = 0.2; // Energy threshold
  const peaks: number[] = [];
  const minSpacing = Math.floor(sampleRate * 0.3); // Min 0.3s between beats (~200 BPM max)
  
  for (let i = 0; i < filtered.length; i++) {
    if (filtered[i] > threshold) {
      peaks.push(i / sampleRate);
      i += minSpacing; // Skip ahead
    }
  }

  if (peaks.length < 2) return 0;

  // 3. Calculate intervals and average BPM
  const intervals: number[] = [];
  for (let i = 1; i < peaks.length; i++) {
    intervals.push(peaks[i] - peaks[i - 1]);
  }

  // Sort and pick median to avoid outliers
  intervals.sort((a, b) => a - b);
  const medianInterval = intervals[Math.floor(intervals.length / 2)];
  
  const bpm = Math.round(60 / medianInterval);
  
  // Common BPM ranges for sanity
  if (bpm < 60) return bpm * 2; // Might be double-time
  if (bpm > 180) return bpm / 2; // Might be half-time
  
  return bpm;
}

/**
 * Calculates a simplified Loudness (LUFS-like) value based on RMS.
 * Standard LUFS (EBU R128) uses K-weighting, but RMS is a good proxy for normalization.
 */
export function calculateLoudness(buffer: AudioBuffer): number {
  const data = buffer.getChannelData(0);
  let sumSquared = 0;
  
  // Use a subset for speed if buffer is very long
  const step = Math.max(1, Math.floor(data.length / 100000));
  let count = 0;
  for (let i = 0; i < data.length; i += step) {
    sumSquared += data[i] * data[i];
    count++;
  }
  
  const rms = Math.sqrt(sumSquared / count);
  // Convert to dBFS. -23 LUFS is a common radio standard.
  // We use -20 dBFS as a baseline reference for "standard" level.
  const db = 20 * Math.log10(Math.max(1e-6, rms));
  return parseFloat(db.toFixed(2));
}

/**
 * Normalizes gain to hit a target level.
 * Target is usually -23 LUFS or similar.
 */
export function getNormalizationGain(currentLoudness: number, targetLoudness = -14): number {
  // Gain in dB = target - current
  const dbDiff = targetLoudness - currentLoudness;
  // Linear gain factor
  return Math.pow(10, dbDiff / 20);
}

/**
 * Suggests a crossfade curve based on track types and BPM.
 */
export type CrossfadeCurve = 'equal-power' | 'linear' | 'logarithmic' | 's-curve';

export function suggestCrossfadeCurve(
  currentCategory: string,
  nextCategory: string,
  currentBpm: number,
  nextBpm: number
): CrossfadeCurve {
  // If BPMs are close, S-Curve or Equal-Power is great for beat-matching feel
  if (currentBpm > 0 && nextBpm > 0 && Math.abs(currentBpm - nextBpm) < 5) {
    return 's-curve';
  }
  
  // Locution to Music -> Logarithmic (smooth ducking)
  if (currentCategory === 'locucao' || nextCategory === 'locucao') {
    return 'logarithmic';
  }
  
  // Default for music is equal-power
  return 'equal-power';
}
