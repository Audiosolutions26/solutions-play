import { useEffect, useMemo, useRef, useState } from "react";
import { Bookmark, Save, RotateCcw, Trash2, ZoomIn, ZoomOut, Play, Lock, Unlock, Pencil, Copy } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { fmt, type Track } from "@/lib/play-data";
import {
  MARKER_DEFS, type Marker, type MarkerKind, getMarkers, saveMarkers, pseudoWave, applyMarkersToTracks,
} from "@/lib/play-markers";
import { usePlayer } from "@/hooks/use-player";

const HIT = 0.012; // tolerância (fração) para pegar um marcador ao clicar

export function MarkersDialog({
  track,
  open,
  onOpenChange,
}: {
  track: Track | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { getEngine, blocks } = usePlayer();
  const [markers, setMarkers] = useState<Marker[]>([]);
  const [tool, setTool] = useState<MarkerKind>("startPoint");
  const [zoom, setZoom] = useState(1);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
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

  const block = track ? blocks.find((b) => b.items.some((t) => t.id === track.id)) : undefined;

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
    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.beginPath();
    ctx.moveTo(0, h / 2);
    ctx.lineTo(w, h / 2);
    ctx.stroke();
    ctx.fillStyle = "rgba(232,130,30,0.55)";
    const n = wave.length;
    for (let x = 0; x < w; x++) {
      const v = wave[Math.floor((x / w) * n)] ?? 0;
      const bar = v * (h / 2) * 0.92;
      ctx.fillRect(x, h / 2 - bar, 1, bar * 2);
    }
    for (const m of markers) {
      const def = MARKER_DEFS.find((d) => d.kind === m.kind);
      if (!def) continue;
      const x = m.pos * w;
      ctx.strokeStyle = def.color;
      ctx.lineWidth = m.locked ? 3 : 2;
      ctx.setLineDash(m.locked ? [4, 3] : []);
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
      ctx.setLineDash([]);
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

  const posFromEvent = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
  };

  const findNear = (pos: number): number => {
    let best = -1, bestD = HIT;
    markers.forEach((m, i) => {
      const d = Math.abs(m.pos - pos);
      if (d < bestD) { bestD = d; best = i; }
    });
    return best;
  };

  const onMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = posFromEvent(e);
    const near = findNear(pos);
    if (near >= 0 && !markers[near].locked) {
      setDragIdx(near); // arrastar marcador existente (editar posição)
      return;
    }
    if (near >= 0 && markers[near].locked) {
      toast.info("Marcador travado — destrave para mover.");
      return;
    }
    // criar novo marcador
    const def = MARKER_DEFS.find((d) => d.kind === tool)!;
    setMarkers((prev) => {
      let next = prev;
      if (def.single) next = prev.filter((m) => m.kind !== tool || m.locked);
      const note = tool === "annotation" ? (window.prompt("Texto da anotação:") || "") : undefined;
      return [...next, { kind: tool, pos, note }];
    });
    getEngine().fire(track.freq > 0 ? track.freq : 330, 0.12);
  };

  const onMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (dragIdx == null) return;
    const pos = posFromEvent(e);
    setMarkers((prev) => prev.map((m, i) => (i === dragIdx ? { ...m, pos } : m)));
  };

  const endDrag = () => setDragIdx(null);

  const toggleLock = (idx: number) =>
    setMarkers((prev) => prev.map((m, i) => (i === idx ? { ...m, locked: !m.locked } : m)));

  const editNote = (idx: number) => {
    const note = window.prompt("Nota do marcador:", markers[idx].note || "") ?? markers[idx].note;
    setMarkers((prev) => prev.map((m, i) => (i === idx ? { ...m, note } : m)));
  };

  const removeAt = (idx: number) => {
    if (markers[idx].locked) { toast.info("Marcador travado — destrave para remover."); return; }
    setMarkers((prev) => prev.filter((_, i) => i !== idx));
  };

  const lockAll = () => setMarkers((prev) => prev.map((m) => ({ ...m, locked: true })));

  const applyToBlock = () => {
    if (!block) { toast.error("Bloco não encontrado."); return; }
    const others = block.items.filter((t) => t.id !== track.id).map((t) => t.id);
    if (!others.length) { toast.info("O bloco não tem outras inserções."); return; }
    saveMarkers(track.id, markers);
    applyMarkersToTracks(markers, others);
    toast.success(`Marcadores aplicados a ${others.length} inserção(ões) do bloco.`);
  };

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
            {track.artist ? `${track.artist} • ` : ""}duração {fmt(track.duration)}. Clique para criar; arraste um marcador para reposicionar; trave para fixar.
          </DialogDescription>
        </DialogHeader>

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

        <div className="overflow-x-auto rounded border border-pl-panel-dark/40">
          <canvas
            ref={canvasRef}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={endDrag}
            onMouseLeave={endDrag}
            className="block h-40 cursor-crosshair"
            style={{ width: `${100 * zoom}%` }}
          />
        </div>

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

        <div className="max-h-40 overflow-y-auto rounded border border-pl-panel-dark/40">
          {markers.length === 0 ? (
            <p className="p-3 text-[12px] text-muted-foreground">Nenhum marcador. Clique na onda para adicionar.</p>
          ) : (
            <table className="w-full text-[12px]">
              <tbody>
                {markers
                  .map((m, i) => ({ m, i }))
                  .sort((a, b) => a.m.pos - b.m.pos)
                  .map(({ m, i }) => {
                    const def = MARKER_DEFS.find((d) => d.kind === m.kind)!;
                    return (
                      <tr key={`${m.kind}-${i}`} className="border-t border-pl-panel-dark/30">
                        <td className="px-2 py-1">
                          <span className="inline-flex items-center gap-1.5">
                            <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: def.color }} />
                            {def.label}{m.locked && <Lock className="h-3 w-3 text-amber-500" />}
                          </span>
                        </td>
                        <td className="px-2 py-1 font-mono tabular-nums">{fmt(track.duration * m.pos)}</td>
                        <td className="px-2 py-1 text-muted-foreground">{m.note}</td>
                        <td className="px-2 py-1">
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => editNote(i)} title="Editar nota" className="text-muted-foreground hover:text-pl-text"><Pencil className="h-3.5 w-3.5" /></button>
                            <button onClick={() => toggleLock(i)} title={m.locked ? "Destravar" : "Travar"} className="text-amber-500 hover:opacity-70">
                              {m.locked ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
                            </button>
                            <button onClick={() => removeAt(i)} title="Remover" className="text-destructive hover:opacity-70"><Trash2 className="h-3.5 w-3.5" /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          )}
        </div>

        <DialogFooter className="flex-wrap gap-1">
          <button onClick={() => getEngine().fire(track.freq > 0 ? track.freq : 330, 0.5)} className="mr-auto inline-flex items-center gap-1 rounded border px-3 py-2 text-[12px] font-medium hover:bg-muted">
            <Play className="h-3.5 w-3.5" /> Pré-escuta
          </button>
          <button onClick={lockAll} className="inline-flex items-center gap-1 rounded border px-3 py-2 text-[12px] font-medium hover:bg-muted">
            <Lock className="h-3.5 w-3.5" /> Travar todos
          </button>
          <button onClick={applyToBlock} className="inline-flex items-center gap-1 rounded border px-3 py-2 text-[12px] font-medium hover:bg-muted">
            <Copy className="h-3.5 w-3.5" /> Aplicar ao bloco
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
