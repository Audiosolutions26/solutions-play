import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import {
  loadShortcuts, saveShortcuts, typeMeta, type Shortcut,
} from "@/lib/play-shortcuts";

interface ShortcutsCtx {
  shortcuts: Shortcut[];
  add: (s: Shortcut) => void;
  update: (id: string, patch: Partial<Shortcut>) => void;
  remove: (id: string) => void;
}

const Ctx = createContext<ShortcutsCtx | null>(null);

export function ShortcutsProvider({ children }: { children: ReactNode }) {
  const [shortcuts, setShortcuts] = useState<Shortcut[]>(() => loadShortcuts());

  const value = useMemo<ShortcutsCtx>(() => ({
    shortcuts,
    add: (s) => setShortcuts((l) => { const n = [...l, s]; saveShortcuts(n); return n; }),
    update: (id, patch) => setShortcuts((l) => {
      const n = l.map((x) => {
        if (x.id !== id) return x;
        const merged = { ...x, ...patch };
        // Mantém a categoria coerente com o Tipo escolhido.
        if (patch.type) merged.category = typeMeta(patch.type).category;
        return merged;
      });
      saveShortcuts(n);
      return n;
    }),
    remove: (id) => setShortcuts((l) => { const n = l.filter((x) => x.id !== id); saveShortcuts(n); return n; }),
  }), [shortcuts]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useShortcuts() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useShortcuts must be used within ShortcutsProvider");
  return ctx;
}
