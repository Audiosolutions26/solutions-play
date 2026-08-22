import { Headphones, Mic2, Play, Radio, SkipForward, Square, Volume2 } from "lucide-react";
import { usePlayer } from "@/hooks/use-player";
import { fmt } from "@/lib/play-data";

function DeckCard({
  label,
  track,
  blockId,
  accent,
  onPlay,
  onCue,
}: {
  label: string;
  track: { id: string; title: string; artist?: string; duration: number } | null;
  blockId: string | null;
  accent: "cyan" | "amber";
  onPlay: () => void;
  onCue: () => void;
}) {
  const accentClass =
    accent === "cyan" ? "border-cyan-400/60 bg-cyan-950/30" : "border-amber-400/60 bg-amber-950/30";
  return (
    <div className={`rounded border p-2 shadow-inner ${accentClass}`}>
      <div className="mb-2 flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-white/80">
        <span className="flex items-center gap-1">
          <Radio className="h-3 w-3" /> Deck {label}
        </span>
        <span className="rounded bg-black/30 px-1.5 py-0.5 font-mono">
          {blockId ? "READY" : "EMPTY"}
        </span>
      </div>
      <div className="mb-2 h-12 overflow-hidden rounded bg-black/60 px-2 py-1">
        <div className="flex h-full items-end gap-px opacity-80">
          {Array.from({ length: 32 }, (_, index) => (
            <span
              key={index}
              className={`flex-1 rounded-t ${accent === "cyan" ? "bg-cyan-400" : "bg-amber-400"}`}
              style={{ height: `${18 + ((index * 17) % 62)}%` }}
            />
          ))}
        </div>
      </div>
      <div className="min-h-[42px]">
        <div className="truncate text-[12px] font-bold text-white">
          {track?.title || "Nenhuma faixa carregada"}
        </div>
        <div className="truncate text-[10px] text-white/60">
          {track?.artist || "Arraste uma faixa da playlist"}
        </div>
      </div>
      <div className="mt-2 flex items-center justify-between border-t border-white/10 pt-2 text-[10px] text-white/55">
        <span className="font-mono">{track ? fmt(track.duration) : "—"}</span>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={onCue}
            disabled={!track}
            title="Pré-escutar deck"
            className="grid h-6 w-6 place-items-center rounded bg-white/10 hover:bg-white/20 disabled:opacity-30"
          >
            <Headphones className="h-3 w-3" />
          </button>
          <button
            type="button"
            onClick={onPlay}
            disabled={!track}
            title="Carregar/tocar deck"
            className="grid h-6 w-6 place-items-center rounded bg-white/10 hover:bg-white/20 disabled:opacity-30"
          >
            <Play className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  );
}

export function StudioDecksPanel() {
  const { blocks, current, currentBlockId, playAt, setCue, nextManual, stop } = usePlayer();
  const firstBlock = blocks[0];
  const firstTrack = firstBlock?.items[0] ?? null;
  const nextTrack = firstBlock?.items[1] ?? blocks[1]?.items[0] ?? null;
  const nextBlockId = firstBlock?.items[1] ? firstBlock.id : (blocks[1]?.id ?? null);
  const deckA = current ?? firstTrack;
  const deckABlock = current ? currentBlockId : (firstBlock?.id ?? null);

  return (
    <aside className="flex min-w-[210px] max-w-[290px] flex-col border-r border-slate-950 bg-slate-900 p-2 text-white">
      <div className="mb-2 flex items-center justify-between border-b border-white/10 pb-2">
        <div>
          <div className="text-[11px] font-black uppercase tracking-widest text-white">
            Studio decks
          </div>
          <div className="text-[9px] text-white/50">A/B · SOHO workflow</div>
        </div>
        <Volume2 className="h-4 w-4 text-emerald-300" />
      </div>
      <div className="space-y-2">
        <DeckCard
          label="A · NO AR"
          track={deckA}
          blockId={deckABlock}
          accent="cyan"
          onCue={() => setCue(true)}
          onPlay={() => {
            if (deckABlock && deckA) playAt(deckABlock, deckA.id);
          }}
        />
        <DeckCard
          label="B · PRÓXIMA"
          track={nextTrack}
          blockId={nextBlockId}
          accent="amber"
          onCue={() => setCue(true)}
          onPlay={nextManual}
        />
      </div>
      <div className="mt-2 grid grid-cols-3 gap-1 border-t border-white/10 pt-2">
        <button
          type="button"
          onClick={nextManual}
          className="flex flex-col items-center gap-1 rounded bg-emerald-600/80 py-1.5 text-[9px] font-bold hover:bg-emerald-500"
        >
          <SkipForward className="h-3.5 w-3.5" /> NEXT
        </button>
        <button
          type="button"
          onClick={() => setCue(true)}
          className="flex flex-col items-center gap-1 rounded bg-indigo-600/80 py-1.5 text-[9px] font-bold hover:bg-indigo-500"
        >
          <Mic2 className="h-3.5 w-3.5" /> CUE
        </button>
        <button
          type="button"
          onClick={stop}
          className="flex flex-col items-center gap-1 rounded bg-red-600/80 py-1.5 text-[9px] font-bold hover:bg-red-500"
        >
          <Square className="h-3.5 w-3.5" /> STOP
        </button>
      </div>
      <div className="mt-auto rounded border border-white/10 bg-black/20 p-2 text-[10px] text-white/60">
        <div className="mb-1 font-bold uppercase tracking-wider text-white/80">Operação</div>
        <div className="flex justify-between">
          <span>Modo</span>
          <span className="font-mono text-emerald-300">AUTO</span>
        </div>
        <div className="flex justify-between">
          <span>Mix</span>
          <span className="font-mono text-amber-300">EQUAL POWER</span>
        </div>
        <div className="flex justify-between">
          <span>Ganho</span>
          <span className="font-mono text-cyan-300">ORIGINAL</span>
        </div>
      </div>
    </aside>
  );
}
