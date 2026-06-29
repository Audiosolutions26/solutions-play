import { useEffect, useReducer } from "react";
import { subscribeCue, cueCurrentId, cueIsPlaying } from "@/lib/play-cue";

// Estado reativo da pré-escuta (CUE) para indicadores visuais na UI.
export function useCue(): { cueId: string | null; playing: boolean } {
  const [, force] = useReducer((x: number) => x + 1, 0);
  useEffect(() => subscribeCue(force), []);
  return { cueId: cueCurrentId(), playing: cueIsPlaying() };
}
