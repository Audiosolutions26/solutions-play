import { useEffect, useState } from "react";
import { History } from "lucide-react";
import { usePlayer } from "@/hooks/use-player";
import { fmt } from "@/lib/play-data";
import { formatClockTime } from "@/lib/format";
import { PanelHeader } from "./PanelHeader";

interface PlayedEntry {
  id: string;
  title: string;
  artist?: string;
  cat: string;
  time: string;
  dur: number;
}

// ---- Músicas executadas (histórico / comprovação ECAD) ----
export function PlayedPanel() {
  const { blocks, current } = usePlayer();
  const [log, setLog] = useState<PlayedEntry[]>([]);

  useEffect(() => {
    if (!current) return;
    setLog((prev) => {
      if (prev[0]?.id === current.id) return prev;
      const now = formatClockTime();
      return [{ id: current.id, title: current.title, artist: current.artist, cat: current.category, time: now, dur: current.duration }, ...prev].slice(0, 60);
    });
  }, [current]);

  const totalTracks = blocks.reduce((sum, block) => sum + block.items.length, 0);

  return (
    <div className="flex h-full flex-col">
      <PanelHeader icon={History} title="Músicas executadas (comprovação)" />
      <div className="border-b border-pl-panel-dark/30 px-2 py-1 text-[11px] text-muted-foreground">
        {log.length} execuções registradas nesta sessão • {totalTracks} inserções na grade
      </div>
      <div className="pl-scroll flex-1 overflow-y-auto bg-pl-row">
        {log.length === 0 ? (
          <p className="p-3 text-[12px] text-muted-foreground">Nenhuma execução ainda. Toque uma inserção na Programação.</p>
        ) : (
          <table className="w-full text-[12px]">
            <thead className="sticky top-0 bg-muted">
              <tr><th className="px-2 py-1 text-left">Hora</th><th className="px-2 py-1 text-left">Título</th><th className="px-2 py-1 text-left">Tipo</th><th className="px-2 py-1 text-right">Duração</th></tr>
            </thead>
            <tbody>
              {log.map((entry, i) => (
                <tr key={`${entry.id}-${i}`} className="border-t border-pl-panel-dark/20">
                  <td className="px-2 py-1 font-mono tabular-nums">{entry.time}</td>
                  <td className="px-2 py-1">{entry.title}{entry.artist ? <span className="opacity-70"> — {entry.artist}</span> : null}</td>
                  <td className="px-2 py-1 capitalize">{entry.cat}</td>
                  <td className="px-2 py-1 text-right font-mono tabular-nums">{fmt(entry.dur)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
