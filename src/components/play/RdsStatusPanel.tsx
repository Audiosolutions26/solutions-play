import { useMemo, useState, useEffect } from "react";
import { Radio, RefreshCw, Clipboard, Settings, AlertTriangle, Info, Clock, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { useConfig } from "@/hooks/use-config";
import { usePlayer } from "@/hooks/use-player";
import { rdsLabel } from "@/lib/play-rds";
import { getEvents, subscribeEvents, type PlayEvent, EVENT_META, fmtClock } from "@/lib/play-events";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { fmt, type Track } from "@/lib/play-data";

function shortStationName(value: string): string {
  const clean = value.trim() || "Solutions Play";
  return clean
    .replace(/[^A-Za-zÀ-ÿ0-9 ]/g, "")
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 4)
    .toUpperCase();
}

export function RdsStatusPanel({ onOpenSettings }: { onOpenSettings?: () => void }) {
  const { get } = useConfig();
  const { current, position, blocks, currentBlockId } = usePlayer();
  const [showDetails, setShowDetails] = useState(false);
  const [events, setEvents] = useState<PlayEvent[]>([]);

  useEffect(() => {
    setEvents(getEvents());
    return subscribeEvents(() => setEvents(getEvents()));
  }, []);

  const station = String(get("configuracoes.avancado.advTitulo") || "Solutions Play");
  const configuredPs = String(get("configuracoes.rds.rdsTexto") || "").trim();
  const ps = (configuredPs || shortStationName(station)).slice(0, 8).toUpperCase();
  const rtPlus = current
    ? `${current.artist || station} - ${current.title}`.slice(0, 64)
    : "Aguardando programação";

  const nextBreakSeconds = useMemo(() => {
    if (!current || !currentBlockId) return 0;
    
    const blockIndex = blocks.findIndex(b => b.id === currentBlockId);
    if (blockIndex < 0) return 0;
    
    const currentBlock = blocks[blockIndex];
    const trackIndex = currentBlock.items.findIndex(t => t.id === current.id);
    if (trackIndex < 0) return 0;
    
    // 1. Tempo restante da música atual
    let total = Math.max(0, current.duration - position);
    
    // 2. Soma durações das músicas seguintes no mesmo bloco
    for (let i = trackIndex + 1; i < currentBlock.items.length; i++) {
      total += currentBlock.items[i].duration;
    }
    
    return total;
  }, [current, currentBlockId, blocks, position]);

  const systemErrors = useMemo(() => {
    return events.filter(e => 
      e.kind === "sistema" || 
      e.kind === "secao" || 
      e.label.toLowerCase().includes("erro") || 
      e.label.toLowerCase().includes("falha")
    );
  }, [events]);

  function pfmtLocal(sec: number): string {
    const s = Math.max(0, Math.floor(sec));
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${m}:${r.toString().padStart(2, "0")}`;
  }

  return (
    <section className="flex h-full flex-col overflow-hidden bg-[#242424] text-[#dbe8f0]">
      {/* Next Break / Timer Section */}
      <div className="flex h-[45%] flex-col border-b border-[#333]">
        <div className="flex h-7 items-center bg-[#b0b0b0] px-3">
          <span className="text-[13px] font-bold text-[#222]">Next Break</span>
        </div>
        <div className="flex flex-1 items-center justify-center bg-[#1a1a1a]">
          <span className="font-mono text-[72px] font-medium leading-none text-white">
            {pfmtLocal(nextBreakSeconds)}
          </span>
        </div>
      </div>

      {/* RDS Section */}
      <div className="flex flex-1 flex-col">
        <div className="flex h-7 items-center justify-between bg-[#b0b0b0] px-3">
          <div className="flex items-center gap-2">
            <Radio className="h-4 w-4 text-[#222]" />
            <span className="text-[13px] font-bold text-[#222]">R·D·S</span>
          </div>
          <button 
            onClick={() => onOpenSettings?.()}
            className="flex items-center gap-1 rounded bg-[#333]/20 px-2 py-0.5 text-[10px] font-bold text-[#222] hover:bg-black/10"
          >
            Settings
          </button>
        </div>
        
        <div className="flex flex-1 flex-col items-center justify-center bg-[#1a1a1a] px-4 text-center">
          <div className="mb-1 font-mono text-[24px] tracking-widest text-[#dbe8f0]">
            **{ps}**
          </div>
          <div className="line-clamp-2 max-w-full font-mono text-[14px] text-[#91acbb]">
            {rtPlus}
          </div>
        </div>
      </div>

      {/* Problems Section */}
      <div className="flex flex-col border-t border-[#333]">
        <div className="flex h-7 items-center justify-between bg-[#b0b0b0] px-3">
          <div className="flex items-center gap-2">
            {systemErrors.length > 0 ? (
              <AlertTriangle className="h-4 w-4 text-red-600 animate-pulse" />
            ) : (
              <CheckCircle2 className="h-4 w-4 text-emerald-700" />
            )}
            <span className="text-[13px] font-bold text-[#222]">Problems</span>
          </div>
          <button 
            onClick={() => setShowDetails(true)}
            className="flex items-center gap-1 rounded bg-[#333]/20 px-2 py-0.5 text-[10px] font-bold text-[#222] hover:bg-black/10"
          >
            Details
          </button>
        </div>
        <div className="flex h-8 items-center bg-[#1a1a1a] px-3 text-[11px] text-[#91acbb]">
          {systemErrors.length > 0 
            ? `${systemErrors.length} alerta(s) captado(s)` 
            : "Nenhum problema detectado"}
        </div>
      </div>

      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-2xl bg-[#1e1e1e] border-[#333] text-[#dbe8f0]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[#dbe8f0]">
              <AlertTriangle className="h-5 w-5 text-pl-onair-bg" />
              Detalhes do Sistema / Problemas
            </DialogTitle>
            <DialogDescription className="text-[#91acbb]">
              Lista de eventos e alertas captados pelo software em tempo real.
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="mt-4 h-[400px] rounded border border-[#333] bg-[#1a1a1a] p-4">
            <div className="space-y-3">
              {events.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-[#91acbb]">
                  <Info className="mb-2 h-8 w-8 opacity-20" />
                  <p>Nenhum evento registrado ainda.</p>
                </div>
              ) : (
                events.map((event) => {
                  const isError = event.label.toLowerCase().includes("erro") || event.label.toLowerCase().includes("falha");
                  const meta = EVENT_META[event.kind];
                  
                  return (
                    <div key={event.id} className="flex gap-3 border-b border-[#333] pb-2 last:border-0">
                      <div className="flex h-5 w-5 shrink-0 items-center justify-center mt-0.5">
                        {isError ? (
                          <XCircle className="h-4 w-4 text-red-500" />
                        ) : (
                          <Info className="h-4 w-4 text-blue-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className={`text-[12px] font-bold ${isError ? 'text-red-400' : 'text-[#dbe8f0]'}`}>
                            {event.label}
                          </span>
                          <span className="flex items-center gap-1 text-[10px] text-[#91acbb] font-mono">
                            <Clock className="h-3 w-3" />
                            {fmtClock(event.ts)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span 
                            className="rounded px-1 text-[9px] font-bold uppercase"
                            style={{ backgroundColor: `${meta.color}33`, color: meta.color }}
                          >
                            {meta.label}
                          </span>
                          {event.detail && (
                            <span className="truncate text-[11px] text-[#6b8a9c]">
                              {event.detail}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </section>
  );
}
