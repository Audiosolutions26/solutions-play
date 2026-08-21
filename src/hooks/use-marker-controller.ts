import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { usePlayer } from "./use-player";
import { getMarkers, markerPositionSec } from "@/lib/play-markers";
import { resolveTrackAudio } from "@/lib/play-audio-files";
import { deviceForFunction } from "@/lib/play-outputs";
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
    if (!current) {
      idRef.current = null;
      firedRef.current.clear();
      return;
    }
    if (idRef.current !== current.id) {
      idRef.current = current.id;
      firedRef.current = new Set();
    }
    const markers = getMarkers(current.id);
    if (!markers.length) return;
    const engine = getEngine();
    for (const marker of markers) {
      const at = markerPositionSec(marker, current.duration);
      const key = marker.id || `${marker.kind}:${at.toFixed(3)}`;
      if (position < at || firedRef.current.has(key)) continue;
      firedRef.current.add(key);
      switch (marker.kind) {
        case "annotation":
          if (marker.note) {
            toast.info(`📝 ${marker.note}`);
            logEvent("marcador", "Anotação", marker.note);
          }
          break;
        case "introEnd":
          toast.message("Fim da introdução — locutor liberado.");
          logEvent("marcador", "Fim da introdução", current.title);
          break;
        case "locStart":
          toast.message("🎙️ Início de locução.");
          logEvent("locucao", "Início de locução", current.title);
          break;
        case "carimbo": {
          const path = marker.payload?.audioPath;
          if (path) {
            const stamp = {
              ...current,
              id: `${current.id}:carimbo:${marker.id || at}`,
              title: marker.note || "Carimbo",
              audioUrl: /^https?:/i.test(path) ? path : undefined,
              filePath: /^https?:/i.test(path) ? undefined : path,
              kind: "audio" as const,
            };
            void resolveTrackAudio(stamp).then((url) => {
              if (url)
                engine.fireUrl(
                  url,
                  Math.max(1.2, (marker.payload?.fadeMs ?? 0) / 1000 + 0.8),
                  deviceForFunction("quickstart"),
                );
              else engine.fire(current.freq > 0 ? current.freq : 330, 0.5);
            });
          } else {
            engine.fire(current.freq > 0 ? current.freq : 330, 0.5);
          }
          toast.message("Carimbo disparado.");
          logEvent("carimbo", "Carimbo disparado", current.title);
          break;
        }
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
