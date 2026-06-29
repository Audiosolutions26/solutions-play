// In-memory registry of real audio files loaded by the user, keyed by track id.
// Files are kept as object URLs for the session (no backend / no persistence).

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
