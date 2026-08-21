import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Folder,
  FolderPlus,
  Trash2,
  Save,
  Music,
  Megaphone,
  Clock,
  FileText,
  Disc3,
  ListMusic,
  Check,
  FolderSearch,
  FolderOpen,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useShortcuts } from "@/hooks/use-shortcuts";
import {
  SHORTCUT_TYPES,
  PALETTE,
  makeShortcut,
  typeMeta,
  type ShortcutType,
  type Shortcut,
} from "@/lib/play-shortcuts";
import {
  isDesktop,
  pickFolderNative,
  openFolderNative,
  folderExistsNative,
  listFolderAudioNative,
} from "@/lib/play-native";
import { makeFolderAudioTrack, type Track } from "@/lib/play-data";
import { readTrackDuration } from "@/lib/play-audio-files";
import { generatePkfInfoForFolder, importPkfInfoForTracks } from "@/lib/play-pkfinfo";

const TYPE_ICON: Record<ShortcutType, typeof Music> = {
  musicas: Music,
  comerciais: Megaphone,
  horacerta: Clock,
  vinhetas: Disc3,
  trilhas: ListMusic,
  textos: FileText,
};

export function ShortcutsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { shortcuts, add, update, remove } = useShortcuts();
  const [selId, setSelId] = useState<string | null>(null);
  const [newType, setNewType] = useState<ShortcutType>("musicas");

  const sel = shortcuts.find((s) => s.id === selId) ?? null;

  // Agrupa os atalhos por categoria, igual ao Config Manager (manual p.146).
  const grouped = useMemo(() => {
    return SHORTCUT_TYPES.map((meta) => ({
      meta,
      items: shortcuts.filter((s) => s.type === meta.type),
    }));
  }, [shortcuts]);

  const createShortcut = () => {
    const sc = makeShortcut(newType);
    add(sc);
    setSelId(sc.id);
    toast.success(`Atalho criado em ${typeMeta(newType).label}.`);
  };

  const deleteShortcut = () => {
    if (!sel) {
      toast.info("Selecione um atalho para excluir.");
      return;
    }
    remove(sel.id);
    setSelId(null);
    toast.success(`Atalho "${sel.name}" excluído.`);
  };

  const saveAll = () => {
    // As alterações já são persistidas a cada edição (localStorage);
    // este botão confirma como no Config Manager (manual p.149).
    toast.success("Todas as alterações foram salvas.");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b border-pl-panel-dark/40 bg-pl-toolbar px-4 py-2.5">
          <DialogTitle className="flex items-center gap-2 text-[14px] font-semibold text-white">
            <Folder className="h-4 w-4" /> Gerenciamento de atalhos
          </DialogTitle>
          <DialogDescription className="text-[11px] text-white/80">
            Crie e organize os atalhos das pastas de trabalho por categoria (manual p.145-149).
          </DialogDescription>
        </DialogHeader>

        {/* toolbar */}
        <div className="flex flex-wrap items-center gap-2 border-b border-pl-panel-dark/40 bg-pl-panel px-3 py-2">
          <select
            value={newType}
            onChange={(e) => setNewType(e.target.value as ShortcutType)}
            className="h-8 rounded border border-pl-panel-dark bg-white px-2 text-[12px] text-pl-text outline-none"
          >
            {SHORTCUT_TYPES.map((t) => (
              <option key={t.type} value={t.type}>
                {t.label}
              </option>
            ))}
          </select>
          <Button
            onClick={createShortcut}
            size="sm"
            className="h-8 gap-1 bg-pl-toolbar text-[12px] hover:brightness-110"
          >
            <FolderPlus className="h-4 w-4" /> Criar atalho
          </Button>
          <Button
            onClick={deleteShortcut}
            size="sm"
            variant="destructive"
            className="h-8 gap-1 text-[12px]"
            disabled={!sel}
          >
            <Trash2 className="h-4 w-4" /> Excluir
          </Button>
          <Button
            onClick={saveAll}
            size="sm"
            variant="outline"
            className="ml-auto h-8 gap-1 text-[12px]"
          >
            <Save className="h-4 w-4" /> Salvar todas as alterações
          </Button>
        </div>

        <div className="grid grid-cols-[1fr_300px]">
          {/* lista por categoria */}
          <div className="pl-scroll max-h-[60vh] overflow-y-auto border-r border-pl-panel-dark/40 bg-pl-row p-2">
            {grouped.map(({ meta, items }) => {
              const Icon = TYPE_ICON[meta.type];
              return (
                <div key={meta.type} className="mb-3">
                  <div className="flex items-center gap-2 rounded-t bg-pl-toolbar-light/40 px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-pl-toolbar">
                    <Icon className="h-3.5 w-3.5" /> {meta.label}
                    <span className="ml-auto rounded bg-white/60 px-1.5 text-[10px] font-semibold text-pl-text">
                      {items.length}
                    </span>
                  </div>
                  {items.length === 0 ? (
                    <p className="rounded-b border border-t-0 border-pl-panel-dark/40 bg-white/50 px-2 py-1.5 text-[11px] text-muted-foreground">
                      Nenhum atalho nesta categoria.
                    </p>
                  ) : (
                    <div className="overflow-hidden rounded-b border border-t-0 border-pl-panel-dark/40">
                      {items.map((s, i) => (
                        <button
                          key={s.id}
                          onClick={() => setSelId(s.id)}
                          className={`flex w-full items-center gap-2 px-2 py-1.5 text-left text-[12px] ${
                            selId === s.id
                              ? "bg-pl-toolbar-light/50"
                              : i % 2
                                ? "bg-pl-row-alt"
                                : "bg-white"
                          }`}
                        >
                          <Folder
                            className="h-4 w-4 shrink-0"
                            style={{ color: s.color, fill: s.color }}
                          />
                          <span className="flex-1 break-words text-pl-text">{s.name}</span>
                          {s.registered && (
                            <span className="rounded bg-emerald-600 px-1 text-[9px] font-bold text-white">
                              REG
                            </span>
                          )}
                          <span className="font-mono text-[10px] text-muted-foreground">
                            {s.tracks.length}
                          </span>
                          {selId === s.id && <Check className="h-3.5 w-3.5 text-pl-toolbar" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* propriedades */}
          <div className="pl-scroll max-h-[60vh] overflow-y-auto bg-pl-panel p-3">
            <h3 className="mb-2 text-[12px] font-bold text-pl-toolbar">Propriedades da pasta</h3>
            {!sel ? (
              <p className="text-[12px] text-muted-foreground">
                Selecione um atalho à esquerda para editar suas propriedades.
              </p>
            ) : (
              <ShortcutForm sel={sel} onChange={(patch) => update(sel.id, patch)} />
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ShortcutForm({
  sel,
  onChange,
}: {
  sel: Shortcut;
  onChange: (patch: Partial<Shortcut>) => void;
}) {
  const desktop = isDesktop();
  // Estado de validação do diretório: "checking" | "ok" | "missing" | "idle".
  const [dirStatus, setDirStatus] = useState<"idle" | "checking" | "ok" | "missing">("idle");
  const [scanning, setScanning] = useState(false);
  const [pkfScanning, setPkfScanning] = useState(false);
  const [pkfProgress, setPkfProgress] = useState({ done: 0, total: 0 });

  // Valida o caminho sempre que o atalho ou o diretório mudar (debounced).
  useEffect(() => {
    const dir = sel.directory?.trim();
    if (!desktop) {
      setDirStatus("idle");
      return;
    }
    if (!dir) {
      setDirStatus("missing");
      return;
    }
    let active = true;
    setDirStatus("checking");
    const t = setTimeout(async () => {
      const exists = await folderExistsNative(dir);
      if (!active) return;
      setDirStatus(exists ? "ok" : "missing");
    }, 350);
    return () => {
      active = false;
      clearTimeout(t);
    };
  }, [sel.id, sel.directory, desktop]);

  // Lê os áudios da pasta e popula as músicas do atalho (manual p.145-149).
  const loadTracksFrom = async (dir: string): Promise<number> => {
    const files = await listFolderAudioNative(dir);
    if (!files) return -1; // modo web: não há acesso ao sistema de arquivos
    const tracks: Track[] = files.map((f) => makeFolderAudioTrack(f.name, f.path, sel.category));
    onChange({ tracks });
    // Importa sidecars já existentes sem bloquear a listagem da pasta.
    void importPkfInfoForTracks(tracks);
    // Lê a duração real de cada música em segundo plano e atualiza o "tempo"
    // exibido na lista (as inserções entram com 0:00 e vão sendo preenchidas).
    void resolveDurations(tracks);
    return tracks.length;
  };

  // Resolve as durações em pequenos lotes concorrentes. Antes, uma pasta com
  // centenas de arquivos fazia uma leitura e uma re-renderização por faixa;
  // agora há no máximo quatro metadados sendo lidos simultaneamente e a UI
  // recebe atualizações agrupadas. Nenhum áudio é decodificado para playback.
  const resolveDurations = async (tracks: Track[]) => {
    const out = [...tracks];
    let cursor = 0;
    const worker = async () => {
      while (true) {
        const i = cursor++;
        if (i >= out.length) return;
        const d = await readTrackDuration(out[i]);
        if (d > 0) out[i] = { ...out[i], duration: Math.round(d) };
        if ((i + 1) % 8 === 0 || i === out.length - 1) onChange({ tracks: [...out] });
      }
    };
    const workers = Math.min(4, Math.max(1, out.length));
    await Promise.all(Array.from({ length: workers }, () => worker()));
    onChange({ tracks: [...out] });
  };

  // Abre a árvore de pastas do Windows e aponta o atalho para a pasta escolhida.
  const browseFolder = async () => {
    const picked = await pickFolderNative(sel.directory);
    if (!picked) return; // cancelado
    onChange({ directory: picked.path });
    setDirStatus("ok");
    setScanning(true);
    const n = await loadTracksFrom(picked.path);
    setScanning(false);
    toast.success(
      `Atalho apontado para "${picked.name}" — ${n >= 0 ? n : picked.audioCount} música(s) carregada(s).`,
    );
  };

  // Relê a pasta atual (útil quando o caminho foi digitado manualmente ou
  // novos arquivos foram adicionados à pasta no Windows).
  const rescanFolder = async () => {
    const dir = sel.directory?.trim();
    if (!dir) {
      toast.info("Defina um diretório primeiro.");
      return;
    }
    if (desktop) {
      const exists = await folderExistsNative(dir);
      if (exists === false) {
        setDirStatus("missing");
        toast.error(`A pasta não existe: ${dir}`);
        return;
      }
    }
    setScanning(true);
    const n = await loadTracksFrom(dir);
    setScanning(false);
    if (n < 0) {
      toast.info("A leitura da pasta só funciona no app desktop.");
      return;
    }
    setDirStatus("ok");
    toast.success(`${n} música(s) carregada(s) da pasta.`);
  };

  const generatePkfInfo = async () => {
    const dir = sel.directory?.trim();
    if (!dir) {
      toast.info("Defina um diretório primeiro.");
      return;
    }
    if (!desktop) {
      toast.info("A geração de pkfinfo só funciona no app desktop.");
      return;
    }
    const exists = await folderExistsNative(dir);
    if (exists === false) {
      setDirStatus("missing");
      toast.error(`A pasta não existe: ${dir}`);
      return;
    }
    setPkfScanning(true);
    setPkfProgress({ done: 0, total: 0 });
    const result = await generatePkfInfoForFolder(dir, sel.category, (done, total) =>
      setPkfProgress({ done, total }),
    );
    setPkfScanning(false);
    if (result.errors)
      toast.warning(
        `pkfinfo: ${result.generated} gerado(s), ${result.skipped} ignorado(s), ${result.errors} erro(s).`,
      );
    else toast.success(`pkfinfo: ${result.generated} arquivo(s) gerado(s) na pasta.`);
  };

  // Abre a pasta apontada pelo atalho no Explorer, no local exato.
  const openInExplorer = async () => {
    const dir = sel.directory?.trim();
    if (!dir) {
      toast.info("Defina um diretório primeiro.");
      return;
    }
    // Revalida antes de abrir para dar uma mensagem clara em caso de erro.
    if (desktop) {
      const exists = await folderExistsNative(dir);
      if (exists === false) {
        setDirStatus("missing");
        toast.error(`A pasta não existe: ${dir}`);
        return;
      }
    }
    const ok = await openFolderNative(dir);
    if (!ok) toast.error(`Não foi possível abrir a pasta no Explorer: ${dir}`);
  };

  return (
    <div className="space-y-3">
      <div>
        <Label className="text-[11px] font-semibold">Título</Label>
        <Input
          className="mt-1 h-8 text-[12px]"
          value={sel.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="Nome do atalho"
        />
      </div>

      <div>
        <Label className="text-[11px] font-semibold">Tipo (categoria)</Label>
        <select
          value={sel.type}
          onChange={(e) => onChange({ type: e.target.value as ShortcutType })}
          className="mt-1 h-8 w-full rounded border border-pl-panel-dark bg-white px-2 text-[12px] text-pl-text outline-none"
        >
          {SHORTCUT_TYPES.map((t) => (
            <option key={t.type} value={t.type}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <Label className="text-[11px] font-semibold">Diretório</Label>
        <div className="mt-1 flex gap-1">
          <Input
            className={`h-8 flex-1 font-mono text-[11px] ${
              dirStatus === "missing" ? "border-red-500 focus-visible:ring-red-500" : ""
            }`}
            value={sel.directory}
            onChange={(e) => onChange({ directory: e.target.value })}
            placeholder="C:\Playlist\Pgm\Pastas\..."
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={browseFolder}
            className="h-8 gap-1 px-2 text-[11px]"
            title="Procurar pasta na árvore do Windows"
          >
            <FolderSearch className="h-4 w-4" /> Procurar
          </Button>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={openInExplorer}
          disabled={!sel.directory || dirStatus === "missing"}
          className="mt-1.5 h-8 w-full gap-1 text-[11px]"
          title="Abrir a pasta deste atalho no Explorer do Windows"
        >
          <FolderOpen className="h-4 w-4" /> Abrir no Explorer
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={generatePkfInfo}
          disabled={!desktop || !sel.directory || dirStatus === "missing" || pkfScanning}
          className="mt-1.5 h-8 w-full gap-1 text-[11px]"
          title="Analisar as bordas audíveis e gerar sidecars .pkfinfo"
        >
          <RefreshCw className={`h-4 w-4 ${pkfScanning ? "animate-spin" : ""}`} />{" "}
          {pkfScanning
            ? `Gerando pkfinfo ${pkfProgress.done}/${pkfProgress.total || "…"}`
            : "Gerar pkfinfo das músicas"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={rescanFolder}
          disabled={!sel.directory || dirStatus === "missing" || scanning}
          className="mt-1.5 h-8 w-full gap-1 text-[11px]"
          title="Reler a pasta e carregar as músicas"
        >
          <RefreshCw className={`h-4 w-4 ${scanning ? "animate-spin" : ""}`} />{" "}
          {scanning ? "Lendo pasta…" : "Reler pasta (carregar músicas)"}
        </Button>

        {/* Validação clara do caminho do diretório */}
        {desktop && dirStatus === "missing" && (
          <p className="mt-1.5 flex items-center gap-1 text-[10px] font-semibold text-red-600">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            {sel.directory?.trim()
              ? "Pasta não encontrada — o atalho está apontando para um local inexistente."
              : "Defina um diretório — o atalho não pode ficar sem pasta."}
          </p>
        )}
        {desktop && dirStatus === "checking" && (
          <p className="mt-1.5 text-[10px] text-muted-foreground">Verificando o caminho…</p>
        )}
        {desktop && dirStatus === "ok" && (
          <p className="mt-1.5 flex items-center gap-1 text-[10px] font-semibold text-emerald-600">
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0" /> Pasta encontrada.
          </p>
        )}
        {!desktop && (
          <p className="mt-1 text-[10px] text-muted-foreground">
            A árvore de pastas do Windows abre no app desktop. No navegador, digite o caminho
            manualmente.
          </p>
        )}
      </div>

      <div>
        <Label className="text-[11px] font-semibold">Código (atalho da Grade/Mapa)</Label>
        <Input
          className="mt-1 h-8 text-[12px] uppercase"
          value={sel.code}
          onChange={(e) => onChange({ code: e.target.value.toUpperCase() })}
          placeholder="Ex.: NAC, FB, COM"
        />
      </div>

      <div className="flex items-center justify-between rounded border border-pl-panel-dark/40 bg-white/60 px-3 py-2">
        <div>
          <Label className="text-[11px] font-semibold">Registrar</Label>
          <p className="text-[10px] text-muted-foreground">
            Permite programar este atalho automaticamente.
          </p>
        </div>
        <Switch checked={sel.registered} onCheckedChange={(v) => onChange({ registered: v })} />
      </div>

      <div>
        <Label className="text-[11px] font-semibold">Ícone (cor)</Label>
        <div className="mt-1 flex flex-wrap gap-1.5">
          {PALETTE.map((c) => (
            <button
              key={c}
              onClick={() => onChange({ color: c })}
              className={`grid h-7 w-7 place-items-center rounded ${sel.color === c ? "ring-2 ring-pl-toolbar ring-offset-1" : ""}`}
              style={{ backgroundColor: c }}
              title={c}
            >
              {sel.color === c && <Check className="h-4 w-4 text-white" />}
            </button>
          ))}
        </div>
      </div>

      <p className="text-[10px] text-muted-foreground">
        {sel.tracks.length} áudio(s) nesta pasta de trabalho.
      </p>
    </div>
  );
}
