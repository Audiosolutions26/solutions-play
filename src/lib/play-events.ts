// Log de eventos em execução (manual p.113-143): registra Beep, Locuções e
// Marcadores disparados durante a execução, com timestamps, para o painel de
// status acompanhar a programação em tempo real.

export type PlayEventKind =
  | "beep"
  | "locucao"
  | "marcador"
  | "carimbo"
  | "programa"
  | "secao"
  | "sistema";

export interface PlayEvent {
  id: string;
  ts: number; // Date.now()
  kind: PlayEventKind;
  label: string;
  detail?: string;
}

const MAX = 250;
let log: PlayEvent[] = [];
const subs = new Set<() => void>();

function notify() {
  for (const cb of subs) cb();
}

export function subscribeEvents(cb: () => void): () => void {
  subs.add(cb);
  return () => subs.delete(cb);
}

export function getEvents(): PlayEvent[] {
  return log;
}

export function logEvent(kind: PlayEventKind, label: string, detail?: string): PlayEvent {
  const ev: PlayEvent = {
    id: `ev${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    ts: Date.now(),
    kind,
    label,
    detail,
  };
  log = [ev, ...log].slice(0, MAX);
  notify();
  return ev;
}

export function clearEvents() {
  log = [];
  notify();
}

export function fmtClock(ts: number): string {
  const d = new Date(ts);
  const p = (n: number) => n.toString().padStart(2, "0");
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

export const EVENT_META: Record<PlayEventKind, { label: string; color: string }> = {
  beep: { label: "Beep", color: "#0ea5e9" },
  locucao: { label: "Locução", color: "#a855f7" },
  marcador: { label: "Marcador", color: "#3b82f6" },
  carimbo: { label: "Carimbo", color: "#eab308" },
  programa: { label: "Programação", color: "#22c55e" },
  secao: { label: "Seção", color: "#f97316" },
  sistema: { label: "Sistema", color: "#94a3b8" },
};
