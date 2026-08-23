import { useState, useEffect, useCallback } from "react";
import { getMarkers, saveMarkers, type Marker } from "./play-markers";

/**
 * Hook reativo para acessar e modificar os marcadores de uma faixa.
 * Sincroniza via localStorage (storage event) para que várias janelas/painéis
 * vejam as mudanças em tempo real.
 */
export function useTrackMarkers(trackId: string | undefined) {
  const [markers, setMarkersState] = useState<Marker[]>(() => 
    trackId ? getMarkers(trackId) : []
  );

  const refresh = useCallback(() => {
    if (trackId) {
      setMarkersState(getMarkers(trackId));
    } else {
      setMarkersState([]);
    }
  }, [trackId]);

  useEffect(() => {
    refresh();

    const handleStorage = (e: StorageEvent) => {
      if (e.key === "solutions-play-markers") {
        refresh();
      }
    };

    window.addEventListener("storage", handleStorage);
    
    // Custom event para mudanças na mesma aba
    const handleUpdate = () => refresh();
    window.addEventListener("sp:markers-updated", handleUpdate);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("sp:markers-updated", handleUpdate);
    };
  }, [refresh, trackId]);

  const setMarkers = useCallback((newMarkers: Marker[]) => {
    if (trackId) {
      saveMarkers(trackId, newMarkers);
      setMarkersState(newMarkers);
      // Dispara evento para outras partes da mesma aba
      window.dispatchEvent(new CustomEvent("sp:markers-updated"));
    }
  }, [trackId]);

  return { markers, setMarkers, refresh };
}
