// Pré-escuta (CUE) — manual p.20, 30.
// Toca o áudio FORA DO AR, em uma saída de áudio SEPARADA da saída principal
// (no ar). Usa um <audio> independente do AudioContext do programa, com
// setSinkId apontando para a placa/saída escolhida para pré-escuta.

import { getTrackAudioUrl } from "./play-audio-files";
import { loadDevicePrefs } from "./play-audio-devices";
import type { Track } from "./play-data";

type SinkEl = HTMLMediaElement & { setSinkId?: (id: string) => Promise<void> };

let cueEl: HTMLAudioElement | null = null;
let currentId: string | null = null;
const toneCache = new Map<number, string>();

function ensureEl(): HTMLAudioElement | null {
  if (typeof window === "undefined") return null;
  if (!cueEl) {
    cueEl = new Audio();
    cueEl.preload = "auto";
    cueEl.addEventListener("ended", () => { currentId = null; });
  }
  return cueEl;
}

// Gera um WAV (data URL) com um tom suave para tracks de demonstração que
// ainda não têm áudio real carregado — assim a pré-escuta sempre soa.
function toneWav(freq: number, seconds = 6): string {
  const key = Math.round(freq);
  const cached = toneCache.get(key);
  if (cached) return cached;
  const rate = 22050;
  const n = Math.floor(rate * seconds);
  const buf = new ArrayBuffer(44 + n * 2);
  const dv = new DataView(buf);
  const wr = (off: number, s: string) => { for (let i = 0; i < s.length; i++) dv.setUint8(off + i, s.charCodeAt(i)); };
  wr(0, "RIFF"); dv.setUint32(4, 36 + n * 2, true); wr(8, "WAVE");
  wr(12, "fmt "); dv.setUint32(16, 16, true); dv.setUint16(20, 1, true);
  dv.setUint16(22, 1, true); dv.setUint32(24, rate, true);
  dv.setUint32(28, rate * 2, true); dv.setUint16(32, 2, true); dv.setUint16(34, 16, true);
  wr(36, "data"); dv.setUint32(40, n * 2, true);
  for (let i = 0; i < n; i++) {
    const t = i / rate;
    const env = Math.min(1, t * 4) * Math.min(1, (seconds - t) * 2);
    const s = (Math.sin(2 * Math.PI * freq * t) * 0.4 + Math.sin(2 * Math.PI * freq * 2 * t) * 0.15) * env;
    dv.setInt16(44 + i * 2, Math.max(-1, Math.min(1, s)) * 32767, true);
  }
  let bin = "";
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  const url = `data:audio/wav;base64,${btoa(bin)}`;
  toneCache.set(key, url);
  return url;
}

async function applyCueSink(el: HTMLAudioElement) {
  const id = loadDevicePrefs().cueId;
  const anyEl = el as SinkEl;
  if (id && typeof anyEl.setSinkId === "function") {
    try { await anyEl.setSinkId(id); } catch { /* saída indisponível */ }
  }
}

// Inicia a pré-escuta de um item na saída de CUE (fora do ar).
export async function cuePlay(track: Track): Promise<void> {
  const el = ensureEl();
  if (!el) return;
  await applyCueSink(el);
  const real = getTrackAudioUrl(track.id) || track.audioUrl;
  el.src = real || toneWav(track.freq || 220, 6);
  el.volume = 1;
  try { el.currentTime = 0; } catch { /* ignore */ }
  currentId = track.id;
  try { await el.play(); } catch { /* ignore */ }
}

export function cueStop(): void {
  if (cueEl) {
    try { cueEl.pause(); cueEl.currentTime = 0; } catch { /* ignore */ }
  }
  currentId = null;
}

export function cueIsPlaying(): boolean {
  return !!cueEl && !cueEl.paused;
}

export function cueCurrentId(): string | null {
  return currentId;
}

// Reaplica a saída escolhida (chamado após salvar dispositivos).
export async function refreshCueSink(): Promise<void> {
  if (cueEl) await applyCueSink(cueEl);
}

// Tom de teste na saída de pré-escuta.
export async function cueTestTone(freq = 660): Promise<void> {
  const el = ensureEl();
  if (!el) return;
  await applyCueSink(el);
  el.src = toneWav(freq, 1.2);
  el.volume = 1;
  try { el.currentTime = 0; await el.play(); } catch { /* ignore */ }
}
