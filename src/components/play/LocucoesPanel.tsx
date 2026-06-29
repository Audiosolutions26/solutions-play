import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Mic, Square, FileAudio, Play, Pause, Trash2, ListPlus, Circle, HardDrive, ChevronUp, ChevronDown, GripVertical } from "lucide-react";
import { toast } from "sonner";
import { usePlayer } from "@/hooks/use-player";
import { fmt, makeLocucao } from "@/lib/play-data";
import { readAudioFile } from "@/lib/play-audio-files";
import {
  getLocucoes, subscribeLocucoes, addLocucao, removeLocucao, moveLocucao, reorderLocucao, resolveLocucaoUrl, type Locucao,
} from "@/lib/play-locucoes";
import { isDesktop, pickAudioFilesNative } from "@/lib/play-native";
import { AUDIO_ACCEPT } from "@/lib/audio-formats";
import { ensureMicPermission, loadDevicePrefs, micConstraints, applyOutput } from "@/lib/play-audio-devices";
import { logEvent } from "@/lib/play-events";

export function LocucoesPanel() {
  const locucoes = useSyncExternalStore(subscribeLocucoes, getLocucoes, getLocucoes);
  const { blocks, currentBlockId, addTrack } = usePlayer();
  const fileRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<{ id: string; place: "before" | "after" } | null>(null);

  // gravação
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recStart = useRef(0);

  useEffect(() => {
    audioRef.current = new Audio();
    audioRef.current.onended = () => setPlayingId(null);
    return () => { try { audioRef.current?.pause(); } catch { /* ignore */ } };
  }, []);

  useEffect(() => {
    if (!recording) return;
    const id = setInterval(() => setElapsed((Date.now() - recStart.current) / 1000), 200);
    return () => clearInterval(id);
  }, [recording]);

  // seletor nativo do Windows (caminhos persistidos)
  const pickNative = async () => {
    const picked = await pickAudioFilesNative();
    if (!picked) { fileRef.current?.click(); return; }
    for (const f of picked) {
      const dur = await durationOf(f.dataUrl);
      addLocucao(f.name, f.dataUrl, dur || 1, "arquivo", f.path);
    }
    if (picked.length) toast.success(`${picked.length} áudio(s) carregado(s) do Windows.`);
  };

  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    for (const file of files) {
      try {
        const { url, duration } = await readAudioFile(file);
        addLocucao(file.name.replace(/\.[^.]+$/, ""), url, duration, "arquivo");
      } catch { toast.error(`Falha ao carregar ${file.name}`); }
    }
    if (files.length) toast.success(`${files.length} locução(ões) carregada(s).`);
  };

  const startRec = async () => {
    const perm = await ensureMicPermission();
    if (perm === "denied") { toast.error("Permissão de microfone negada. Verifique as configurações do Windows."); return; }
    if (perm === "unsupported") { toast.error("Microfone não suportado neste ambiente."); return; }
    try {
      const prefs = loadDevicePrefs();
      const stream = await navigator.mediaDevices.getUserMedia(micConstraints(prefs.inputId));
      const rec = new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = (ev) => { if (ev.data.size) chunksRef.current.push(ev.data); };
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || "audio/webm" });
        const url = URL.createObjectURL(blob);
        const dur = await durationOf(url) || (Date.now() - recStart.current) / 1000;
        addLocucao(`Locução ${new Date().toLocaleTimeString("pt-BR")}`, url, dur || 1, "gravada");
        toast.success("Locução gravada.");
      };
      recRef.current = rec;
      recStart.current = Date.now();
      setElapsed(0);
      rec.start();
      setRecording(true);
    } catch {
      toast.error("Não foi possível acessar o microfone.");
    }
  };

  const stopRec = () => {
    try { recRef.current?.stop(); } catch { /* ignore */ }
    setRecording(false);
  };

  const preview = async (loc: Locucao) => {
    const a = audioRef.current!;
    if (playingId === loc.id) { a.pause(); setPlayingId(null); return; }
    const url = await resolveLocucaoUrl(loc);
    if (!url) { toast.error("Áudio indisponível (arquivo movido/ausente)."); return; }
    const prefs = loadDevicePrefs();
    await applyOutput(a, prefs.outputId);
    a.src = url;
    void a.play();
    setPlayingId(loc.id);
  };

  const insert = async (loc: Locucao) => {
    const blockId = currentBlockId ?? blocks[0]?.id;
    if (!blockId) { toast.error("Nenhum bloco disponível."); return; }
    const url = await resolveLocucaoUrl(loc);
    if (!url) { toast.error("Áudio indisponível para inserir."); return; }
    addTrack(blockId, makeLocucao(loc.name, url, loc.duration));
    logEvent("locucao", `Inserida: ${loc.name}`, "Locução adicionada à programação");
    toast.success(`"${loc.name}" inserida na programação.`);
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 bg-pl-toolbar px-2 py-1 text-[12px] font-semibold text-white">
        <Mic className="h-4 w-4" /> Locuções gravadas
        <div className="ml-auto flex items-center gap-1.5">
          {recording ? (
            <button onClick={stopRec} className="inline-flex items-center gap-1 rounded bg-red-600 px-2 py-1 text-[11px] font-semibold text-white hover:brightness-110">
              <Square className="h-3.5 w-3.5" /> Parar ({elapsed.toFixed(0)}s)
            </button>
          ) : (
            <button onClick={startRec} className="inline-flex items-center gap-1 rounded bg-white/15 px-2 py-1 text-[11px] font-semibold text-white hover:bg-white/30">
              <Circle className="h-3.5 w-3.5 fill-red-500 text-red-500" /> Gravar
            </button>
          )}
          <button onClick={pickNative} className="inline-flex items-center gap-1 rounded bg-white/15 px-2 py-1 text-[11px] font-semibold text-white hover:bg-white/30">
            {isDesktop() ? <HardDrive className="h-3.5 w-3.5" /> : <FileAudio className="h-3.5 w-3.5" />}
            {isDesktop() ? "Abrir do Windows" : "Carregar"}
          </button>
        </div>
        <input ref={fileRef} type="file" accept="audio/*" multiple className="hidden" onChange={onPick} />
      </div>

      <div className="pl-scroll flex-1 overflow-y-auto bg-pl-row">
        {locucoes.length === 0 ? (
          <p className="p-3 text-[12px] text-muted-foreground">
            Nenhuma locução. Use <b>Gravar</b> (microfone) ou <b>{isDesktop() ? "Abrir do Windows" : "Carregar"}</b> para adicionar áudios e depois inserir na programação.
          </p>
        ) : (
          <table className="w-full text-[12px]">
            <thead className="sticky top-0 bg-muted">
              <tr>
                <th className="px-2 py-1 text-left">Locução</th>
                <th className="px-2 py-1 text-left">Origem</th>
                <th className="px-2 py-1 text-right">Duração</th>
                <th className="px-2 py-1 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {locucoes.map((loc, i) => (
                <tr
                  key={loc.id}
                  draggable
                  onDragStart={(e) => { setDragId(loc.id); e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", loc.id); }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "move";
                    const r = e.currentTarget.getBoundingClientRect();
                    setDragOver({ id: loc.id, place: e.clientY - r.top < r.height / 2 ? "before" : "after" });
                  }}
                  onDragLeave={() => setDragOver((d) => (d?.id === loc.id ? null : d))}
                  onDrop={(e) => {
                    e.preventDefault();
                    const src = dragId ?? e.dataTransfer.getData("text/plain");
                    const place = dragOver?.place ?? "before";
                    setDragOver(null); setDragId(null);
                    if (src && src !== loc.id) reorderLocucao(src, loc.id, place);
                  }}
                  onDragEnd={() => { setDragOver(null); setDragId(null); }}
                  className={`border-t border-pl-panel-dark/20 ${dragId === loc.id ? "opacity-50" : ""} ${
                    dragOver?.id === loc.id && dragOver.place === "before" ? "shadow-[inset_0_2px_0_0_var(--color-pl-toolbar)]"
                      : dragOver?.id === loc.id && dragOver.place === "after" ? "shadow-[inset_0_-2px_0_0_var(--color-pl-toolbar)]" : ""
                  }`}
                >
                  <td className="px-2 py-1">
                    <span className="flex items-center gap-1">
                      <GripVertical className="h-3.5 w-3.5 shrink-0 cursor-grab text-muted-foreground active:cursor-grabbing" />
                      <span className="truncate">{loc.name}</span>
                    </span>
                    <span className="block text-[10px] text-muted-foreground">
                      {loc.date}{loc.path ? " • arquivo do Windows" : ""}
                    </span>
                  </td>
                  <td className="px-2 py-1 capitalize">{loc.source}</td>
                  <td className="px-2 py-1 text-right font-mono tabular-nums">{fmt(loc.duration)}</td>
                  <td className="px-2 py-1">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => moveLocucao(loc.id, -1)} disabled={i === 0} title="Mover para cima" className="grid h-6 w-6 place-items-center rounded hover:bg-muted disabled:opacity-30">
                        <ChevronUp className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => moveLocucao(loc.id, 1)} disabled={i === locucoes.length - 1} title="Mover para baixo" className="grid h-6 w-6 place-items-center rounded hover:bg-muted disabled:opacity-30">
                        <ChevronDown className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => preview(loc)} title="Pré-escuta" className="grid h-6 w-6 place-items-center rounded hover:bg-muted">
                        {playingId === loc.id ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                      </button>
                      <button onClick={() => insert(loc)} title="Inserir na programação" className="grid h-6 w-6 place-items-center rounded text-pl-toolbar hover:bg-muted">
                        <ListPlus className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => { if (playingId === loc.id) { audioRef.current?.pause(); setPlayingId(null); } removeLocucao(loc.id); }} title="Remover" className="grid h-6 w-6 place-items-center rounded text-destructive hover:bg-muted">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function durationOf(url: string): Promise<number> {
  return new Promise((resolve) => {
    const a = new Audio();
    a.preload = "metadata";
    a.onloadedmetadata = () => resolve(Number.isFinite(a.duration) ? a.duration : 0);
    a.onerror = () => resolve(0);
    a.src = url;
  });
}
