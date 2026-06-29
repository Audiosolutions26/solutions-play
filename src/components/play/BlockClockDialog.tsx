import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { usePlayer } from "@/hooks/use-player";
import { fmt, type Block, type BlockClock } from "@/lib/play-data";

// Relógio Operacional — editor de parâmetros por bloco (manual p.137-142).
export function BlockClockDialog({
  block,
  open,
  onOpenChange,
}: {
  block: Block | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { setBlockClock } = usePlayer();
  const [form, setForm] = useState<BlockClock>({});

  useEffect(() => {
    if (block) setForm({ ...block.clock });
  }, [block]);

  if (!block) return null;

  const totalMin = block.items.reduce((s, t) => s + t.duration, 0) / 60;

  const save = () => {
    setBlockClock(block.id, form);
    toast.success("Relógio operacional do bloco atualizado.");
    onOpenChange(false);
  };

  const set = (patch: Partial<BlockClock>) => setForm((f) => ({ ...f, ...patch }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Relógio Operacional — {block.time} {block.title}</DialogTitle>
          <DialogDescription>
            Parâmetros do bloco (manual p.137-142). Duração real atual: {fmt(block.items.reduce((s, t) => s + t.duration, 0))}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="bc-id">ID — nome do bloco</Label>
            <Input
              id="bc-id"
              value={form.name ?? ""}
              placeholder={block.title}
              onChange={(e) => set({ name: e.target.value })}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="bc-dur">DUR — duração alvo (minutos)</Label>
            <Input
              id="bc-dur"
              type="number"
              min={0}
              value={form.dur ?? ""}
              placeholder="ex.: 15"
              onChange={(e) => set({ dur: e.target.value ? Number(e.target.value) : undefined })}
            />
            {form.dur != null && form.dur > 0 && (
              <p className="text-[11px] text-muted-foreground">
                Real {totalMin.toFixed(1)} min / alvo {form.dur} min —{" "}
                {Math.round(totalMin) === form.dur ? "no tempo (verde)" : totalMin > form.dur ? "excedido (amarelo)" : "abaixo (vermelho)"}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => set({ mode: form.mode === "local" ? undefined : "local" })}
              className={`rounded border px-3 py-2 text-sm font-medium ${form.mode === "local" ? "border-pl-toolbar bg-pl-toolbar/10" : "border-border"}`}
            >
              LOCAL
            </button>
            <button
              type="button"
              onClick={() => set({ mode: form.mode === "sat" ? undefined : "sat" })}
              className={`rounded border px-3 py-2 text-sm font-medium ${form.mode === "sat" ? "border-pl-toolbar bg-pl-toolbar/10" : "border-border"}`}
            >
              SAT (satélite)
            </button>
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="bc-fixo">FIXO — bloco não pode atrasar (F amarelo)</Label>
            <Switch id="bc-fixo" checked={!!form.fixo} onCheckedChange={(v) => set({ fixo: v })} />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="bc-locked">LOCKED — bloquear edição do bloco</Label>
            <Switch id="bc-locked" checked={!!form.locked} onCheckedChange={(v) => set({ locked: v })} />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="bc-desc">DESCARTE — aplicar descarte neste bloco</Label>
            <Switch id="bc-desc" checked={!!form.descarte} onCheckedChange={(v) => set({ descarte: v })} />
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