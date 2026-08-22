import { Fragment, useEffect, useRef, useState } from "react";
import { Folder, Info, Zap } from "lucide-react";
import { toast } from "sonner";
import { PlayerProvider } from "@/hooks/use-player";
import { ConfigProvider } from "@/hooks/use-config";
import { ShortcutsProvider } from "@/hooks/use-shortcuts";
import { TopBar } from "./TopBar";
import { OnAirBar } from "./OnAirBar";
import { ProgramPanel } from "./ProgramPanel";
import { StudioDecksPanel } from "./StudioDecksPanel";
import { FoldersPanel } from "./FoldersPanel";
import { PropertiesPanel } from "./PropertiesPanel";
import { QuickStartPanel } from "./QuickStartPanel";
import { LocucoesPanel } from "./LocucoesPanel";
import {
  PlayedPanel,
  TodayPanel,
  NotesPanel,
  LiveTextPanel,
  MiniSitePanel,
  TextoDoDiaPanel,
} from "./BottomPanels";
import { OptionsDialog } from "./OptionsDialog";
import { RecursosAvancadosDialog } from "./RecursosAvancadosDialog";
import { BeepDialog } from "./BeepDialog";
import { SecoesDialog } from "./SecoesDialog";
import { AudioDevicesDialog } from "./AudioDevicesDialog";
import { ShortcutsDialog } from "./ShortcutsDialog";
import { ProgramFoldersDialog } from "./ProgramFoldersDialog";
import { StatusPanel } from "./StatusPanel";
import { OperatorLogin, operators, type Operator } from "./OperatorLogin";
import { PlayerControllers } from "./PlayerControllers";
import { useAppUiState } from "@/hooks/use-app-ui-state";
import { useDockLayout, type DockId } from "@/hooks/use-dock-layout";
import { DockFrame } from "./DockFrame";
import { ResizeHandle } from "./ResizeHandle";
import { applyRouting } from "@/lib/play-outputs";

const tabs = [
  "Programação",
  "QuickStart",
  "Status",
  "Músicas executadas",
  "Textos ao vivo",
  "Texto do dia",
  "Locuções",
  "Hoje",
  "Mini site",
  "Anotações",
];

