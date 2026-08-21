import { analyzeCuePoints, type CuePoints } from "./play-cuepoints";
import { makeFolderAudioTrack, type Category, type Track } from "./play-data";
import {
  listFolderAudioNative,
  readAudioPathNative,
  readPkfInfoNative,
  writePkfInfoNative,
} from "./play-native";
import { getMarkers, saveMarkers, type Marker, type MarkerKind } from "./play-markers";

/**
 * Formato sidecar do Solutions-Play.
 *
 * O arquivo usa a extensão `.pkfinfo` e fica ao lado do áudio, no formato
 * `<arquivo.ext>.pkfinfo`. Ele é JSON versionado para permitir evolução sem
 * quebrar arquivos já gerados. Não contém áudio nem altera o ganho do arquivo.
 */
export const PKFINFO_FORMAT = "solutions-play-pkfinfo" as const;
export const PKFINFO_VERSION = 1 as const;

export interface PkfInfoDocument {
  format: typeof PKFINFO_FORMAT;
  version: typeof PKFINFO_VERSION;
  audioFile: string;
  duration: number;
  cueIn: number;
  cueOut: number;
  markers: Marker[];
  generatedAt: string;
}

export interface PkfInfoGenerationResult {
  audioPath: string;
  sidecarPath?: string;
  markers: number;
  status: "generated" | "skipped" | "error";
  error?: string;
}

export interface PkfInfoFolderResult {
  total: number;
  generated: number;
  skipped: number;
  errors: number;
  results: PkfInfoGenerationResult[];
}

const VALID_KINDS = new Set<MarkerKind>([
  "introEnd",
  "startPoint",
  "fadeInEnd",
  "mixIn",
  "nextEntry",
  "fadeOutStart",
  "locStart",
  "endPoint",
  "refraoStart",
  "refraoEnd",
  "annotation",
  "carimbo",
]);

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
}

function finiteSeconds(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : 0;
}

function normalizeMarker(value: unknown): Marker | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  if (typeof raw.kind !== "string" || !VALID_KINDS.has(raw.kind as MarkerKind)) return null;
  const pos = clamp01(typeof raw.pos === "number" ? raw.pos : Number(raw.pos));
  const marker: Marker = { kind: raw.kind as MarkerKind, pos };
  if (typeof raw.note === "string" && raw.note.trim()) marker.note = raw.note.trim();
  if (raw.locked === true) marker.locked = true;
  return marker;
}

/** Cria somente marcadores de limite audível; não inventa intro/fade/mixagem. */
export function markersFromCuePoints(points: CuePoints): Marker[] {
  const duration = finiteSeconds(points.duration);
  if (duration <= 0) return [];
  const markers: Marker[] = [];
  const cueIn = Math.min(duration, finiteSeconds(points.cueIn));
  const cueOut = Math.min(duration, finiteSeconds(points.cueOut));
  if (cueIn > 0.01) markers.push({ kind: "startPoint", pos: clamp01(cueIn / duration) });
  if (cueOut > cueIn + 0.2 && cueOut < duration - 0.05) {
    markers.push({ kind: "endPoint", pos: clamp01(cueOut / duration) });
  }
  return markers;
}

export function createPkfInfoDocument(track: Track, points: CuePoints): PkfInfoDocument {
  const duration = finiteSeconds(points.duration || track.duration);
  const cueIn = Math.min(duration, finiteSeconds(points.cueIn));
  const cueOut = Math.min(duration, finiteSeconds(points.cueOut || duration));
  return {
    format: PKFINFO_FORMAT,
    version: PKFINFO_VERSION,
    audioFile: track.filePath ?? track.title,
    duration,
    cueIn,
    cueOut,
    markers: markersFromCuePoints({ cueIn, cueOut, duration }),
    generatedAt: new Date().toISOString(),
  };
}

export function serializePkfInfo(document: PkfInfoDocument): string {
  return `${JSON.stringify(document, null, 2)}\n`;
}

