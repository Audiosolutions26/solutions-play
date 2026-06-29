import { useRef, useState } from "react";
import { Settings, Plus, Trash2, KeyRound, Upload, Download } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { configGuides, exportConfig, importConfig, type ConfigField, type ConfigGuide } from "@/lib/play-config";
import { useConfig } from "@/hooks/use-config";
import { validateFieldValue, validateConfigState } from "@/lib/play-config-validate";
import { operators as seedOperators, type Operator } from "./OperatorLogin";
import { folders } from "@/lib/play-data";

const GUIDES: { id: string; title: string }[] = [
  { id: "geral", title: "Geral" },
  { id: "operadores", title: "Operadores" },
  { id: "configuracoes", title: "Configurações" },
  { id: "insercoes", title: "Inserções" },
  { id: "licenca", title: "Licença" },
];

function FieldRow({ field, fullKey }: { field: ConfigField; fullKey: string }) {
  const { draft, setDraft } = useConfig();
  const value = draft[fullKey] ?? field.default;
  const error = validateFieldValue(field, value);

  if (field.type === "switch") {
    return (
      <div className="flex items-center justify-between gap-3 rounded border border-pl-panel-dark/40 bg-white/60 px-3 py-2">
        <div className="min-w-0">
          <div className="text-[12px] font-medium text-pl-text">{field.label}</div>
          {field.help && <div className="text-[11px] leading-tight text-muted-foreground">{field.help}</div>}
        </div>
        <Switch checked={Boolean(value)} onCheckedChange={(v) => setDraft(fullKey, v)} />
      </div>
    );
  }

  if (field.type === "select") {
    return (
      <div className="space-y-1">
        <Label className="text-[12px]">{field.label}</Label>
        <Select value={String(value)} onValueChange={(v) => setDraft(fullKey, v)}>
          <SelectTrigger className="h-8 text-[12px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {field.options?.map((o) => (
              <SelectItem key={o.value} value={o.value} className="text-[12px]">{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  // text / number / password / textarea
  return (
    <div className="space-y-1">
      <Label className="text-[12px]">{field.label}{field.unit ? ` (${field.unit})` : ""}</Label>
      <Input
        type={field.type === "number" ? "number" : field.type === "password" ? "password" : "text"}
        className={cn("h-8 text-[12px]", error && "border-red-500 focus-visible:ring-red-500")}
        aria-invalid={!!error}
        min={field.min}
        max={field.max}
        value={String(value)}
        onChange={(e) =>
          setDraft(fullKey, field.type === "number" ? Number(e.target.value) : e.target.value)
        }
      />
      {error
        ? <div className="text-[11px] leading-tight text-red-600">{error}</div>
        : field.help && <div className="text-[11px] leading-tight text-muted-foreground">{field.help}</div>}
    </div>
  );
}

function GuideView({ guide }: { guide: ConfigGuide }) {
  return (
    <div className="space-y-5">
      {guide.description && <p className="text-[12px] text-muted-foreground">{guide.description}</p>}
      {guide.sections.map((section) => (
        <fieldset key={section.id} className="rounded-md border border-pl-panel-dark/40">
          <legend className="ml-2 px-1 text-[12px] font-bold text-pl-toolbar">{section.title}</legend>
          {section.note && <p className="px-3 pb-1 text-[11px] text-muted-foreground">{section.note}</p>}
          <div className="grid grid-cols-1 gap-2 p-3 sm:grid-cols-2">
            {section.fields.map((f) => (
              <FieldRow key={f.key} field={f} fullKey={`${guide.id}.${section.id}.${f.key}`} />
            ))}
          </div>
        </fieldset>
      ))}
    </div>
  );
}

function OperatorsView() {
  const [ops, setOps] = useState<Operator[]>(seedOperators);
  const [name, setName] = useState("");
  const [role, setRole] = useState("Locutor");
  const [pin, setPin] = useState("");

  const add = () => {
    if (!name.trim() || pin.length < 4) {
      toast.error("Informe nome e uma senha de 4+ dígitos.");
      return;
    }
    setOps((o) => [...o, { id: `op${Date.now()}`, name: name.trim(), role, pin }]);
    setName(""); setPin(""); setRole("Locutor");
    toast.success("Operador adicionado (demo).");
  };

  return (
    <div className="space-y-4">
      <p className="text-[12px] text-muted-foreground">
        Cadastro de operadores e permissões. Em <b>Geral</b> ficam as permissões padrão; aqui o
        administrador personaliza por operador (Padrão / Sim / Não).
      </p>

      <fieldset className="rounded-md border border-pl-panel-dark/40">
        <legend className="ml-2 px-1 text-[12px] font-bold text-pl-toolbar">Operadores cadastrados</legend>
        <div className="overflow-hidden">
          <table className="w-full text-[12px]">
            <thead className="bg-muted">
              <tr>
                <th className="px-3 py-1.5 text-left">Nome</th>
                <th className="px-3 py-1.5 text-left">Função</th>
                <th className="px-3 py-1.5 text-left">Senha</th>
                <th className="px-3 py-1.5"></th>
              </tr>
            </thead>
            <tbody>
              {ops.map((o) => (
                <tr key={o.id} className="border-t border-pl-panel-dark/30">
                  <td className="px-3 py-1.5">{o.name}</td>
                  <td className="px-3 py-1.5">{o.role}</td>
                  <td className="px-3 py-1.5 font-mono"><KeyRound className="inline h-3 w-3" /> ••••</td>
                  <td className="px-3 py-1.5 text-right">
                    <button
                      onClick={() => setOps((x) => x.filter((p) => p.id !== o.id))}
                      className="text-destructive hover:opacity-70"
                      title="Remover"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </fieldset>

      <fieldset className="rounded-md border border-pl-panel-dark/40">
        <legend className="ml-2 px-1 text-[12px] font-bold text-pl-toolbar">Novo operador</legend>
        <div className="grid grid-cols-1 gap-2 p-3 sm:grid-cols-4">
          <div className="space-y-1 sm:col-span-2">
            <Label className="text-[12px]">Nome</Label>
            <Input className="h-8 text-[12px]" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-[12px]">Função</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger className="h-8 text-[12px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {["Locutor", "Programador", "Administrador"].map((r) => (
                  <SelectItem key={r} value={r} className="text-[12px]">{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-[12px]">Senha (PIN)</Label>
            <Input className="h-8 text-[12px]" type="password" value={pin} onChange={(e) => setPin(e.target.value)} />
          </div>
        </div>
        <div className="px-3 pb-3">
          <button onClick={add} className="inline-flex items-center gap-1 rounded bg-pl-toolbar px-3 py-1.5 text-[12px] font-semibold text-white hover:brightness-110">
            <Plus className="h-3.5 w-3.5" /> Adicionar operador
          </button>
        </div>
      </fieldset>

      <fieldset className="rounded-md border border-pl-panel-dark/40">
        <legend className="ml-2 px-1 text-[12px] font-bold text-pl-toolbar">Pastas visíveis</legend>
        <p className="px-3 pb-1 text-[11px] text-muted-foreground">Marque as pastas de trabalho visíveis na guia "Pastas".</p>
        <div className="grid grid-cols-1 gap-2 p-3 sm:grid-cols-2">
          {folders.map((f) => (
            <div key={f.id} className="flex items-center justify-between gap-2 rounded border border-pl-panel-dark/40 bg-white/60 px-3 py-1.5 text-[12px]">
              <span className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: f.color }} />
                {f.name} <span className="text-muted-foreground">({f.tracks.length})</span>
              </span>
              <Switch defaultChecked />
            </div>
          ))}
        </div>
      </fieldset>
    </div>
  );
}

export function OptionsDialog({
  open,
  onOpenChange,
  tab,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  tab: string;
}) {
  const { commit, cancel, reset, draft, setDraftAll } = useConfig();
  const [active, setActive] = useState(tab);
  const fileRef = useRef<HTMLInputElement>(null);

  const errors = validateConfigState(draft);
  const errorKeys = Object.keys(errors);
  const errorCount = errorKeys.length;

  const handleSave = () => {
    if (errorCount > 0) {
      const firstGuide = errorKeys[0].split(".")[0];
      setActive(firstGuide);
      toast.error(`Corrija ${errorCount} campo(s) inválido(s) antes de salvar.`);
      return;
    }
    commit();
    toast.success("Configurações salvas.");
    onOpenChange(false);
  };

  const handleExport = () => {
    const blob = new Blob([exportConfig(draft)], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const stamp = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `solutions-play-config-${stamp}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast.success("Configurações exportadas (não altera o que está salvo).");
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // permite reimportar o mesmo arquivo
    if (!file) return;
    try {
      const text = await file.text();
      const { state, applied, ignored } = importConfig(text);
      setDraftAll(state);
      toast.success(
        `Configurações importadas: ${applied} aplicada(s)` +
        (ignored.length ? `, ${ignored.length} ignorada(s).` : ".") +
        " Revise e clique em Salvar.",
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao importar arquivo.");
    }
  };

  // sync requested tab when dialog opens
  const handleOpen = (v: boolean) => {
    if (v) setActive(tab);
    else cancel();
    onOpenChange(v);
  };

  const guide = configGuides.find((g) => g.id === active);

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="max-w-4xl gap-0 p-0">
        <DialogHeader className="border-b px-4 py-3">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Settings className="h-5 w-5" /> Opções — Solutions-Play
          </DialogTitle>
          <DialogDescription className="text-[12px]">
            Menu Ferramentas › Opções — configurações da estação (modo demonstração, salvas localmente).
          </DialogDescription>
        </DialogHeader>

        <div className="flex h-[70vh]">
          <nav className="w-40 shrink-0 border-r bg-muted/40 p-2">
            {GUIDES.map((g) => (
              <button
                key={g.id}
                onClick={() => setActive(g.id)}
                className={cn(
                  "mb-1 w-full rounded px-3 py-2 text-left text-[13px] font-medium transition-colors",
                  active === g.id ? "bg-pl-toolbar text-white" : "text-pl-text hover:bg-pl-panel-dark/20",
                )}
              >
                {g.title}
              </button>
            ))}
          </nav>

          <ScrollArea className="flex-1">
            <div className="p-4">
              {active === "operadores" ? <OperatorsView /> : guide ? <GuideView guide={guide} /> : null}
            </div>
          </ScrollArea>
        </div>

        <DialogFooter className="border-t px-4 py-3">
          {errorCount > 0 && (
            <span className="mr-auto self-center text-[12px] font-medium text-red-600">
              {errorCount} campo(s) inválido(s)
            </span>
          )}
          <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={handleImportFile} />
          <button
            onClick={() => fileRef.current?.click()}
            className={cn("flex items-center gap-1 rounded border px-3 py-2 text-[12px] font-medium hover:bg-muted", errorCount === 0 && "mr-auto")}
          >
            <Upload className="h-4 w-4" /> Importar
          </button>
          <button
            onClick={handleExport}
            className="flex items-center gap-1 rounded border px-3 py-2 text-[12px] font-medium hover:bg-muted"
          >
            <Download className="h-4 w-4" /> Exportar
          </button>
          <button
            onClick={() => { reset(); toast.message("Padrões restaurados (não salvo até clicar em Salvar)."); }}
            className="rounded border px-3 py-2 text-[12px] font-medium hover:bg-muted"
          >
            Restaurar padrões
          </button>
          <button
            onClick={() => handleOpen(false)}
            className="rounded border px-4 py-2 text-[12px] font-medium hover:bg-muted"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={errorCount > 0}
            className="rounded bg-gradient-to-b from-pl-transport to-pl-transport-dark px-4 py-2 text-[12px] font-semibold text-white hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Salvar
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