export function PlayApp() {
  const [operator, setOperator] = useState<Operator>(operators[0]);
  const [loginMode, setLoginMode] = useState<null | "switch" | "logout">(null);
  const ui = useAppUiState();
  const { activeTab, setActiveTab } = ui;
  const dock = useDockLayout();
  const splitRef = useRef<HTMLDivElement>(null);
  const rightColRef = useRef<HTMLDivElement>(null);

  const DOCK_DATA = "application/x-solplay-dock";

  // Conteúdo de cada grid encaixável (sem o cabeçalho próprio — o DockFrame
  // fornece o cabeçalho padrão com os controles de tamanho/fechar).
  const dockMeta: Record<DockId, { title: string; icon: typeof Folder; node: React.ReactNode }> = {
    pastas: {
      title: "Pastas de trabalho",
      icon: Folder,
      node: <FoldersPanel embedded onManage={() => ui.setShortcutsOpen(true)} />,
    },
    propriedades: { title: "Propriedades", icon: Info, node: <PropertiesPanel embedded /> },
    quickstart: { title: "QuickStart", icon: Zap, node: <QuickStartPanel embedded /> },
  };

  // Arrastar a divisória vertical (largura da coluna direita).
  const onVDrag = (clientX: number) => {
    const r = splitRef.current?.getBoundingClientRect();
    if (!r) return;
    dock.setRightWidth(((r.right - clientX) / r.width) * 100);
  };

  // Arrastar a divisória horizontal entre os grids open[i] e open[i+1].
  const onHDrag = (i: number, _x: number, clientY: number) => {
    const r = rightColRef.current?.getBoundingClientRect();
    if (!r) return;
    const ids = dock.open;
    const a = ids[i],
      b = ids[i + 1];
    const sum = ids.reduce((s, id) => s + dock.weights[id], 0) || 1;
    const H = r.height;
    let top = 0;
    for (let k = 0; k < i; k++) top += (H * dock.weights[ids[k]]) / sum;
    const combinedPx = (H * (dock.weights[a] + dock.weights[b])) / sum;
    const minPx = 72;
    const newA = Math.min(
      Math.max(clientY - r.top - top, minPx),
      Math.max(minPx, combinedPx - minPx),
    );
    const newB = combinedPx - newA;
    const combinedW = dock.weights[a] + dock.weights[b];
    dock.setWeights({ [a]: (combinedW * newA) / combinedPx, [b]: (combinedW * newB) / combinedPx });
  };

  const onDockDrop = (e: React.DragEvent) => {
    const id = e.dataTransfer.getData(DOCK_DATA) as DockId;
    if (!id) return;
    e.preventDefault();
    if (dock.open.includes(id)) return;
    dock.openPanel(id);
    toast.success("QuickStart fixado nos painéis");
  };

  // Aplica o roteamento de saídas salvo ao iniciar (manual p.111).
  useEffect(() => {
    void applyRouting();
  }, []);

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
              panels={{
                pastas: dock.open.includes("pastas"),
                propriedades: dock.open.includes("propriedades"),
              }}
              onTogglePanel={(k) => dock.togglePanel(k)}
              onOpenOptions={ui.openOptions}
              onLogout={() => setLoginMode("logout")}
              onSwitchOperator={() => setLoginMode("switch")}
              onOpenQuickStart={() => setActiveTab("QuickStart")}
              onOpenAdvanced={ui.openAdvanced}
              onOpenBeep={() => ui.setBeepOpen(true)}
              onOpenSecoes={() => ui.setSecoesOpen(true)}
              onOpenDevices={() => ui.setDevicesOpen(true)}
              onOpenShortcuts={() => ui.setShortcutsOpen(true)}
              onDockQuickStart={() => {
                dock.openPanel("quickstart");
                toast.success("QuickStart fixado nos painéis");
              }}
              onOpenProgramFolders={() => ui.setProgramFoldersOpen(true)}
            />
            <OnAirBar />
            {activeTab === "Programação" && <StudioDecksPanel />}
            <div ref={splitRef} className="flex h-0 min-h-0 flex-1 overflow-hidden">
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
                  {/* Studio SOHO: playlist/Final Log no centro, painéis operacionais à direita */}
                  <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col border-r border-pl-toolbar-dark bg-pl-row">
                    <ProgramPanel />
                  </div>
                  {/* right: grids encaixáveis (redimensionáveis / fecháveis) */}
                  {dock.open.length > 0 && (
                    <>
                      <ResizeHandle orientation="vertical" onDrag={(x) => onVDrag(x)} />
                      <div
                        ref={rightColRef}
                        style={{ width: `${dock.rightWidth}%` }}
                        className="flex h-full min-w-[300px] flex-col"
                        onDragOver={(e) => {
                          if (e.dataTransfer.types.includes(DOCK_DATA)) e.preventDefault();
                        }}
                        onDrop={onDockDrop}
                      >
                        {dock.open.map((id, i) => (
                          <Fragment key={id}>
                            <DockFrame
                              title={dockMeta[id].title}
                              icon={dockMeta[id].icon}
                              grow={dock.weights[id]}
                              onGrow={() => dock.grow(id)}
                              onShrink={() => dock.shrink(id)}
                              onClose={() => dock.closePanel(id)}
                            >
                              {dockMeta[id].node}
                            </DockFrame>
                            {i < dock.open.length - 1 && (
                              <ResizeHandle
                                orientation="horizontal"
                                onDrag={(x, y) => onHDrag(i, x, y)}
                              />
                            )}
                          </Fragment>
                        ))}
                      </div>
                    </>
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
                  draggable={tab === "QuickStart"}
                  onDragStart={
                    tab === "QuickStart"
                      ? (e) => {
                          e.dataTransfer.setData(DOCK_DATA, "quickstart");
                          e.dataTransfer.effectAllowed = "copy";
                        }
                      : undefined
                  }
                  title={
                    tab === "QuickStart"
                      ? "Clique para abrir, ou arraste para fixar como grid nos painéis"
                      : undefined
                  }
                  className={`rounded-t px-3 py-1 text-[11px] font-medium ${
                    activeTab === tab
                      ? "bg-pl-row text-pl-text"
                      : "bg-pl-toolbar text-white/90 hover:bg-pl-toolbar-light"
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
          <OptionsDialog
            open={ui.options.open}
            onOpenChange={ui.setOptionsOpen}
            tab={ui.options.tab}
          />
          <BeepDialog open={ui.isBeepOpen} onOpenChange={ui.setBeepOpen} />
          <SecoesDialog open={ui.isSecoesOpen} onOpenChange={ui.setSecoesOpen} />
          <AudioDevicesDialog open={ui.isDevicesOpen} onOpenChange={ui.setDevicesOpen} />
          <ShortcutsDialog open={ui.isShortcutsOpen} onOpenChange={ui.setShortcutsOpen} />
          <ProgramFoldersDialog
            open={ui.isProgramFoldersOpen}
            onOpenChange={ui.setProgramFoldersOpen}
            onLoaded={() => setActiveTab("Programação")}
          />
          <RecursosAvancadosDialog
            open={ui.advanced.open}
            onOpenChange={ui.setAdvancedOpen}
            defaultTab={ui.advanced.tab}
            onGenerated={() => setActiveTab("Programação")}
          />
          {loginMode && (
            <OperatorLogin
              current={loginMode === "switch" ? operator : null}
              onLogin={(op) => {
                setOperator(op);
                setLoginMode(null);
              }}
              onCancel={loginMode === "switch" ? () => setLoginMode(null) : undefined}
            />
          )}
        </PlayerProvider>
      </ShortcutsProvider>
    </ConfigProvider>
  );
}
