import { Info } from "lucide-react";
import { usePlayer } from "@/hooks/use-player";
import { fmt } from "@/lib/play-data";

function Field({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex gap-2 px-2 py-[3px] text-[12px] even:bg-pl-row-alt">
      <span className="w-24 shrink-0 font-semibold text-pl-text/70">{label}</span>
      <span className="flex-1 break-words text-pl-text">{value || "—"}</span>
    </div>
  );
}

export function PropertiesPanel() {
  const { blocks, selectedId, current } = usePlayer();
  const track =
    blocks.flatMap((b) => b.items).find((t) => t.id === selectedId) ?? current ?? null;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 bg-pl-toolbar px-2 py-1 text-[12px] font-semibold text-white">
        <Info className="h-4 w-4" /> Propriedades
      </div>
      <div className="pl-scroll flex-1 overflow-y-auto bg-pl-row">
        {track ? (
          <>
            <div className="bg-pl-comercial-head px-2 py-1 text-[11px] font-bold text-pl-text">Áudio atual</div>
            <Field label="Áudio" value={track.title} />
            <Field label="Artista" value={track.artist} />
            <Field label="Álbum" value={track.album} />
            <Field label="Gravadora" value={track.label} />
            <Field label="Ano" value={track.year} />
            <Field label="Categoria" value={track.category} />
            <div className="bg-pl-comercial-head px-2 py-1 text-[11px] font-bold text-pl-text">Arquivo</div>
            <Field label="Duração" value={fmt(track.duration)} />
            <Field label="Taxa de bits" value="320 kbps" />
            <Field label="Ponto de mixagem" value={`${fmt(Math.max(0, track.duration - 8))}`} />
          </>
        ) : (
          <p className="p-4 text-center text-[12px] text-muted-foreground">
            Selecione um item para ver as propriedades.
          </p>
        )}
      </div>
    </div>
  );
}