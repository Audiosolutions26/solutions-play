import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { PlayerProvider } from "@/hooks/use-player";
import { usePlayer } from "@/hooks/use-player";
import { ConfigProvider } from "@/hooks/use-config";
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
import { BeepDialog, BeepController } from "./BeepDialog";
import { SecoesDialog } from "./SecoesDialog";
import { AudioDevicesDialog } from "./AudioDevicesDialog";
import { StatusPanel } from "./StatusPanel";
import { OperatorLogin, operators, type Operator } from "./OperatorLogin";
import { getMarkers } from "@/lib/play-markers";
import { logEvent } from "@/lib/play-events";
import type { PanelVisibility } from "./AppMenu";

const tabs = ["Programação", "QuickStart", "Status", "Músicas executadas", "Textos ao vivo", "Texto do dia", "Locuções", "Hoje", "Mini site", "Anotações"];

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

// Quando a inserção no ar é um texto, abre o painel Textos ao vivo (manual p.36).
function LiveTextAutoOpen({ onOpen }: { onOpen: () => void }) {
  const { current } = usePlayer();
  useEffect(() => {
    if (current && current.category === "texto" && current.kind !== "textodia") onOpen();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id]);
  return null;
}

// Registra no log de status cada inserção que entra no ar (manual p.113).
function ProgramLogger() {
  const { current } = usePlayer();
  useEffect(() => {
    if (current) logEvent("programa", `No ar: ${current.title}`, current.artist);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id]);
  return null;
}

// Texto do dia (manual p.36): ao chegar a vez na programação, abre o painel e
// lê o texto automaticamente por voz (TTS).
function TextoDoDiaAutoPlay({ onOpen }: { onOpen: () => void }) {
  const { current } = usePlayer();
  useEffect(() => {
    if (current?.kind === "textodia") {
      onOpen();
      try {
        const synth = window.speechSynthesis;
        synth.cancel();
        const u = new SpeechSynthesisUtterance(current.body || current.title);
        u.lang = "pt-BR";
        u.rate = 1;
        synth.speak(u);
      } catch { /* ignore */ }
    } else {
      try { window.speechSynthesis?.cancel(); } catch { /* ignore */ }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id]);
  return null;
}

// Marcadores em execução (manual p.113-119): dispara o evento de cada marcador
// no momento exato em que a posição do áudio cruza a marca.
function MarkerController() {
  const { current, position, getEngine, next, setVolume, volume } = usePlayer();
  const idRef = useRef<string | null>(null);
  const firedRef = useRef<Set<string>>(new Set());
  const fadeTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const preFade = useRef<number | null>(null);

  useEffect(() => {
    if (!current) { idRef.current = null; firedRef.current.clear(); return; }
    if (idRef.current !== current.id) {
      if (fadeTimer.current) { clearInterval(fadeTimer.current); fadeTimer.current = null; }
      if (preFade.current != null) { setVolume(preFade.current); preFade.current = null; }
      idRef.current = current.id;
      firedRef.current = new Set();
    }
    const markers = getMarkers(current.id);
    if (!markers.length) return;
    const eng = getEngine();
    for (const m of markers) {
      const at = m.pos * current.duration;
      const key = `${m.kind}:${m.pos}`;
      if (position < at || firedRef.current.has(key)) continue;
      firedRef.current.add(key);
      switch (m.kind) {
        case "annotation":
          if (m.note) { toast.info(`📝 ${m.note}`); logEvent("marcador", "Anotação", m.note); }
          break;
        case "introEnd":
          toast.message("Fim da introdução — locutor liberado.");
          logEvent("marcador", "Fim da introdução", current.title);
          break;
        case "locStart":
          toast.message("🎙️ Início de locução.");
          logEvent("locucao", "Início de locução", current.title);
          break;
        case "carimbo":
          eng.fire(current.freq > 0 ? current.freq : 330, 0.5);
          toast.message("Carimbo (Hora Certa) disparado.");
          logEvent("carimbo", "Carimbo disparado", current.title);
          break;
        case "fadeOutStart": {
          preFade.current = volume;
          const startVol = volume;
          const remaining = Math.max(0.4, current.duration - at);
          let t = 0;
          if (fadeTimer.current) clearInterval(fadeTimer.current);
          fadeTimer.current = setInterval(() => {
            t += 0.1;
            const f = Math.max(0, 1 - t / remaining);
            setVolume(startVol * f);
            if (f <= 0 && fadeTimer.current) { clearInterval(fadeTimer.current); fadeTimer.current = null; }
          }, 100);
          logEvent("marcador", "Início do Fade-Out", current.title);
          break;
        }
        case "nextEntry":
          logEvent("marcador", "Entrada do próximo", current.title);
          next();
          break;
        default:
          break;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id, position]);

  return null;
}

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

  const togglePanel = (key: keyof PanelVisibility) =>
    setPanels((p) => ({ ...p, [key]: !p[key] }));
  const openOptions = (tab: string) => setOptions({ open: true, tab });
  const openAdvanced = (tab: string) => setAdvanced({ open: true, tab });

  return (
    <ConfigProvider>
    <PlayerProvider>
      <KeyboardShortcuts />
      <BeepController />
      <MarkerController />
      <ProgramLogger />
      <TextoDoDiaAutoPlay onOpen={() => setActiveTab("Texto do dia")} />
      <LiveTextAutoOpen onOpen={() => setActiveTab("Textos ao vivo")} />
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
      <BeepDialog open={beepOpen} onOpenChange={setBeepOpen} />
      <SecoesDialog open={secoesOpen} onOpenChange={setSecoesOpen} />
      <AudioDevicesDialog open={devicesOpen} onOpenChange={setDevicesOpen} />
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