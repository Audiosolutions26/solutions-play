// Sistema de Marcadores — posições temporais não destrutivas.
// O arquivo de áudio nunca é alterado. `pos` permanece por compatibilidade;
// `positionSec` é a posição canônica quando a duração real é conhecida.

export type MarkerKind =
  | "introEnd" // Marca o fim da introdução
  | "startPoint" // Marca o ponto de início do áudio
  | "fadeInEnd" // Marca o ponto de término do Fade-In
  | "mixIn" // Ponto de mixagem na entrada do áudio
  | "nextEntry" // Ponto de entrada do próximo áudio
  | "fadeOutStart" // Marca o ponto de início do Fade-Out
  | "locStart" // Início de Locução
  | "endPoint" // Marca o ponto de término do áudio
  | "refraoStart" // Marca o início do refrão
  | "refraoEnd" // Marca o fim do refrão
  | "annotation" // Marca de anotação
  | "carimbo"; // Carimbo (ex.: Hora Certa)

export interface MarkerDef {
  kind: MarkerKind;
  label: string;
  color: string;
  help: string;
  single: boolean;
}

export const MARKER_DEFS: MarkerDef[] = [
  {
    kind: "startPoint",
    label: "Início do áudio",
    color: "#22c55e",
    single: true,
    help: "O áudio sempre começará deste ponto.",
  },
  {
    kind: "fadeInEnd",
    label: "Fim do Fade-In",
    color: "#84cc16",
    single: true,
    help: "Fade-in do início do áudio até este ponto.",
  },
  {
    kind: "introEnd",
    label: "Fim da introdução",
    color: "#06b6d4",
    single: true,
    help: "Permite ao locutor falar sobre a introdução.",
  },
  {
    kind: "mixIn",
    label: "Mixagem na entrada",
    color: "#0ea5e9",
    single: true,
    help: "Ponto de mixagem na entrada do áudio.",
  },
  {
    kind: "nextEntry",
    label: "Entrada do próximo",
    color: "#3b82f6",
    single: true,
    help: "O próximo arquivo iniciará neste ponto.",
  },
  {
    kind: "fadeOutStart",
    label: "Início do Fade-Out",
    color: "#f59e0b",
    single: true,
    help: "Fade-out deste ponto até o fim do áudio.",
  },
  {
    kind: "locStart",
    label: "Início de locução",
    color: "#a855f7",
    single: true,
    help: "Início de locução no final de uma música.",
  },
  {
    kind: "endPoint",
    label: "Término do áudio",
    color: "#ef4444",
    single: true,
    help: "A parte posterior nunca será exibida.",
  },
  {
    kind: "refraoStart",
    label: "Início do refrão",
    color: "#ec4899",
    single: true,
    help: "Habilita 'Escutar/Tocar/Adicionar refrão'.",
  },
  {
    kind: "refraoEnd",
    label: "Fim do refrão",
    color: "#db2777",
    single: true,
    help: "Final do trecho de refrão.",
  },
  {
    kind: "carimbo",
    label: "Carimbo (Hora Certa)",
    color: "#eab308",
    single: true,
    help: "Carimba um áudio (ex.: Hora Certa) sobre o áudio.",
  },
  {
    kind: "annotation",
    label: "Anotação",
    color: "#94a3b8",
    single: false,
    help: "Comentário exibido durante a execução.",
  },
];

export interface MarkerPayload {
  /** Caminho absoluto ou URL do áudio que será sobreposto no carimbo. */
  audioPath?: string;
  /** Fade de entrada/saída da sobreposição, em milissegundos. */
  fadeMs?: number;
  /** Redução transitória da programação, em percentual de 0 a 100. */
  duckPercent?: number;
  /** Identificador opcional de uma fonte externa/atalho. */
  sourceId?: string;
}

export interface Marker {
  kind: MarkerKind;
  /** Posição normalizada legada, sempre 0..1. */
  pos: number;
  /** Posição canônica em segundos na mídia original. */
  positionSec?: number;
  /** ID estável para edição e sincronização do sidecar. */
  id?: string;
  note?: string;
  locked?: boolean;
  payload?: MarkerPayload;
}

export interface TrackMarkers {
  markers: Marker[];
}

const KEY = "solutions-play-markers";

type Store = Record<string, TrackMarkers>;

function read(): Store {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "{}");
  } catch {
    return {};
  }
}

export function getMarkers(trackId: string): Marker[] {
  return read()[trackId]?.markers ?? [];
}

export function saveMarkers(trackId: string, markers: Marker[]) {
  const store = read();
  store[trackId] = { markers: markers.map((marker) => ({ ...marker })) };
  try {
    localStorage.setItem(KEY, JSON.stringify(store));
  } catch {
    /* ignore storage quota/private mode */
  }
}

export function hasRefrao(trackId: string): boolean {
  const m = getMarkers(trackId);
  return m.some((x) => x.kind === "refraoStart") && m.some((x) => x.kind === "refraoEnd");
}

export function hasCarimbo(trackId: string): boolean {
  return getMarkers(trackId).some((x) => x.kind === "carimbo");
}

