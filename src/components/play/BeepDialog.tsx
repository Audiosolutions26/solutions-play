import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { FileAudio, Play } from "lucide-react";
import { loadBeep, saveBeep, type BeepConfig } from "@/lib/play-beep";
import { getAudioEngine } from "@/lib/audio-engine";
import { readAudioFile } from "@/lib/play-audio-files";

const ALL_MIN = [0, 5, 10, 15, 20, 30, 40, 45, 50];

export function BeepDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [cfg, setCfg] = useState<BeepConfig>(loadBeep);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (open) setCfg(loadBeep()); }, [open]);

  const toggleMin = (m: number) =>
    setCfg((c) => ({ ...c, minutes: c.minutes.includes(m) ? c.minutes.filter((x) => x !== m) : [...c.minutes, m].sort((a, b) => a - b) }));

  const preview = () => {
    if (cfg.url) getAudioEngine().fireUrl(cfg.url, 1.5);
    else getAudioEngine().fire(cfg.freq, 0.6);
  };

  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const { url } = await readAudioFile(file);
      setCfg((c) => ({ ...c, url }));
      toast.success(`Beep: ${file.name}`);
    } catch { toast.error("Não foi possível carregar o áudio."); }
  };

  const save = () => {
    saveBeep(cfg);
    window.dispatchEvent(new CustomEvent("beep-config-changed"));
    toast.success("Configuração do Beep salva.");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Beep</DialogTitle>
          <DialogDescription>
            Som disparado nos minutos escolhidos da hora, sobre o áudio no ar (manual p.143).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="beep-on">Ativar Beep</Label>
            <Switch id="beep-on" checked={cfg.enabled} onCheckedChange={(v) => setCfg((c) => ({ ...c, enabled: v }))} />
          </div>

          <div className="space-y-1.5">
            <Label>Minutos de disparo</Label>
            <div className="flex flex-wrap gap-1.5">
              {ALL_MIN.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => toggleMin(m)}
                  className={`w-12 rounded border px-2 py-1 text-sm font-mono ${cfg.minutes.includes(m) ? "border-pl-toolbar bg-pl-toolbar/10" : "border-border"}`}
                >
                  :{m.toString().padStart(2, "0")}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Som do Beep</Label>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
                <FileAudio className="mr-1 h-4 w-4" /> {cfg.url ? "Trocar .mp3" : "Escolher .mp3"}
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={preview}>
                <Play className="mr-1 h-4 w-4" /> Testar
              </Button>
              {cfg.url && <span className="text-[11px] text-emerald-600">áudio carregado</span>}
            </div>
            <input ref={fileRef} type="file" accept="audio/*" className="hidden" onChange={onPick} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={save}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Controlador invisível: dispara o beep quando o relógio bate o minuto configurado.
export function BeepController() {
  const cfgRef = useRef<BeepConfig>(loadBeep());
  const firedRef = useRef<string>("");

  useEffect(() => {
    const reload = () => { cfgRef.current = loadBeep(); };
    window.addEventListener("beep-config-changed", reload);
    const id = setInterval(() => {
      const cfg = cfgRef.current;
      if (!cfg.enabled) return;
      const now = new Date();
      const m = now.getMinutes();
      const key = `${now.getHours()}:${m}`;
      if (cfg.minutes.includes(m) && now.getSeconds() === 0 && firedRef.current !== key) {
        firedRef.current = key;
        if (cfg.url) getAudioEngine().fireUrl(cfg.url, 1.5);
        else getAudioEngine().fire(cfg.freq, 0.6);
      }
    }, 1000);
    return () => { clearInterval(id); window.removeEventListener("beep-config-changed", reload); };
  }, []);

  return null;
}
