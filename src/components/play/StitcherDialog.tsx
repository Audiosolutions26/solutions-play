import { useEffect, useMemo, useRef, useState } from "react";
import { AudioLines, Play, Square, WandSparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { fmt, type Track } from "@/lib/play-data";
import { cuePlayAt, cueStop } from "@/lib/play-cue";
import { firstMarker, getMarkers, markerPositionSec } from "@/lib/play-markers";

interface TeaserRange {
  start: number;
  end: number;
  source: "hook" | "fallback";
}

function getTeaserRange(track: Track | null): TeaserRange | null {
  if (!track) return null;
  const duration = Math.max(1, track.duration || 0);
  const markers = getMarkers(track.id);
  const start = firstMarker(markers, "refraoStart", duration);
  const end = firstMarker(markers, "refraoEnd", duration);
  if (start && end) {
    return {
      start: markerPositionSec(start, duration),
      end: Math.max(markerPositionSec(start, duration) + 0.25, markerPositionSec(end, duration)),
      source: "hook",
    };
  }
  return { start: 0, end: Math.min(duration, 12), source: "fallback" };
}

function rangeLabel(range: TeaserRange | null) {
  if (!range) return "—";
  return `${fmt(range.start)} → ${fmt(range.end)} (${Math.max(0, range.end - range.start).toFixed(1)}s)`;
}

export function StitcherDialog({
  current,
  next,
  open,
  onOpenChange,
}: {
  current: Track | null;
  next: Track | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [playing, setPlaying] = useState(false);
  const timerRef = useRef<number | null>(null);
  const currentRange = useMemo(() => getTeaserRange(current), [current]);
  const nextRange = useMemo(() => getTeaserRange(next), [next]);
  const hasHook = currentRange?.source === "hook" && nextRange?.source === "hook";

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      cueStop();
    };
  }, []);

  const stopPreview = () => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = null;
    cueStop();
    setPlaying(false);
  };

  const preview = async () => {
    if (!current || !next || !currentRange || !nextRange) {
      toast.info("Selecione uma faixa atual e uma próxima para montar o teaser.");
      return;
    }
    stopPreview();
    setPlaying(true);
    await cuePlayAt(current, currentRange.start, currentRange.end, "manual");
    const firstDuration = Math.max(0.25, currentRange.end - currentRange.start);
    timerRef.current = window.setTimeout(
      () => {
        void cuePlayAt(next, nextRange.start, nextRange.end, "manual");
      },
      firstDuration * 1000 + 180,
    );
    timerRef.current = window.setTimeout(
      () => setPlaying(false),
      (firstDuration + Math.max(0.25, nextRange.end - nextRange.start) + 0.35) * 1000,
    );
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!value) stopPreview();
        onOpenChange(value);
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <WandSparkles className="h-5 w-5 text-fuchsia-500" /> Stitcher — teaser por Hook
          </DialogTitle>
          <DialogDescription className="text-[12px]">
            Montagem de pré-escuta em dois trechos. Quando os Hooks existem, o sistema usa os
            marcadores salvos; sem Hook, usa um fallback curto e identifica a origem.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 rounded border border-pl-panel-dark/50 bg-pl-row p-2">
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-pl-toolbar">
            <AudioLines className="h-4 w-4" /> Roteiro do teaser
          </div>
          <div className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 text-[12px]">
            <span className="min-w-0 truncate font-semibold text-pl-text">
              {current?.title || "Nenhuma faixa no ar"}
            </span>
            <span className="font-mono text-pl-text/70">{rangeLabel(currentRange)}</span>
            <span className="text-[10px] uppercase text-pl-text/55">
              {currentRange?.source === "hook" ? "Hook salvo" : "Fallback"}
            </span>
            <span className="text-right text-[10px] uppercase text-pl-text/55">1º trecho</span>
            <span className="min-w-0 truncate font-semibold text-pl-text">
              {next?.title || "Nenhuma próxima faixa"}
            </span>
            <span className="font-mono text-pl-text/70">{rangeLabel(nextRange)}</span>
            <span className="text-[10px] uppercase text-pl-text/55">
              {nextRange?.source === "hook" ? "Hook salvo" : "Fallback"}
            </span>
            <span className="text-right text-[10px] uppercase text-pl-text/55">2º trecho</span>
          </div>
        </div>

        {!hasHook && current && next && (
          <p className="rounded border border-amber-500/40 bg-amber-500/10 px-2 py-1.5 text-[11px] text-amber-200">
            Para uma montagem editorial precisa, marque Início/Fim do refrão nas duas faixas pelo
            botão de marcador dos decks.
          </p>
        )}

        <DialogFooter>
          <button
            type="button"
            onClick={stopPreview}
            className="inline-flex items-center gap-1 rounded border px-3 py-2 text-[12px] font-medium hover:bg-muted"
          >
            <Square className="h-3.5 w-3.5" /> Parar
          </button>
          <button
            type="button"
            onClick={() => void preview()}
            disabled={playing || !current || !next}
            className="inline-flex items-center gap-1 rounded bg-pl-toolbar px-3 py-2 text-[12px] font-semibold text-white hover:bg-pl-toolbar-light disabled:opacity-40"
          >
            <Play className="h-3.5 w-3.5" /> {playing ? "Reproduzindo…" : "Pré-escutar montagem"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
