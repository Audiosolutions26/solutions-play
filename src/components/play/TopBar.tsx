import {
  FolderOpen,
  Save,
  Printer,
  Settings,
  Search,
  Scissors,
  Copy,
  Clipboard,
  RefreshCw,
  Info,
  Wand2,
  Calendar,
  Mic2,
  ListMusic,
  Radio,
  Zap,
  HelpCircle,
} from "lucide-react";
import { VuMeter } from "./VuMeter";
import { Clock } from "./Clock";
import { AppMenu, type PanelVisibility } from "./AppMenu";

const toolIcons = [
  FolderOpen,
  Save,
  RefreshCw,
  Info,
  ListMusic,
  Radio,
  Calendar,
  Mic2,
  Settings,
  HelpCircle,
];

export function TopBar({
  panels,
  onTogglePanel,
  onOpenOptions,
  onLogout,
  onSwitchOperator,
  onOpenQuickStart,
  onOpenAdvanced,
  onOpenBeep,
  onOpenSecoes,
  onOpenDevices,
  onOpenShortcuts,
  onDockQuickStart,
  onOpenProgramFolders,
}: {
  panels: PanelVisibility;
  onTogglePanel: (key: keyof PanelVisibility) => void;
  onOpenOptions: (tab: string) => void;
  onLogout: () => void;
  onSwitchOperator: () => void;
  onOpenQuickStart: () => void;
  onOpenAdvanced: (tab: string) => void;
  onOpenBeep: () => void;
  onOpenSecoes: () => void;
  onOpenDevices: () => void;
  onOpenShortcuts: () => void;
  onDockQuickStart?: () => void;
  onOpenProgramFolders: () => void;
}) {
  return (
    <div className="select-none bg-gradient-to-b from-pl-toolbar-light to-pl-toolbar-dark text-white">
      {/* menu enxuto, no mesmo nível do SOHO; o título da janela fica a cargo do sistema operacional */}
      <div className="flex h-[22px] items-center gap-1 border-b border-white/10 bg-pl-toolbar-dark px-1">
        <AppMenu
          panels={panels}
          onTogglePanel={onTogglePanel}
          onOpenOptions={onOpenOptions}
          onLogout={onLogout}
          onSwitchOperator={onSwitchOperator}
          onOpenQuickStart={onOpenQuickStart}
          onOpenAdvanced={onOpenAdvanced}
          onOpenBeep={onOpenBeep}
          onOpenSecoes={onOpenSecoes}
          onOpenDevices={onOpenDevices}
          onOpenShortcuts={onOpenShortcuts}
          onDockQuickStart={onDockQuickStart}
          onOpenProgramFolders={onOpenProgramFolders}
        />
      </div>
      {/* control bar: modos e atalhos do Studio, inspirados no SOHO */}
      <div className="flex h-[22px] items-center gap-1 border-t border-white/10 bg-[#2d5f86] px-1 text-[9px] font-bold uppercase tracking-wide">
        <span className="mr-1 text-[8px] font-normal text-white/60">MODO</span>
        <button type="button" className="rounded bg-[#2e9c58] px-2 py-0.5 text-white shadow-inner">
          AUTO
        </button>
        <button
          type="button"
          className="rounded bg-white/10 px-2 py-0.5 text-white/75 hover:bg-white/20"
        >
          MANUAL
        </button>
        <button
          type="button"
          className="rounded bg-white/10 px-2 py-0.5 text-white/75 hover:bg-white/20"
        >
          RE-BROADCAST
        </button>
        <button
          type="button"
          className="rounded bg-white/10 px-2 py-0.5 text-white/75 hover:bg-white/20"
        >
          OFFLINE
        </button>
        <span className="mx-1 h-4 w-px bg-white/20" />
        <button
          type="button"
          onClick={() => onOpenAdvanced("gerar")}
          className="rounded bg-white/15 px-2 py-0.5 text-white hover:bg-white/25"
        >
          FINAL LOG
        </button>
        <button
          type="button"
          onClick={() => onOpenAdvanced("grade")}
          className="rounded bg-white/15 px-2 py-0.5 text-white hover:bg-white/25"
        >
          CLOCKS
        </button>
        <button
          type="button"
          onClick={onOpenQuickStart}
          className="rounded bg-white/15 px-2 py-0.5 text-white hover:bg-white/25"
        >
          INSTANT JINGLES
        </button>
        <span className="ml-auto hidden text-[8px] font-normal normal-case tracking-normal text-white/65 lg:inline">
          ganho original · saída local
        </span>
      </div>
      {/* toolbar row */}
      <div className="flex h-[34px] items-center gap-1 border-t border-white/15 px-1 py-0.5">
        <div className="flex items-center gap-0.5">
          {toolIcons.map((Icon, i) => (
            <button
              key={i}
              className="grid h-6 w-6 place-items-center rounded border border-white/10 bg-white/10 hover:bg-white/25"
              title="ferramenta"
            >
              <Icon className="h-4 w-4" />
            </button>
          ))}
        </div>
        <div className="ml-2 flex items-center gap-2">
          <Clock />
          <div className="rounded bg-black/40 px-1.5 py-0.5 font-mono text-[12px] font-bold text-pl-vu-warn">
            56'02
          </div>
        </div>
        <div className="ml-auto flex items-end gap-3 pr-1">
          <VuMeter label="L" />
          <VuMeter label="R" />
        </div>
      </div>
    </div>
  );
}
