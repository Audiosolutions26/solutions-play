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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  ensureMicPermission, listAudioDevices, loadDevicePrefs, saveDevicePrefs,
  type MicPermission, type DeviceLists,
} from "@/lib/play-audio-devices";
import { getAudioEngine } from "@/lib/audio-engine";
import { platformLabel } from "@/lib/play-native";
import { logEvent } from "@/lib/play-events";
import { cueTestTone, refreshCueSink, makeToneUrl } from "@/lib/play-cue";
import { Aes67Panel } from "./Aes67Panel";
import { Network, Speaker, Volume2 as Vol2 } from "lucide-react";
import {
  OUTPUT_FUNCTIONS, OUTPUT_DEFAULT, loadRouting, applyRouting, outputIds,
  type OutputRouting, type OutputFn,
} from "@/lib/play-outputs";

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
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Headphones className="h-5 w-5" /> Dispositivos de áudio</DialogTitle>
          <DialogDescription>
            Microfone (gravação de locuções) e saída (pré-escuta). Ambiente: <b>{platformLabel()}</b>.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="dispositivos">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="dispositivos"><Headphones className="mr-1 h-4 w-4" /> Dispositivos</TabsTrigger>
            <TabsTrigger value="saidas"><Speaker className="mr-1 h-4 w-4" /> Saídas</TabsTrigger>
            <TabsTrigger value="aes67"><Network className="mr-1 h-4 w-4" /> AES67 TX</TabsTrigger>
          </TabsList>

          <TabsContent value="dispositivos">
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

            <DialogFooter className="mt-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button onClick={save}>Salvar</Button>
            </DialogFooter>
          </TabsContent>

          <TabsContent value="saidas">
            <OutputsView onClose={() => onOpenChange(false)} />
          </TabsContent>

          <TabsContent value="aes67">
            <Aes67Panel />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

// Roteamento de SAÍDAS por função (manual p.111) + "ID para Saídas".
function OutputsView({ onClose }: { onClose: () => void }) {
  const [devices, setDevices] = useState<DeviceLists>({ inputs: [], outputs: [] });
  const [routing, setRouting] = useState<OutputRouting>(() => loadRouting());

  useEffect(() => {
    void (async () => {
      await ensureMicPermission(); // libera os rótulos das saídas
      setDevices(await listAudioDevices());
      setRouting(loadRouting());
    })();
  }, []);

  const ids = outputIds(devices);
  const setFn = (fn: OutputFn, id: string) => setRouting((r) => ({ ...r, [fn]: id }));

  const test = async (fn: OutputFn) => {
    const id = routing[fn];
    const deviceId = id === OUTPUT_DEFAULT ? "" : id;
    const el = new Audio(makeToneUrl(fn === "musicas" ? 440 : 660, 0.8)) as HTMLAudioElement & {
      setSinkId?: (id: string) => Promise<void>;
    };
    try {
      if (deviceId && typeof el.setSinkId === "function") await el.setSinkId(deviceId);
      await el.play();
    } catch { toast.error("Não foi possível tocar nesta saída."); }
  };

  const save = async () => {
    await applyRouting(routing);
    logEvent("sistema", "Saídas de áudio salvas", "Roteamento por função aplicado.");
    toast.success("Saídas salvas e aplicadas.");
    onClose();
  };

  return (
    <div className="space-y-3 py-2">
      <p className="text-[12px] text-muted-foreground">
        Escolha a placa/saída de áudio para cada função (manual p.111). O <b>ID</b> é gerado
        automaticamente por saída reconhecida e pode ser usado no QuickStart.
      </p>

      <div className="space-y-2">
        {OUTPUT_FUNCTIONS.map(({ fn, label, help }) => (
          <div key={fn} className="rounded border border-border p-2">
            <div className="flex items-center gap-2">
              <Label className="flex-1 text-[12px] font-medium">{label}</Label>
              <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                {ids.get(routing[fn]) ?? "S0"}
              </span>
              <Button type="button" variant="ghost" size="sm" className="h-7" onClick={() => test(fn)}>
                <Vol2 className="mr-1 h-3.5 w-3.5" /> Testar
              </Button>
            </div>
            <Select value={routing[fn]} onValueChange={(v) => setFn(fn, v)}>
              <SelectTrigger className="mt-1 h-8 text-[12px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ANY}>Padrão do sistema</SelectItem>
                {devices.outputs.map((d, i) => (
                  <SelectItem key={`${fn}-${d.deviceId || i}`} value={d.deviceId || `out-${i}`}>
                    {d.label || `Saída ${i + 1}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="mt-0.5 text-[11px] leading-tight text-muted-foreground">{help}</p>
          </div>
        ))}
      </div>

      <fieldset className="rounded border border-border p-2">
        <legend className="px-1 text-[11px] font-semibold text-muted-foreground">ID para Saídas</legend>
        <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
          {[...ids.entries()].map(([devId, sid]) => {
            const name = devId === OUTPUT_DEFAULT
              ? "Padrão do sistema"
              : devices.outputs.find((d) => d.deviceId === devId)?.label || devId;
            return (
              <div key={sid} className="flex items-center gap-2 text-[12px]">
                <span className="rounded bg-pl-toolbar px-1.5 py-0.5 font-mono text-[10px] text-white">{sid}</span>
                <span className="break-words text-pl-text">{name}</span>
              </div>
            );
          })}
        </div>
      </fieldset>

      <DialogFooter className="mt-2">
        <Button variant="outline" onClick={onClose}>Cancelar</Button>
        <Button onClick={save}>Salvar</Button>
      </DialogFooter>
    </div>
  );
}
