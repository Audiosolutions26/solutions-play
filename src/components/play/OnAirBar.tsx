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
    try {
      window.localStorage.setItem("sp:waveZoom", String(n));
    } catch {
      /* ignore */
    }
  };
  const title = current?.title || "Nenhum áudio selecionado";
  const artist = current?.artist || (onAir ? "Aguardando programação" : "Sistema parado");
  return (
    <div className="flex h-[66px] items-stretch border-y border-black bg-black">
      <div className="flex w-[116px] shrink-0 flex-col items-center justify-center bg-[#e00000] leading-none text-white">
        <span className="text-[22px] font-black tracking-tight">NO AR</span>
        <span className="mt-1 text-[10px] font-bold uppercase tracking-wider">
          {onAir ? "AO VIVO" : "PAUSADO"}
        </span>
      </div>
      <div className="relative min-w-0 flex-1 overflow-hidden bg-[#050505]">
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex h-6 items-center border-b border-white/10 bg-black/80 px-3">
          <span className="truncate text-[12px] font-extrabold uppercase tracking-wide text-[#f04b4b]">
            {title}
          </span>
          <span className="ml-2 truncate text-[10px] font-semibold uppercase text-[#ff6a2a]">
            {artist}
          </span>
          <span className="ml-auto shrink-0 rounded bg-white/10 px-1.5 py-0.5 font-mono text-[10px] text-white/75">
            {onAir ? "PROGRAM" : "PAUSA"}
          </span>
        </div>
        <div className="absolute inset-x-0 bottom-0 top-6">
          <Waveform zoom={zoom} />
        </div>
        {/* Controle de zoom (+/-) da visualização da waveform. */}
        <div className="absolute right-1 bottom-1 z-10 flex items-center gap-1 rounded bg-[#111]/90 px-1 py-0.5 backdrop-blur-sm">
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
