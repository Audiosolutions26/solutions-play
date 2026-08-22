import { useRef } from "react";
import { toast } from "sonner";
import {
  ArrowDown,
  ArrowUp,
  CalendarDays,
  ClipboardPaste,
  Copy,
  FileCode2,
  FilePlus2,
  FolderArchive,
  FolderOpen,
  Headphones,
  HelpCircle,
  Info,
  Keyboard,
  ListChecks,
  LogIn,
  LogOut,
  PanelsTopLeft,
  Play,
  Printer,
  Radio,
  RefreshCw,
  Save,
  Search,
  Scissors,
  Settings2,
  SkipForward,
  Square,
  Trash2,
  Volume2,
  Wand2,
  type LucideIcon,
} from "lucide-react";
import { usePlayer } from "@/hooks/use-player";
import { parseProgramText } from "@/lib/play-program-import";
import { parseProgramXml } from "@/lib/play-program-xml";
import {
  Menubar,
  MenubarMenu,
  MenubarTrigger,
  MenubarContent,
  MenubarItem,
  MenubarSeparator,
  MenubarSub,
  MenubarSubTrigger,
  MenubarSubContent,
  MenubarCheckboxItem,
  MenubarShortcut,
} from "@/components/ui/menubar";

export interface PanelVisibility {
  pastas: boolean;
  propriedades: boolean;
}

interface Props {
  panels: PanelVisibility;
  onTogglePanel: (key: keyof PanelVisibility) => void;
  onOpenOptions: (tab: string) => void;
  onLogout: () => void;
  onSwitchOperator: () => void;
  onOpenQuickStart: () => void;
  onOpenAdvanced: (tab: string) => void;
  onOpenBeep: () => void;
  onOpenSecoes: () => void;
  onOpenDevices: () => void;
  onOpenShortcuts: () => void;
  onDockQuickStart?: () => void;
  onOpenProgramFolders: () => void;
  onOpenTab: (tab: string) => void;
}

const soon = (name: string) => () => toast.info(`${name}: recurso em breve`);

function MenuGlyph({ icon: Icon }: { icon: LucideIcon }) {
  return <Icon aria-hidden="true" className="mr-2 h-3.5 w-3.5 shrink-0 text-[#8fb8cf]" />;
}

const panelList = [
  "Programação",
  "Display No Ar",
  "Músicas Executadas",
  "Textos ao vivo",
  "Texto do dia",
  "Anotações",
  "Hoje",
  "Mini Site",
  "Aparência",
];

const triggerCls =
  "cursor-pointer rounded-sm px-2 py-0.5 text-[12px] font-medium text-white outline-none transition-colors data-[state=open]:bg-[#2d668c] data-[state=open]:text-white focus:bg-[#2d668c] hover:bg-white/15";

