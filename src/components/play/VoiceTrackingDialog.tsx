import { useEffect, useRef, useState } from "react";
import { Mic, Play, Radio, Square, Trash2, Upload } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { fmt, makeLocucao, type Track } from "@/lib/play-data";
import { addLocucao } from "@/lib/play-locucoes";
import { usePlayer } from "@/hooks/use-player";

function drawWaveform(canvas: HTMLCanvasElement, values: Uint8Array, active: boolean) {
  const rect = canvas.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(rect.width * dpr);
  canvas.height = Math.round(rect.height * dpr);
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const w = rect.width;
  const h = rect.height;
  const mid = h / 2;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "#080c11";
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = "rgba(215, 228, 236, .12)";
  ctx.beginPath();
  ctx.moveTo(0, mid);
  ctx.lineTo(w, mid);
  ctx.stroke();
  ctx.strokeStyle = active ? "#d58bff" : "#9d6cc0";
  ctx.lineWidth = 1.25;
  ctx.beginPath();
  for (let x = 0; x <= w; x += 1) {
    const index = Math.min(values.length - 1, Math.floor((x / Math.max(1, w)) * values.length));
    const amplitude = ((values[index] ?? 128) - 128) / 128;
    const y = mid + amplitude * (h * 0.42);
    if (x === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
}

export function VoiceTrackingDialog({
  track,
  open,
  onOpenChange,
}: {
  track: Track | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { blocks, addTrackAt } = usePlayer();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const animationRef = useRef<number | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef(0);
  const [recording, setRecording] = useState(false);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [name, setName] = useState("Voice Tracking");
  const [previewing, setPreviewing] = useState(false);
  const previewRef = useRef<HTMLAudioElement | null>(null);

  const stopVisualiser = () => {
    if (animationRef.current !== null) cancelAnimationFrame(animationRef.current);
    animationRef.current = null;
    analyserRef.current?.disconnect();
    analyserRef.current = null;
    if (audioContextRef.current) void audioContextRef.current.close().catch(() => undefined);
    audioContextRef.current = null;
  };

  const stopStream = () => {
    streamRef.current?.getTracks().forEach((item) => item.stop());
    streamRef.current = null;
  };

  const clearRecording = () => {
    if (recording) return;
    if (recordedUrl?.startsWith("blob:")) URL.revokeObjectURL(recordedUrl);
    setRecordedUrl(null);
    setDuration(0);
    setPreviewing(false);
    if (previewRef.current) {
      previewRef.current.pause();
      previewRef.current.currentTime = 0;
    }
    const canvas = canvasRef.current;
    if (canvas) drawWaveform(canvas, new Uint8Array([128]), false);
  };

  useEffect(() => {
    if (!open) return;
    const canvas = canvasRef.current;
    if (canvas) drawWaveform(canvas, new Uint8Array([128]), false);
    return () => {
      if (recorderRef.current && recorderRef.current.state !== "inactive")
        recorderRef.current.stop();
      stopStream();
      stopVisualiser();
      if (previewRef.current) previewRef.current.pause();
    };
  }, [open]);

  const animate = () => {
    const analyser = analyserRef.current;
    const canvas = canvasRef.current;
    if (!analyser || !canvas) return;
    const values = new Uint8Array(analyser.fftSize);
    const frame = () => {
      analyser.getByteTimeDomainData(values);
      drawWaveform(canvas, values, true);
      animationRef.current = requestAnimationFrame(frame);
    };
    frame();
  };

  const startRecording = async () => {
    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === "undefined"
    ) {
      toast.error("A gravação de microfone não está disponível neste ambiente.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const preferred = "audio/webm;codecs=opus";
      const options = MediaRecorder.isTypeSupported(preferred)
        ? { mimeType: preferred }
        : undefined;
      const recorder = new MediaRecorder(stream, options);
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 1024;
      audioContext.createMediaStreamSource(stream).connect(analyser);
      streamRef.current = stream;
      recorderRef.current = recorder;
      analyserRef.current = analyser;
      audioContextRef.current = audioContext;
      chunksRef.current = [];
      startedAtRef.current = performance.now();
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        const url = URL.createObjectURL(blob);
        setRecordedUrl(url);
        setDuration(Math.max(1, Math.round((performance.now() - startedAtRef.current) / 1000)));
        setRecording(false);
        stopStream();
        stopVisualiser();
        toast.success("Voice Tracking gravado. Você pode pré-escutar ou inserir na programação.");
      };
      recorder.start(100);
      setRecording(true);
      setPreviewing(false);
      animate();
    } catch {
      stopStream();
      stopVisualiser();
      toast.error("Não foi possível acessar o microfone. Verifique a permissão do navegador.");
    }
  };

  const stopRecording = () => {
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") recorder.stop();
  };

  const togglePreview = () => {
    if (!recordedUrl) return;
    if (!previewRef.current) previewRef.current = new Audio();
    const audio = previewRef.current;
    if (previewing) {
      audio.pause();
      setPreviewing(false);
      return;
    }
    audio.src = recordedUrl;
    audio.onended = () => setPreviewing(false);
    void audio
      .play()
      .then(() => setPreviewing(true))
      .catch(() => toast.info("Clique novamente para liberar a pré-escuta."));
  };

  const insertAfterCurrent = () => {
    if (!track || !recordedUrl) return;
    const block = blocks.find((item) => item.items.some((entry) => entry.id === track.id));
    if (!block) {
      toast.error("A faixa atual não está em um bloco da programação.");
      return;
    }
    const loc = addLocucao(name.trim() || "Voice Tracking", recordedUrl, duration, "gravada");
    addTrackAt(track.id, makeLocucao(loc.name, recordedUrl, duration), "after");
    toast.success("Locução inserida logo após a faixa no Final Log.");
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!value && recording) stopRecording();
        onOpenChange(value);
      }}
    >
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Mic className="h-5 w-5 text-fuchsia-400" /> Voice Tracking
          </DialogTitle>
          <DialogDescription className="text-[12px]">
            Grave uma intervenção entre a faixa atual e a próxima. A gravação fica como locução não
            destrutiva e pode ser inserida no Final Log.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded border border-pl-panel-dark/50 bg-[#091016] p-2">
          <div className="mb-2 flex items-center justify-between text-[10px] uppercase tracking-wider text-pl-text/60">
            <span className="flex items-center gap-1">
              <Radio className="h-3 w-3" /> Faixa de referência
            </span>
            <span className={recording ? "text-red-300" : "text-pl-text/50"}>
              {recording ? "GRAVANDO" : recordedUrl ? `${fmt(duration)} PRONTO` : "AGUARDANDO"}
            </span>
          </div>
          <div className="truncate text-[12px] font-semibold text-pl-text">
            {track?.title || "Nenhuma faixa selecionada"}
          </div>
          <div className="truncate text-[10px] text-pl-text/55">
            {track?.artist || "Escolha uma faixa no Deck A"}
          </div>
          <canvas
            ref={canvasRef}
            className="mt-2 block h-20 w-full rounded border border-white/10"
            aria-label="Waveform da locução"
          />
        </div>

        <label className="space-y-1 text-[11px] text-pl-text/70">
          Nome da locução
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="w-full rounded border border-pl-panel-dark/60 bg-pl-input px-2 py-1.5 text-[12px] text-pl-text outline-none focus:border-fuchsia-400"
          />
        </label>

        {typeof window !== "undefined" && !navigator.mediaDevices?.getUserMedia && (
          <p className="rounded border border-amber-500/40 bg-amber-500/10 px-2 py-1.5 text-[11px] text-amber-200">
            O navegador atual não expõe uma entrada de microfone. No Windows/Electron, o Voice
            Tracking usa a ponte de áudio local.
          </p>
        )}

        <DialogFooter className="flex-wrap justify-between gap-2">
          <div className="flex gap-1">
            {!recording ? (
              <button
                type="button"
                onClick={() => void startRecording()}
                className="inline-flex items-center gap-1 rounded bg-red-600 px-3 py-2 text-[12px] font-semibold text-white hover:bg-red-500"
              >
                <Mic className="h-3.5 w-3.5" /> Gravar
              </button>
            ) : (
              <button
                type="button"
                onClick={stopRecording}
                className="inline-flex items-center gap-1 rounded bg-red-700 px-3 py-2 text-[12px] font-semibold text-white hover:bg-red-600"
              >
                <Square className="h-3.5 w-3.5" /> Parar gravação
              </button>
            )}
            <button
              type="button"
              onClick={togglePreview}
              disabled={!recordedUrl || recording}
              className="inline-flex items-center gap-1 rounded border px-3 py-2 text-[12px] font-medium hover:bg-muted disabled:opacity-40"
            >
              <Play className="h-3.5 w-3.5" /> {previewing ? "Parar pré-escuta" : "Pré-escutar"}
            </button>
            <button
              type="button"
              onClick={clearRecording}
              disabled={!recordedUrl || recording}
              title="Descartar gravação"
              className="grid h-9 w-9 place-items-center rounded border text-red-300 hover:bg-red-500/10 disabled:opacity-40"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
          <button
            type="button"
            onClick={insertAfterCurrent}
            disabled={!recordedUrl || recording || !track}
            className="inline-flex items-center gap-1 rounded bg-pl-toolbar px-3 py-2 text-[12px] font-semibold text-white hover:bg-pl-toolbar-light disabled:opacity-40"
          >
            <Upload className="h-3.5 w-3.5" /> Inserir após a faixa
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
