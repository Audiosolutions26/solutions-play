import { CalendarDays } from "lucide-react";
import { formatLongDate } from "@/lib/format";
import { PanelHeader } from "./PanelHeader";

const TODAY_FACTS = [
  "Dia Mundial do Rock — boas pautas para vinhetas temáticas.",
  "Lembrete: revisar o bloco comercial das 18h.",
  "Aniversário de fundação de várias rádios brasileiras.",
  "Dica: alternar trilhas para textos ao vivo melhora a dinâmica.",
];

// ---- Hoje (efemérides / fatos do dia) ----
export function TodayPanel() {
  const formattedDate = formatLongDate();
  return (
    <div className="flex h-full flex-col">
      <PanelHeader icon={CalendarDays} title="Hoje" />
      <div className="pl-scroll flex-1 overflow-y-auto bg-pl-row p-3">
        <div className="mb-3 rounded border border-pl-panel-dark/30 bg-white/60 p-3">
          <div className="text-[13px] font-bold capitalize text-pl-toolbar">{formattedDate}</div>
          <div className="text-[12px] text-muted-foreground">Detalhes, fatos históricos e jornalísticos do dia.</div>
        </div>
        <ul className="space-y-2">
          {TODAY_FACTS.map((fact, i) => (
            <li key={i} className="flex gap-2 rounded border border-pl-panel-dark/30 bg-white/40 p-2 text-[12px]">
              <span className="font-bold text-pl-toolbar">•</span> {fact}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