export function parsePkfInfo(text: string): PkfInfoDocument | null {
  try {
    const raw = JSON.parse(text) as Record<string, unknown>;
    if (raw.format !== PKFINFO_FORMAT || raw.version !== PKFINFO_VERSION) return null;
    const duration = finiteSeconds(raw.duration);
    const cueIn = Math.min(duration, finiteSeconds(raw.cueIn));
    const cueOut = Math.min(duration, finiteSeconds(raw.cueOut || duration));
    const markers = Array.isArray(raw.markers)
      ? raw.markers.map(normalizeMarker).filter((m): m is Marker => Boolean(m))
      : [];
    return {
      format: PKFINFO_FORMAT,
      version: PKFINFO_VERSION,
      audioFile: typeof raw.audioFile === "string" ? raw.audioFile : "",
      duration,
      cueIn,
      cueOut,
      markers,
      generatedAt: typeof raw.generatedAt === "string" ? raw.generatedAt : "",
    };
  } catch {
    return null;
  }
}

export async function generatePkfInfoForTrack(track: Track): Promise<PkfInfoGenerationResult> {
  const audioPath = track.filePath;
  if (!audioPath)
    return {
      audioPath: track.title,
      markers: 0,
      status: "skipped",
      error: "A faixa não possui caminho local.",
    };
  try {
    const url = await readAudioPathNative(audioPath);
    if (!url)
      return { audioPath, markers: 0, status: "error", error: "Não foi possível ler o áudio." };
    const points = await analyzeCuePoints(url);
    if (points.duration <= 0)
      return { audioPath, markers: 0, status: "skipped", error: "Duração não identificada." };
    const document = createPkfInfoDocument(track, points);
    const sidecarPath = await writePkfInfoNative({
      audioPath,
      content: serializePkfInfo(document),
    });
    if (!sidecarPath)
      return {
        audioPath,
        markers: document.markers.length,
        status: "error",
        error: "Não foi possível gravar o sidecar.",
      };
    return { audioPath, sidecarPath, markers: document.markers.length, status: "generated" };
  } catch (error) {
    return {
      audioPath,
      markers: 0,
      status: "error",
      error: error instanceof Error ? error.message : "Falha desconhecida.",
    };
  }
}

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const out: R[] = [];
  let cursor = 0;
  const worker = async () => {
    while (true) {
      const index = cursor++;
      if (index >= items.length) return;
      out[index] = await fn(items[index]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, Math.max(1, items.length)) }, worker));
  return out;
}

export async function generatePkfInfoForFolder(
  directory: string,
  category: Category = "musical",
  onProgress?: (done: number, total: number) => void,
): Promise<PkfInfoFolderResult> {
  const files = await listFolderAudioNative(directory);
  if (!files)
    return {
      total: 0,
      generated: 0,
      skipped: 0,
      errors: 1,
      results: [
        {
          audioPath: directory,
          markers: 0,
          status: "error",
          error: "A geração exige o aplicativo desktop.",
        },
      ],
    };
  const tracks = files.map((file) => makeFolderAudioTrack(file.name, file.path, category));
  let done = 0;
  const results = await mapWithConcurrency(tracks, 2, async (track) => {
    const result = await generatePkfInfoForTrack(track);
    onProgress?.(++done, tracks.length);
    return result;
  });
  return {
    total: results.length,
    generated: results.filter((r) => r.status === "generated").length,
    skipped: results.filter((r) => r.status === "skipped").length,
    errors: results.filter((r) => r.status === "error").length,
    results,
  };
}

/** Importa somente documentos válidos e não mexe nos marcadores travados existentes. */
export async function importPkfInfoForTracks(tracks: Track[]): Promise<number> {
  const candidates = tracks.filter((track) => Boolean(track.filePath));
  const imported = await mapWithConcurrency(candidates, 8, async (track) => {
    const raw = await readPkfInfoNative(track.filePath as string);
    const parsed = raw ? parsePkfInfo(raw) : null;
    if (!parsed) return false;
    const existingLocked = getMarkers(track.id).filter((marker) => marker.locked);
    const merged = [
      ...existingLocked,
      ...parsed.markers.filter(
        (marker) => !existingLocked.some((locked) => locked.kind === marker.kind),
      ),
    ];
    saveMarkers(track.id, merged);
    return true;
  });
  return imported.filter(Boolean).length;
}
