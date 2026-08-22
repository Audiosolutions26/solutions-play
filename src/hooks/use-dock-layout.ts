import { useCallback, useEffect, useState } from "react";

// Layout dos painéis "encaixáveis" (grids) da coluna direita do PlayApp.
// Permite redimensionar (arrastar divisórias ou botões +/−), fechar e fixar
// novos grids (ex.: arrastar o QuickStart para dentro dos quadros visíveis).

export type DockId = "historico" | "pastas" | "propriedades" | "quickstart";

interface DockState {
  rightWidth: number; // largura da coluna direita (% do split)
  pastasSide: "left" | "right"; // zona de encaixe da Biblioteca/Pastas de trabalho
  pastasWidth: number; // largura percentual da Biblioteca quando encaixada à esquerda
  open: DockId[]; // grids visíveis, de cima para baixo
  weights: Record<DockId, number>; // peso (altura relativa) de cada grid
}

const KEY = "solplay.dock.v3";

const DEFAULT: DockState = {
  rightWidth: 34,
  pastasSide: "left",
  pastasWidth: 16,
  open: ["historico", "propriedades", "pastas", "quickstart"],
  weights: { historico: 1.05, pastas: 1.15, propriedades: 1.05, quickstart: 1.45 },
};

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

function load(): DockState {
  if (typeof window === "undefined") return DEFAULT;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) {
      const p = JSON.parse(raw) as Partial<DockState>;
      const storedOpen =
        Array.isArray(p.open) && p.open.length ? (p.open as DockId[]) : DEFAULT.open;
      const open: DockId[] = storedOpen.includes("historico")
        ? storedOpen
        : ["historico", ...storedOpen];
      return {
        rightWidth: clamp(Number(p.rightWidth ?? DEFAULT.rightWidth), 22, 72),
        pastasSide: p.pastasSide === "right" ? "right" : DEFAULT.pastasSide,
        pastasWidth: clamp(Number(p.pastasWidth ?? DEFAULT.pastasWidth), 14, 32),
        open,
        weights: { ...DEFAULT.weights, ...(p.weights ?? {}) },
      };
    }
  } catch {
    /* ignore */
  }
  return DEFAULT;
}

export function useDockLayout() {
  const [state, setState] = useState<DockState>(load);

  useEffect(() => {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* ignore */
    }
  }, [state]);

  const setRightWidth = useCallback(
    (pct: number) => setState((s) => ({ ...s, rightWidth: clamp(pct, 22, 72) })),
    [],
  );
  const setPastasSide = useCallback(
    (side: "left" | "right") => setState((s) => ({ ...s, pastasSide: side })),
    [],
  );
  const setPastasWidth = useCallback(
    (pct: number) => setState((s) => ({ ...s, pastasWidth: clamp(pct, 14, 32) })),
    [],
  );
  const openPanel = useCallback(
    (id: DockId) => setState((s) => (s.open.includes(id) ? s : { ...s, open: [...s.open, id] })),
    [],
  );
  const closePanel = useCallback(
    (id: DockId) => setState((s) => ({ ...s, open: s.open.filter((x) => x !== id) })),
    [],
  );
  const togglePanel = useCallback(
    (id: DockId) =>
      setState((s) =>
        s.open.includes(id)
          ? { ...s, open: s.open.filter((x) => x !== id) }
          : { ...s, open: [...s.open, id] },
      ),
    [],
  );
  const grow = useCallback(
    (id: DockId) =>
      setState((s) => ({
        ...s,
        weights: { ...s.weights, [id]: clamp(s.weights[id] * 1.25, 0.25, 6) },
      })),
    [],
  );
  const shrink = useCallback(
    (id: DockId) =>
      setState((s) => ({
        ...s,
        weights: { ...s.weights, [id]: clamp(s.weights[id] / 1.25, 0.25, 6) },
      })),
    [],
  );
  const setWeights = useCallback(
    (updates: Partial<Record<DockId, number>>) =>
      setState((s) => {
        const w = { ...s.weights };
        for (const k in updates) {
          const id = k as DockId;
          const v = updates[id];
          if (typeof v === "number") w[id] = clamp(v, 0.25, 6);
        }
        return { ...s, weights: w };
      }),
    [],
  );

  return {
    ...state,
    setRightWidth,
    setPastasSide,
    setPastasWidth,
    openPanel,
    closePanel,
    togglePanel,
    grow,
    shrink,
    setWeights,
  };
}
