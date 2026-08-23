import { useState, useEffect, useCallback, useRef } from "react";
import { getMarkers, saveMarkers, type Marker } from "@/lib/play-markers";

export function useTrackMarkers(trackId: string | undefined) {
  const [markers, setMarkersState] = useState<Marker[]>(() => 
    trackId ? getMarkers(trackId) : []
  );
  
  // Undo/Redo state
  const [history, setHistory] = useState<Marker[][]>([trackId ? getMarkers(trackId) : []]);
  const [index, setIndex] = useState(0);
  const historyRef = useRef<Marker[][]>([trackId ? getMarkers(trackId) : []]);
  const indexRef = useRef(0);

  const refresh = useCallback(() => {
    if (trackId) {
      const ms = getMarkers(trackId);
      setMarkersState(ms);
      historyRef.current = [ms];
      indexRef.current = 0;
      setHistory([ms]);
      setIndex(0);
    } else {
      setMarkersState([]);
      historyRef.current = [[]];
      indexRef.current = 0;
      setHistory([[]]);
      setIndex(0);
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
    const handleUpdate = () => refresh();
    window.addEventListener("sp:markers-updated", handleUpdate);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("sp:markers-updated", handleUpdate);
    };
  }, [refresh, trackId]);

  const setMarkers = useCallback((newMarkers: Marker[], isUndoRedo = false) => {
    if (trackId) {
      saveMarkers(trackId, newMarkers);
      setMarkersState(newMarkers);
      
      if (!isUndoRedo) {
        const newHistory = historyRef.current.slice(0, indexRef.current + 1);
        newHistory.push(newMarkers);
        historyRef.current = newHistory;
        indexRef.current = newHistory.length - 1;
        setHistory(newHistory);
        setIndex(newHistory.length - 1);
      }
      
      window.dispatchEvent(new CustomEvent("sp:markers-updated"));
    }
  }, [trackId]);

  const undo = useCallback(() => {
    if (indexRef.current > 0) {
      indexRef.current -= 1;
      setIndex(indexRef.current);
      setMarkers(historyRef.current[indexRef.current], true);
    }
  }, [setMarkers]);

  const redo = useCallback(() => {
    if (indexRef.current < historyRef.current.length - 1) {
      indexRef.current += 1;
      setIndex(indexRef.current);
      setMarkers(historyRef.current[indexRef.current], true);
    }
  }, [setMarkers]);

  const updateMarkerPosition = useCallback((markerId: string, newSec: number) => {
    if (!trackId) return;
    const currentMarkers = getMarkers(trackId);
    const updated = currentMarkers.map(m => 
      m.id === markerId ? { ...m, positionSec: newSec, pos: 0 } : m
    );
    setMarkers(updated);
  }, [trackId, setMarkers]);

  return { markers, setMarkers, updateMarkerPosition, refresh, undo, redo, canUndo: index > 0, canRedo: index < history.length - 1 };
}
