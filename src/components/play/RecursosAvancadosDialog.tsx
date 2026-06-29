import { useMemo, useState } from "react";
import { Sliders, Wand2, FileCode2, Map, Download, AlertTriangle, AlertCircle, CheckCircle2, Save, FolderOpen, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { usePlayer } from "@/hooks/use-player";
import { DEFAULT_GRADE, DEFAULT_MAPA, fmt, type Block } from "@/lib/play-data";
import { generateProgram, codeLegend, validateGrid, type CodeIssue } from "@/lib/play-gen";
import {
  buildPlaylistIni, serializeResult, downloadText, baseName,
} from "@/lib/play-export";
import {
  loadPresets, savePreset, deletePreset, getPreset, type GenPreset,
} from "@/lib/play-presets";
import { validateIniFile, validateIniFormat } from "@/lib/play-config-validate";

const variables = [
  ["%d", "dia do mês (31)"],
  ["%m", "mês (12)"],
  ["%Y", "ano 4 dígitos (2026)"],
  ["%y", "ano 2 dígitos (26)"],
  ["%a", "nome do dia (Seg, Ter…)"],
  ["%w", "número do dia (Dom=0…)"],
];

const specialCodes = [
  ["VH", "vinheta aleatória"],
  ["VHC", "vinheta carimbo / hora certa"],
  ["HC", "hora certa (relógio)"],
  ["00–99", "comercial por código (rodízio)"],
];

export function RecursosAvancadosDialog({
  open,
  onOpenChange,
  defaultTab,
  onGenerated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultTab: string;
  onGenerated: () => void;
}) {
  const { replaceBlocks, blocks: currentBlocks } = usePlayer();
  const [comFormat, setComFormat] = useState("AUTO");
  const [musFormat, setMusFormat] = useState("AUTO");
  const [comFile, setComFile] = useState("Mapas\\Mapa%d-%m-%Y.txt");
  const [musFile, setMusFile] = useState("Grades\\Grade%d.txt");
  const [grade, setGrade] = useState(DEFAULT_GRADE);
  const [mapa, setMapa] = useState(DEFAULT_MAPA);

  const [presets, setPresets] = useState<GenPreset[]>(() => loadPresets());
  const [presetName, setPresetName] = useState("");

  const salvarPreset = () => {
    const name = presetName.trim();
    if (!name) {
      toast.error("Informe um nome para o preset");
      return;
    }
    setPresets(savePreset({ name, grade, mapa, comFormat, comFile, musFormat, musFile }));
    toast.success(`Preset "${name}" salvo`);
  };

  const carregarPreset = (name: string) => {
    const p = getPreset(name);
    if (!p) return;
    setGrade(p.grade);
    setMapa(p.mapa);
    setComFormat(p.comFormat);
    setComFile(p.comFile);
    setMusFormat(p.musFormat);
    setMusFile(p.musFile);
    setPresetName(p.name);
    toast.success(`Preset "${p.name}" carregado`);
  };

  const excluirPreset = () => {
    const name = presetName.trim();
    if (!getPreset(name)) {
      toast.error("Selecione um preset existente para excluir");
      return;
    }
    setPresets(deletePreset(name));
    setPresetName("");
    toast.success(`Preset "${name}" excluído`);
  };

  const gradeIssues = useMemo(() => validateGrid(grade, "musical"), [grade]);
  const mapaIssues = useMemo(() => validateGrid(mapa, "comercial"), [mapa]);
  const errorCount = gradeIssues.filter((i) => i.severity === "error").length
    + mapaIssues.filter((i) => i.severity === "error").length;

  const preview = useMemo<Block[]>(
    () => (errorCount > 0 ? [] : generateProgram(grade, mapa)),
    [grade, mapa, errorCount],
  );
  const previewTotal = preview.reduce((s, b) => s + b.items.length, 0);

  const comFileErr = validateIniFile(comFile, "ARQUIVO comercial");
  const musFileErr = validateIniFile(musFile, "ARQUIVO musical");
  const comFmtErr = validateIniFormat(comFormat, "FORMATO comercial");
  const musFmtErr = validateIniFormat(musFormat, "FORMATO musical");
  const iniErrors = [comFileErr, musFileErr, comFmtErr, musFmtErr].filter(Boolean) as string[];

  const gerar = () => {
    if (errorCount > 0) {
      toast.error(`Corrija ${errorCount} erro(s) de código antes de gerar`);
      return;
    }
    const blocks = generateProgram(grade, mapa);
    if (!blocks.length) {
      toast.error("Nenhum bloco válido encontrado na Grade/Mapa");
      return;
    }
    replaceBlocks(blocks);
    const total = blocks.reduce((s, b) => s + b.items.length, 0);
    toast.success(`Programação gerada: ${blocks.length} blocos, ${total} inserções`);
    onOpenChange(false);
    onGenerated();
  };

  const iniConfig = { comFormat, comFile, musFormat, musFile };

  const exportarIni = () => {
    if (iniErrors.length) {
      toast.error(iniErrors[0]);
      return;
    }
    downloadText("Playlist.ini", buildPlaylistIni(iniConfig));
    toast.success("Playlist.ini exportado");
  };

  const baixarResultado = (kind: "comercial" | "musical") => {
    const fileErr = kind === "comercial" ? comFileErr : musFileErr;
    const fmtErr = kind === "comercial" ? comFmtErr : musFmtErr;
    if (fileErr || fmtErr) {
      toast.error(fileErr || fmtErr!);
      return;
    }
    const blocks = currentBlocks.filter((b) => b.category === kind);
    if (!blocks.length) {
      toast.error("Programação vazia — gere a programação antes de baixar");
      return;
    }
    const format = kind === "comercial" ? comFormat : musFormat;
    const template = kind === "comercial" ? comFile : musFile;
    const name = baseName(template);
    downloadText(name, serializeResult(blocks, format));
    toast.success(`${name} baixado (${format})`);
  };

  // Gera a programação final e exporta os arquivos no formato do Playlist.ini.
  const gerarEExportar = () => {
    if (errorCount > 0) {
      toast.error(`Corrija ${errorCount} erro(s) de código antes de gerar`);
      return;
    }
    if (iniErrors.length) {
      toast.error(iniErrors[0]);
      return;
    }
    const blocks = generateProgram(grade, mapa);
    if (!blocks.length) {
      toast.error("Nenhum bloco válido encontrado na Grade/Mapa");
      return;
    }
    replaceBlocks(blocks);

    // Exporta o índice e o resultado de cada bloco no formato definido.
    downloadText("Playlist.ini", buildPlaylistIni(iniConfig));
    const exported: string[] = [];
    ([
      ["comercial", comFormat, comFile],
      ["musical", musFormat, musFile],
    ] as const).forEach(([kind, format, template]) => {
      const sub = blocks.filter((b) => b.category === kind);
      if (!sub.length) return;
      const name = baseName(template);
      downloadText(name, serializeResult(sub, format));
      exported.push(`${name} (${format})`);
    });

    const total = blocks.reduce((s, b) => s + b.items.length, 0);
    toast.success(`Programação gerada (${blocks.length} blocos, ${total} inserções) e exportada: Playlist.ini, ${exported.join(", ")}`);
    onOpenChange(false);
    onGenerated();
  };

  const textareaCls =
    "h-48 w-full resize-none rounded border border-pl-panel-dark bg-white p-2 font-mono text-[12px] text-pl-text outline-none focus:border-pl-toolbar";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sliders className="h-5 w-5" /> Recursos Avançados
          </DialogTitle>
          <DialogDescription>
            Configuração de leitura (Playlist.ini), Grade musical, Mapa comercial e geração automática.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-end gap-2 rounded border bg-muted/40 p-2">
          <div className="flex-1 min-w-[160px] space-y-1">
            <Label htmlFor="presetName" className="text-[11px]">Preset (Grade + Mapa + regras)</Label>
            <Input id="presetName" list="preset-list" value={presetName} placeholder="Nome do preset…"
              onChange={(e) => setPresetName(e.target.value)} className="h-9 text-sm" />
            <datalist id="preset-list">
              {presets.map((p) => <option key={p.name} value={p.name} />)}
            </datalist>
          </div>
          <button onClick={salvarPreset}
            className="flex h-9 items-center gap-1 rounded bg-gradient-to-b from-pl-transport to-pl-transport-dark px-3 text-sm font-semibold text-white hover:brightness-110">
            <Save className="h-4 w-4" /> Salvar
          </button>
          <button onClick={() => carregarPreset(presetName)}
            className="flex h-9 items-center gap-1 rounded border px-3 text-sm font-medium hover:bg-muted">
            <FolderOpen className="h-4 w-4" /> Carregar
          </button>
          <button onClick={excluirPreset}
            className="flex h-9 items-center gap-1 rounded border px-3 text-sm font-medium text-red-600 hover:bg-red-50">
            <Trash2 className="h-4 w-4" /> Excluir
          </button>
        </div>

        <Tabs key={defaultTab} defaultValue={defaultTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="ini"><FileCode2 className="mr-1 h-4 w-4" />Playlist.ini</TabsTrigger>
            <TabsTrigger value="grade"><Map className="mr-1 h-4 w-4" />Grade</TabsTrigger>
            <TabsTrigger value="mapa"><Map className="mr-1 h-4 w-4" />Mapa</TabsTrigger>
            <TabsTrigger value="gerar"><Wand2 className="mr-1 h-4 w-4" />Gerar</TabsTrigger>
          </TabsList>

          {/* Playlist.ini */}
          <TabsContent value="ini" className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 rounded border p-3">
                <div className="text-sm font-semibold">[BLOCO COMERCIAL]</div>
                <Label htmlFor="cf">FORMATO</Label>
                <select id="cf" value={comFormat} onChange={(e) => setComFormat(e.target.value)}
                  className="h-9 w-full rounded border border-pl-panel-dark bg-white px-2 text-sm">
                  <option>AUTO</option><option>TXT1</option>
                </select>
                <Label htmlFor="cfile">ARQUIVO</Label>
                <Input id="cfile" value={comFile} onChange={(e) => setComFile(e.target.value)} className="font-mono text-xs" />
              </div>
              <div className="space-y-2 rounded border p-3">
                <div className="text-sm font-semibold">[BLOCO MUSICAL]</div>
                <Label htmlFor="mf">FORMATO</Label>
                <select id="mf" value={musFormat} onChange={(e) => setMusFormat(e.target.value)}
                  className="h-9 w-full rounded border border-pl-panel-dark bg-white px-2 text-sm">
                  <option>AUTO</option><option>TXT1</option>
                </select>
                <Label htmlFor="mfile">ARQUIVO</Label>
                <Input id="mfile" value={musFile} onChange={(e) => setMusFile(e.target.value)} className="font-mono text-xs" />
              </div>
            </div>
            <div className="rounded border p-3">
              <div className="mb-2 text-sm font-semibold">Variáveis disponíveis</div>
              <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-[12px] sm:grid-cols-3">
                {variables.map(([v, d]) => (
                  <div key={v}><code className="rounded bg-muted px-1 font-mono">{v}</code> — {d}</div>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={exportarIni}
                className="flex items-center gap-2 rounded bg-gradient-to-b from-pl-transport to-pl-transport-dark px-4 py-2 text-sm font-semibold text-white hover:brightness-110 active:translate-y-px">
                <FileCode2 className="h-4 w-4" /> Exportar Playlist.ini
              </button>
              <button onClick={() => baixarResultado("comercial")}
                className="flex items-center gap-2 rounded border px-4 py-2 text-sm font-medium hover:bg-muted">
                <Download className="h-4 w-4" /> Baixar resultado comercial
              </button>
              <button onClick={() => baixarResultado("musical")}
                className="flex items-center gap-2 rounded border px-4 py-2 text-sm font-medium hover:bg-muted">
                <Download className="h-4 w-4" /> Baixar resultado musical
              </button>
            </div>
          </TabsContent>

          {/* Grade */}
          <TabsContent value="grade" className="space-y-2 py-2">
            <Label>Grade musical (HH:MM código, código, …)</Label>
            <textarea value={grade} onChange={(e) => setGrade(e.target.value)} className={textareaCls} spellCheck={false} />
            <IssuesPanel issues={gradeIssues} />
            <CodeLegend />
          </TabsContent>

          {/* Mapa */}
          <TabsContent value="mapa" className="space-y-2 py-2">
            <Label>Mapa comercial (HH:MM código, código, …)</Label>
            <textarea value={mapa} onChange={(e) => setMapa(e.target.value)} className={textareaCls} spellCheck={false} />
            <IssuesPanel issues={mapaIssues} />
            <CodeLegend />
          </TabsContent>

          {/* Gerar */}
          <TabsContent value="gerar" className="space-y-3 py-2 text-sm">
            <p className="text-muted-foreground">
              O Solutions-Play sorteia músicas/comerciais das pastas conforme os códigos da Grade e do Mapa,
              montando a programação automaticamente (substitui a programação atual).
            </p>
            <div className="rounded border p-3">
              <div className="mb-1 font-semibold">Resumo</div>
              <div>Grade: {grade.split("\n").filter((l) => l.trim()).length} blocos musicais</div>
              <div>Mapa: {mapa.split("\n").filter((l) => l.trim()).length} blocos comerciais</div>
            </div>
            <IssuesPanel issues={[...gradeIssues, ...mapaIssues]} />
            {errorCount === 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Pré-visualização da programação</Label>
                  <span className="text-[11px] text-muted-foreground">
                    {preview.length} blocos · {previewTotal} inserções
                  </span>
                </div>
                <PreviewGrid blocks={preview} />
              </div>
            )}
            <button onClick={gerar}
              disabled={errorCount > 0}
              className="flex w-full items-center justify-center gap-2 rounded bg-gradient-to-b from-pl-transport to-pl-transport-dark py-2.5 font-semibold text-white hover:brightness-110 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50">
              <Wand2 className="h-4 w-4" /> Gerar programação automática
            </button>
            <button onClick={gerarEExportar}
              disabled={errorCount > 0}
              className="flex w-full items-center justify-center gap-2 rounded border border-pl-transport py-2.5 font-semibold text-pl-transport hover:bg-pl-transport/10 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50">
              <Download className="h-4 w-4" /> Gerar e exportar (Playlist.ini + arquivos)
            </button>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <button onClick={() => onOpenChange(false)}
            className="rounded border px-4 py-2 text-sm font-medium hover:bg-muted">Fechar</button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CodeLegend() {
  return (
    <div className="rounded border p-2 text-[11px]">
      <span className="font-semibold">Códigos: </span>
      {codeLegend.map((c) => (
        <span key={c.code} className="mr-2 inline-block">
          <code className="rounded bg-muted px-1 font-mono">{c.code}</code> {c.name}
        </span>
      ))}
      {specialCodes.map(([c, d]) => (
        <span key={c} className="mr-2 inline-block">
          <code className="rounded bg-muted px-1 font-mono">{c}</code> {d}
        </span>
      ))}
    </div>
  );
}

const catStyle: Record<string, string> = {
  musical: "bg-blue-50 text-blue-700 border-blue-200",
  comercial: "bg-emerald-50 text-emerald-700 border-emerald-200",
  vinheta: "bg-amber-50 text-amber-700 border-amber-200",
  texto: "bg-gray-100 text-gray-600 border-gray-200",
};

function PreviewGrid({ blocks }: { blocks: Block[] }) {
  if (!blocks.length) {
    return (
      <div className="rounded border p-3 text-[12px] text-muted-foreground">
        Nenhum bloco para pré-visualizar.
      </div>
    );
  }
  return (
    <div className="max-h-64 space-y-2 overflow-auto rounded border p-2">
      {blocks.map((b) => (
        <div key={b.id} className="rounded border border-pl-panel-dark/40">
          <div className="flex items-center justify-between gap-2 border-b bg-muted/60 px-2 py-1 text-[12px] font-semibold">
            <span className="flex items-center gap-2">
              <span className="font-mono">{b.time}</span>
              <span className={`rounded border px-1.5 text-[10px] uppercase ${catStyle[b.category] ?? ""}`}>
                {b.category}
              </span>
            </span>
            <span className="text-[10px] font-normal text-muted-foreground">{b.items.length} inserções</span>
          </div>
          <ol className="divide-y text-[12px]">
            {b.items.map((t, i) => (
              <li key={t.id} className="flex items-center gap-2 px-2 py-1">
                <span className="w-5 text-right font-mono text-[10px] text-muted-foreground">{i + 1}</span>
                <span className={`rounded border px-1 text-[10px] uppercase ${catStyle[t.category] ?? ""}`}>
                  {t.category.slice(0, 3)}
                </span>
                <span className="flex-1 truncate">
                  {t.title}
                  {t.artist ? <span className="text-muted-foreground"> — {t.artist}</span> : null}
                </span>
                <span className="font-mono text-[10px] text-muted-foreground">{fmt(t.duration)}</span>
              </li>
            ))}
          </ol>
        </div>
      ))}
    </div>
  );
}

function IssuesPanel({ issues }: { issues: CodeIssue[] }) {
  if (!issues.length) {
    return (
      <div className="flex items-center gap-2 rounded border border-green-600/40 bg-green-50 px-3 py-2 text-[12px] text-green-700">
        <CheckCircle2 className="h-4 w-4" /> Todos os códigos são válidos e consistentes.
      </div>
    );
  }
  const errors = issues.filter((i) => i.severity === "error");
  const warnings = issues.filter((i) => i.severity === "warning");
  return (
    <div className="max-h-40 space-y-1 overflow-auto rounded border p-2 text-[12px]">
      <div className="mb-1 font-semibold">
        {errors.length} erro(s), {warnings.length} aviso(s)
      </div>
      {issues.map((i, idx) => (
        <div key={idx} className={`flex items-start gap-2 ${i.severity === "error" ? "text-red-600" : "text-amber-600"}`}>
          {i.severity === "error"
            ? <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            : <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />}
          <span>Linha {i.line}: {i.message}</span>
        </div>
      ))}
    </div>
  );
}
