import { Play, Pause, SkipForward, Square, ChevronUp, ChevronDown, Music, X } from "lucide-react";
import { Headphones } from "lucide-react";
import { toast } from "sonner";
import { cuePlayAt } from "@/lib/play-cue";
import { getMarkers } from "@/lib/play-markers";
import { getEffectiveMarkers } from "@/lib/play-effective-markers";
import { useConfig } from "@/hooks/use-config";
import { mixTimeForTrack } from "@/lib/play-mixagem";
import { passagePreviewStartSec, resolveTransitionPlan } from "@/lib/play-transition";
import { usePlayer } from "@/hooks/use-player";

function TButton({
  onClick,
  title,
  children,
  danger,
  disabled,
}: {
  onClick?: () => void;
  title: string;
  children: React.ReactNode;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      disabled={disabled}
      aria-disabled={disabled}
      className={`grid h-9 w-10 place-items-center rounded text-white shadow-sm transition active:translate-y-px ${
        disabled
          ? "cursor-not-allowed opacity-40 grayscale brightness-75 active:translate-y-0"
          : danger
            ? "bg-gradient-to-b from-red-400 to-red-600 hover:from-red-300"
            : "bg-gradient-to-b from-pl-transport to-pl-transport-dark hover:brightness-110"
      } ${disabled ? "bg-gradient-to-b from-pl-transport to-pl-transport-dark" : ""}`}
    >
      {children}
    </button>
  );
}

export function TransportBar() {
  const { config } = useConfig();
  const {
    isPlaying,
    togglePlay,
    nextManual,
    stop,
    selectedId,
    blocks,
    moveTrack,
    removeTrack,
    currentBlockId,
    current,
  } = usePlayer();

  const requireSel = (): boolean => {
    if (!selectedId) {
      toast.info("Selecione uma inserção primeiro.");
      return false;
    }
    return true;
  };
  const blockOfSelected = () => blocks.find((b) => b.items.some((t) => t.id === selectedId))?.id;
  const moveSel = (dir: -1 | 1) => {
    if (requireSel()) moveTrack(selectedId!, dir);
  };
  const removeSel = () => {
    if (!requireSel()) return;
    const bid = blockOfSelected() ?? currentBlockId;
    if (bid) {
      removeTrack(bid, selectedId!);
      toast.success("Inserção removida.");
    }
  };
  const previewPassage = () => {
    if (!current || !currentBlockId) {
      toast.info("Nenhuma inserção está no ar.");
      return;
    }
    const bi = blocks.findIndex((block) => block.id === currentBlockId);
    const ti = bi >= 0 ? blocks[bi].items.findIndex((track) => track.id === current.id) : -1;
    const next =
      bi >= 0 && ti >= 0 && ti + 1 < blocks[bi].items.length
        ? blocks[bi].items[ti + 1]
        : bi >= 0
          ? blocks.slice(bi + 1).find((block) => block.items.length)?.items[0]
          : undefined;
    if (!next) {
      toast.info("Não há próxima inserção para pré-escutar.");
      return;
    }
    const plan = resolveTransitionPlan({
      current,
      next,
      currentMarkers: getEffectiveMarkers(current, getMarkers(current.id), current.duration, {
        config,
      }),
      nextMarkers: getEffectiveMarkers(next, getMarkers(next.id), next.duration, { config }),
      mixMs: mixTimeForTrack(current, config),
      useMarkerMix: true,
      useStartMix: true,
    });
    const start = passagePreviewStartSec(plan, 5);
    void cuePlayAt(current, start, plan.currentEndSec, "passage");
    toast.message(`Pré-escuta da passagem: ${start.toFixed(1)}s antes da entrada`);
  };
  return (
    <div className="flex items-center gap-1.5 border-b border-pl-panel-dark bg-pl-panel px-2 py-1.5">
      <TButton
        onClick={() => {
          if (!isPlaying) togglePlay();
        }}
        title={isPlaying ? "No ar (tocando)" : "Tocar"}
        disabled={isPlaying}
      >
        <Play className="h-5 w-5" />
      </TButton>
      <TButton
        onClick={() => {
          if (isPlaying) togglePlay();
        }}
        title="Pausar"
        disabled={!isPlaying}
      >
        <Pause className="h-5 w-5" />
      </TButton>
      <TButton onClick={nextManual} title="Próxima (com fade)">
        <SkipForward className="h-5 w-5" />
      </TButton>
      <TButton onClick={previewPassage} title="Pré-escutar passagem — 5 segundos antes da mixagem">
        <Headphones className="h-5 w-5" />
      </TButton>
      <TButton onClick={stop} title="Parar">
        <Square className="h-4 w-4" />
      </TButton>
      <div className="ml-auto flex items-center gap-1.5">
        <TButton onClick={() => moveSel(-1)} title="Subir inserção">
          <ChevronUp className="h-5 w-5" />
        </TButton>
        <TButton onClick={() => moveSel(1)} title="Descer inserção">
          <ChevronDown className="h-5 w-5" />
        </TButton>
        <TButton
          onClick={() =>
            toast.info("Arraste uma música da guia Pastas ou use o botão + para inserir.")
          }
          title="Inserir música"
        >
          <Music className="h-5 w-5" />
        </TButton>
        <TButton onClick={removeSel} title="Remover" danger>
          <X className="h-5 w-5" />
        </TButton>
      </div>
    </div>
  );
}
