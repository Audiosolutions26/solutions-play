import { useEffect } from "react";
import { usePlayer } from "./use-player";

/**
 * Quando a inserção no ar é um texto (e não o "texto do dia"), abre o painel
 * "Textos ao vivo" automaticamente (manual p.36).
 */
export function useLiveTextAutoOpen(onOpen: () => void): void {
  const { current } = usePlayer();
  useEffect(() => {
    if (current && current.category === "texto" && current.kind !== "textodia") onOpen();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id]);
}
