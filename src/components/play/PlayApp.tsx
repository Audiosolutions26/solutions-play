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
import { useAppUiState } from "@/hooks/use-app-ui-state";
import { applyRouting } from "@/lib/play-outputs";

const tabs = ["Programação", "QuickStart", "Status", "Músicas executadas", "Textos ao vivo", "Texto do dia", "Locuções", "Hoje", "Mini site", "Anotações"];

export function PlayApp() {
  const [operator, setOperator] = useState<Operator>(operators[0]);
  const [loginMode, setLoginMode] = useState<null | "switch" | "logout">(null);
  const ui = useAppUiState();
  const { activeTab, setActiveTab, panels, togglePanel } = ui;

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
          onOpenOptions={ui.openOptions}
          onLogout={() => setLoginMode("logout")}
          onSwitchOperator={() => setLoginMode("switch")}
          onOpenQuickStart={() => setActiveTab("QuickStart")}
          onOpenAdvanced={ui.openAdvanced}
          onOpenBeep={() => ui.setBeepOpen(true)}
          onOpenSecoes={() => ui.setSecoesOpen(true)}
          onOpenDevices={() => ui.setDevicesOpen(true)}
          onOpenShortcuts={() => ui.setShortcutsOpen(true)}
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
                      <FoldersPanel onManage={() => ui.setShortcutsOpen(true)} />
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
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`rounded-t px-3 py-1 text-[11px] font-medium ${
                activeTab === tab ? "bg-pl-row text-pl-text" : "bg-pl-toolbar text-white/90 hover:bg-pl-toolbar-light"
              }`}
            >
              {tab}
            </button>
          ))}
          <span className="ml-auto pr-2 text-[10px] text-white/70">
            {operator.name} • {operator.role} • Solutions-Play demo
          </span>
        </div>
      </div>
      <OptionsDialog open={ui.options.open} onOpenChange={ui.setOptionsOpen} tab={ui.options.tab} />
      <BeepDialog open={ui.isBeepOpen} onOpenChange={ui.setBeepOpen} />
      <SecoesDialog open={ui.isSecoesOpen} onOpenChange={ui.setSecoesOpen} />
      <AudioDevicesDialog open={ui.isDevicesOpen} onOpenChange={ui.setDevicesOpen} />
      <ShortcutsDialog open={ui.isShortcutsOpen} onOpenChange={ui.setShortcutsOpen} />
      <RecursosAvancadosDialog
        open={ui.advanced.open}
        onOpenChange={ui.setAdvancedOpen}
        defaultTab={ui.advanced.tab}
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