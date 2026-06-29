import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { usePlayer } from "./use-player";
import { getMarkers } from "@/lib/play-markers";
import { logEvent } from "@/lib/play-events";

/**
 * Marcadores em execução (manual p.113-119): dispara o evento de cada marcador
 * no momento exato em que a posição do áudio cruza a marca (anotação, fim da
 * introdução, início de locução, carimbo/hora certa, fade-out e entrada do
 * próximo). Mantém estado interno para não disparar o mesmo marcador duas vezes
 * e para restaurar o volume após um fade-out interrompido por troca de faixa.
 */
export function useMarkerController(): void {
  const { current, position, getEngine, next } = usePlayer();
  const idRef = useRef<string | null>(null);
  const firedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!current) { idRef.current = null; firedRef.current.clear(); return; }
    if (idRef.current !== current.id) {
      idRef.current = current.id;
      firedRef.current = new Set();
    }
    const markers = getMarkers(current.id);
    if (!markers.length) return;
    const engine = getEngine();
    for (const marker of markers) {
      const at = marker.pos * current.duration;
      const key = `${marker.kind}:${marker.pos}`;
      if (position < at || firedRef.current.has(key)) continue;
      firedRef.current.add(key);
      switch (marker.kind) {
        case "annotation":
          if (marker.note) { toast.info(`📝 ${marker.note}`); logEvent("marcador", "Anotação", marker.note); }
          break;
        case "introEnd":
          toast.message("Fim da introdução — locutor liberado.");
          logEvent("marcador", "Fim da introdução", current.title);
          break;
        case "locStart":
          toast.message("🎙️ Início de locução.");
          logEvent("locucao", "Início de locução", current.title);
          break;
        case "carimbo":
          engine.fire(current.freq > 0 ? current.freq : 330, 0.5);
          toast.message("Carimbo (Hora Certa) disparado.");
          logEvent("carimbo", "Carimbo disparado", current.title);
          break;
        case "fadeOutStart": {
          // Fade-out automático no nível da própria inserção (não há volume
          // base do usuário). A próxima faixa entra com ganho 1.0 (original).
          const remaining = Math.max(0.4, current.duration - at);
          engine.fadeOutCurrent(remaining);
          logEvent("marcador", "Início do Fade-Out", current.title);
          break;
        }
        case "nextEntry":
          logEvent("marcador", "Entrada do próximo", current.title);
          next();
          break;
        default:
          break;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id, position]);
}
