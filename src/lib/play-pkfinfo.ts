import { analyzeCuePoints, type CuePoints } from "./play-cuepoints";
import { makeFolderAudioTrack, type Category, type Track } from "./play-data";
import {
  listFolderAudioNative,
  readAudioPathNative,
  readPkfInfoNative,
  writePkfInfoNative,
} from "./play-native";
import { importMrkInfoForTrack } from "./play-mrk";
import {
  getMarkers,
  normalizeMarker,
  saveMarkers,
  sortMarkers,
  type Marker,
  type MarkerKind,
  type MarkerPayload,
} from "./play-markers";

/**
 * Formato canônico de sidecar do Solutions-Play.
 *
 * O sidecar fica ao lado da mídia como `<arquivo.ext>.pkfinfo`. O áudio não é
 * copiado nem reprocessado; o documento guarda somente tempos e metadados de
 * execução. A versão 1 continua sendo aceita pelo parser e convertida para o
 * modelo v2 em memória.
 */
export const PKFINFO_FORMAT = "solutions-play-pkfinfo" as const;
export const PKFINFO_VERSION = 2 as const;
const LEGACY_VERSION = 1 as const;

type PkfInfoVersion = typeof LEGACY_VERSION | typeof PKFINFO_VERSION;

export interface PkfInfoAudio {
  durationSec: number;
  sizeBytes: number | null;
  mtimeMs: number | null;
  sha256: string | null;
}

export interface PkfInfoPlayback {
  startPointSec: number;
  endPointSec: number;
  cueInSec: number;
  cueOutSec: number;
  defaultMixOutMs: number;
  useMarkerMix: boolean;
  useStartMix: boolean;
}

export interface PkfInfoGenerated {
  at: string;
  by: string;
  analysis: "manual-or-autocue" | "manual" | "imported";
  schema: "2.0";
}

export interface PkfInfoDocument {
  format: typeof PKFINFO_FORMAT;
  version: typeof PKFINFO_VERSION;
  audioFile: string;
  /** Campos legados preservados para consumidores já existentes. */
  duration: number;
  cueIn: number;
  cueOut: number;
  audio: PkfInfoAudio;
  playback: PkfInfoPlayback;
  markers: Marker[];
  generated: PkfInfoGenerated;
  /** Compatibilidade de leitura para código que ainda acessa generatedAt. */
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

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Number.isFinite(value) ? value : min));
}

function finiteSeconds(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : 0;
}

function finiteOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
}

function finiteMs(value: unknown, fallback = 0): number {
  const ms = typeof value === "number" && Number.isFinite(value) ? value : fallback;
  return Math.max(0, Math.round(ms));
}

function stringOrNull(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function parsePayload(value: unknown): MarkerPayload | undefined {
  if (!value || typeof value !== "object") return undefined;
  const raw = value as Record<string, unknown>;
  const payload: MarkerPayload = {};
  const audioPath = stringOrNull(raw.audioPath);
  const sourceId = stringOrNull(raw.sourceId);
  if (audioPath) payload.audioPath = audioPath;
  if (sourceId) payload.sourceId = sourceId;
  if (typeof raw.fadeMs === "number" && Number.isFinite(raw.fadeMs)) {
    payload.fadeMs = finiteMs(raw.fadeMs);
  }
  if (typeof raw.duckPercent === "number" && Number.isFinite(raw.duckPercent)) {
    payload.duckPercent = clamp(raw.duckPercent, 0, 100);
  }
  return Object.keys(payload).length ? payload : undefined;
}

function parseMarker(value: unknown, duration: number, index: number): Marker | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  const kind = raw.kind;
  if (typeof kind !== "string" || !VALID_KINDS.has(kind as MarkerKind)) return null;
  const rawSec = raw.positionSec;
  const rawPos = typeof raw.pos === "number" ? raw.pos : Number(raw.pos);
  const positionSec =
    typeof rawSec === "number" && Number.isFinite(rawSec) && rawSec >= 0
      ? clamp(rawSec, 0, duration)
      : clamp(Number.isFinite(rawPos) ? rawPos * duration : 0, 0, duration);
  const marker = normalizeMarker(
    {
      kind: kind as MarkerKind,
      pos: duration > 0 ? positionSec / duration : 0,
      positionSec,
      id: typeof raw.id === "string" ? raw.id : undefined,
      note: typeof raw.note === "string" ? raw.note : undefined,
      locked: raw.locked === true,
      payload: parsePayload(raw.payload),
    },
    duration,
    `${kind}-${index + 1}`,
  );
  return marker;
}

function normalizeTimes(duration: number, cueIn: unknown, cueOut: unknown): CuePoints {
  const safeDuration = Math.max(0, finiteSeconds(duration));
  const start = clamp(finiteSeconds(cueIn), 0, safeDuration);
  const end = clamp(finiteSeconds(cueOut || safeDuration), start, safeDuration);
  return { cueIn: start, cueOut: end, duration: safeDuration };
}