export function AppMenu({
  panels,
  onTogglePanel,
  onOpenOptions,
  onLogout,
  onSwitchOperator,
  onOpenQuickStart,
  onOpenAdvanced,
  onOpenBeep,
  onOpenSecoes,
  onOpenDevices,
  onOpenShortcuts,
  onDockQuickStart,
  onOpenProgramFolders,
  onOpenTab,
}: Props) {
  const {
    togglePlay,
    stop,
    next,
    isPlaying,
    cue,
    setCue,
    selectedId,
    currentBlockId,
    blocks,
    removeTrack,
    moveTrack,
    replaceBlocks,
  } = usePlayer();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const abrirPrograma = () => fileInputRef.current?.click();

  const novaProgramacao = () => {
    if (window.confirm("Criar uma nova programação? A grade atual será substituída.")) {
      replaceBlocks([]);
      toast.success("Nova programação criada");
    }
  };

  const salvarPrograma = () => {
    const payload = JSON.stringify(
      { version: 1, exportedAt: new Date().toISOString(), blocks },
      null,
      2,
    );
    const url = URL.createObjectURL(new Blob([payload], { type: "application/json" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `solutions-play-programacao-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    toast.success("Programação salva em arquivo JSON");
  };

  const imprimirPrograma = () => {
    window.print();
  };

  const abrirReleases = () => {
    window.open(
      "https://github.com/Audiosolutions26/solutions-play/releases",
      "_blank",
      "noopener,noreferrer",
    );
  };

  const onProgramFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const text = await file.text();
      const isXml = /\.(pxml|xml3?|xml)$/i.test(file.name) || /^\s*</.test(text);
      const imported = isXml ? parseProgramXml(text) : parseProgramText(text);
      if (!imported) {
        toast.error("Formato de programação inválido ou não suportado");
        return;
      }
      const { blocks: parsed, stats } = imported;
      if (!parsed.length) {
        toast.error("Nenhum bloco válido encontrado no arquivo de programação");
        return;
      }
      replaceBlocks(parsed);
      toast.success(
        `${isXml ? "Programação PXML importada" : "Programação TXT importada"}: ${stats.blocks} blocos, ${stats.inserts} inserções` +
          (stats.unresolved
            ? ` (${stats.unresolved} arquivo(s) não localizado(s) nas pastas)`
            : ""),
      );
    } catch {
      toast.error("Falha ao ler o arquivo de programação");
    }
  };

  const removeSelected = () => {
    if (!selectedId) {
      toast.info("Selecione uma inserção para remover");
      return;
    }
    const block =
      blocks.find((b) => b.items.some((t) => t.id === selectedId)) ??
      blocks.find((b) => b.id === currentBlockId);
    if (block) {
      removeTrack(block.id, selectedId);
      toast.success("Inserção removida");
    }
  };

  const move = (dir: -1 | 1) => {
    if (!selectedId) {
      toast.info("Selecione uma inserção primeiro.");
      return;
    }
    moveTrack(selectedId, dir);
  };

  return (
    <Menubar className="h-auto space-x-0 rounded-none border-0 bg-transparent p-0 shadow-none">
      <input
        ref={fileInputRef}
        type="file"
        accept=".txt,.xml,.xml3,.pxml,text/plain,application/xml"
        className="hidden"
        onChange={onProgramFile}
      />
      {/* SOLUTIONS */}
      <MenubarMenu>
        <MenubarTrigger className={triggerCls}>Solutions Play</MenubarTrigger>
        <MenubarContent align="start">
          <MenubarItem onSelect={novaProgramacao}>
            <MenuGlyph icon={FilePlus2} />
            Nova programação
          </MenubarItem>
          <MenubarItem onSelect={abrirPrograma}>
            <MenuGlyph icon={FolderOpen} />
            Abrir programação…
          </MenubarItem>
          <MenubarItem onSelect={onOpenProgramFolders}>
            <MenuGlyph icon={FolderArchive} />
            Abrir das pastas Grades/Mapas…
          </MenubarItem>
          <MenubarItem onSelect={salvarPrograma}>
            <MenuGlyph icon={Save} />
            Salvar programação
          </MenubarItem>
          <MenubarSeparator />
          <MenubarItem onSelect={() => onOpenAdvanced("gerar")}>
            <MenuGlyph icon={ListChecks} />
            Final Log — gerar e revisar programação
          </MenubarItem>
          <MenubarItem onSelect={() => onOpenAdvanced("grade")}>
            Editor de clocks — Grade musical
          </MenubarItem>
          <MenubarItem onSelect={() => onOpenAdvanced("mapa")}>
            Editor de clocks — Mapa comercial
          </MenubarItem>
          <MenubarItem onSelect={onOpenProgramFolders}>Importar áudios…</MenubarItem>
          <MenubarItem onSelect={() => onOpenAdvanced("mapa")}>
            Registrar comerciais (Ligação)
          </MenubarItem>
          <MenubarSeparator />
          <MenubarItem onSelect={imprimirPrograma}>
            <MenuGlyph icon={Printer} />
            Imprimir programação…
          </MenubarItem>
          <MenubarSeparator />
          <MenubarItem onSelect={onSwitchOperator}>
            <MenuGlyph icon={LogIn} />
            Trocar operador…
          </MenubarItem>
          <MenubarItem onSelect={onLogout}>
            <MenuGlyph icon={LogOut} />
            Sair
          </MenubarItem>
        </MenubarContent>
      </MenubarMenu>

      {/* EDITAR */}
      <MenubarMenu>
        <MenubarTrigger className={triggerCls}>Editar</MenubarTrigger>
        <MenubarContent align="start">
          <MenubarItem onSelect={soon("Desfazer")}>
            <MenuGlyph icon={ArrowUp} />
            Desfazer<MenubarShortcut>Ctrl+Z</MenubarShortcut>
          </MenubarItem>
          <MenubarItem onSelect={soon("Refazer")}>
            <MenuGlyph icon={ArrowDown} />
            Refazer<MenubarShortcut>Ctrl+Y</MenubarShortcut>
          </MenubarItem>
          <MenubarSeparator />
          <MenubarItem onSelect={soon("Recortar")}>
            <MenuGlyph icon={Scissors} />
            Recortar<MenubarShortcut>Ctrl+X</MenubarShortcut>
          </MenubarItem>
          <MenubarItem onSelect={soon("Copiar")}>
            <MenuGlyph icon={Copy} />
            Copiar<MenubarShortcut>Ctrl+C</MenubarShortcut>
          </MenubarItem>
          <MenubarItem onSelect={soon("Colar")}>
            <MenuGlyph icon={ClipboardPaste} />
            Colar<MenubarShortcut>Ctrl+V</MenubarShortcut>
          </MenubarItem>
          <MenubarSeparator />
          <MenubarItem onSelect={removeSelected}>
            <MenuGlyph icon={Trash2} />
            Remover inserção<MenubarShortcut>Del</MenubarShortcut>
          </MenubarItem>
          <MenubarItem onSelect={() => move(-1)}>
            <MenuGlyph icon={ArrowUp} />
            Mover inserção p/ cima
          </MenubarItem>
          <MenubarItem onSelect={() => move(1)}>
            <MenuGlyph icon={ArrowDown} />
            Mover inserção p/ baixo
          </MenubarItem>
          <MenubarSeparator />
          <MenubarItem onSelect={soon("Localizar")}>
            <MenuGlyph icon={Search} />
            Localizar arquivo…<MenubarShortcut>Ctrl+F</MenubarShortcut>
          </MenubarItem>
          <MenubarItem onSelect={soon("Selecionar tudo")}>
            <MenuGlyph icon={ListChecks} />
            Selecionar tudo<MenubarShortcut>Ctrl+A</MenubarShortcut>
          </MenubarItem>
        </MenubarContent>
      </MenubarMenu>

      {/* EXIBIR */}
      <MenubarMenu>
        <MenubarTrigger className={triggerCls}>Exibir</MenubarTrigger>
        <MenubarContent align="start">
          <MenubarSub>
            <MenubarSubTrigger>
              <MenuGlyph icon={PanelsTopLeft} />
              Painéis
            </MenubarSubTrigger>
            <MenubarSubContent>
              <MenubarCheckboxItem
                checked={panels.pastas}
                onCheckedChange={() => onTogglePanel("pastas")}
              >
                Pastas
              </MenubarCheckboxItem>
              <MenubarCheckboxItem
                checked={panels.propriedades}
                onCheckedChange={() => onTogglePanel("propriedades")}
              >
                Propriedades
              </MenubarCheckboxItem>
              <MenubarSeparator />
              {panelList.map((p) => (
                <MenubarItem
                  key={p}
                  onSelect={() => {
                    if (p === "Aparência") {
                      onOpenOptions("geral");
                      return;
                    }
                    if (p === "Display No Ar") {
                      toast.info("O Display No Ar está integrado ao Studio Decks.");
                      return;
                    }
                    const tab = p === "Músicas Executadas" ? "Músicas executadas" : p;
                    onOpenTab(tab);
                  }}
                >
                  {p}
                </MenubarItem>
              ))}
            </MenubarSubContent>
          </MenubarSub>
          <MenubarSub>
            <MenubarSubTrigger>
              <MenuGlyph icon={Radio} />
              QuickStart
            </MenubarSubTrigger>
            <MenubarSubContent>
              <MenubarItem onSelect={onOpenQuickStart}>Abrir painel QuickStart</MenubarItem>
              {onDockQuickStart && (
                <MenubarItem onSelect={onDockQuickStart}>Fixar como grid nos painéis</MenubarItem>
              )}
              <MenubarItem
                onSelect={() =>
                  toast.info("Use os pads do QuickStart para disparar efeitos no ar.")
                }
              >
                Painel Efeitos
              </MenubarItem>
              <MenubarSeparator />
              <MenubarItem onSelect={() => onOpenOptions("insercoes")}>Configurações…</MenubarItem>
            </MenubarSubContent>
          </MenubarSub>
          <MenubarItem onSelect={soon("Camera Controller")}>Camera Controller</MenubarItem>
          <MenubarSeparator />
          <MenubarSub>
            <MenubarSubTrigger>
              <MenuGlyph icon={Settings2} />
              Barras de ferramentas
            </MenubarSubTrigger>
            <MenubarSubContent>
              <MenubarItem onSelect={soon("Barra Solutions Play")}>Solutions Play</MenubarItem>
              <MenubarItem onSelect={soon("Barra Pré-Escuta")}>Pré-Escuta</MenubarItem>
              <MenubarItem onSelect={soon("Barra Displays")}>Displays</MenubarItem>
            </MenubarSubContent>
          </MenubarSub>
          <MenubarItem onSelect={soon("Guias de ancoragem")}>Guias de ancoragem</MenubarItem>
          <MenubarSeparator />
          <MenubarSub>
            <MenubarSubTrigger>
              <MenuGlyph icon={Settings2} />
              Modelos de aparência
            </MenubarSubTrigger>
            <MenubarSubContent>
              <MenubarItem onSelect={soon("Aparência Clássico")}>Clássico</MenubarItem>
              <MenubarItem onSelect={soon("Aparência Azul")}>Azul</MenubarItem>
              <MenubarItem onSelect={soon("Aparência Escuro")}>Escuro</MenubarItem>
            </MenubarSubContent>
          </MenubarSub>
        </MenubarContent>
      </MenubarMenu>

      {/* FERRAMENTAS */}
      <MenubarMenu>
        <MenubarTrigger className={triggerCls}>Ferramentas</MenubarTrigger>
        <MenubarContent align="start">
          <MenubarItem onSelect={() => togglePlay()}>
            <MenuGlyph icon={isPlaying ? Square : Play} />
            {isPlaying ? "Pausar" : "Tocar"}
            <MenubarShortcut>Espaço</MenubarShortcut>
          </MenubarItem>
          <MenubarItem onSelect={() => stop()}>
            <MenuGlyph icon={Square} />
            Parar
          </MenubarItem>
          <MenubarItem onSelect={() => next()}>
            <MenuGlyph icon={SkipForward} />
            Próxima inserção
          </MenubarItem>
          <MenubarSeparator />
          <MenubarCheckboxItem checked={cue} onCheckedChange={(v) => setCue(!!v)}>
            <MenuGlyph icon={Headphones} />
            Pré-escuta (CUE)
          </MenubarCheckboxItem>
          <MenubarItem
            onSelect={() => {
              if (!currentBlockId) {
                toast.info("Abra uma programação antes de inserir a Hora Certa.");
                return;
              }
              toast.info("Use o botão Hora Certa no Final Log para inserir no bloco selecionado.");
              onOpenTab("Programação");
            }}
          >
            <MenuGlyph icon={CalendarDays} />
            Hora Certa
          </MenubarItem>
          <MenubarItem onSelect={onOpenBeep}>
            <MenuGlyph icon={Radio} />
            Beep…
          </MenubarItem>
          <MenubarItem onSelect={() => onOpenAdvanced("mapa")}>
            <MenuGlyph icon={Wand2} />
            Gerar mapas comerciais
          </MenubarItem>
          <MenubarSeparator />
          <MenubarItem onSelect={onOpenSecoes}>
            <MenuGlyph icon={Settings2} />
            Seções (Arduino/LPT/Satélite/RDS/Sensores)…
          </MenubarItem>
          <MenubarItem onSelect={onOpenDevices}>
            <MenuGlyph icon={Volume2} />
            Dispositivos de áudio…
          </MenubarItem>
          <MenubarItem onSelect={onOpenShortcuts}>
            <MenuGlyph icon={Keyboard} />
            Gerenciamento de atalhos…
          </MenubarItem>
          <MenubarSeparator />
          <MenubarSub>
            <MenubarSubTrigger>
              <MenuGlyph icon={Settings2} />
              Opções
            </MenubarSubTrigger>
            <MenubarSubContent>
              <MenubarItem onSelect={() => onOpenOptions("licenca")}>Licença</MenubarItem>
              <MenubarItem onSelect={() => onOpenOptions("geral")}>Geral</MenubarItem>
              <MenubarItem onSelect={() => onOpenOptions("operadores")}>Operadores</MenubarItem>
              <MenubarItem onSelect={() => onOpenOptions("pastas")}>Pastas</MenubarItem>
              <MenubarItem onSelect={() => onOpenOptions("insercoes")}>Inserções</MenubarItem>
              <MenubarItem onSelect={() => onOpenOptions("geral")}>Configurações</MenubarItem>
            </MenubarSubContent>
          </MenubarSub>
          <MenubarSeparator />
          <MenubarItem onSelect={() => onOpenAdvanced("ini")}>
            <MenuGlyph icon={FileCode2} />
            Recursos Avançados…
          </MenubarItem>
          <MenubarItem onSelect={() => onOpenOptions("geral")}>
            <MenuGlyph icon={Settings2} />
            Personalizar…
          </MenubarItem>
        </MenubarContent>
      </MenubarMenu>

      {/* AJUDA */}
      <MenubarMenu>
        <MenubarTrigger className={triggerCls}>Ajuda</MenubarTrigger>
        <MenubarContent align="start">
          <MenubarItem onSelect={soon("Guia de configuração e uso")}>
            <MenuGlyph icon={HelpCircle} />
            Guia de configuração e uso
          </MenubarItem>
          <MenubarItem onSelect={soon("Suporte Solutions")}>
            <MenuGlyph icon={HelpCircle} />
            Suporte Solutions
          </MenubarItem>
          <MenubarItem onSelect={soon("Acesso remoto")}>
            <MenuGlyph icon={Radio} />
            Acesso remoto
          </MenubarItem>
          <MenubarSeparator />
          <MenubarItem onSelect={abrirReleases}>
            <MenuGlyph icon={RefreshCw} />
            Verificar atualizações
          </MenubarItem>
          <MenubarItem onSelect={() => toast.info("Solutions Play • modo demonstração • v1.0")}>
            <MenuGlyph icon={Info} />
            Sobre o Solutions Play
          </MenubarItem>
        </MenubarContent>
      </MenubarMenu>
    </Menubar>
  );
}