/** Converte o formato legado normalizado para segundos reais. */
export function markerPositionSec(marker: Marker, durationSec: number): number {
  const duration = Math.max(0, Number.isFinite(durationSec) ? durationSec : 0);
  if (typeof marker.positionSec === "number" && Number.isFinite(marker.positionSec)) {
    return Math.max(0, Math.min(duration || marker.positionSec, marker.positionSec));
  }
  const pos = Number.isFinite(marker.pos) ? marker.pos : 0;
  return Math.max(0, Math.min(duration, pos * duration));
}

/** Normaliza uma marca sem alterar a semântica nem gerar novos tipos. */
export function normalizeMarker(marker: Marker, durationSec: number, fallbackId?: string): Marker {
  const duration = Math.max(0, Number.isFinite(durationSec) ? durationSec : 0);
  const sec = markerPositionSec(marker, duration);
  const pos = duration > 0 ? sec / duration : Math.max(0, Math.min(1, marker.pos || 0));
  const id = marker.id?.trim() || fallbackId || `${marker.kind}-${Math.round(pos * 1_000_000)}`;
  const normalized: Marker = {
    ...marker,
    id,
    pos: Math.max(0, Math.min(1, pos)),
    ...(duration > 0 ? { positionSec: sec } : {}),
  };
  if (normalized.note !== undefined) normalized.note = normalized.note.trim() || undefined;
  if (normalized.payload) {
    normalized.payload = {
      ...normalized.payload,
      ...(typeof normalized.payload.fadeMs === "number"
        ? { fadeMs: Math.max(0, Math.round(normalized.payload.fadeMs)) }
        : {}),
      ...(typeof normalized.payload.duckPercent === "number"
        ? { duckPercent: Math.max(0, Math.min(100, normalized.payload.duckPercent)) }
        : {}),
    };
  }
  return normalized;
}

/** Retorna a primeira marca de um tipo, ordenada pela posição temporal. */
export function firstMarker(
  markers: Marker[] | undefined,
  kind: MarkerKind,
  durationSec: number,
): Marker | undefined {
  return [...(markers ?? [])]
    .filter((marker) => marker.kind === kind)
    .sort((a, b) => markerPositionSec(a, durationSec) - markerPositionSec(b, durationSec))[0];
}

/** Retorna uma cópia ordenada sem remover marcas repetíveis. */
export function sortMarkers(markers: Marker[], durationSec: number): Marker[] {
  return markers
    .map((marker, index) => normalizeMarker(marker, durationSec, `${marker.kind}-${index + 1}`))
    .sort((a, b) => markerPositionSec(a, durationSec) - markerPositionSec(b, durationSec));
}

export interface MarkerValidation {
  valid: boolean;
  errors: string[];
}

/** Valida invariantes antes de salvar/usar marcadores no runtime. */
export function validateMarkers(markers: Marker[], durationSec: number): MarkerValidation {
  const duration = Math.max(0, Number.isFinite(durationSec) ? durationSec : 0);
  const errors: string[] = [];
  const singles = new Set(MARKER_DEFS.filter((def) => def.single).map((def) => def.kind));
  for (const kind of singles) {
    if (markers.filter((marker) => marker.kind === kind).length > 1) {
      errors.push(`O marcador ${kind} só pode aparecer uma vez.`);
    }
  }
  for (const marker of markers) {
    const sec = markerPositionSec(marker, duration);
    if (!Number.isFinite(sec) || sec < 0 || (duration > 0 && sec > duration)) {
      errors.push(`Posição inválida para ${marker.kind}.`);
    }
  }
  const start = firstMarker(markers, "refraoStart", duration);
  const end = firstMarker(markers, "refraoEnd", duration);
  if ((start && !end) || (!start && end)) errors.push("O refrão precisa de início e fim.");
  if (start && end && markerPositionSec(start, duration) >= markerPositionSec(end, duration)) {
    errors.push("O início do refrão deve ser anterior ao fim.");
  }
  const startPoint = firstMarker(markers, "startPoint", duration);
  const endPoint = firstMarker(markers, "endPoint", duration);
  if (
    startPoint &&
    endPoint &&
    markerPositionSec(startPoint, duration) >= markerPositionSec(endPoint, duration)
  ) {
    errors.push("O início do áudio deve ser anterior ao término.");
  }
  return { valid: errors.length === 0, errors };
}

// Aplica o mesmo conjunto de marcadores a vários áudios. Marcadores travados
// existentes no destino são mantidos e não são sobrescritos.
export function applyMarkersToTracks(markers: Marker[], trackIds: string[]) {
  for (const id of trackIds) {
    const existingLocked = getMarkers(id).filter((m) => m.locked);
    const incoming = markers.filter(
      (marker) => !existingLocked.some((locked) => locked.kind === marker.kind),
    );
    saveMarkers(id, [...existingLocked, ...incoming.map((m) => ({ ...m }))]);
  }
}

// Forma de onda determinística legada, mantida somente para fallback de tracks
// sintéticas sem arquivo real. O editor real deve preferir picos decodificados.
export function pseudoWave(seed: number, samples = 600): number[] {
  const out: number[] = [];
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < samples; i++) {
    const env = Math.sin((i / samples) * Math.PI);
    const v = (rnd() * 0.6 + Math.abs(Math.sin(i / 9)) * 0.4) * (0.4 + env * 0.6);
    out.push(Math.min(1, v));
  }
  return out;
}
