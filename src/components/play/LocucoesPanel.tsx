import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Mic, Square, FileAudio, Play, Pause, Trash2, ListPlus, Circle } from "lucide-react";
import { toast } from "sonner";
import { usePlayer } from "@/hooks/use-player";
import { fmt, makeLocucao } from "@/lib/play-data";
import { readAudioFile } from "@/lib/play-audio-files";
import {
  getLocucoes, subscribeLocucoes, addLocucao, removeLocucao, type Locucao,
} from "@/lib/play-locucoes";

export function LocucoesPanel() {
  const locucoes = useSyncExternalStore(subscribeLocucoes, getLocucoes, getLocucoes);
  const { blocks, currentBlockId, addTrack } = usePlayer();
  const fileRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);

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
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = (ev) => { if (ev.data.size) chunksRef.current.push(ev.data); };
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || "audio/webm" });
        const url = URL.createObjectURL(blob);
        const dur = await new Promise<number>((resolve) => {
          const a = new Audio();
          a.preload = "metadata";
          a.onloadedmetadata = () => resolve(Number.isFinite(a.duration) ? a.duration : (Date.now() - recStart.current) / 1000);
          a.onerror = () => resolve((Date.now() - recStart.current) / 1000);
          a.src = url;
        });
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

  const preview = (loc: Locucao) => {
    const a = audioRef.current!;
    if (playingId === loc.id) { a.pause(); setPlayingId(null); return; }
    a.src = loc.url;
    void a.play();
    setPlayingId(loc.id);
  };

  const insert = (loc: Locucao) => {
    const blockId = currentBlockId ?? blocks[0]?.id;
    if (!blockId) { toast.error("Nenhum bloco disponível."); return; }
    addTrack(blockId, makeLocucao(loc.name, loc.url, loc.duration));
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
          <button onClick={() => fileRef.current?.click()} className="inline-flex items-center gap-1 rounded bg-white/15 px-2 py-1 text-[11px] font-semibold text-white hover:bg-white/30">
            <FileAudio className="h-3.5 w-3.5" /> Carregar
          </button>
        </div>
        <input ref={fileRef} type="file" accept="audio/*" multiple className="hidden" onChange={onPick} />
      </div>

      <div className="pl-scroll flex-1 overflow-y-auto bg-pl-row">
        {locucoes.length === 0 ? (
          <p className="p-3 text-[12px] text-muted-foreground">
            Nenhuma locução. Use <b>Gravar</b> (microfone) ou <b>Carregar</b> para adicionar áudios e depois inserir na programação.
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
              {locucoes.map((loc) => (
                <tr key={loc.id} className="border-t border-pl-panel-dark/20">
                  <td className="px-2 py-1">
                    <span className="block truncate">{loc.name}</span>
                    <span className="block text-[10px] text-muted-foreground">{loc.date}</span>
                  </td>
                  <td className="px-2 py-1 capitalize">{loc.source}</td>
                  <td className="px-2 py-1 text-right font-mono tabular-nums">{fmt(loc.duration)}</td>
                  <td className="px-2 py-1">
                    <div className="flex items-center justify-end gap-1">
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