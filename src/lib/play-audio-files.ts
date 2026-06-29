// In-memory registry of real audio files loaded by the user, keyed by track id.
// Files are kept as object URLs for the session (no backend / no persistence).

import { readAudioPathNative } from "./play-native";
import type { Track } from "./play-data";

const urls = new Map<string, string>();

export function setTrackAudioUrl(trackId: string, url: string) {
  const prev = urls.get(trackId);
  if (prev && prev !== url) {
    try { URL.revokeObjectURL(prev); } catch { /* ignore */ }
  }
  urls.set(trackId, url);
}

export function getTrackAudioUrl(trackId: string): string | undefined {
  return urls.get(trackId);
}

export function hasTrackAudio(trackId: string): boolean {
  return urls.has(trackId);
}

export async function readAudioFile(
  file: File,
): Promise<{ url: string; duration: number }> {
  const url = URL.createObjectURL(file);
  const duration = await new Promise<number>((resolve) => {
    const a = new Audio();
    a.preload = "metadata";
    a.onloadedmetadata = () => resolve(Number.isFinite(a.duration) ? a.duration : 0);
    a.onerror = () => resolve(0);
    a.src = url;
  });
  return { url, duration };
}

// Resolve a URL tocável de um track. Para áudios de pasta (filePath), lê o
// arquivo nativo sob demanda e guarda em cache pela id do track.
export async function resolveTrackAudio(track: Track): Promise<string | undefined> {
  const cached = urls.get(track.id);
  if (cached) return cached;
  if (track.audioUrl) return track.audioUrl;
  if (track.filePath) {
    const url = await readAudioPathNative(track.filePath);
    if (url) { urls.set(track.id, url); return url; }
  }
  return undefined;
}
