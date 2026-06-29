import { useEffect, useState } from "react";
import { PlayerProvider } from "@/hooks/use-player";
import { usePlayer } from "@/hooks/use-player";
import { ConfigProvider } from "@/hooks/use-config";
import { TopBar } from "./TopBar";
import { OnAirBar } from "./OnAirBar";
import { ProgramPanel } from "./ProgramPanel";
import { FoldersPanel } from "./FoldersPanel";
import { PropertiesPanel } from "./PropertiesPanel";
import { QuickStartPanel } from "./QuickStartPanel";
import { PlayedPanel, TodayPanel, NotesPanel, LiveTextPanel, MiniSitePanel } from "./BottomPanels";
import { OptionsDialog } from "./OptionsDialog";
import { RecursosAvancadosDialog } from "./RecursosAvancadosDialog";
import { OperatorLogin, operators, type Operator } from "./OperatorLogin";
import type { PanelVisibility } from "./AppMenu";

const tabs = ["Programação", "QuickStart", "Músicas executadas", "Textos ao vivo", "Hoje", "Mini site", "Anotações"];

// Atalhos de teclado (manual p.16, 18, 30): Espaço = Tocar/Passar, Delete = Remover.
function KeyboardShortcuts() {
  const { togglePlay, selectedId, blocks, removeTrack } = usePlayer();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable)) return;
      if (e.code === "Space") {
        e.preventDefault();
        togglePlay();
      } else if (e.key === "Delete" && selectedId) {
        const block = blocks.find((b) => b.items.some((t) => t.id === selectedId));
        if (block) removeTrack(block.id, selectedId);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [togglePlay, selectedId, blocks, removeTrack]);
  return null;
}

export function PlayApp() {
  const [operator, setOperator] = useState<Operator>(operators[0]);
  const [loginMode, setLoginMode] = useState<null | "switch" | "logout">(null);
  const [panels, setPanels] = useState<PanelVisibility>({ pastas: true, propriedades: true });
  const [activeTab, setActiveTab] = useState("Programação");
  const [options, setOptions] = useState<{ open: boolean; tab: string }>({ open: false, tab: "geral" });
  const [advanced, setAdvanced] = useState<{ open: boolean; tab: string }>({ open: false, tab: "ini" });

  const togglePanel = (key: keyof PanelVisibility) =>
    setPanels((p) => ({ ...p, [key]: !p[key] }));
  const openOptions = (tab: string) => setOptions({ open: true, tab });
  const openAdvanced = (tab: string) => setAdvanced({ open: true, tab });

  return (
    <ConfigProvider>
    <PlayerProvider>
      <KeyboardShortcuts />
      <div className="flex h-screen w-full flex-col overflow-hidden bg-pl-panel text-pl-text">
        <TopBar
          panels={panels}
          onTogglePanel={togglePanel}
          onOpenOptions={openOptions}
          onLogout={() => setLoginMode("logout")}
          onSwitchOperator={() => setLoginMode("switch")}
          onOpenQuickStart={() => setActiveTab("QuickStart")}
          onOpenAdvanced={openAdvanced}
        />
        <OnAirBar />
        <div className="flex min-h-0 flex-1">
          {activeTab === "QuickStart" ? (
            <QuickStartPanel />
          ) : activeTab === "Músicas executadas" ? (
            <PlayedPanel />
          ) : activeTab === "Textos ao vivo" ? (
            <LiveTextPanel />
          ) : activeTab === "Hoje" ? (
            <TodayPanel />
          ) : activeTab === "Mini site" ? (
            <MiniSitePanel />
          ) : activeTab === "Anotações" ? (
            <NotesPanel />
          ) : (
            <>
              {/* left: programação */}
              <div className="flex min-w-0 flex-[1.6] flex-col border-r border-pl-toolbar-dark">
                <ProgramPanel />
              </div>
              {/* right: pastas + propriedades */}
              {(panels.pastas || panels.propriedades) && (
                <div className="flex w-[40%] min-w-[320px] flex-col">
                  {panels.pastas && (
                    <div className="min-h-0 flex-[1.4] border-b border-pl-toolbar-dark">
                      <FoldersPanel />
                    </div>
                  )}
                  {panels.propriedades && (
                    <div className="min-h-0 flex-1">
                      <PropertiesPanel />
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
        {/* bottom tabs */}
        <div className="flex items-center gap-px border-t border-pl-toolbar-dark bg-pl-toolbar-dark px-1 py-0.5">
          {tabs.map((t) => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={`rounded-t px-3 py-1 text-[11px] font-medium ${
                activeTab === t ? "bg-pl-row text-pl-text" : "bg-pl-toolbar text-white/90 hover:bg-pl-toolbar-light"
              }`}
            >
              {t}
            </button>
          ))}
          <span className="ml-auto pr-2 text-[10px] text-white/70">
            {operator.name} • {operator.role} • Solutions-Play demo
          </span>
        </div>
      </div>
      <OptionsDialog open={options.open} onOpenChange={(v) => setOptions((o) => ({ ...o, open: v }))} tab={options.tab} />
      <RecursosAvancadosDialog
        open={advanced.open}
        onOpenChange={(v) => setAdvanced((a) => ({ ...a, open: v }))}
        defaultTab={advanced.tab}
        onGenerated={() => setActiveTab("Programação")}
      />
      {loginMode && (
        <OperatorLogin
          current={loginMode === "switch" ? operator : null}
          onLogin={(op) => { setOperator(op); setLoginMode(null); }}
          onCancel={loginMode === "switch" ? () => setLoginMode(null) : undefined}
        />
      )}
    </PlayerProvider>
    </ConfigProvider>
  );
}