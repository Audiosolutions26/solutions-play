// Locuções gravadas (manual p.111-112): banco de locuções/voz do operador.
// Gravações via microfone ficam em memória (object URLs) durante a sessão.
// Arquivos escolhidos pelo seletor nativo do Windows guardam o CAMINHO e são
// persistidos, sendo recarregados sob demanda em sessões seguintes.

import { readAudioPathNative } from "./play-native";

export interface Locucao {
  id: string;
  name: string;
  url?: string;       // object URL / data URL tocável nesta sessão
  path?: string;      // caminho nativo persistido (Windows)
  duration: number;   // segundos
  date: string;
  source: "gravada" | "arquivo";
}

const KEY = "solutions-play-locucoes";

let list: Locucao[] = [];
const subs = new Set<() => void>();

function persist() {
  // só persistimos as locuções com caminho nativo (recarregáveis).
  try {
    const keep = list
      .filter((l) => l.path)
      .map(({ id, name, path, duration, date, source }) => ({ id, name, path, duration, date, source }));
    localStorage.setItem(KEY, JSON.stringify(keep));
  } catch { /* ignore */ }
}

function hydrate() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) list = JSON.parse(raw) as Locucao[];
  } catch { /* ignore */ }
}
hydrate();

function notify() {
  for (const cb of subs) cb();
}

export function subscribeLocucoes(cb: () => void): () => void {
  subs.add(cb);
  return () => subs.delete(cb);
}

export function getLocucoes(): Locucao[] {
  return list;
}

export function addLocucao(
  name: string,
  url: string | undefined,
  duration: number,
  source: Locucao["source"],
  path?: string,
): Locucao {
  const loc: Locucao = {
    id: `loc${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name,
    url,
    path,
    duration: Math.max(1, Math.round(duration)),
    date: new Date().toLocaleString("pt-BR"),
    source,
  };
  list = [loc, ...list];
  persist();
  notify();
  return loc;
}

export function renameLocucao(id: string, name: string) {
  list = list.map((l) => (l.id === id ? { ...l, name } : l));
  persist();
  notify();
}

export function removeLocucao(id: string) {
  const found = list.find((l) => l.id === id);
  if (found?.url && found.url.startsWith("blob:")) {
    try { URL.revokeObjectURL(found.url); } catch { /* ignore */ }
  }
  list = list.filter((l) => l.id !== id);
  persist();
  notify();
}

// Garante uma URL tocável: se a locução só tem caminho nativo (persistido),
// recarrega via ponte do Windows e memoriza para esta sessão.
export async function resolveLocucaoUrl(loc: Locucao): Promise<string | null> {
  if (loc.url) return loc.url;
  if (loc.path) {
    const url = await readAudioPathNative(loc.path);
    if (url) {
      list = list.map((l) => (l.id === loc.id ? { ...l, url } : l));
      notify();
      return url;
    }
  }
  return null;
}
