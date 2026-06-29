import { Music, Megaphone, Radio, FileText } from "lucide-react";
import { usePlayer } from "@/hooks/use-player";
import { fmt, type Block, type Track } from "@/lib/play-data";
import { TransportBar } from "./TransportBar";

const catIcon = {
  musical: Music,
  comercial: Megaphone,
  vinheta: Radio,
  texto: FileText,
} as const;

const catRowBg = {
  musical: "bg-pl-musical",
  comercial: "bg-pl-comercial",
  vinheta: "bg-pl-vinheta",
  texto: "bg-pl-texto",
} as const;

function Row({ block, track }: { block: Block; track: Track }) {
  const { current, isPlaying, position, selectedId, select, playAt } = usePlayer();
  const isCurrent = current?.id === track.id;
  const isSelected = selectedId === track.id;
  const Icon = catIcon[track.category];
  const pct = isCurrent ? Math.min(100, (position / track.duration) * 100) : 0;

  return (
    <div
      onClick={() => select(track.id)}
      onDoubleClick={() => playAt(block.id, track.id)}
      className={`relative flex cursor-default items-center gap-2 border-b border-black/5 px-2 py-[3px] text-[12px] text-pl-text ${
        isCurrent
          ? "bg-pl-onair font-semibold text-pl-onair-text"
          : isSelected
            ? "bg-pl-toolbar-light/40"
            : catRowBg[track.category]
      }`}
    >
      {isCurrent && (
        <div
          className="absolute inset-y-0 left-0 bg-white/30"
          style={{ width: `${pct}%` }}
        />
      )}
      <Icon className="relative z-10 h-3.5 w-3.5 shrink-0 opacity-70" />
      <span className="relative z-10 flex-1 truncate">
        {track.title}
        {track.artist ? <span className="opacity-70"> — {track.artist}</span> : null}
      </span>
      <span className="relative z-10 font-mono text-[11px] tabular-nums opacity-80">
        {isCurrent ? `-${fmt(track.duration - position)}` : fmt(track.duration)}
      </span>
    </div>
  );
}

function BlockView({ block }: { block: Block }) {
  const total = block.items.reduce((s, t) => s + t.duration, 0);
  const head = block.category === "musical" ? "bg-pl-musical-head" : "bg-pl-comercial-head";
  return (
    <div className="mb-1">
      <div className={`flex items-center justify-between px-2 py-1 text-[11px] font-bold text-pl-text ${head}`}>
        <span>
          {block.date}, {block.time} • {block.title}
        </span>
        <span className="font-mono">{fmt(total)}</span>
      </div>
      {block.items.map((t) => (
        <Row key={t.id} block={block} track={t} />
      ))}
    </div>
  );
}

export function ProgramPanel() {
  const { blocks } = usePlayer();
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 bg-pl-toolbar px-2 py-1 text-[12px] font-semibold text-white">
        <Music className="h-4 w-4" /> Programação
      </div>
      <TransportBar />
      <div className="pl-scroll flex-1 overflow-y-auto bg-pl-row">
        {blocks.map((b) => (
          <BlockView key={b.id} block={b} />
        ))}
      </div>
    </div>
  );
}