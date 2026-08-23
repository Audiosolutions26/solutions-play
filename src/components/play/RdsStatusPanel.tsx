import { useMemo, useState } from "react";
import { Radio, RefreshCw, Clipboard, Settings } from "lucide-react";
import { toast } from "sonner";
import { useConfig } from "@/hooks/use-config";
import { usePlayer } from "@/hooks/use-player";
import { rdsLabel } from "@/lib/play-rds";
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

export function RdsStatusPanel() {
  const { get } = useConfig();
  const { current, position } = usePlayer();
  const station = String(get("configuracoes.avancado.advTitulo") || "Solutions Play");
  const configuredPs = String(get("configuracoes.rds.rdsTexto") || "").trim();
  const ps = (configuredPs || shortStationName(station)).slice(0, 8).toUpperCase();
  const rt = rdsLabel(current) || "Aguardando programação";
  const rtPlus = current
    ? `${current.artist || station} - ${current.title}`.slice(0, 64)
    : "Aguardando programação";

  const remaining = current?.duration ? Math.max(0, current.duration - position) : 0;

  const copyText = async (label: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copiado`);
    } catch {
      toast.error("Não foi possível copiar o metadado");
    }
  };

  return (
    <section className="flex h-full flex-col overflow-hidden bg-[#242424] text-[#dbe8f0]">
      {/* Next Break / Timer Section */}
      <div className="flex h-1/2 flex-col border-b border-[#333]">
        <div className="flex h-7 items-center bg-[#b0b0b0] px-3">
          <span className="text-[14px] font-bold text-[#222]">Next Break</span>
        </div>
        <div className="flex flex-1 items-center justify-center bg-[#1a1a1a]">
          <span className="font-mono text-[72px] font-medium leading-none text-white">
            {pfmt(remaining)}
          </span>
        </div>
      </div>

      {/* RDS Section */}
      <div className="flex flex-1 flex-col">
        <div className="flex h-7 items-center justify-between bg-[#b0b0b0] px-3">
          <div className="flex items-center gap-2">
            <Radio className="h-4 w-4 text-[#222]" />
            <span className="text-[14px] font-bold text-[#222]">R·D·S</span>
          </div>
          <button className="flex items-center gap-1 rounded bg-[#333]/20 px-2 py-0.5 text-[11px] font-bold text-[#222] hover:bg-black/10">
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
          <span className="text-[14px] font-bold text-[#222]">Problems</span>
          <button className="flex items-center gap-1 rounded bg-[#333]/20 px-2 py-0.5 text-[11px] font-bold text-[#222] hover:bg-black/10">
            Details
          </button>
        </div>
      </div>
    </section>
  );
}
