import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  Bookmark,
  Download,
  Headphones,
  Mic2,
  Play,
  Radio,
  SkipForward,
  Square,
  Volume2,
} from "lucide-react";
import { toast } from "sonner";
import { usePlayer } from "@/hooks/use-player";
import { fmt, type Track } from "@/lib/play-data";
import { getTrackAudioUrl, resolveTrackAudio } from "@/lib/play-audio-files";
import { MARKER_DEFS, markerPositionSec, pseudoWave } from "@/lib/play-markers";
import { analyzeWaveform, type WaveformPeaks } from "@/lib/play-waveform";
import { MarkersDialog } from "./MarkersDialog";
import { StitcherDialog } from "./StitcherDialog";
import { VoiceTrackingDialog } from "./VoiceTrackingDialog";
import { useTrackMarkers } from "@/hooks/use-track-markers";

function formatTime(value: number): string {
  return Number.isFinite(value) && value > 0 ? fmt(Math.round(value)) : "00:00";
}

function drawEnvelope(
  ctx: CanvasRenderingContext2D,
  left: Float32Array | undefined,
  right: Float32Array | undefined,
  fallback: number[],
  w: number,
  h: number,
  fill: string,
) {
  const mid = h / 2;
  const half = Math.max(4, h * 0.43);
  const count = left?.length || fallback.length;
  const sample = (index: number, channel: "left" | "right") => {
    if (channel === "left" && left) return left[index] ?? 0;
    if (channel === "right" && right) return right[index] ?? left?.[index] ?? 0;
    return fallback[index] ?? 0;
  };

  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.moveTo(0, mid);
  for (let x = 0; x <= w; x += 1) {
    const idx = Math.min(count - 1, Math.floor((x / Math.max(1, w)) * count));
    ctx.lineTo(x, mid - sample(idx, "left") * half);
  }
  ctx.lineTo(w, mid);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(0, mid);
  for (let x = 0; x <= w; x += 1) {
    const idx = Math.min(count - 1, Math.floor((x / Math.max(1, w)) * count));
    ctx.lineTo(x, mid + sample(idx, "right") * half);
  }
  ctx.lineTo(w, mid);
  ctx.closePath();
  ctx.fill();
}

