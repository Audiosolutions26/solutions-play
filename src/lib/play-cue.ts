// Pré-escuta fora do ar. A reprodução utiliza um elemento independente e,
// quando disponível, uma saída/sink separado da programação.

import { getTrackAudioUrl, resolveTrackAudio } from "./play-audio-files";
import { loadDevicePrefs } from "./play-audio-devices";
import type { Track } from "./play-data";

type SinkEl = HTMLMediaElement & { setSinkId?: (id: string) => Promise<void> };
export type CueReason = "manual" | "hover" | "passage";

export interface CuePlayOptions {
  startSec?: number;
  stopSec?: number;
  reason?: CueReason;
}

let cueEl: HTMLAudioElement | null = null;
let currentId: string | null = null;
let currentReason: CueReason | null = null;
let stopAtSec: number | null = null;
let requestToken = 0;
const toneCache = new Map<number, string>();

const listeners = new Set<() => void>();
function notify() {
  listeners.forEach((listener) => listener());
}
export function subscribeCue(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

function resetState() {
  currentId = null;
  currentReason = null;
  stopAtSec = null;
  notify();
}

function ensureEl(): HTMLAudioElement | null {
  if (typeof window === "undefined") return null;
  if (!cueEl) {
    cueEl = new Audio();
    cueEl.preload = "auto";
    cueEl.addEventListener("ended", resetState);
    cueEl.addEventListener("pause", notify);
    cueEl.addEventListener("playing", notify);
    cueEl.addEventListener("timeupdate", () => {
      if (stopAtSec !== null && cueEl && cueEl.currentTime >= stopAtSec) {
        try {
          cueEl.pause();
          cueEl.currentTime = 0;
        } catch {
          /* ignore */
        }
        resetState();
      }
    });
  }
  return cueEl;
}

function toneWav(freq: number, seconds = 6): string {
  const key = Math.round(freq);
  const cached = toneCache.get(key);
  if (cached) return cached;
  const rate = 22050;
  const n = Math.floor(rate * seconds);
  const buf = new ArrayBuffer(44 + n * 2);
  const dv = new DataView(buf);
  const wr = (off: number, s: string) => {
    for (let i = 0; i < s.length; i++) dv.setUint8(off + i, s.charCodeAt(i));
  };
  wr(0, "RIFF");
  dv.setUint32(4, 36 + n * 2, true);
  wr(8, "WAVE");
  wr(12, "fmt ");
  dv.setUint32(16, 16, true);
  dv.setUint16(20, 1, true);
  dv.setUint16(22, 1, true);
  dv.setUint32(24, rate, true);
  dv.setUint32(28, rate * 2, true);
  dv.setUint16(32, 2, true);
  dv.setUint16(34, 16, true);
  wr(36, "data");
  dv.setUint32(40, n * 2, true);
  for (let i = 0; i < n; i++) {
    const t = i / rate;
    const env = Math.min(1, t * 4) * Math.min(1, (seconds - t) * 2);
    const sample =
      (Math.sin(2 * Math.PI * freq * t) * 0.4 + Math.sin(2 * Math.PI * freq * 2 * t) * 0.15) * env;
    dv.setInt16(44 + i * 2, Math.max(-1, Math.min(1, sample)) * 32767, true);
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
    try {
      await anyEl.setSinkId(id);
    } catch {
      /* saída indisponível */
    }
  }
}

/** Inicia CUE real; um token novo invalida a solicitação anterior. */
export async function cuePlay(track: Track, options: CuePlayOptions = {}): Promise<void> {
  const el = ensureEl();
  if (!el) return;
  const token = ++requestToken;
  const startSec = Math.max(0, options.startSec ?? 0);
  const stopSec =
    typeof options.stopSec === "number" && Number.isFinite(options.stopSec)
      ? Math.max(startSec, options.stopSec)
      : null;
  await applyCueSink(el);
  if (token !== requestToken) return;
  const real = getTrackAudioUrl(track.id) || track.audioUrl || (await resolveTrackAudio(track));
  if (token !== requestToken) return;
  el.src = real || toneWav(track.freq || 220, Math.max(6, (stopSec ?? 6) - startSec));
  el.volume = 1;
  try {
    el.currentTime = startSec;
  } catch {
    /* metadata ainda não carregou */
  }
  currentId = track.id;
  currentReason = options.reason ?? "manual";
  stopAtSec = stopSec;
  try {
    await el.play();
  } catch {
    /* autoplay requer gesto do operador */
  }
  if (token === requestToken) notify();
}

export async function cuePlayAt(
  track: Track,
  startSec: number,
  stopSec?: number,
  reason: CueReason = "manual",
) {
  return cuePlay(track, { startSec, stopSec, reason });
}

export function cueStop(): void {
  requestToken++;
  stopAtSec = null;
  if (cueEl) {
    try {
      cueEl.pause();
      cueEl.currentTime = 0;
    } catch {
      /* ignore */
    }
  }
  resetState();
}

export function cueIsPlaying(): boolean {
  return !!cueEl && !cueEl.paused;
}
export function cueCurrentId(): string | null {
  return currentId;
}
export function cueCurrentReason(): CueReason | null {
  return currentReason;
}

export async function refreshCueSink(): Promise<void> {
  if (cueEl) await applyCueSink(cueEl);
}

export function makeToneUrl(freq = 660, seconds = 1.2): string {
  return toneWav(freq, seconds);
}

export async function cueTestTone(freq = 660): Promise<void> {
  const el = ensureEl();
  if (!el) return;
  const token = ++requestToken;
  await applyCueSink(el);
  if (token !== requestToken) return;
  el.src = toneWav(freq, 1.2);
  el.volume = 1;
  stopAtSec = null;
  currentId = "__tone__";
  currentReason = "manual";
  try {
    el.currentTime = 0;
    await el.play();
  } catch {
    /* ignore */
  }
  if (token === requestToken) notify();
}
