// Locuções gravadas (manual p.111-112): banco de locuções/voz do operador.
// As gravações ficam em memória durante a sessão (object URLs), com um
// pequeno store observável para os painéis reagirem a mudanças.

export interface Locucao {
  id: string;
  name: string;
  url: string;
  duration: number; // segundos
  date: string;
  source: "gravada" | "arquivo";
}

let list: Locucao[] = [];
const subs = new Set<() => void>();

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
  url: string,
  duration: number,
  source: Locucao["source"],
): Locucao {
  const loc: Locucao = {
    id: `loc${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name,
    url,
    duration: Math.max(1, Math.round(duration)),
    date: new Date().toLocaleString("pt-BR"),
    source,
  };
  list = [loc, ...list];
  notify();
  return loc;
}

export function renameLocucao(id: string, name: string) {
  list = list.map((l) => (l.id === id ? { ...l, name } : l));
  notify();
}

export function removeLocucao(id: string) {
  const found = list.find((l) => l.id === id);
  if (found) {
    try { URL.revokeObjectURL(found.url); } catch { /* ignore */ }
  }
  list = list.filter((l) => l.id !== id);
  notify();
}