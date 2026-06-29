import { Play, Pause, SkipForward, Square, Volume2, ChevronUp, ChevronDown, Music, X } from "lucide-react";
import { toast } from "sonner";
import { usePlayer } from "@/hooks/use-player";

function TButton({
  onClick, title, children, danger,
}: { onClick?: () => void; title: string; children: React.ReactNode; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`grid h-9 w-10 place-items-center rounded text-white shadow-sm transition active:translate-y-px ${
        danger
          ? "bg-gradient-to-b from-red-400 to-red-600 hover:from-red-300"
          : "bg-gradient-to-b from-pl-transport to-pl-transport-dark hover:brightness-110"
      }`}
    >
      {children}
    </button>
  );
}

export function TransportBar() {
  const { isPlaying, togglePlay, nextManual, stop, volume, setVolume, selectedId, blocks, moveTrack, removeTrack, currentBlockId } = usePlayer();

  const requireSel = (): boolean => {
    if (!selectedId) { toast.info("Selecione uma inserção primeiro."); return false; }
    return true;
  };
  const blockOfSelected = () =>
    blocks.find((b) => b.items.some((t) => t.id === selectedId))?.id;
  const moveSel = (dir: -1 | 1) => { if (requireSel()) moveTrack(selectedId!, dir); };
  const removeSel = () => {
    if (!requireSel()) return;
    const bid = blockOfSelected() ?? currentBlockId;
    if (bid) { removeTrack(bid, selectedId!); toast.success("Inserção removida."); }
  };
  return (
    <div className="flex items-center gap-1.5 border-b border-pl-panel-dark bg-pl-panel px-2 py-1.5">
      <TButton onClick={togglePlay} title={isPlaying ? "Pausar" : "Tocar"}>
        {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
      </TButton>
      <TButton onClick={() => !isPlaying && togglePlay()} title="Pausa">
        <Pause className="h-5 w-5" />
      </TButton>
      <TButton onClick={nextManual} title="Próxima (com fade)">
        <SkipForward className="h-5 w-5" />
      </TButton>
      <TButton onClick={stop} title="Parar">
        <Square className="h-4 w-4" />
      </TButton>
      <div className="mx-1 flex items-center gap-1">
        <Volume2 className="h-4 w-4 text-pl-text" />
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={volume}
          onChange={(e) => setVolume(Number(e.target.value))}
          className="h-1 w-28 cursor-pointer accent-pl-transport"
        />
      </div>
      <div className="ml-auto flex items-center gap-1.5">
        <TButton onClick={() => moveSel(-1)} title="Subir inserção"><ChevronUp className="h-5 w-5" /></TButton>
        <TButton onClick={() => moveSel(1)} title="Descer inserção"><ChevronDown className="h-5 w-5" /></TButton>
        <TButton onClick={() => toast.info("Arraste uma música da guia Pastas ou use o botão + para inserir.")} title="Inserir música"><Music className="h-5 w-5" /></TButton>
        <TButton onClick={removeSel} title="Remover" danger><X className="h-5 w-5" /></TButton>
      </div>
    </div>
  );
}