function DeckWaveform({
  track,
  position,
  isActive,
  accent,
}: {
  track: Track | null;
  position: number;
  isActive: boolean;
  accent: "blue" | "orange";
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [waveform, setWaveform] = useState<WaveformPeaks | null>(null);
  const fallbackWave = useMemo(
    () => (track ? pseudoWave(Math.round((track.freq + track.duration) * 7) + 1, 1800) : []),
    [track],
  );
  const { markers } = useTrackMarkers(track?.id);
  const durationSec = waveform?.durationSec || track?.duration || 1;

  useEffect(() => {
    let cancelled = false;
    setWaveform(null);
    if (!track)
      return () => {
        cancelled = true;
      };
    const url = getTrackAudioUrl(track.id) || track.audioUrl;
    void (url ? Promise.resolve(url) : resolveTrackAudio(track))
      .then((resolved) => (resolved && !cancelled ? analyzeWaveform(resolved, 1800) : null))
      .then((peaks) => {
        if (!cancelled && peaks) setWaveform(peaks);
      });
    return () => {
      cancelled = true;
    };
  }, [track]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const w = rect.width;
    const h = rect.height;
    const progress = isActive ? Math.max(0, Math.min(1, position / durationSec)) : 0;
    const baseWave = accent === "blue" ? "rgba(128, 157, 173, 0.48)" : "rgba(166, 125, 73, 0.5)";
    const activeWave =
      accent === "blue" ? "rgba(205, 231, 244, 0.92)" : "rgba(247, 193, 105, 0.95)";
    const left = waveform?.left;
    const right = waveform?.right ?? left;

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#070b0f";
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = "rgba(206, 225, 235, 0.1)";
    ctx.lineWidth = 1;
    for (let tick = 0; tick <= 4; tick += 1) {
      const x = (w * tick) / 4;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    ctx.strokeStyle = "rgba(255,255,255,0.18)";
    ctx.beginPath();
    ctx.moveTo(0, h / 2);
    ctx.lineTo(w, h / 2);
    ctx.stroke();

    drawEnvelope(ctx, left, right, fallbackWave, w, h, baseWave);
    if (progress > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, w * progress, h);
      ctx.clip();
      drawEnvelope(ctx, left, right, fallbackWave, w, h, activeWave);
      ctx.restore();
    }

    for (const marker of markers) {
      const sec = markerPositionSec(marker, durationSec);
      const x = (sec / durationSec) * w;
      const def = MARKER_DEFS.find((item) => item.kind === marker.kind);
      if (!def) continue;
      ctx.save();
      ctx.strokeStyle = def.color;
      ctx.lineWidth = marker.locked ? 2 : 1;
      ctx.setLineDash(marker.locked ? [3, 2] : [2, 2]);
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = def.color;
      ctx.beginPath();
      ctx.moveTo(x - 4, 0);
      ctx.lineTo(x + 4, 0);
      ctx.lineTo(x, 6);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    if (isActive) {
      const cursorX = w * progress;
      ctx.strokeStyle = "#f6f8fa";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(cursorX, 0);
      ctx.lineTo(cursorX, h);
      ctx.stroke();
      ctx.fillStyle = "#f6f8fa";
      ctx.beginPath();
      ctx.moveTo(cursorX - 4, h - 6);
      ctx.lineTo(cursorX + 4, h - 6);
      ctx.lineTo(cursorX, h);
      ctx.closePath();
      ctx.fill();
    }

    ctx.fillStyle = "rgba(218, 231, 238, 0.55)";
    ctx.font = "9px ui-monospace, SFMono-Regular, Menlo, monospace";
    ctx.textAlign = "left";
    ctx.fillText("00:00", 4, h - 3);
    ctx.textAlign = "right";
    ctx.fillText(formatTime(durationSec), w - 4, h - 3);
  }, [accent, durationSec, fallbackWave, isActive, markers, position, waveform]);

  return (
    <div className="relative h-[66px] overflow-hidden rounded border border-white/10 bg-[#070b0f]">
      <canvas ref={canvasRef} className="block h-full w-full" aria-label="Waveform da faixa" />
      {!waveform && track?.audioUrl && (
        <span className="pointer-events-none absolute left-2 top-1 rounded bg-black/50 px-1 text-[8px] uppercase tracking-wider text-white/60">
          analisando áudio
        </span>
      )}
    </div>
  );
}

function DeckCard({
  label,
  track,
  blockId,
  accent,
  position,
  isActive,
  onPlay,
  onCue,
  onMarkers,
  onExport,
}: {
  label: string;
  track: Track | null;
  blockId: string | null;
  accent: "blue" | "orange";
  position: number;
  isActive: boolean;
  onPlay: () => void;
  onCue: () => void;
  onMarkers: () => void;
  onExport: () => void;
}) {
  const accentClass =
    accent === "blue" ? "border-[#3d6e8f] bg-[#121b23]" : "border-[#9b5c1e] bg-[#1e1711]";
  const buttonClass =
    "grid h-6 w-6 place-items-center rounded bg-[#243543] text-[#9fc2d8] transition-colors hover:bg-[#314b5d] disabled:opacity-30";
  const duration = track?.duration || 0;
  const elapsed = isActive ? Math.min(position, duration || position) : 0;

  return (
    <div
      className={`h-[140px] min-w-0 flex-1 overflow-hidden rounded border p-2 shadow-[0_1px_5px_rgba(0,0,0,.35)] ${accentClass}`}
    >
      <div className="mb-1 flex items-start justify-between gap-2 text-[10px] font-bold uppercase tracking-widest text-[#c8d9e5]">
        <span className="flex min-w-0 items-center gap-1 truncate">
          <Radio className="h-3 w-3 shrink-0" /> {label}
        </span>
        <div className="flex shrink-0 items-center gap-2">
          <span className="font-mono text-[13px] font-black tracking-tight text-[#6ee77b]">
            {track ? formatTime(elapsed) : "--:--"}
          </span>
          <span className="rounded bg-[#243543] px-1.5 py-0.5 font-mono text-[9px] text-[#9fc2d8]">
            {blockId ? "READY" : "EMPTY"}
          </span>
        </div>
      </div>
      <DeckWaveform track={track} position={position} isActive={isActive} accent={accent} />
      {track && markers.length > 0 && (
        <div className="absolute top-10 right-3 flex gap-1 pointer-events-none">
          {markers.slice(0, 3).map((m, i) => (
            <span key={i} className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: MARKER_DEFS.find(d => d.kind === m.kind)?.color || '#fff' }} />
          ))}
        </div>
      )}
      <div className="mt-1 flex min-h-[25px] items-center justify-between gap-2 border-t border-[#2a3d4a] pt-1 text-[10px] text-[#91a7b5]">
        <div className="min-w-0">
          <div className="truncate text-[11px] font-bold text-[#e7f0f5]">
            {track?.title || "Nenhuma faixa carregada"}
          </div>
          <div className="truncate text-[9px] text-[#91a7b5]">
            {track?.artist || "Arraste uma faixa da playlist"}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <span className="font-mono text-[9px] text-[#a5bac6]">{track ? fmt(duration) : "—"}</span>
          <button
            type="button"
            onClick={onCue}
            disabled={!track}
            title="Pré-escutar deck"
            className={buttonClass}
          >
            <Headphones className="h-3 w-3" />
          </button>
          <button
            type="button"
            onClick={onMarkers}
            disabled={!track}
            title="Editar marcadores da faixa"
            className={buttonClass}
          >
            <Bookmark className="h-3 w-3" />
          </button>
          <button
            type="button"
            onClick={onExport}
            disabled={!track}
            title="Exportar marcadores (.mrk)"
            className={buttonClass}
          >
            <Download className="h-3 w-3" />
          </button>
          <button
            type="button"
            onClick={onPlay}
            disabled={!track}
            title="Carregar/tocar deck"
            className={buttonClass}
          >
            <Play className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  );
}

