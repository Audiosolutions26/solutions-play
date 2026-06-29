import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Cpu, Plug, Satellite, RadioTower, Activity, Power } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
  SECTION_META, loadSections, saveSections, type SectionConfig, type SectionKind,
} from "@/lib/play-sections";
import { logEvent } from "@/lib/play-events";
import { platformLabel } from "@/lib/play-native";

const ICON: Record<SectionKind, typeof Cpu> = {
  arduino: Cpu, paralela: Plug, satelite: Satellite, rds: RadioTower, sensores: Activity,
};

export function SecoesDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [list, setList] = useState<SectionConfig[]>(loadSections);

  useEffect(() => { if (open) setList(loadSections()); }, [open]);

  const update = (kind: SectionKind, patch: Partial<SectionConfig>) =>
    setList((l) => l.map((s) => (s.kind === kind ? { ...s, ...patch } : s)));

  const testConnect = (s: SectionConfig) => {
    const meta = SECTION_META.find((m) => m.kind === s.kind)!;
    if (!s.enabled) { toast.info(`${meta.label}: ative a seção primeiro.`); return; }
    const ok = !!s.port.trim();
    update(s.kind, { status: ok ? "online" : "offline" });
    logEvent("secao", `${meta.label}: ${ok ? "conectado" : "falha"}`, ok ? `${meta.portLabel}: ${s.port}` : "Informe a porta/entrada");
    toast[ok ? "success" : "error"](`${meta.label}: ${ok ? "online" : "porta não informada"}`);
  };

  const save = () => {
    saveSections(list);
    logEvent("secao", "Configuração de seções salva", `${list.filter((s) => s.enabled).length} ativa(s)`);
    toast.success("Seções salvas.");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Cpu className="h-5 w-5" /> Seções / Integrações de hardware</DialogTitle>
          <DialogDescription>
            Arduino, porta paralela, satélite, RDS e sensores. Ambiente atual: <b>{platformLabel()}</b>. No app desktop (Windows) os caminhos e portas são usados na integração real.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[60vh] space-y-2 overflow-y-auto py-1">
          {list.map((s) => {
            const meta = SECTION_META.find((m) => m.kind === s.kind)!;
            const Icon = ICON[s.kind];
            return (
              <div key={s.kind} className="rounded-lg border border-border p-3">
                <div className="flex items-center gap-2">
                  <Icon className="h-5 w-5 text-pl-toolbar" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      {meta.label}
                      <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${s.status === "online" ? "bg-emerald-600 text-white" : "bg-muted text-muted-foreground"}`}>
                        {s.status === "online" ? "ONLINE" : "OFFLINE"}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">{meta.help}</p>
                  </div>
                  <Switch checked={s.enabled} onCheckedChange={(v) => update(s.kind, { enabled: v, status: v ? s.status : "offline" })} />
                </div>

                {s.enabled && (
                  <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_auto]">
                    <div className="space-y-1">
                      <Label className="text-[11px]">{meta.portLabel}</Label>
                      <Input value={s.port} onChange={(e) => update(s.kind, { port: e.target.value })} placeholder={s.kind === "paralela" ? "LPT1" : s.kind === "arduino" ? "COM3" : "—"} className="h-8" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px]">{meta.paramLabel}</Label>
                      <Input value={s.param} onChange={(e) => update(s.kind, { param: e.target.value })} placeholder={meta.paramPlaceholder} className="h-8" />
                    </div>
                    <div className="flex items-end">
                      <Button type="button" variant="outline" size="sm" onClick={() => testConnect(s)} className="h-8">
                        <Power className="mr-1 h-3.5 w-3.5" /> Testar
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={save}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
