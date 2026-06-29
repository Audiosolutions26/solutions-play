import { Settings } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { operators } from "./OperatorLogin";
import { folders } from "@/lib/play-data";

export function OptionsDialog({
  open,
  onOpenChange,
  tab,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  tab: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" /> Opções — Solutions-Play
          </DialogTitle>
          <DialogDescription>Configurações da estação (modo demonstração).</DialogDescription>
        </DialogHeader>

        <Tabs key={tab} defaultValue={tab} className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="geral">Geral</TabsTrigger>
            <TabsTrigger value="operadores">Operadores</TabsTrigger>
            <TabsTrigger value="pastas">Pastas</TabsTrigger>
            <TabsTrigger value="insercoes">Inserções</TabsTrigger>
            <TabsTrigger value="licenca">Licença</TabsTrigger>
          </TabsList>

          <TabsContent value="geral" className="space-y-4 py-2">
            <div className="space-y-1">
              <Label htmlFor="station">Nome da estação</Label>
              <Input id="station" defaultValue="Estação Demo FM" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="city">Cidade / Frequência</Label>
              <Input id="city" defaultValue="São Paulo • 100.9 MHz" />
            </div>
            <div className="flex items-center justify-between rounded border p-3">
              <span className="text-sm">Auto-avançar inserções</span>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between rounded border p-3">
              <span className="text-sm">Hora certa automática</span>
              <Switch />
            </div>
          </TabsContent>

          <TabsContent value="operadores" className="py-2">
            <div className="overflow-hidden rounded border">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr><th className="px-3 py-2 text-left">Nome</th><th className="px-3 py-2 text-left">Função</th><th className="px-3 py-2 text-left">Senha</th></tr>
                </thead>
                <tbody>
                  {operators.map((o) => (
                    <tr key={o.id} className="border-t">
                      <td className="px-3 py-2">{o.name}</td>
                      <td className="px-3 py-2">{o.role}</td>
                      <td className="px-3 py-2 font-mono">••••</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>

          <TabsContent value="pastas" className="py-2">
            <div className="grid grid-cols-2 gap-2">
              {folders.map((f) => (
                <div key={f.id} className="flex items-center gap-2 rounded border p-2 text-sm">
                  <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: f.color }} />
                  <span className="flex-1 truncate">{f.name}</span>
                  <span className="text-muted-foreground">{f.tracks.length} faixas</span>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="insercoes" className="space-y-3 py-2">
            <div className="flex items-center justify-between rounded border p-3">
              <span className="text-sm">Crossfade entre músicas</span>
              <Switch defaultChecked />
            </div>
            <div className="space-y-1">
              <Label htmlFor="fade">Tempo de crossfade (segundos)</Label>
              <Input id="fade" type="number" defaultValue={3} min={0} max={12} />
            </div>
            <div className="flex items-center justify-between rounded border p-3">
              <span className="text-sm">Normalizar volume (ReplayGain)</span>
              <Switch defaultChecked />
            </div>
          </TabsContent>

          <TabsContent value="licenca" className="space-y-2 py-2 text-sm">
            <div className="rounded border p-4">
              <div className="font-semibold">Solutions-Play v1.0 — Demonstração</div>
              <p className="mt-1 text-muted-foreground">Licença: DEMO-0000-0000-0000</p>
              <p className="text-muted-foreground">Status: ativa (modo demonstração local)</p>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <button
            onClick={() => { toast.success("Configurações salvas (demo)"); onOpenChange(false); }}
            className="rounded bg-gradient-to-b from-pl-transport to-pl-transport-dark px-4 py-2 text-sm font-semibold text-white hover:brightness-110"
          >
            Salvar
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}