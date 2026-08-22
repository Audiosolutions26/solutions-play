import { Headphones, Mic2, Play, Radio, SkipForward, Square, Volume2 } from "lucide-react";
import { usePlayer } from "@/hooks/use-player";
import { fmt } from "@/lib/play-data";

type DeckTrack = { id: string; title: string; artist?: string; duration: number } | null;

function DeckCard({
  label,
  track,
  blockId,
  accent,
  onPlay,
  onCue,
}: {
  label: string;
  track: DeckTrack;
  blockId: string | null;
  accent: "blue" | "orange";
  onPlay: () => void;
  onCue: () => void;
}) {
  const accentClass =
    accent === "blue" ? "border-[#3d6e8f] bg-[#121b23]" : "border-[#9b5c1e] bg-[#1e1711]";
  const waveClass = accent === "blue" ? "bg-[#4e9dcc]" : "bg-[#e39b37]";
  const buttonClass =
    "grid h-6 w-6 place-items-center rounded bg-[#243543] text-[#9fc2d8] transition-colors hover:bg-[#314b5d] disabled:opacity-30";

  return (
    <div
      className={`h-[140px] min-w-0 flex-1 rounded border p-2 shadow-[0_1px_5px_rgba(0,0,0,.35)] ${accentClass}`}
    >
      <div className="mb-2 flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-[#c8d9e5]">
        <span className="flex items-center gap-1">
          <Radio className="h-3 w-3" /> {label}
        </span>
        <span className="rounded bg-[#243543] px-1.5 py-0.5 font-mono text-[9px] text-[#9fc2d8]">
          {blockId ? "READY" : "EMPTY"}
        </span>
      </div>
      <div className="mb-2 h-12 overflow-hidden rounded border border-white/5 bg-[#0b1218] px-2 py-1">
        <div className="flex h-full items-end gap-px opacity-90">
          {Array.from({ length: 32 }, (_, index) => (
            <span
              key={index}
              className={`flex-1 rounded-t ${waveClass}`}
              style={{ height: `${18 + ((index * 17) % 62)}%` }}
            />
          ))}
        </div>
      </div>
      <div className="min-h-[42px]">
        <div className="truncate text-[12px] font-bold text-[#e7f0f5]">
          {track?.title || "Nenhuma faixa carregada"}
        </div>
        <div className="truncate text-[10px] text-[#91a7b5]">
          {track?.artist || "Arraste uma faixa da playlist"}
        </div>
      </div>
      <div className="mt-2 flex items-center justify-between border-t border-[#2a3d4a] pt-2 text-[10px] text-[#91a7b5]">
        <span className="font-mono">{track ? fmt(track.duration) : "—"}</span>
        <div className="flex gap-1">
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
  const { blocks, current, currentBlockId, playAt, setCue, nextManual, stop } = usePlayer();
  const firstBlock = blocks[0];
  const firstTrack = firstBlock?.items[0] ?? null;
  const nextTrack = firstBlock?.items[1] ?? blocks[1]?.items[0] ?? null;
  const nextBlockId = firstBlock?.items[1] ? firstBlock.id : (blocks[1]?.id ?? null);
  const deckA = current ?? firstTrack;
  const deckABlock = current ? currentBlockId : (firstBlock?.id ?? null);

  return (
    <aside className="flex h-[164px] max-h-[164px] w-full shrink-0 items-stretch gap-2 overflow-hidden border-b border-[#304858] bg-[#0f1820] p-2 text-[#dce6ed]">
      <div className="flex w-[150px] shrink-0 flex-col justify-center border-r border-[#2a4051] pr-2">
        <div>
          <div className="text-[11px] font-black uppercase tracking-widest text-[#dbe8f0]">
            Studio decks
          </div>
          <div className="text-[9px] text-[#7893a6]">A/B · SOHO workflow</div>
        </div>
        <Volume2 className="h-4 w-4 text-[#4eaa64]" />
      </div>
      <div className="flex h-[140px] min-w-0 flex-1 gap-2">
        <DeckCard
          label="Deck A · NO AR"
          track={deckA}
          blockId={deckABlock}
          accent="blue"
          onCue={() => setCue(true)}
          onPlay={() => {
            if (deckABlock && deckA) playAt(deckABlock, deckA.id);
          }}
        />
        <DeckCard
          label="Deck B · PRÓXIMA"
          track={nextTrack}
          blockId={nextBlockId}
          accent="orange"
          onCue={() => setCue(true)}
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
          <span className="font-mono text-[#4eaa64]">AUTO</span>
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
    </aside>
  );
}
