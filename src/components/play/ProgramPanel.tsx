import { useRef, useState } from "react";
import { Music, Megaphone, Radio, FileText, Bookmark, Repeat, Clock, Play, Headphones, Trash2, FileAudio, Pause, ChevronUp, ChevronDown, Lock, Timer, Mic, Newspaper } from "lucide-react";
import { toast } from "sonner";
import { usePlayer } from "@/hooks/use-player";
import { fmt, makePause, makeHoraCerta, type Block, type Track } from "@/lib/play-data";
import {
  ContextMenu, ContextMenuTrigger, ContextMenuContent, ContextMenuItem, ContextMenuSeparator,
} from "@/components/ui/context-menu";
import { TransportBar } from "./TransportBar";
import { MarkersDialog } from "./MarkersDialog";
import { BlockClockDialog } from "./BlockClockDialog";
import { saveMarkers, getMarkers, hasRefrao, hasCarimbo } from "@/lib/play-markers";
import { hasTrackAudio, readAudioFile } from "@/lib/play-audio-files";

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

function Row({ block, track, onMarkers }: { block: Block; track: Track; onMarkers: (t: Track) => void }) {
  const { current, position, selectedId, select, playAt, removeTrack, moveTrack, reorderTrack, getEngine, setTrackAudio } = usePlayer();
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState<"top" | "bottom" | null>(null);
  const locked = !!block.clock?.locked;
  const isCurrent = current?.id === track.id;
  const isSelected = selectedId === track.id;
  const Icon = track.kind === "pausa" ? Pause
    : track.kind === "horacerta" ? Clock
    : track.kind === "locucao" ? Mic
    : track.kind === "textodia" ? Newspaper
    : catIcon[track.category];
  const pct = isCurrent ? Math.min(100, (position / track.duration) * 100) : 0;
  const refrao = hasRefrao(track.id);
  const carimbo = hasCarimbo(track.id);
  const realAudio = hasTrackAudio(track.id);
  // M marker (manual p.14-15): blue = inserted manually; red = auto item moved.
  const mMarker = track.origin === "manual" ? "blue" : track.origin === "auto" && track.moved ? "red" : null;

  const onPickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const { url, duration } = await readAudioFile(file);
      setTrackAudio(block.id, track.id, url, duration);
      toast.success(`Áudio real carregado: ${file.name}`);
    } catch {
      toast.error("Não foi possível carregar o arquivo de áudio.");
    }
  };

  const addRefrao = () => {
    const m = getMarkers(track.id).filter((x) => x.kind !== "refraoStart" && x.kind !== "refraoEnd");
    saveMarkers(track.id, [...m, { kind: "refraoStart", pos: 0.4 }, { kind: "refraoEnd", pos: 0.7 }]);
    toast.success("Refrão marcado (40%–70%). Ajuste em Marcadores.");
  };
  const carimbar = () => {
    const m = getMarkers(track.id).filter((x) => x.kind !== "carimbo");
    saveMarkers(track.id, [...m, { kind: "carimbo", pos: 0.05, note: "Hora Certa" }]);
    toast.success("Áudio carimbado com Hora Certa.");
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          draggable={!locked}
          onDragStart={(e) => {
            e.dataTransfer.setData("text/plain", track.id);
            e.dataTransfer.effectAllowed = "move";
          }}
          onDragOver={(e) => {
            if (locked) return;
            e.preventDefault();
            e.dataTransfer.dropEffect = "move";
            const r = e.currentTarget.getBoundingClientRect();
            setDragOver(e.clientY - r.top < r.height / 2 ? "top" : "bottom");
          }}
          onDragLeave={() => setDragOver(null)}
          onDrop={(e) => {
            e.preventDefault();
            const sourceId = e.dataTransfer.getData("text/plain");
            const place = dragOver === "bottom" ? "after" : "before";
            setDragOver(null);
            if (sourceId && sourceId !== track.id) reorderTrack(sourceId, track.id, place);
          }}
          onClick={() => select(track.id)}
          onDoubleClick={() => playAt(block.id, track.id)}
          className={`relative flex items-center gap-2 border-b border-black/5 px-2 py-[3px] text-[12px] text-pl-text ${
            locked ? "cursor-default" : "cursor-grab active:cursor-grabbing"
          } ${
            dragOver === "top" ? "shadow-[inset_0_2px_0_0_var(--color-pl-transport)]"
              : dragOver === "bottom" ? "shadow-[inset_0_-2px_0_0_var(--color-pl-transport)]" : ""
          } ${
            isCurrent
              ? "bg-pl-onair font-semibold text-pl-onair-text"
              : isSelected
                ? "bg-pl-toolbar-light/40"
                : catRowBg[track.category]
          }`}
        >
          {isCurrent && (
            <div className="absolute inset-y-0 left-0 bg-white/30" style={{ width: `${pct}%` }} />
          )}
          <Icon className="relative z-10 h-3.5 w-3.5 shrink-0 opacity-70" />
          {mMarker && (
            <span
              title={mMarker === "blue" ? "Inserção manual" : "Inserção automática movida"}
              className={`relative z-10 grid h-3.5 w-3.5 shrink-0 place-items-center rounded-sm text-[9px] font-bold text-white ${
                mMarker === "blue" ? "bg-blue-600" : "bg-red-600"
              }`}
            >
              M
            </span>
          )}
          <span className="relative z-10 flex-1 truncate">
            {track.title}
            {track.artist ? <span className="opacity-70"> — {track.artist}</span> : null}
            {refrao && <Repeat className="relative z-10 ml-1 inline h-3 w-3 text-pink-600" />}
            {carimbo && <Clock className="relative z-10 ml-1 inline h-3 w-3 text-yellow-600" />}
            {realAudio && <FileAudio className="relative z-10 ml-1 inline h-3 w-3 text-emerald-600" />}
          </span>
          <span className="relative z-10 font-mono text-[11px] tabular-nums opacity-80">
            {isCurrent ? `-${fmt(track.duration - position)}` : fmt(track.duration)}
          </span>
          <input ref={fileRef} type="file" accept="audio/*" className="hidden" onChange={onPickFile} />
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-56">
        <ContextMenuItem onClick={() => playAt(block.id, track.id)}><Play className="mr-2 h-4 w-4" /> Tocar</ContextMenuItem>
        <ContextMenuItem onClick={() => { getEngine().fire(track.freq, 1.2); toast.message("Pré-escuta (CUE)"); }}>
          <Headphones className="mr-2 h-4 w-4" /> Pré-escuta (CUE)
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={() => moveTrack(track.id, -1)}><ChevronUp className="mr-2 h-4 w-4" /> Mover para cima</ContextMenuItem>
        <ContextMenuItem onClick={() => moveTrack(track.id, 1)}><ChevronDown className="mr-2 h-4 w-4" /> Mover para baixo</ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={() => fileRef.current?.click()}>
          <FileAudio className="mr-2 h-4 w-4" /> {realAudio ? "Trocar áudio real…" : "Carregar áudio real…"}
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={() => onMarkers(track)}><Bookmark className="mr-2 h-4 w-4" /> Marcadores…</ContextMenuItem>
        <ContextMenuItem onClick={addRefrao}><Repeat className="mr-2 h-4 w-4" /> Adicionar refrão</ContextMenuItem>
        <ContextMenuItem onClick={carimbar}><Clock className="mr-2 h-4 w-4" /> Carimbar Hora Certa</ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem className="text-destructive" onClick={() => { removeTrack(block.id, track.id); toast.success("Inserção removida."); }}>
          <Trash2 className="mr-2 h-4 w-4" /> Remover inserção
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

function BlockView({ block, onMarkers, onClock }: { block: Block; onMarkers: (t: Track) => void; onClock: (b: Block) => void }) {
  const total = block.items.reduce((s, t) => s + t.duration, 0);
  const head = block.category === "musical" ? "bg-pl-musical-head" : "bg-pl-comercial-head";
  const c = block.clock;
  // Indicador DUR (manual p.140): verde=igual, amarelo=excedido, vermelho=abaixo.
  const durColor = c?.dur
    ? Math.round(total / 60) === c.dur
      ? "text-emerald-600"
      : total / 60 > c.dur
        ? "text-yellow-600"
        : "text-red-600"
    : "";
  return (
    <div className="mb-1">
      <div className={`flex items-center gap-1.5 px-2 py-1 text-[11px] font-bold text-pl-text ${head}`}>
        <span className="truncate">{block.date}, {block.time} • {c?.name || block.title}</span>
        {c?.fixo && <span title="FIXO — não pode atrasar" className="grid h-4 w-4 place-items-center rounded-sm bg-yellow-400 text-[9px] text-black">F</span>}
        {c?.locked && <span title="Bloco bloqueado (LOCKED)"><Lock className="h-3.5 w-3.5 text-yellow-500" /></span>}
        {c?.mode && <span title={c.mode === "sat" ? "Bloco satélite" : "Bloco local"} className="rounded bg-pl-toolbar/30 px-1 text-[9px] uppercase">{c.mode}</span>}
        {c?.descarte && <span title="Descarte aplicado" className="rounded bg-pl-toolbar/30 px-1 text-[9px]">DESC</span>}
        <button
          onClick={() => onClock(block)}
          title="Relógio operacional do bloco"
          className="ml-auto grid h-5 w-5 place-items-center rounded hover:bg-black/10"
        >
          <Timer className="h-3.5 w-3.5" />
        </button>
        {c?.dur ? (
          <span className={`font-mono ${durColor}`}>{fmt(total)}/{c.dur}min</span>
        ) : (
          <span className="font-mono">{fmt(total)}</span>
        )}
      </div>
      {block.items.map((t) => (
        <Row key={t.id} block={block} track={t} onMarkers={onMarkers} />
      ))}
    </div>
  );
}

export function ProgramPanel() {
  const { blocks, currentBlockId, addTrack } = usePlayer();
  const [markerTrack, setMarkerTrack] = useState<Track | null>(null);
  const [markersOpen, setMarkersOpen] = useState(false);
  const [clockBlock, setClockBlock] = useState<Block | null>(null);
  const [clockOpen, setClockOpen] = useState(false);

  const openMarkers = (t: Track) => { setMarkerTrack(t); setMarkersOpen(true); };
  const openClock = (b: Block) => { setClockBlock(b); setClockOpen(true); };
  const targetBlock = currentBlockId ?? blocks[0]?.id;
  const insertPause = () => {
    if (!targetBlock) return;
    addTrack(targetBlock, makePause());
    toast.success("Pausa inserida na programação.");
  };
  const insertHoraCerta = () => {
    if (!targetBlock) return;
    addTrack(targetBlock, makeHoraCerta());
    toast.success("Hora Certa inserida na programação.");
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 bg-pl-toolbar px-2 py-1 text-[12px] font-semibold text-white">
        <Music className="h-4 w-4" /> Programação
        <div className="ml-auto flex items-center gap-1">
          <button onClick={insertPause} title="Inserir Pausa" className="grid h-6 w-6 place-items-center rounded bg-white/15 hover:bg-white/30">
            <Pause className="h-3.5 w-3.5" />
          </button>
          <button onClick={insertHoraCerta} title="Inserir Hora Certa" className="grid h-6 w-6 place-items-center rounded bg-white/15 hover:bg-white/30">
            <Clock className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      <TransportBar />
      <div className="pl-scroll flex-1 overflow-y-auto bg-pl-row">
        {blocks.map((b) => (
          <BlockView key={b.id} block={b} onMarkers={openMarkers} onClock={openClock} />
        ))}
      </div>
      <MarkersDialog track={markerTrack} open={markersOpen} onOpenChange={setMarkersOpen} />
      <BlockClockDialog block={clockBlock} open={clockOpen} onOpenChange={setClockOpen} />
    </div>
  );
}