function markersForDocument(track: Track, points: CuePoints, supplied?: Marker[]): Marker[] {
  const duration = Math.max(0, finiteSeconds(points.duration || track.duration));
  const base =
    supplied ??
    (() => {
      try {
        return getMarkers(track.id);
      } catch {
        return [];
      }
    })();
  const auto = markersFromCuePoints(points);
  const byKind = new Map<MarkerKind, Marker>();
  for (const marker of auto) byKind.set(marker.kind, marker);
  for (const marker of base) {
    const normalized = normalizeMarker(marker, duration);
    byKind.set(normalized.kind, normalized);
  }
  return sortMarkers([...byKind.values()], duration);
}

/** Cria somente limites audíveis; não inventa intro/fade/mixagem artística. */
export function markersFromCuePoints(points: CuePoints): Marker[] {
  const duration = finiteSeconds(points.duration);
  if (duration <= 0) return [];
  const markers: Marker[] = [];
  const cueIn = clamp(finiteSeconds(points.cueIn), 0, duration);
  const cueOut = clamp(finiteSeconds(points.cueOut), cueIn, duration);
  if (cueIn > 0.01) {
    markers.push(
      normalizeMarker(
        { kind: "startPoint", pos: cueIn / duration, positionSec: cueIn, id: "auto-start" },
        duration,
      ),
    );
  }
  if (cueOut > cueIn + 0.2 && cueOut < duration - 0.05) {
    markers.push(
      normalizeMarker(
        { kind: "endPoint", pos: cueOut / duration, positionSec: cueOut, id: "auto-end" },
        duration,
      ),
    );
  }
  return markers;
}

export function createPkfInfoDocument(
  track: Track,
  points: CuePoints,
  suppliedMarkers?: Marker[],
): PkfInfoDocument {
  const times = normalizeTimes(points.duration || track.duration, points.cueIn, points.cueOut);
  const markers = markersForDocument(track, times, suppliedMarkers);
  const duration = times.duration;
  const generatedAt = new Date().toISOString();
  return {
    format: PKFINFO_FORMAT,
    version: PKFINFO_VERSION,
    audioFile: track.filePath ?? track.title,
    duration,
    cueIn: times.cueIn,
    cueOut: times.cueOut,
    audio: {
      durationSec: duration,
      sizeBytes: null,
      mtimeMs: null,
      sha256: null,
    },
    playback: {
      startPointSec: times.cueIn,
      endPointSec: times.cueOut,
      cueInSec: times.cueIn,
      cueOutSec: times.cueOut,
      defaultMixOutMs: 0,
      useMarkerMix: true,
      useStartMix: true,
    },
    markers,
    generated: {
      at: generatedAt,
      by: "solutions-play",
      analysis: suppliedMarkers?.length ? "manual-or-autocue" : "manual-or-autocue",
      schema: "2.0",
    },
    generatedAt,
  };
}

export function serializePkfInfo(document: PkfInfoDocument): string {
  return `${JSON.stringify(document, null, 2)}\n`;
}

function parseV2(raw: Record<string, unknown>): PkfInfoDocument | null {
  const rawAudio =
    raw.audio && typeof raw.audio === "object" ? (raw.audio as Record<string, unknown>) : {};
  const rawPlayback =
    raw.playback && typeof raw.playback === "object"
      ? (raw.playback as Record<string, unknown>)
      : {};
  const duration = finiteSeconds(rawAudio.durationSec ?? raw.duration);
  const times = normalizeTimes(
    duration,
    rawPlayback.startPointSec ?? rawPlayback.cueInSec ?? raw.cueIn,
    rawPlayback.endPointSec ?? rawPlayback.cueOutSec ?? raw.cueOut,
  );
  const markers = Array.isArray(raw.markers)
    ? raw.markers
        .map((marker, index) => parseMarker(marker, duration, index))
        .filter((m): m is Marker => Boolean(m))
    : [];
  const generatedAt =
    stringOrNull(
      raw.generated && typeof raw.generated === "object"
        ? (raw.generated as Record<string, unknown>).at
        : raw.generatedAt,
    ) ?? "";
  const generatedRaw =
    raw.generated && typeof raw.generated === "object"
      ? (raw.generated as Record<string, unknown>)
      : {};
  return {
    format: PKFINFO_FORMAT,
    version: PKFINFO_VERSION,
    audioFile: typeof raw.audioFile === "string" ? raw.audioFile : "",
    duration,
    cueIn: times.cueIn,
    cueOut: times.cueOut,
    audio: {
      durationSec: duration,
      sizeBytes: finiteOrNull(rawAudio.sizeBytes),
      mtimeMs: finiteOrNull(rawAudio.mtimeMs),
      sha256: stringOrNull(rawAudio.sha256),
    },
    playback: {
      startPointSec: clamp(finiteSeconds(rawPlayback.startPointSec ?? times.cueIn), 0, duration),
      endPointSec: clamp(
        finiteSeconds(rawPlayback.endPointSec ?? times.cueOut),
        times.cueIn,
        duration,
      ),
      cueInSec: times.cueIn,
      cueOutSec: times.cueOut,
      defaultMixOutMs: finiteMs(rawPlayback.defaultMixOutMs),
      useMarkerMix: rawPlayback.useMarkerMix !== false,
      useStartMix: rawPlayback.useStartMix !== false,
    },
    markers: sortMarkers(markers, duration),
    generated: {
      at: generatedAt,
      by: stringOrNull(generatedRaw.by) ?? "imported",
      analysis: generatedRaw.analysis === "manual" ? "manual" : "imported",
      schema: "2.0",
    },
    generatedAt,
  };
}

