// Sistema de Marcadores (páginas 110-119 do manual — "Ferramentas dos Marcadores").
// Cada marcador é uma posição fracionária (0..1) sobre a duração do áudio.

export type MarkerKind =
  | "introEnd"      // Marca o fim da introdução
  | "startPoint"    // Marca o ponto de início do áudio
  | "fadeInEnd"     // Marca o ponto de término do Fade-In
  | "mixIn"         // Ponto de mixagem na entrada do áudio
  | "nextEntry"     // Ponto de entrada do próximo áudio
  | "fadeOutStart"  // Marca o ponto de início do Fade-Out
  | "locStart"      // Início de Locução
  | "endPoint"      // Marca o ponto de término do áudio
  | "refraoStart"   // Marca o início do refrão
  | "refraoEnd"     // Marca o fim do refrão
  | "annotation"    // Marca de anotação
  | "carimbo";      // Carimbo (ex.: Hora Certa)

export interface MarkerDef {
  kind: MarkerKind;
  label: string;
  color: string;
  help: string;
  single: boolean; // só uma posição por áudio
}

export const MARKER_DEFS: MarkerDef[] = [
  { kind: "startPoint", label: "Início do áudio", color: "#22c55e", single: true, help: "O áudio sempre começará deste ponto." },
  { kind: "fadeInEnd", label: "Fim do Fade-In", color: "#84cc16", single: true, help: "Fade-in do início do áudio até este ponto." },
  { kind: "introEnd", label: "Fim da introdução", color: "#06b6d4", single: true, help: "Permite ao locutor falar sobre a introdução." },
  { kind: "mixIn", label: "Mixagem na entrada", color: "#0ea5e9", single: true, help: "Ponto de mixagem na entrada do áudio." },
  { kind: "nextEntry", label: "Entrada do próximo", color: "#3b82f6", single: true, help: "O próximo arquivo iniciará neste ponto." },
  { kind: "fadeOutStart", label: "Início do Fade-Out", color: "#f59e0b", single: true, help: "Fade-out deste ponto até o fim do áudio." },
  { kind: "locStart", label: "Início de locução", color: "#a855f7", single: true, help: "Início de locução no final de uma música." },
  { kind: "endPoint", label: "Término do áudio", color: "#ef4444", single: true, help: "A parte posterior nunca será exibida." },
  { kind: "refraoStart", label: "Início do refrão", color: "#ec4899", single: true, help: "Habilita 'Escutar/Tocar/Adicionar refrão'." },
  { kind: "refraoEnd", label: "Fim do refrão", color: "#db2777", single: true, help: "Final do trecho de refrão." },
  { kind: "carimbo", label: "Carimbo (Hora Certa)", color: "#eab308", single: true, help: "Carimba um áudio (ex.: Hora Certa) sobre o áudio." },
  { kind: "annotation", label: "Anotação", color: "#94a3b8", single: false, help: "Comentário exibido durante a execução." },
];

export interface Marker {
  kind: MarkerKind;
  pos: number; // 0..1
  note?: string;
  locked?: boolean; // marcador travado: dispara mas não pode ser editado/movido
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
  store[trackId] = { markers };
  try {
    localStorage.setItem(KEY, JSON.stringify(store));
  } catch { /* ignore */ }
}

export function hasRefrao(trackId: string): boolean {
  const m = getMarkers(trackId);
  return m.some((x) => x.kind === "refraoStart") && m.some((x) => x.kind === "refraoEnd");
}

export function hasCarimbo(trackId: string): boolean {
  return getMarkers(trackId).some((x) => x.kind === "carimbo");
}

// Aplica (copia) o mesmo conjunto de marcadores a vários áudios (manual p.118
// — "aplicar marcadores ao bloco"). Marcadores travados de destino são mantidos.
export function applyMarkersToTracks(markers: Marker[], trackIds: string[]) {
  for (const id of trackIds) {
    const existingLocked = getMarkers(id).filter((m) => m.locked);
    saveMarkers(id, [...existingLocked, ...markers.map((m) => ({ ...m }))]);
  }
}

// Forma de onda determinística (visual) a partir de uma semente.
export function pseudoWave(seed: number, samples = 600): number[] {
  const out: number[] = [];
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < samples; i++) {
    const env = Math.sin((i / samples) * Math.PI); // envelope
    const v = (rnd() * 0.6 + Math.abs(Math.sin(i / 9)) * 0.4) * (0.4 + env * 0.6);
    out.push(Math.min(1, v));
  }
  return out;
}
