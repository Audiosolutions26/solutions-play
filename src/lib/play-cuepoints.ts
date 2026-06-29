// Detecção automática de pontos de mixagem (segue), inspirada no modo como os
// automadores profissionais de rádio (Playlist Digital / Liquidsoap "autocue")
// encadeiam as músicas:
//
//  • cue-in  → onde o áudio realmente começa (corta o silêncio inicial);
//  • cue-out → onde o áudio efetivamente termina (corta o silêncio/cauda final);
//
// Com esses pontos, a próxima faixa entra exatamente quando a atual perde
// energia — sem buracos no ar — e o crossfade sobrepõe o "ponto de mixagem"
// configurado por tipo. O resultado é uma passagem firme e contínua.

import { loadConfig } from "./play-config";

export interface CuePoints {
  cueIn: number;   // segundos: onde começar a tocar
  cueOut: number;  // segundos: onde iniciar a saída (0 = desconhecido)
  duration: number;
}

const cache = new Map<string, CuePoints>();
const pending = new Map<string, Promise<CuePoints>>();

let decodeCtx: AudioContext | null = null;
function ctx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!decodeCtx) {
    const C = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!C) return null;
    decodeCtx = new C();
  }
  return decodeCtx;
}

// Limiar de silêncio em dBFS (valor positivo na config = nº de dB abaixo de 0).
function silenceThreshold(): number {
  let db = 45;
  try {
    const c = loadConfig() as Record<string, unknown>;
    const v = c["insercoes.deteccaoPontos.cueThresholdDb"];
    if (typeof v === "number" && v > 0) db = v;
  } catch { /* SSR / sem storage */ }
  return Math.pow(10, -db / 20); // amplitude linear (ex.: -45 dBFS ≈ 0.0056)
}

export function cueDetectionEnabled(): boolean {
  try {
    const c = loadConfig() as Record<string, unknown>;
    const v = c["insercoes.deteccaoPontos.detectarPontos"];
    return v !== false; // padrão ligado
  } catch {
    return true;
  }
}

export function equalPowerEnabled(): boolean {
  try {
    const c = loadConfig() as Record<string, unknown>;
    const v = c["insercoes.deteccaoPontos.crossEqualPower"];
    return v !== false; // padrão ligado
  } catch {
    return true;
  }
}

function maxAt(chs: Float32Array[], i: number): number {
  let m = 0;
  for (let c = 0; c < chs.length; c++) {
    const a = Math.abs(chs[c][i] || 0);
    if (a > m) m = a;
  }
  return m;
}

// Calcula cue-in/cue-out varrendo as bordas do arquivo (rápido: para no
// primeiro/último trecho audível). Mantém silêncios internos da música.
function compute(buf: AudioBuffer, thr: number): CuePoints {
  const sr = buf.sampleRate;
  const n = buf.length;
  const chs: Float32Array[] = [];
  for (let c = 0; c < Math.min(buf.numberOfChannels, 2); c++) chs.push(buf.getChannelData(c));

  // cue-in: primeiro ponto acima do limiar (com 50 ms de respiro antes).
  let cueIn = 0;
  for (let i = 0; i < n; i++) {
    if (maxAt(chs, i) > thr) { cueIn = Math.max(0, i / sr - 0.05); break; }
  }
  // cue-out: último ponto acima do limiar (com 150 ms de cauda depois).
  let cueOut = buf.duration;
  for (let i = n - 1; i >= 0; i--) {
    if (maxAt(chs, i) > thr) { cueOut = Math.min(buf.duration, i / sr + 0.15); break; }
  }
  // Sanidade: cue-out tem de vir depois do cue-in.
  if (cueOut <= cueIn + 0.2) cueOut = buf.duration;
  return { cueIn, cueOut, duration: buf.duration };
}

// Analisa (e cacheia) os pontos de mixagem de uma URL tocável (blob:/data:/http).
export async function analyzeCuePoints(url: string): Promise<CuePoints> {
  const hit = cache.get(url);
  if (hit) return hit;
  const inflight = pending.get(url);
  if (inflight) return inflight;

  const p = (async (): Promise<CuePoints> => {
    const fallback: CuePoints = { cueIn: 0, cueOut: 0, duration: 0 };
    try {
      const c = ctx();
      if (!c) return fallback;
      const res = await fetch(url);
      const ab = await res.arrayBuffer();
      const buf = await c.decodeAudioData(ab);
      const cp = compute(buf, silenceThreshold());
      cache.set(url, cp);
      return cp;
    } catch {
      cache.set(url, fallback);
      return fallback;
    } finally {
      pending.delete(url);
    }
  })();

  pending.set(url, p);
  return p;
}

export function getCachedCuePoints(url: string): CuePoints | undefined {
  return cache.get(url);
}
