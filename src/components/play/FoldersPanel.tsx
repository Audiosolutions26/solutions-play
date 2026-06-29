import { useMemo, useState } from "react";
import { ArrowLeft, Folder, Play, Square, SkipForward, Search, Clock3, Plus, Music } from "lucide-react";
import { toast } from "sonner";
import { usePlayer } from "@/hooks/use-player";
import { folders, fmt, type Folder as FolderType, type Track } from "@/lib/play-data";

export function FoldersPanel() {
  const { addTrack, blocks, currentBlockId } = usePlayer();
  const [openId, setOpenId] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const open = folders.find((f) => f.id === openId) ?? null;

  const results = useMemo(() => {
    if (!query.trim()) return null;
    const q = query.toLowerCase();
    return folders.flatMap((f) =>
      f.tracks.filter((t) => t.title.toLowerCase().includes(q) || (t.artist ?? "").toLowerCase().includes(q)),
    );
  }, [query]);

  const targetBlock = currentBlockId ?? blocks[0]?.id;

  const add = (t: Track) => {
    if (!targetBlock) return;
    addTrack(targetBlock, t);
    toast.success(`Adicionado à programação: ${t.title}`);
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 bg-pl-toolbar px-2 py-1 text-[12px] font-semibold text-white">
        <Folder className="h-4 w-4" /> Pastas
      </div>
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
        <div className="grid h-7 w-7 place-items-center rounded bg-gradient-to-b from-pl-transport to-pl-transport-dark text-white"><Play className="h-4 w-4" /></div>
        <div className="grid h-7 w-7 place-items-center rounded bg-gradient-to-b from-pl-transport to-pl-transport-dark text-white"><Square className="h-3.5 w-3.5" /></div>
        <div className="grid h-7 w-7 place-items-center rounded bg-gradient-to-b from-pl-transport to-pl-transport-dark text-white"><SkipForward className="h-4 w-4" /></div>
        <span className="ml-2 truncate text-[12px] font-semibold text-pl-text">
          {results ? `Resultados: "${query}"` : open ? open.name : "Pastas de trabalho"}
        </span>
        <Clock3 className="ml-auto h-5 w-5 text-pl-toolbar" />
      </div>

      {/* content */}
      <div className="pl-scroll flex-1 overflow-y-auto bg-pl-row p-2">
        {results ? (
          <TrackList tracks={results} onAdd={add} />
        ) : open ? (
          <TrackList tracks={open.tracks} onAdd={add} />
        ) : (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {folders.map((f) => (
              <FolderTile key={f.id} folder={f} onOpen={() => setOpenId(f.id)} />
            ))}
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

function FolderTile({ folder, onOpen }: { folder: FolderType; onOpen: () => void }) {
  return (
    <button
      onDoubleClick={onOpen}
      onClick={onOpen}
      className="flex flex-col items-center gap-1 rounded p-2 text-center hover:bg-pl-toolbar-light/30"
      title={folder.name}
    >
      <Folder className="h-10 w-10" style={{ color: folder.color, fill: folder.color }} />
      <span className="line-clamp-2 text-[11px] leading-tight text-pl-text">{folder.name}</span>
    </button>
  );
}

function TrackList({ tracks, onAdd }: { tracks: Track[]; onAdd: (t: Track) => void }) {
  if (!tracks.length) return <p className="p-4 text-center text-[12px] text-muted-foreground">Nada encontrado.</p>;
  return (
    <div className="overflow-hidden rounded border border-pl-panel-dark">
      {tracks.map((t, i) => (
        <div
          key={t.id}
          onDoubleClick={() => onAdd(t)}
          className={`group flex items-center gap-2 px-2 py-1 text-[12px] text-pl-text ${i % 2 ? "bg-pl-row-alt" : "bg-white"}`}
        >
          <Music className="h-3.5 w-3.5 shrink-0 opacity-60" />
          <span className="flex-1 truncate">
            {t.title}
            {t.artist ? <span className="opacity-70"> — {t.artist}</span> : null}
          </span>
          <span className="font-mono text-[11px] opacity-70">{fmt(t.duration)}</span>
          <button
            onClick={() => onAdd(t)}
            className="grid h-5 w-5 place-items-center rounded bg-pl-transport text-white opacity-0 transition group-hover:opacity-100"
            title="Adicionar à programação"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}