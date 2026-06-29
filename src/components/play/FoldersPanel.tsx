import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Folder, Play, Square, SkipForward, Search, Clock3, Plus, Music, Shuffle, Headphones, Settings2 } from "lucide-react";
import { toast } from "sonner";
import { usePlayer } from "@/hooks/use-player";
import { fmt, type Folder as FolderType, type Track } from "@/lib/play-data";
import { useShortcuts } from "@/hooks/use-shortcuts";
import { SHORTCUT_TYPES } from "@/lib/play-shortcuts";
import {
  ContextMenu, ContextMenuTrigger, ContextMenuContent, ContextMenuItem, ContextMenuSeparator,
} from "@/components/ui/context-menu";
import { cuePlay, cueStop, cueIsPlaying, cueCurrentId } from "@/lib/play-cue";
import { useCue } from "@/hooks/use-cue";

export function FoldersPanel({ onManage, embedded }: { onManage?: () => void; embedded?: boolean }) {
  const { addTrack, blocks, currentBlockId } = usePlayer();
  const { shortcuts: folders } = useShortcuts();
  const [openId, setOpenId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [sel, setSel] = useState<Track | null>(null);
  const { cueId, playing: cuePlaying } = useCue();

  const open = folders.find((f) => f.id === openId) ?? null;

  const results = useMemo(() => {
    if (!query.trim()) return null;
    const q = query.toLowerCase();
    return folders.flatMap((f) =>
      f.tracks.filter((t) => t.title.toLowerCase().includes(q) || (t.artist ?? "").toLowerCase().includes(q)),
    );
  }, [query, folders]);

  const targetBlock = currentBlockId ?? blocks[0]?.id;

  const add = (t: Track) => {
    if (!targetBlock) return;
    addTrack(targetBlock, t);
    toast.success(`Adicionado à programação: ${t.title}`);
  };

  // Pré-escuta (CUE) FORA DO AR, na saída de pré-escuta (manual p.20, 30).
  const preview = (t?: Track | null) => {
    const track = t ?? sel;
    if (!track) { toast.info("Selecione um áudio para pré-escuta."); return; }
    setSel(track);
    void cuePlay(track);
    toast.message(`Pré-escuta (fora do ar): ${track.title}`);
  };
  const stopPreview = () => cueStop();

  // Atalho de teclado: tecla "C" inicia/para a pré-escuta do item selecionado.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== "c" || e.ctrlKey || e.metaKey || e.altKey) return;
      const el = document.activeElement as HTMLElement | null;
      const tag = el?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || el?.isContentEditable) return;
      e.preventDefault();
      if (cueIsPlaying() && (!sel || cueCurrentId() === sel.id)) stopPreview();
      else preview();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sel]);

  // Arrastar/soltar uma pasta adiciona um áudio aleatório (manual p.15, 26).
  const addRandom = (f: FolderType) => {
    if (!targetBlock || !f.tracks.length) return;
    const t = f.tracks[Math.floor(Math.random() * f.tracks.length)];
    addTrack(targetBlock, t);
    toast.success(`Aleatório de "${f.name}": ${t.title}`);
  };

  return (
    <div className="flex h-full flex-col">
      {!embedded && (
        <div className="flex items-center gap-2 bg-pl-toolbar px-2 py-1 text-[12px] font-semibold text-white">
          <Folder className="h-4 w-4" /> Pastas
        </div>
      )}
      {/* toolbar */}
      <div className="flex items-center gap-1 border-b border-pl-panel-dark bg-pl-panel px-2 py-1">
        <button
          onClick={() => setOpenId(null)}
          className="grid h-7 w-7 place-items-center rounded border border-pl-panel-dark bg-white/60 text-pl-text hover:bg-white disabled:opacity-40"
          disabled={!open && !results}
          title="Voltar"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <button onClick={() => preview()} title="Pré-escuta (atalho: C)" className="grid h-7 w-7 place-items-center rounded bg-gradient-to-b from-pl-transport to-pl-transport-dark text-white hover:brightness-110"><Play className="h-4 w-4" /></button>
        <button onClick={stopPreview} title="Parar pré-escuta (atalho: C)" className="grid h-7 w-7 place-items-center rounded bg-gradient-to-b from-pl-transport to-pl-transport-dark text-white hover:brightness-110"><Square className="h-3.5 w-3.5" /></button>
        <button onClick={() => sel && add(sel)} title="Adicionar à programação" className="grid h-7 w-7 place-items-center rounded bg-gradient-to-b from-pl-transport to-pl-transport-dark text-white hover:brightness-110"><SkipForward className="h-4 w-4" /></button>
        {onManage && (
          <button onClick={onManage} title="Gerenciamento de atalhos" className="grid h-7 w-7 place-items-center rounded border border-pl-panel-dark bg-white/60 text-pl-text hover:bg-white"><Settings2 className="h-4 w-4" /></button>
        )}
        <span className="ml-2 break-words text-[12px] font-semibold text-pl-text">
          {results ? `Resultados: "${query}"` : open ? open.name : "Pastas de trabalho"}
        </span>
        {cuePlaying && cueId && (
          <span className="ml-auto mr-1 inline-flex items-center gap-1 rounded bg-emerald-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
            <CueBars /> CUE
          </span>
        )}
        <Clock3 className={`${cuePlaying && cueId ? "" : "ml-auto"} h-5 w-5 text-pl-toolbar`} />
      </div>

      {/* content */}
      <div className="pl-scroll flex-1 overflow-y-auto bg-pl-row p-2">
        {results ? (
          <TrackList tracks={results} onAdd={add} onSelect={setSel} selId={sel?.id} onPreview={preview} onStopPreview={stopPreview} cueId={cueId} cuePlaying={cuePlaying} />
        ) : open ? (
          <TrackList tracks={open.tracks} onAdd={add} onSelect={setSel} selId={sel?.id} onPreview={preview} onStopPreview={stopPreview} cueId={cueId} cuePlaying={cuePlaying} />
        ) : (
          <div className="space-y-3">
            {SHORTCUT_TYPES.map((meta) => {
              const items = folders.filter((f) => (f as FolderType & { type?: string }).type === meta.type);
              if (!items.length) return null;
              return (
                <div key={meta.type}>
                  <div className="mb-1 border-b border-pl-panel-dark/40 px-1 text-[10px] font-bold uppercase tracking-wide text-pl-toolbar">
                    {meta.label}
                  </div>
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {items.map((f) => (
                      <FolderTile key={f.id} folder={f} onOpen={() => setOpenId(f.id)} onRandom={() => addRandom(f)} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* search */}
      <div className="flex items-center gap-2 border-t border-pl-panel-dark bg-pl-panel px-2 py-1.5">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Pesquisar em todas as pastas..."
          className="h-7 flex-1 rounded border border-pl-panel-dark bg-white px-2 text-[12px] text-pl-text outline-none focus:border-pl-toolbar"
        />
        <button className="grid h-7 w-7 place-items-center rounded bg-pl-toolbar text-white" title="Pesquisar">
          <Search className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function FolderTile({ folder, onOpen, onRandom }: { folder: FolderType; onOpen: () => void; onRandom: () => void }) {
  return (
    <div className="group relative flex flex-col items-center gap-1 rounded p-2 text-center hover:bg-pl-toolbar-light/30">
      <button onDoubleClick={onOpen} onClick={onOpen} className="flex flex-col items-center gap-1" title={`${folder.name} (abrir)`}>
        <Folder className="h-10 w-10" style={{ color: folder.color, fill: folder.color }} />
        <span className="break-words text-[11px] leading-tight text-pl-text">{folder.name}</span>
      </button>
      <button
        onClick={onRandom}
        title="Adicionar áudio aleatório desta pasta"
        className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded bg-pl-toolbar text-white opacity-0 transition group-hover:opacity-100"
      >
        <Shuffle className="h-3 w-3" />
      </button>
    </div>
  );
}

function CueBars() {
  return (
    <span className="inline-flex items-end gap-[1px]" aria-hidden>
      <span className="h-2 w-[2px] animate-[pulse_0.7s_ease-in-out_infinite] rounded-sm bg-white" />
      <span className="h-3 w-[2px] animate-[pulse_0.5s_ease-in-out_infinite] rounded-sm bg-white" />
      <span className="h-1.5 w-[2px] animate-[pulse_0.9s_ease-in-out_infinite] rounded-sm bg-white" />
    </span>
  );
}

function TrackList({ tracks, onAdd, onSelect, selId, onPreview, onStopPreview, cueId, cuePlaying }: { tracks: Track[]; onAdd: (t: Track) => void; onSelect: (t: Track) => void; selId?: string; onPreview: (t: Track) => void; onStopPreview: () => void; cueId: string | null; cuePlaying: boolean }) {
  if (!tracks.length) return <p className="p-4 text-center text-[12px] text-muted-foreground">Nada encontrado.</p>;
  return (
    <div className="overflow-hidden rounded border border-pl-panel-dark">
      {tracks.map((t, i) => {
        const isCue = cuePlaying && cueId === t.id;
        return (
        <ContextMenu key={t.id}>
          <ContextMenuTrigger asChild>
            <div
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData("application/x-play-folder-track", JSON.stringify(t));
                e.dataTransfer.effectAllowed = "copy";
                onSelect(t);
              }}
              onClick={() => onSelect(t)}
              onDoubleClick={() => onAdd(t)}
              className={`group flex cursor-grab items-center gap-2 px-2 py-1 text-[12px] text-pl-text active:cursor-grabbing ${
                isCue ? "bg-emerald-100 shadow-[inset_3px_0_0_0_#059669]" : selId === t.id ? "bg-pl-toolbar-light/40" : i % 2 ? "bg-pl-row-alt" : "bg-white"
              }`}
              title="Clique direito para pré-escuta • arraste para a Programação"
            >
              {isCue ? <Headphones className="h-3.5 w-3.5 shrink-0 text-emerald-600" /> : <Music className="h-3.5 w-3.5 shrink-0 opacity-60" />}
              <span className="flex-1 break-words">
                {t.title}
                {t.artist ? <span className="opacity-70"> — {t.artist}</span> : null}
              </span>
              {isCue && <CueBars />}
              <span className="font-mono text-[11px] opacity-70">{fmt(t.duration)}</span>
              <button
                onClick={() => onAdd(t)}
                className="grid h-5 w-5 place-items-center rounded bg-pl-transport text-white opacity-0 transition group-hover:opacity-100"
                title="Adicionar à programação"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
          </ContextMenuTrigger>
          <ContextMenuContent className="w-52">
            <ContextMenuItem onSelect={() => onPreview(t)}>
              <Headphones className="mr-2 h-4 w-4" /> Pré-escuta (fora do ar)
            </ContextMenuItem>
            <ContextMenuItem onSelect={() => onStopPreview()}>
              <Square className="mr-2 h-3.5 w-3.5" /> Parar pré-escuta
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem onSelect={() => onAdd(t)}>
              <Plus className="mr-2 h-4 w-4" /> Adicionar à programação
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
        );
      })}
    </div>
  );
}