import { useSyncExternalStore } from "react";
import { Activity, Radio, Bell, Mic, Bookmark, Trash2, Clock as ClockIcon } from "lucide-react";
import { usePlayer } from "@/hooks/use-player";
import { fmt } from "@/lib/play-data";
import {
  subscribeEvents, getEvents, clearEvents, fmtClock, EVENT_META, type PlayEvent,
} from "@/lib/play-events";

const kindIcon: Record<string, typeof Bell> = {
  beep: Bell, locucao: Mic, marcador: Bookmark, carimbo: Bookmark,
  programa: Radio, secao: Activity, sistema: Activity,
};

export function StatusPanel() {
  const events = useSyncExternalStore(subscribeEvents, getEvents, getEvents);
  const { current, position, blocks, currentBlockId, isPlaying, onAir } = usePlayer();

  const block = blocks.find((b) => b.id === currentBlockId);
  const idx = block && current ? block.items.findIndex((t) => t.id === current.id) : -1;
  const nextTrack = block && idx >= 0 ? block.items[idx + 1] : undefined;
  const remaining = current ? Math.max(0, current.duration - position) : 0;

  return (
    <div className="flex h-full min-w-0 flex-1 flex-col">
      <div className="flex items-center gap-2 bg-pl-toolbar px-2 py-1 text-[12px] font-semibold text-white">
        <Activity className="h-4 w-4" /> Status da execução
        <span className={`ml-2 inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-bold ${onAir ? "bg-red-600 text-white" : "bg-white/15 text-white/80"}`}>
          <span className={`h-2 w-2 rounded-full ${onAir ? "bg-white animate-pulse" : "bg-white/50"}`} /> {onAir ? "NO AR" : "PARADO"}
        </span>
        <button onClick={clearEvents} className="ml-auto inline-flex items-center gap-1 rounded bg-white/15 px-2 py-1 text-[11px] font-semibold text-white hover:bg-white/30">
          <Trash2 className="h-3.5 w-3.5" /> Limpar
        </button>
      </div>

      {/* relógio da programação */}
      <div className="grid grid-cols-2 gap-2 border-b border-pl-panel-dark/30 bg-pl-row p-2 md:grid-cols-4">
        <StatBox label="No ar" value={current?.title ?? "—"} sub={current?.artist} />
        <StatBox label="Tempo restante" value={current ? fmt(remaining) : "--:--"} sub={isPlaying ? "tocando" : "em pausa"} mono />
        <StatBox label="Próxima" value={nextTrack?.title ?? "fim do bloco"} sub={nextTrack?.artist} />
        <StatBox label="Bloco" value={block?.title ?? "—"} sub={block ? `${block.time} • ${block.items.length} inserções` : undefined} />
      </div>

      {/* log de eventos disparados */}
      <div className="pl-scroll flex-1 overflow-y-auto bg-pl-row">
        {events.length === 0 ? (
          <p className="p-3 text-[12px] text-muted-foreground">
            Nenhum evento ainda. Beep, Locuções e Marcadores disparados durante a execução aparecem aqui com horário.
          </p>
        ) : (
          <table className="w-full text-[12px]">
            <thead className="sticky top-0 bg-muted">
              <tr>
                <th className="w-20 px-2 py-1 text-left">Hora</th>
                <th className="w-24 px-2 py-1 text-left">Tipo</th>
                <th className="px-2 py-1 text-left">Evento</th>
              </tr>
            </thead>
            <tbody>
              {events.map((ev: PlayEvent) => {
                const meta = EVENT_META[ev.kind];
                const Icon = kindIcon[ev.kind] ?? Activity;
                return (
                  <tr key={ev.id} className="border-t border-pl-panel-dark/20">
                    <td className="px-2 py-1 font-mono tabular-nums text-muted-foreground">{fmtClock(ev.ts)}</td>
                    <td className="px-2 py-1">
                      <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold text-white" style={{ backgroundColor: meta.color }}>
                        <Icon className="h-3 w-3" /> {meta.label}
                      </span>
                    </td>
                    <td className="px-2 py-1">
                      <span className="block">{ev.label}</span>
                      {ev.detail && <span className="block text-[10px] text-muted-foreground">{ev.detail}</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function StatBox({ label, value, sub, mono }: { label: string; value: string; sub?: string; mono?: boolean }) {
  return (
    <div className="rounded border border-pl-panel-dark/30 bg-white/50 p-2">
      <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        <ClockIcon className="h-3 w-3" /> {label}
      </div>
      <div className={`truncate text-[13px] font-bold text-pl-text ${mono ? "font-mono tabular-nums" : ""}`}>{value}</div>
      {sub && <div className="truncate text-[10px] text-muted-foreground">{sub}</div>}
    </div>
  );
}
