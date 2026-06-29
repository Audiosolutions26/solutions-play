// Preferência do estilo do VU: "digital" (barras de LED) x "analogico"
// (ponteiro/agulha clássico). Persistida e compartilhada entre os medidores.
import { useEffect, useState, useSyncExternalStore } from "react";

export type VuMode = "digital" | "analogico";
const KEY = "solutions-play-vu-mode";

function read(): VuMode {
  try {
    return localStorage.getItem(KEY) === "analogico" ? "analogico" : "digital";
  } catch {
    return "digital";
  }
}

let mode: VuMode = read();
const subs = new Set<() => void>();

export function getVuMode(): VuMode {
  return mode;
}

export function setVuMode(m: VuMode): void {
  mode = m;
  try { localStorage.setItem(KEY, m); } catch { /* ignore */ }
  subs.forEach((f) => f());
}

export function toggleVuMode(): void {
  setVuMode(mode === "analogico" ? "digital" : "analogico");
}

function subscribe(cb: () => void): () => void {
  subs.add(cb);
  return () => subs.delete(cb);
}

export function useVuMode(): VuMode {
  // Durante a hidratação, o servidor não conhece a preferência salva em
  // localStorage, então a primeira renderização do cliente também precisa
  // devolver "digital" para casar com o HTML do servidor. Após montar,
  // passamos a refletir o valor real persistido.
  const value = useSyncExternalStore(subscribe, getVuMode, (): VuMode => "digital");
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => setIsMounted(true), []);
  return isMounted ? value : "digital";
}