export function StudioDecksPanel() {
  const {
    blocks,
    current,
    currentBlockId,
    isPlaying,
    position,
    mode,
    playAt,
    setCue,
    nextManual,
    stop,
    exportCurrentMarkers,
  } = usePlayer();
  const [markerTrack, setMarkerTrack] = useState<Track | null>(null);
  const [stitcherOpen, setStitcherOpen] = useState(false);
  const [voiceTrackingOpen, setVoiceTrackingOpen] = useState(false);
  
  // Resolve a lógica de Deck A (No Ar) e Deck B (Próxima) dinamicamente
  const { deckA, deckB, deckABlock, deckBBlock } = useMemo(() => {
    let dA = current;
    let dAB = currentBlockId;
    let dB: Track | null = null;
    let dBB: string | null = null;

    if (!dA) {
      const firstBlock = blocks.find(b => b.items.length > 0);
      dA = firstBlock?.items[0] ?? null;
      dAB = firstBlock?.id ?? null;
      dB = firstBlock?.items[1] ?? blocks.find(b => b.id !== firstBlock?.id && b.items.length > 0)?.items[0] ?? null;
      dBB = firstBlock?.items[1] ? firstBlock.id : (blocks.find(b => b.id !== firstBlock?.id && b.items.length > 0)?.id ?? null);
    } else {
      // Procura a próxima faixa após current
      const bIndex = blocks.findIndex(b => b.id === dAB);
      if (bIndex >= 0) {
        const tIndex = blocks[bIndex].items.findIndex(t => t.id === dA?.id);
        if (tIndex >= 0 && tIndex < blocks[bIndex].items.length - 1) {
          dB = blocks[bIndex].items[tIndex + 1];
          dBB = blocks[bIndex].id;
        } else {
          const nextB = blocks.slice(bIndex + 1).find(b => b.items.length > 0);
          dB = nextB?.items[0] ?? null;
          dBB = nextB?.id ?? null;
        }
      }
    }

    return { deckA: dA, deckB: dB, deckABlock: dAB, deckBBlock: dBB };
  }, [blocks, current, currentBlockId]);

  return (
    <aside className="flex h-[164px] max-h-[164px] w-full shrink-0 items-stretch gap-2 overflow-hidden border-b border-[#304858] bg-[#0f1820] p-2 text-[#dce6ed]">
      <div className="flex w-[150px] shrink-0 flex-col justify-center border-r border-[#2a4051] pr-2">
        <div>
          <div className="text-[11px] font-black uppercase tracking-widest text-[#dbe8f0]">
            Studio decks
          </div>
          <div className="text-[9px] text-[#7893a6]">A/B · Solutions Play waveform</div>
        </div>
        <Volume2 className="h-4 w-4 text-[#4eaa64]" />
        <div className="mt-1 flex gap-1">
          <button
            type="button"
            onClick={() => setStitcherOpen(true)}
            disabled={!deckA || !deckB}
            className="inline-flex flex-1 items-center justify-center rounded border border-fuchsia-500/40 bg-fuchsia-500/10 px-1 py-1 text-[8px] font-bold uppercase tracking-wider text-fuchsia-200 transition-colors hover:bg-fuchsia-500/20 disabled:opacity-30"
            title="Montar teaser pelos Hooks"
          >
            STITCHER
          </button>
          <button
            type="button"
            onClick={() => setVoiceTrackingOpen(true)}
            disabled={!deckA}
            className="inline-flex flex-1 items-center justify-center rounded border border-red-500/40 bg-red-500/10 px-1 py-1 text-[8px] font-bold uppercase tracking-wider text-red-200 transition-colors hover:bg-red-500/20 disabled:opacity-30"
            title="Gravar Voice Tracking"
          >
            VOICE
          </button>
        </div>
      </div>
      <div className="flex h-[140px] min-w-0 flex-1 gap-2">
        <DeckCard
          label="Deck A · NO AR"
          track={deckA}
          blockId={deckABlock}
          accent="blue"
          position={position}
          isActive={Boolean(isPlaying && current?.id === deckA?.id)}
          onCue={() => setCue(true)}
          onMarkers={() => setMarkerTrack(deckA)}
          onExport={exportCurrentMarkers}
          onPlay={() => {
            if (deckABlock && deckA) playAt(deckABlock, deckA.id);
          }}
        />
        <DeckCard
          label="Deck B · PRÓXIMA"
          track={deckB}
          blockId={deckBBlock}
          accent="orange"
          position={0}
          isActive={false}
          onCue={() => setCue(true)}
          onMarkers={() => setMarkerTrack(deckB)}
          onExport={() => {
            if (deckB) {
              // Função local para exportar deck B se necessário, 
              // ou apenas usar a exportCurrentMarkers se o player suportasse múltiplas instâncias.
              // Por enquanto, o player é centralizado no 'current'.
              toast.info("Exportação disponível apenas para o Deck A (No Ar)");
            }
          }}
          onPlay={nextManual}
        />
      </div>
      <div className="flex w-[150px] shrink-0 flex-col justify-center gap-1 border-l border-[#2a4051] pl-2">
        <button
          type="button"
          onClick={nextManual}
          className="flex flex-col items-center gap-1 rounded bg-[#2e9c58] py-1.5 text-[9px] font-bold text-white transition-colors hover:bg-[#237a43]"
        >
          <SkipForward className="h-3.5 w-3.5" /> NEXT
        </button>
        <button
          type="button"
          onClick={() => setCue(true)}
          className="flex flex-col items-center gap-1 rounded bg-[#526fb0] py-1.5 text-[9px] font-bold text-white transition-colors hover:bg-[#405a93]"
        >
          <Mic2 className="h-3.5 w-3.5" /> CUE
        </button>
        <button
          type="button"
          onClick={stop}
          className="flex flex-col items-center gap-1 rounded bg-[#cc4242] py-1.5 text-[9px] font-bold text-white transition-colors hover:bg-[#a93232]"
        >
          <Square className="h-3.5 w-3.5" /> STOP
        </button>
      </div>
      <div className="flex w-[160px] shrink-0 flex-col justify-center rounded border border-[#2a4051] bg-[#18242e] p-2 text-[10px] text-[#8ea6b5]">
        <div className="mb-1 font-bold uppercase tracking-wider text-[#c7d9e5]">Operação</div>
        <div className="flex justify-between">
          <span>Modo</span>
          <span className="font-mono text-[#4eaa64]">{mode}</span>
        </div>
        <div className="flex justify-between">
          <span>Mix</span>
          <span className="font-mono text-[#e6a644]">EQUAL POWER</span>
        </div>
        <div className="flex justify-between">
          <span>Ganho</span>
          <span className="font-mono text-[#6fb4d8]">ORIGINAL</span>
        </div>
      </div>
      <MarkersDialog
        track={markerTrack}
        open={Boolean(markerTrack)}
        onOpenChange={(open) => {
          if (!open) setMarkerTrack(null);
        }}
      />
      <StitcherDialog
        current={deckA}
        next={deckB}
        open={stitcherOpen}
        onOpenChange={setStitcherOpen}
      />
      <VoiceTrackingDialog
        track={deckA}
        open={voiceTrackingOpen}
        onOpenChange={setVoiceTrackingOpen}
      />
    </aside>
  );
}
