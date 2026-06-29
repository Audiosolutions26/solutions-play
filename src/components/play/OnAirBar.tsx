import { useState } from "react";
import { Minus, Plus } from "lucide-react";
import { usePlayer } from "@/hooks/use-player";
import { Waveform } from "./Waveform";

const ZOOM_MIN = 0.5;
const ZOOM_MAX = 6;
const ZOOM_STEP = 0.5;

export function OnAirBar() {
  const { onAir, current } = usePlayer();
  const [zoom, setZoom] = useState<number>(() => {
    if (typeof window === "undefined") return 1;
    const v = Number(window.localStorage.getItem("sp:waveZoom"));
    return Number.isFinite(v) && v > 0 ? Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, v)) : 1;
  });
  const setZoomSafe = (v: number) => {
    const n = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round(v * 10) / 10));
    setZoom(n);
    try { window.localStorage.setItem("sp:waveZoom", String(n)); } catch { /* ignore */ }
  };
  const text = current
    ? `${current.title}${current.artist ? " — " + current.artist : ""}`
    : "Sem áudio no ar";
  return (
    <div className="flex items-stretch border-y border-pl-toolbar-dark bg-[#1b2733]">
      <div
        className={`flex w-28 items-center justify-center text-lg font-extrabold tracking-widest ${
          onAir ? "bg-pl-banner text-white" : "bg-zinc-600 text-white/70"
        }`}
      >
        {onAir ? "NO AR" : "PARADO"}
      </div>
      <div className="relative flex-1 overflow-hidden">
        <div className="absolute inset-0">
          <Waveform zoom={zoom} />
        </div>
        <div className="pointer-events-none absolute inset-0 flex items-center overflow-hidden">
          <span className="pl-marquee whitespace-nowrap px-4 text-sm font-semibold text-pl-wave drop-shadow">
            {text}
          </span>
        </div>
        {/* Controle de zoom (+/-) da visualização da waveform. */}
        <div className="absolute right-1 top-1 z-10 flex items-center gap-1 rounded bg-black/40 px-1 py-0.5 backdrop-blur-sm">
          <button
            onClick={() => setZoomSafe(zoom - ZOOM_STEP)}
            disabled={zoom <= ZOOM_MIN}
            title="Diminuir zoom da waveform"
            className="grid h-5 w-5 place-items-center rounded bg-white/15 text-white hover:bg-white/30 disabled:opacity-30"
          >
            <Minus className="h-3 w-3" />
          </button>
          <button
            onClick={() => setZoomSafe(1)}
            title="Zoom padrão (1x)"
            className="min-w-9 rounded px-1 font-mono text-[10px] font-bold text-white/90 hover:bg-white/20"
          >
            {zoom.toFixed(1)}x
          </button>
          <button
            onClick={() => setZoomSafe(zoom + ZOOM_STEP)}
            disabled={zoom >= ZOOM_MAX}
            title="Aumentar zoom da waveform"
            className="grid h-5 w-5 place-items-center rounded bg-white/15 text-white hover:bg-white/30 disabled:opacity-30"
          >
            <Plus className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  );
}