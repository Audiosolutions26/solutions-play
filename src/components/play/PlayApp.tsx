import { useEffect, useState } from "react";
import { PlayerProvider } from "@/hooks/use-player";
import { ConfigProvider } from "@/hooks/use-config";
import { ShortcutsProvider } from "@/hooks/use-shortcuts";
import { TopBar } from "./TopBar";
import { OnAirBar } from "./OnAirBar";
import { ProgramPanel } from "./ProgramPanel";
import { FoldersPanel } from "./FoldersPanel";
import { PropertiesPanel } from "./PropertiesPanel";
import { QuickStartPanel } from "./QuickStartPanel";
import { LocucoesPanel } from "./LocucoesPanel";
import { PlayedPanel, TodayPanel, NotesPanel, LiveTextPanel, MiniSitePanel, TextoDoDiaPanel } from "./BottomPanels";
import { OptionsDialog } from "./OptionsDialog";
import { RecursosAvancadosDialog } from "./RecursosAvancadosDialog";
import { BeepDialog } from "./BeepDialog";
import { SecoesDialog } from "./SecoesDialog";
import { AudioDevicesDialog } from "./AudioDevicesDialog";
import { ShortcutsDialog } from "./ShortcutsDialog";
import { StatusPanel } from "./StatusPanel";
import { OperatorLogin, operators, type Operator } from "./OperatorLogin";
import { PlayerControllers } from "./PlayerControllers";
import { applyRouting } from "@/lib/play-outputs";
import type { PanelVisibility } from "./AppMenu";

const tabs = ["Programação", "QuickStart", "Status", "Músicas executadas", "Textos ao vivo", "Texto do dia", "Locuções", "Hoje", "Mini site", "Anotações"];

export function PlayApp() {
  const [operator, setOperator] = useState<Operator>(operators[0]);
  const [loginMode, setLoginMode] = useState<null | "switch" | "logout">(null);
  const [panels, setPanels] = useState<PanelVisibility>({ pastas: true, propriedades: true });
  const [activeTab, setActiveTab] = useState("Programação");
  const [options, setOptions] = useState<{ open: boolean; tab: string }>({ open: false, tab: "geral" });
  const [advanced, setAdvanced] = useState<{ open: boolean; tab: string }>({ open: false, tab: "ini" });
  const [beepOpen, setBeepOpen] = useState(false);
  const [secoesOpen, setSecoesOpen] = useState(false);
  const [devicesOpen, setDevicesOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  const togglePanel = (key: keyof PanelVisibility) =>
    setPanels((p) => ({ ...p, [key]: !p[key] }));
  const openOptions = (tab: string) => setOptions({ open: true, tab });
  const openAdvanced = (tab: string) => setAdvanced({ open: true, tab });

  // Aplica o roteamento de saídas salvo ao iniciar (manual p.111).
  useEffect(() => { void applyRouting(); }, []);

  return (
    <ConfigProvider>
    <ShortcutsProvider>
    <PlayerProvider>
      <PlayerControllers
        onOpenTextoDoDia={() => setActiveTab("Texto do dia")}
        onOpenLiveText={() => setActiveTab("Textos ao vivo")}
      />
      <div className="flex h-screen w-full flex-col overflow-hidden bg-pl-panel text-pl-text">
        <TopBar
          panels={panels}
          onTogglePanel={togglePanel}
          onOpenOptions={openOptions}
          onLogout={() => setLoginMode("logout")}
          onSwitchOperator={() => setLoginMode("switch")}
          onOpenQuickStart={() => setActiveTab("QuickStart")}
          onOpenAdvanced={openAdvanced}
          onOpenBeep={() => setBeepOpen(true)}
          onOpenSecoes={() => setSecoesOpen(true)}
          onOpenDevices={() => setDevicesOpen(true)}
          onOpenShortcuts={() => setShortcutsOpen(true)}
        />
        <OnAirBar />
        <div className="flex min-h-0 flex-1">
          {activeTab === "QuickStart" ? (
            <QuickStartPanel />
          ) : activeTab === "Status" ? (
            <StatusPanel />
          ) : activeTab === "Músicas executadas" ? (
            <PlayedPanel />
          ) : activeTab === "Textos ao vivo" ? (
            <LiveTextPanel />
          ) : activeTab === "Texto do dia" ? (
            <TextoDoDiaPanel />
          ) : activeTab === "Locuções" ? (
            <LocucoesPanel />
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
                      <FoldersPanel onManage={() => setShortcutsOpen(true)} />
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
      <BeepDialog open={beepOpen} onOpenChange={setBeepOpen} />
      <SecoesDialog open={secoesOpen} onOpenChange={setSecoesOpen} />
      <AudioDevicesDialog open={devicesOpen} onOpenChange={setDevicesOpen} />
      <ShortcutsDialog open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
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
    </ShortcutsProvider>
    </ConfigProvider>
  );
}