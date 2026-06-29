import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Headphones, Mic, Volume2, ShieldCheck, ShieldAlert, RefreshCw } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import {
  ensureMicPermission, listAudioDevices, loadDevicePrefs, saveDevicePrefs,
  type MicPermission, type DeviceLists,
} from "@/lib/play-audio-devices";
import { getAudioEngine } from "@/lib/audio-engine";
import { platformLabel } from "@/lib/play-native";
import { logEvent } from "@/lib/play-events";
import { cueTestTone, refreshCueSink } from "@/lib/play-cue";

const ANY = "__default__";

export function AudioDevicesDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [perm, setPerm] = useState<MicPermission | "idle">("idle");
  const [devices, setDevices] = useState<DeviceLists>({ inputs: [], outputs: [] });
  const [inputId, setInputId] = useState<string>(ANY);
  const [outputId, setOutputId] = useState<string>(ANY);
  const [cueId, setCueId] = useState<string>(ANY);

  const refresh = async () => {
    const p = await ensureMicPermission();
    setPerm(p);
    const d = await listAudioDevices();
    setDevices(d);
  };

  useEffect(() => {
    if (!open) return;
    const prefs = loadDevicePrefs();
    setInputId(prefs.inputId || ANY);
    setOutputId(prefs.outputId || ANY);
    setCueId(prefs.cueId || ANY);
    void refresh();
  }, [open]);

  const testOutput = async () => {
    const eng = getAudioEngine();
    await eng.setOutputDevice(outputId === ANY ? "" : outputId);
    eng.fire(660, 0.5);
    toast.info("Tom de teste enviado para a saída NO AR.");
  };

  const testCue = async () => {
    saveDevicePrefs({ ...loadDevicePrefs(), cueId: cueId === ANY ? undefined : cueId });
    await cueTestTone(660);
    toast.info("Tom de teste enviado para a saída de PRÉ-ESCUTA (CUE).");
  };

  const save = async () => {
    const prefs = {
      inputId: inputId === ANY ? undefined : inputId,
      outputId: outputId === ANY ? undefined : outputId,
      cueId: cueId === ANY ? undefined : cueId,
    };
    saveDevicePrefs(prefs);
    await getAudioEngine().setOutputDevice(prefs.outputId || "");
    await refreshCueSink();
    logEvent("sistema", "Dispositivos de áudio salvos", `Mic: ${inputId === ANY ? "padrão" : "selecionado"} • No ar: ${outputId === ANY ? "padrão" : "selecionada"} • CUE: ${cueId === ANY ? "padrão" : "selecionada"}`);
    toast.success("Dispositivos de áudio salvos.");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Headphones className="h-5 w-5" /> Dispositivos de áudio</DialogTitle>
          <DialogDescription>
            Microfone (gravação de locuções) e saída (pré-escuta). Ambiente: <b>{platformLabel()}</b>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className={`flex items-center gap-2 rounded border p-2 text-[12px] ${perm === "granted" ? "border-emerald-300 bg-emerald-50 text-emerald-700" : perm === "denied" ? "border-red-300 bg-red-50 text-red-700" : "border-border text-muted-foreground"}`}>
            {perm === "granted" ? <ShieldCheck className="h-4 w-4" /> : <ShieldAlert className="h-4 w-4" />}
            {perm === "granted" ? "Microfone autorizado." : perm === "denied" ? "Permissão negada — autorize o microfone no Windows." : perm === "unsupported" ? "Microfone não suportado." : "Verificando permissão…"}
            <Button variant="ghost" size="sm" className="ml-auto h-7" onClick={refresh}><RefreshCw className="mr-1 h-3.5 w-3.5" /> Atualizar</Button>
          </div>

          <div className="space-y-1.5">
            <Label className="flex items-center gap-1"><Mic className="h-4 w-4" /> Microfone (entrada)</Label>
            <Select value={inputId} onValueChange={setInputId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ANY}>Padrão do sistema</SelectItem>
                {devices.inputs.map((d, i) => (
                  <SelectItem key={d.deviceId || i} value={d.deviceId || `in-${i}`}>{d.label || `Microfone ${i + 1}`}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="flex items-center gap-1"><Volume2 className="h-4 w-4" /> Saída principal (NO AR)</Label>
            <Select value={outputId} onValueChange={setOutputId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ANY}>Padrão do sistema</SelectItem>
                {devices.outputs.map((d, i) => (
                  <SelectItem key={d.deviceId || i} value={d.deviceId || `out-${i}`}>{d.label || `Saída ${i + 1}`}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button type="button" variant="outline" size="sm" className="mt-1" onClick={testOutput}>
              <Volume2 className="mr-1 h-4 w-4" /> Testar saída no ar
            </Button>
          </div>

          <div className="space-y-1.5">
            <Label className="flex items-center gap-1"><Headphones className="h-4 w-4" /> Saída de pré-escuta (CUE — fora do ar)</Label>
            <Select value={cueId} onValueChange={setCueId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ANY}>Padrão do sistema</SelectItem>
                {devices.outputs.map((d, i) => (
                  <SelectItem key={`cue-${d.deviceId || i}`} value={d.deviceId || `out-${i}`}>{d.label || `Saída ${i + 1}`}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button type="button" variant="outline" size="sm" className="mt-1" onClick={testCue}>
              <Headphones className="mr-1 h-4 w-4" /> Testar pré-escuta (CUE)
            </Button>
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
