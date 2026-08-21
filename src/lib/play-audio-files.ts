// Session-scoped audio URL resolver. Files are kept as object/data URLs only
// while the app is running; the original media is never rewritten.

import { readAudioPathNative } from "./play-native";
import type { Track } from "./play-data";

const MAX_URL_CACHE = 96;
const urls = new Map<string, string>();
const pending = new Map<string, Promise<string | undefined>>();

function touch(id: string, url: string) {
  urls.delete(id);
  urls.set(id, url);
  while (urls.size > MAX_URL_CACHE) {
    const oldest = urls.keys().next().value as string | undefined;
    if (!oldest) break;
    urls.delete(oldest);
  }
}

export function setTrackAudioUrl(trackId: string, url: string) {
  const prev = urls.get(trackId);
  if (prev && prev !== url && /^blob:/i.test(prev)) {
    try {
      URL.revokeObjectURL(prev);
    } catch {
      /* ignore */
    }
  }
  touch(trackId, url);
}

export function getTrackAudioUrl(trackId: string): string | undefined {
  const url = urls.get(trackId);
  if (url) touch(trackId, url);
  return url;
}

export function hasTrackAudio(trackId: string): boolean {
  return urls.has(trackId);
}

export function clearTrackAudio(trackId: string): void {
  const url = urls.get(trackId);
  if (url && /^blob:/i.test(url)) {
    try {
      URL.revokeObjectURL(url);
    } catch {
      /* ignore */
    }
  }
  urls.delete(trackId);
  pending.delete(trackId);
}

export function clearTrackAudioCache(): void {
  for (const id of urls.keys()) clearTrackAudio(id);
  urls.clear();
  pending.clear();
}

export async function readAudioFile(file: File): Promise<{ url: string; duration: number }> {
  const url = URL.createObjectURL(file);
  const duration = await new Promise<number>((resolve) => {
    const audio = new Audio();
    audio.preload = "metadata";
    audio.onloadedmetadata = () => resolve(Number.isFinite(audio.duration) ? audio.duration : 0);
    audio.onerror = () => resolve(0);
    audio.src = url;
  });
  return { url, duration };
}

/** Resolve uma mídia local/remota uma única vez por Track durante a sessão. */
export async function resolveTrackAudio(track: Track): Promise<string | undefined> {
  const cached = getTrackAudioUrl(track.id);
  if (cached) return cached;
  const active = pending.get(track.id);
  if (active) return active;
  const request = (async () => {
    if (track.audioUrl) {
      touch(track.id, track.audioUrl);
      return track.audioUrl;
    }
    if (track.filePath) {
      const url = await readAudioPathNative(track.filePath);
      if (url) touch(track.id, url);
      return url ?? undefined;
    }
    return undefined;
  })();
  pending.set(track.id, request);
  try {
    return await request;
  } finally {
    if (pending.get(track.id) === request) pending.delete(track.id);
  }
}

// Lê a duração sem manter uma segunda cópia do arquivo em memória.
export async function readTrackDuration(track: Track): Promise<number> {
  const url = await resolveTrackAudio(track);
  if (!url) return 0;
  return new Promise<number>((resolve) => {
    const audio = new Audio();
    audio.preload = "metadata";
    audio.onloadedmetadata = () => resolve(Number.isFinite(audio.duration) ? audio.duration : 0);
    audio.onerror = () => resolve(0);
    audio.src = url;
  });
}
