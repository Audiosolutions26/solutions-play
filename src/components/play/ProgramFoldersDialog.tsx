import { useCallback, useEffect, useState } from "react";
import { FolderOpen, RefreshCw, FileText, ListMusic, Radio, Download, FolderInput } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { usePlayer } from "@/hooks/use-player";
import { parseProgramText } from "@/lib/play-program-import";
import {
  isDesktop, programDirsNative, listProgramFilesNative, readTextFileNative,
  openProgramFolderNative, type ProgramDirs, type ProgramFile, type ProgramKind,
} from "@/lib/play-native";

const KINDS: { kind: ProgramKind; label: string; sub: string; icon: typeof ListMusic }[] = [
  { kind: "grades", label: "Grades", sub: "Programação musical", icon: ListMusic },
  { kind: "mapas", label: "Mapas", sub: "Programação comercial", icon: Radio },
];

export function ProgramFoldersDialog({
  open,
  onOpenChange,
  onLoaded,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onLoaded?: () => void;
}) {
  const { replaceBlocks } = usePlayer();
  const desktop = isDesktop();
  const [dirs, setDirs] = useState<ProgramDirs | null>(null);
  const [files, setFiles] = useState<Record<ProgramKind, ProgramFile[]>>({ grades: [], mapas: [] });
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!desktop) return;
    setLoading(true);
    const [d, grades, mapas] = await Promise.all([
      programDirsNative(),
      listProgramFilesNative("grades"),
      listProgramFilesNative("mapas"),
    ]);
    setDirs(d);
    setFiles({ grades: grades ?? [], mapas: mapas ?? [] });
    setLoading(false);
  }, [desktop]);

  useEffect(() => {
    if (open) void refresh();
  }, [open, refresh]);

  const carregar = async (kind: ProgramKind, file: ProgramFile) => {
    const text = await readTextFileNative(file.path);
    if (text == null) {
      toast.error(`Falha ao ler ${file.name}`);
      return;
    }
    const category = kind === "mapas" ? "comercial" : "musical";
    const { blocks, stats } = parseProgramText(text, category);
    if (!blocks.length) {
      toast.error(`Nenhum bloco válido em ${file.name}`);
      return;
    }
    replaceBlocks(blocks);
    toast.success(
      `${file.name}: ${stats.blocks} blocos, ${stats.inserts} inserções` +
      (stats.unresolved ? ` (${stats.unresolved} arquivo(s) não localizado(s))` : ""),
    );
    onOpenChange(false);
    onLoaded?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5" /> Pastas de programação (Grades / Mapas)
          </DialogTitle>
          <DialogDescription>
            A raiz do programa contém as pastas <strong>Grades</strong> (programação musical) e{" "}
            <strong>Mapas</strong> (programação comercial). Os arquivos <code>.txt</code> ficam nessas pastas.
          </DialogDescription>
        </DialogHeader>

        {!desktop ? (
          <div className="rounded border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">
            As pastas Grades e Mapas ficam no sistema de arquivos e só estão disponíveis no
            aplicativo desktop (Solutions-Play.exe). No navegador, use “Abrir programação…”
            para selecionar um arquivo <code>.txt</code> manualmente.
          </div>
        ) : (
          <>
            {dirs && (
              <div className="rounded border bg-muted/40 px-3 py-2 font-mono text-[11px] text-muted-foreground">
                Raiz: {dirs.base}
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              {KINDS.map(({ kind, label, sub, icon: Icon }) => (
                <div key={kind} className="flex flex-col rounded border">
                  <div className="flex items-center justify-between gap-2 border-b bg-muted/60 px-3 py-2">
                    <span className="flex items-center gap-2 text-sm font-semibold">
                      <Icon className="h-4 w-4" /> {label}
                      <span className="text-[11px] font-normal text-muted-foreground">{sub}</span>
                    </span>
                    <button
                      onClick={() => openProgramFolderNative(kind)}
                      title="Abrir pasta no Explorer"
                      className="flex items-center gap-1 rounded border px-2 py-0.5 text-[11px] font-medium hover:bg-muted"
                    >
                      <FolderInput className="h-3.5 w-3.5" /> Abrir
                    </button>
                  </div>
                  <ul className="max-h-72 min-h-[120px] divide-y overflow-auto text-[12px]">
                    {files[kind].length === 0 ? (
                      <li className="px-3 py-6 text-center text-muted-foreground">
                        Nenhum arquivo .txt nesta pasta.
                      </li>
                    ) : (
                      files[kind].map((f) => (
                        <li key={f.path} className="flex items-center gap-2 px-2 py-1.5">
                          <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          <span className="flex-1 break-all">{f.name}</span>
                          <button
                            onClick={() => carregar(kind, f)}
                            className="flex items-center gap-1 rounded bg-gradient-to-b from-pl-transport to-pl-transport-dark px-2 py-0.5 text-[11px] font-semibold text-white hover:brightness-110"
                          >
                            <Download className="h-3.5 w-3.5" /> Carregar
                          </button>
                        </li>
                      ))
                    )}
                  </ul>
                </div>
              ))}
            </div>
          </>
        )}

        <DialogFooter className="gap-2">
          {desktop && (
            <button
              onClick={() => refresh()}
              disabled={loading}
              className="mr-auto flex items-center gap-1 rounded border px-3 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Atualizar
            </button>
          )}
          <button onClick={() => onOpenChange(false)}
            className="rounded border px-4 py-2 text-sm font-medium hover:bg-muted">Fechar</button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}