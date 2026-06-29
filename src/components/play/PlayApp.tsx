import { PlayerProvider } from "@/hooks/use-player";
import { TopBar } from "./TopBar";
import { OnAirBar } from "./OnAirBar";
import { ProgramPanel } from "./ProgramPanel";
import { FoldersPanel } from "./FoldersPanel";
import { PropertiesPanel } from "./PropertiesPanel";

const tabs = ["Músicas executadas", "QuickStart", "Programadas", "Hoje", "Mini site", "Anotações"];

export function PlayApp() {
  return (
    <PlayerProvider>
      <div className="flex h-screen w-full flex-col overflow-hidden bg-pl-panel text-pl-text">
        <TopBar />
        <OnAirBar />
        <div className="flex min-h-0 flex-1">
          {/* left: programação */}
          <div className="flex min-w-0 flex-[1.6] flex-col border-r border-pl-toolbar-dark">
            <ProgramPanel />
          </div>
          {/* right: pastas + propriedades */}
          <div className="flex w-[40%] min-w-[320px] flex-col">
            <div className="min-h-0 flex-[1.4] border-b border-pl-toolbar-dark">
              <FoldersPanel />
            </div>
            <div className="min-h-0 flex-1">
              <PropertiesPanel />
            </div>
          </div>
        </div>
        {/* bottom tabs */}
        <div className="flex items-center gap-px border-t border-pl-toolbar-dark bg-pl-toolbar-dark px-1 py-0.5">
          {tabs.map((t, i) => (
            <button
              key={t}
              className={`rounded-t px-3 py-1 text-[11px] font-medium ${
                i === 0 ? "bg-pl-row text-pl-text" : "bg-pl-toolbar text-white/90 hover:bg-pl-toolbar-light"
              }`}
            >
              {t}
            </button>
          ))}
          <span className="ml-auto pr-2 text-[10px] text-white/60">Solutions-Play • modo demonstração</span>
        </div>
      </div>
    </PlayerProvider>
  );
}