import {
  FolderOpen, Save, Printer, Settings, Search, Scissors, Copy, Clipboard,
  RefreshCw, Info, Wand2, Calendar, Mic2, ListMusic, Radio, Zap, HelpCircle,
} from "lucide-react";
import { VuMeter } from "./VuMeter";
import { Clock } from "./Clock";
import { AppMenu, type PanelVisibility } from "./AppMenu";

const toolIcons = [
  FolderOpen, Save, Printer, Scissors, Copy, Clipboard, RefreshCw, Info,
  ListMusic, Radio, Calendar, Mic2, Wand2, Zap, Settings, Search, HelpCircle,
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
}) {
  return (
    <div className="select-none bg-gradient-to-b from-pl-toolbar-light to-pl-toolbar-dark text-white">
      {/* title bar */}
      <div className="flex items-center justify-between bg-pl-toolbar-dark px-2 py-0.5 text-[11px]">
        <div className="flex items-center gap-2 font-semibold tracking-wide">
          <Radio className="h-3.5 w-3.5" />
          Solutions-Play — Estação Demo
        </div>
        <div className="flex gap-1">
          <span className="grid h-3.5 w-3.5 place-items-center rounded-sm bg-white/15">_</span>
          <span className="grid h-3.5 w-3.5 place-items-center rounded-sm bg-white/15">▢</span>
          <span className="grid h-3.5 w-3.5 place-items-center rounded-sm bg-pl-banner">✕</span>
        </div>
      </div>
      {/* menu */}
      <div className="flex items-center gap-1 px-2 py-0.5">
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
        />
      </div>
      {/* toolbar row */}
      <div className="flex items-center gap-2 border-t border-white/15 px-2 py-1">
        <div className="flex items-center gap-0.5">
          {toolIcons.map((Icon, i) => (
            <button
              key={i}
              className="grid h-7 w-7 place-items-center rounded border border-white/10 bg-white/10 hover:bg-white/25"
              title="ferramenta"
            >
              <Icon className="h-4 w-4" />
            </button>
          ))}
        </div>
        <div className="ml-2 flex items-center gap-2">
          <Clock />
          <div className="rounded bg-black/40 px-2 py-0.5 font-mono text-[13px] font-bold text-pl-vu-warn">
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