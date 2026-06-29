import { useEffect } from "react";
import { usePlayer } from "./use-player";

/**
 * Atalhos globais de teclado (manual p.16, 18, 30):
 * Espaço = Tocar/Passar, Delete = Remover a inserção selecionada.
 * Ignora eventos originados em campos de texto editáveis.
 */
export function useKeyboardShortcuts(): void {
  const { togglePlay, selectedId, blocks, removeTrack } = usePlayer();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable)) return;
      if (e.code === "Space") {
        e.preventDefault();
        togglePlay();
      } else if (e.key === "Delete" && selectedId) {
        const block = blocks.find((b) => b.items.some((t) => t.id === selectedId));
        if (block) removeTrack(block.id, selectedId);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [togglePlay, selectedId, blocks, removeTrack]);
}
