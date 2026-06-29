import { useEffect, useMemo, useRef, useState } from "react";
import { Bookmark, Save, RotateCcw, Trash2, ZoomIn, ZoomOut, Play } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { fmt, type Track } from "@/lib/play-data";
import {
  MARKER_DEFS, type Marker, type MarkerKind, getMarkers, saveMarkers, pseudoWave,
} from "@/lib/play-markers";
import { usePlayer } from "@/hooks/use-player";

export function MarkersDialog({
  track,
  open,
  onOpenChange,
}: {
  track: Track | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { getEngine } = usePlayer();
  const [markers, setMarkers] = useState<Marker[]>([]);
  const [tool, setTool] = useState<MarkerKind>("startPoint");
  const [zoom, setZoom] = useState(1);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (track && open) {
      setMarkers(getMarkers(track.id));
      setZoom(1);
    }
  }, [track, open]);

  const wave = useMemo(
    () => (track ? pseudoWave(Math.round((track.freq + track.duration) * 7) + 1) : []),
    [track],
  );

  // draw waveform + markers
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !track || !open) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    const w = rect.width;
    const h = rect.height;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#1b2733";
    ctx.fillRect(0, 0, w, h);
    // center
    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.beginPath();
    ctx.moveTo(0, h / 2);
    ctx.lineTo(w, h / 2);
    ctx.stroke();
    // wave
    ctx.fillStyle = "rgba(232,130,30,0.55)";
    const n = wave.length;
    for (let x = 0; x < w; x++) {
      const v = wave[Math.floor((x / w) * n)] ?? 0;
      const bar = v * (h / 2) * 0.92;
      ctx.fillRect(x, h / 2 - bar, 1, bar * 2);
    }
    // markers
    for (const m of markers) {
      const def = MARKER_DEFS.find((d) => d.kind === m.kind);
      if (!def) continue;
      const x = m.pos * w;
      ctx.strokeStyle = def.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
      ctx.fillStyle = def.color;
      ctx.beginPath();
      ctx.moveTo(x - 4, 0);
      ctx.lineTo(x + 4, 0);
      ctx.lineTo(x, 7);
      ctx.closePath();
      ctx.fill();
    }
  }, [markers, wave, track, open, zoom]);

  if (!track) return null;

  const placeMarker = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const def = MARKER_DEFS.find((d) => d.kind === tool)!;
    setMarkers((prev) => {
      let next = prev;
      if (def.single) next = prev.filter((m) => m.kind !== tool);
      const note = tool === "annotation" ? (window.prompt("Texto da anotação:") || "") : undefined;
      return [...next, { kind: tool, pos, note }];
    });
    getEngine().fire(track.freq, 0.12);
  };

  const removeKind = (kind: MarkerKind, pos: number) =>
    setMarkers((prev) => prev.filter((m) => !(m.kind === kind && m.pos === pos)));

  const save = () => {
    saveMarkers(track.id, markers);
    toast.success("Marcadores salvos.");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Bookmark className="h-5 w-5" /> Marcadores — {track.title}
          </DialogTitle>
          <DialogDescription className="text-[12px]">
            {track.artist ? `${track.artist} • ` : ""}duração {fmt(track.duration)}. Selecione uma ferramenta e clique na onda.
          </DialogDescription>
        </DialogHeader>

        {/* toolbar */}
        <div className="flex flex-wrap gap-1">
          {MARKER_DEFS.map((d) => (
            <button
              key={d.kind}
              title={d.help}
              onClick={() => setTool(d.kind)}
              className={cn(
                "flex items-center gap-1 rounded border px-2 py-1 text-[11px] font-medium transition-colors",
                tool === d.kind ? "border-transparent text-white" : "border-pl-panel-dark/40 bg-white/60 text-pl-text hover:bg-muted",
              )}
              style={tool === d.kind ? { backgroundColor: d.color } : undefined}
            >
              <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: d.color }} />
              {d.label}
            </button>
          ))}
        </div>

        {/* waveform */}
        <div className="overflow-x-auto rounded border border-pl-panel-dark/40">
          <canvas
            ref={canvasRef}
            onClick={placeMarker}
            className="block h-40 cursor-crosshair"
            style={{ width: `${100 * zoom}%` }}
          />
        </div>

        {/* zoom + active marker help */}
        <div className="flex items-center justify-between">
          <p className="text-[11px] text-muted-foreground">
            {MARKER_DEFS.find((d) => d.kind === tool)?.help}
          </p>
          <div className="flex items-center gap-1">
            <button onClick={() => setZoom((z) => Math.max(1, z - 0.5))} className="rounded border p-1 hover:bg-muted" title="Menos zoom"><ZoomOut className="h-3.5 w-3.5" /></button>
            <span className="w-10 text-center text-[11px] tabular-nums">{zoom.toFixed(1)}x</span>
            <button onClick={() => setZoom((z) => Math.min(6, z + 0.5))} className="rounded border p-1 hover:bg-muted" title="Mais zoom"><ZoomIn className="h-3.5 w-3.5" /></button>
          </div>
        </div>

        {/* marker list */}
        <div className="max-h-40 overflow-y-auto rounded border border-pl-panel-dark/40">
          {markers.length === 0 ? (
            <p className="p-3 text-[12px] text-muted-foreground">Nenhum marcador. Clique na onda para adicionar.</p>
          ) : (
            <table className="w-full text-[12px]">
              <tbody>
                {markers
                  .slice()
                  .sort((a, b) => a.pos - b.pos)
                  .map((m, i) => {
                    const def = MARKER_DEFS.find((d) => d.kind === m.kind)!;
                    return (
                      <tr key={`${m.kind}-${i}`} className="border-t border-pl-panel-dark/30">
                        <td className="px-2 py-1">
                          <span className="inline-flex items-center gap-1.5">
                            <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: def.color }} />
                            {def.label}
                          </span>
                        </td>
                        <td className="px-2 py-1 font-mono tabular-nums">{fmt(track.duration * m.pos)}</td>
                        <td className="px-2 py-1 text-muted-foreground">{m.note}</td>
                        <td className="px-2 py-1 text-right">
                          <button onClick={() => removeKind(m.kind, m.pos)} className="text-destructive hover:opacity-70"><Trash2 className="h-3.5 w-3.5" /></button>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          )}
        </div>

        <DialogFooter>
          <button onClick={() => getEngine().fire(track.freq, 0.5)} className="mr-auto inline-flex items-center gap-1 rounded border px-3 py-2 text-[12px] font-medium hover:bg-muted">
            <Play className="h-3.5 w-3.5" /> Pré-escuta
          </button>
          <button onClick={() => setMarkers(getMarkers(track.id))} className="inline-flex items-center gap-1 rounded border px-3 py-2 text-[12px] font-medium hover:bg-muted">
            <RotateCcw className="h-3.5 w-3.5" /> Restaurar
          </button>
          <button onClick={save} className="inline-flex items-center gap-1 rounded bg-gradient-to-b from-pl-transport to-pl-transport-dark px-4 py-2 text-[12px] font-semibold text-white hover:brightness-110">
            <Save className="h-3.5 w-3.5" /> Salvar
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
