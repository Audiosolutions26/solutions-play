import { useEffect } from "react";
import { usePlayer } from "./use-player";
import { logEvent } from "@/lib/play-events";

/** Registra no log de status cada inserção que entra no ar (manual p.113). */
export function useProgramLogger(): void {
  const { current } = usePlayer();
  useEffect(() => {
    if (current) logEvent("programa", `No ar: ${current.title}`, current.artist);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id]);
}
