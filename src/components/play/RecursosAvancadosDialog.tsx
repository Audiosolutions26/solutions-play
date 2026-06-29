import { useMemo, useState } from "react";
import { Sliders, Wand2, FileCode2, Map, Download, AlertTriangle, AlertCircle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { usePlayer } from "@/hooks/use-player";
import { DEFAULT_GRADE, DEFAULT_MAPA } from "@/lib/play-data";
import { generateProgram, codeLegend } from "@/lib/play-gen";
import { generateProgram, codeLegend, validateGrid, type CodeIssue } from "@/lib/play-gen";
import {
  buildPlaylistIni, serializeResult, downloadText, baseName,
} from "@/lib/play-export";

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

  const gradeIssues = useMemo(() => validateGrid(grade, "musical"), [grade]);
  const mapaIssues = useMemo(() => validateGrid(mapa, "comercial"), [mapa]);
  const errorCount = gradeIssues.filter((i) => i.severity === "error").length
    + mapaIssues.filter((i) => i.severity === "error").length;

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
    downloadText("Playlist.ini", buildPlaylistIni(iniConfig));
    toast.success("Playlist.ini exportado");
  };

  const baixarResultado = (kind: "comercial" | "musical") => {
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
            <CodeLegend />
          </TabsContent>

          {/* Mapa */}
          <TabsContent value="mapa" className="space-y-2 py-2">
            <Label>Mapa comercial (HH:MM código, código, …)</Label>
            <textarea value={mapa} onChange={(e) => setMapa(e.target.value)} className={textareaCls} spellCheck={false} />
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
            <button onClick={gerar}
              className="flex w-full items-center justify-center gap-2 rounded bg-gradient-to-b from-pl-transport to-pl-transport-dark py-2.5 font-semibold text-white hover:brightness-110 active:translate-y-px">
              <Wand2 className="h-4 w-4" /> Gerar programação automática
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