function parseV1(raw: Record<string, unknown>): PkfInfoDocument | null {
  const duration = finiteSeconds(raw.duration);
  const times = normalizeTimes(duration, raw.cueIn, raw.cueOut);
  const markers = Array.isArray(raw.markers)
    ? raw.markers
        .map((marker, index) => parseMarker(marker, duration, index))
        .filter((m): m is Marker => Boolean(m))
    : [];
  const generatedAt = stringOrNull(raw.generatedAt) ?? "";
  return {
    format: PKFINFO_FORMAT,
    version: PKFINFO_VERSION,
    audioFile: typeof raw.audioFile === "string" ? raw.audioFile : "",
    duration,
    cueIn: times.cueIn,
    cueOut: times.cueOut,
    audio: { durationSec: duration, sizeBytes: null, mtimeMs: null, sha256: null },
    playback: {
      startPointSec: times.cueIn,
      endPointSec: times.cueOut,
      cueInSec: times.cueIn,
      cueOutSec: times.cueOut,
      defaultMixOutMs: 0,
      useMarkerMix: true,
      useStartMix: true,
    },
    markers: sortMarkers(markers, duration),
    generated: { at: generatedAt, by: "imported", analysis: "imported", schema: "2.0" },
    generatedAt,
  };
}

/** Lê v1/v2 e sempre devolve o modelo canônico v2 em memória. */
export function parsePkfInfo(text: string): PkfInfoDocument | null {
  try {
    const raw = JSON.parse(text) as Record<string, unknown>;
    
    // Suporte ao formato .mrk (mrk_editor) detectado pelo schema
    if (raw.audio && Array.isArray(raw.markers) && typeof (raw.audio as any).duration_ms === 'number') {
      // É um arquivo .mrk do Python. O importMrkInfoForTrack já lida com isso,
      // mas mantemos o parser genérico aqui para compatibilidade de fluxo.
      return null; // O chamador deve usar o fluxo de .mrk específico
    }

    if (raw.format !== PKFINFO_FORMAT) return null;
    const version = raw.version as PkfInfoVersion;
    if (version === LEGACY_VERSION) return parseV1(raw);
    if (version === PKFINFO_VERSION) return parseV2(raw);
    return null;
  } catch {
    return null;
  }
}

export async function generatePkfInfoForTrack(track: Track): Promise<PkfInfoGenerationResult> {
  const audioPath = track.filePath;
  if (!audioPath) {
    return {
      audioPath: track.title,
      markers: 0,
      status: "skipped",
      error: "A faixa não possui caminho local.",
    };
  }
  try {
    const url = await readAudioPathNative(audioPath);
    if (!url)
      return { audioPath, markers: 0, status: "error", error: "Não foi possível ler o áudio." };
    const points = await analyzeCuePoints(url);
    if (points.duration <= 0) {
      return { audioPath, markers: 0, status: "skipped", error: "Duração não identificada." };
    }
    const document = createPkfInfoDocument(track, points);
    const sidecarPath = await writePkfInfoNative({
      audioPath,
      content: serializePkfInfo(document),
    });
    if (!sidecarPath) {
      return {
        audioPath,
        markers: document.markers.length,
        status: "error",
        error: "Não foi possível gravar o sidecar.",
      };
    }
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
  if (!files) {
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
  }
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

/** Importa documentos válidos e não mexe nos marcadores travados existentes. */
export async function importPkfInfoForTracks(tracks: Track[]): Promise<number> {
  const candidates = tracks.filter((track) => Boolean(track.filePath));
  const results = await mapWithConcurrency(candidates, 8, async (track) => {
    // 1. Tenta importar .mrk primeiro (formato do editor externo)
    const res = await importMrkInfoForTrack(track);
    if (res.success) return true;

    // 2. Fallback para .pkfinfo nativo
    const raw = await readPkfInfoNative(track.filePath as string);
    const parsed = raw ? parsePkfInfo(raw) : null;
    if (!parsed) return false;
    
    const existing = getMarkers(track.id);
    const existingLocked = existing.filter((marker) => marker.locked);
    const incoming = parsed.markers.filter(
      (marker) => !existingLocked.some((locked) => locked.kind === marker.kind),
    );
    saveMarkers(track.id, sortMarkers([...existingLocked, ...incoming], parsed.duration));
    return true;
  });
  return results.filter(Boolean).length;
}
