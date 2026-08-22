import { useMemo, useState } from "react";
import { Check, Clipboard, Radio, RefreshCw, Signal, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { useConfig } from "@/hooks/use-config";
import { usePlayer } from "@/hooks/use-player";
import { rdsLabel } from "@/lib/play-rds";
import type { Track } from "@/lib/play-data";

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

function findUpcoming(blocks: { items: Track[] }[], current: Track | null): Track[] {
  const all = blocks.flatMap((block) => block.items);
  if (!current) return all.slice(0, 5);
  const index = all.findIndex((track) => track.id === current.id);
  return (index >= 0 ? all.slice(index + 1) : all).slice(0, 5);
}

export function RdsStatusPanel() {
  const { get } = useConfig();
  const { blocks, current, isPlaying, position } = usePlayer();
  const [lastRefresh, setLastRefresh] = useState(() => new Date());
  const station = String(get("configuracoes.avancado.advTitulo") || "Solutions Play");
  const logoUrl = String(get("configuracoes.avancado.advLogoUrl") || "").trim();
  const configuredPs = String(get("configuracoes.rds.rdsTexto") || "").trim();
  const rdsEnabled = get("configuracoes.rds.rdsGerarArquivos") !== false;
  const currentText = rdsLabel(current) || "Sem inserção no ar";
  const upcoming = useMemo(() => findUpcoming(blocks, current), [blocks, current]);
  const ps = (configuredPs || shortStationName(station)).slice(0, 8).toUpperCase();
  const rt = currentText.slice(0, 64);
  const rtPlus = current
    ? `${current.artist || station} — ${current.title}`.slice(0, 64)
    : "Aguardando programação";
  const remaining = current?.duration ? Math.max(0, current.duration - position) : 0;
  const remainingLabel =
    remaining > 0
      ? `${Math.floor(remaining / 60)}:${String(Math.floor(remaining % 60)).padStart(2, "0")}`
      : "--:--";

  const copyText = async (label: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copiado`);
    } catch {
      toast.error("Não foi possível copiar o metadado");
    }
  };

  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[#101a22] text-[#dbe8f0]">
      <div className="flex items-center gap-2 border-b border-[#29485d] bg-[#162b3b] px-2 py-1.5">
        <div className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded border border-[#4e7894] bg-[#0b141b] text-[10px] font-black tracking-wider text-[#a9d7ee]">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={`Logomarca ${station}`}
              className="h-full w-full object-contain"
            />
          ) : (
            shortStationName(station)
          )}
        </div>
        <div className="min-w-0 flex-1 leading-tight">
          <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-white">
            <Radio className="h-3.5 w-3.5 text-[#70c5e9]" /> RDS / METADATA
          </div>
          <div className="truncate text-[10px] text-[#91acbb]">{station}</div>
        </div>
        <button
          type="button"
          title="Atualizar prévia RDS"
          onClick={() => setLastRefresh(new Date())}
          className="grid h-6 w-6 place-items-center rounded text-[#9fc2d8] hover:bg-white/10"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-2 overflow-auto p-2 xl:grid-cols-[1fr_1.15fr]">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[9px] font-bold uppercase tracking-wider text-[#7993a2]">
            <span>Saída RDS</span>
            <span className={rdsEnabled ? "text-[#65d77c]" : "text-[#dca858]"}>
              {rdsEnabled ? "ATIVA" : "DESATIVADA"}
            </span>
          </div>
          <div className="rounded border border-[#31576f] bg-[#0b1319] p-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[9px] text-[#7896a7]">PS</span>
              <button
                type="button"
                onClick={() => void copyText("PS", ps)}
                className="flex min-w-0 items-center gap-1 text-left font-mono text-[12px] font-bold text-[#e9f5fa] hover:text-white"
              >
                <span className="truncate">{ps}</span>
                <Clipboard className="h-3 w-3 shrink-0 text-[#6fa7c4]" />
              </button>
            </div>
          </div>
          <div className="rounded border border-[#31576f] bg-[#0b1319] p-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[9px] text-[#7896a7]">RT</span>
              <button
                type="button"
                onClick={() => void copyText("RT", rt)}
                className="flex min-w-0 items-center gap-1 text-right font-mono text-[10px] text-[#d8e9ef] hover:text-white"
              >
                <span className="truncate">{rt}</span>
                <Clipboard className="h-3 w-3 shrink-0 text-[#6fa7c4]" />
              </button>
            </div>
          </div>
          <div className="rounded border border-[#31576f] bg-[#0b1319] p-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[9px] text-[#7896a7]">RT+</span>
              <span className="truncate text-right text-[10px] text-[#aec8d4]">{rtPlus}</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 rounded border border-[#29485d] bg-[#15232d] px-1.5 py-1 text-[9px]">
            {rdsEnabled ? (
              <Signal className="h-3 w-3 text-[#65d77c]" />
            ) : (
              <TriangleAlert className="h-3 w-3 text-[#dca858]" />
            )}
            <span className="truncate text-[#9eb4c0]">
              {rdsEnabled ? "TXT/JSON em tempo real no desktop" : "Geração de arquivos desligada"}
            </span>
          </div>
        </div>

        <div className="min-w-0 space-y-1.5">
          <div className="flex items-center justify-between text-[9px] font-bold uppercase tracking-wider text-[#7993a2]">
            <span>NO AR / PRÓXIMAS</span>
            <span className={isPlaying ? "text-[#65d77c]" : "text-[#dca858]"}>
              {isPlaying ? "AO VIVO" : "PARADO"}
            </span>
          </div>
          <div className="rounded border border-[#31576f] bg-[#0b1319] p-1.5">
            <div className="mb-1 flex items-center justify-between gap-2">
              <span className="truncate text-[10px] font-bold text-white">{currentText}</span>
              <span className="shrink-0 font-mono text-[10px] text-[#70c5e9]">
                {remainingLabel}
              </span>
            </div>
            <div className="space-y-0.5">
              {upcoming.map((track, index) => (
                <div
                  key={track.id}
                  className="flex min-w-0 items-center gap-1.5 border-t border-white/5 py-0.5 text-[9px]"
                >
                  <span className="w-4 shrink-0 font-mono text-[#7699ac]">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="truncate text-[#b7cbd4]">{rdsLabel(track)}</span>
                </div>
              ))}
              {!upcoming.length && (
                <div className="py-1 text-[9px] text-[#738d9b]">Nenhuma próxima inserção</div>
              )}
            </div>
          </div>
          <div className="flex items-center justify-between gap-2 text-[8px] text-[#708b9a]">
            <span className="flex items-center gap-1">
              <Check className="h-3 w-3 text-[#65d77c]" /> PS / RT / RT+ preparados
            </span>
            <span>Atualizado {lastRefresh.toLocaleTimeString("pt-BR")}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
