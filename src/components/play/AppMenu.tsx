import { useRef } from "react";
import { toast } from "sonner";
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
  "cursor-pointer rounded px-2 py-0.5 text-[12px] font-medium text-white outline-none data-[state=open]:bg-white/20 focus:bg-white/20 hover:bg-white/15";

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
        <MenubarTrigger className={triggerCls}>Solutions</MenubarTrigger>
        <MenubarContent align="start">
          <MenubarItem onSelect={novaProgramacao}>Nova programação</MenubarItem>
          <MenubarItem onSelect={abrirPrograma}>Abrir programação…</MenubarItem>
          <MenubarItem onSelect={onOpenProgramFolders}>Abrir das pastas Grades/Mapas…</MenubarItem>
          <MenubarItem onSelect={salvarPrograma}>Salvar programação</MenubarItem>
          <MenubarSeparator />
          <MenubarItem onSelect={() => onOpenAdvanced("gerar")}>
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
          <MenubarItem onSelect={imprimirPrograma}>Imprimir programação…</MenubarItem>
          <MenubarSeparator />
          <MenubarItem onSelect={onSwitchOperator}>Trocar operador…</MenubarItem>
          <MenubarItem onSelect={onLogout}>Sair</MenubarItem>
        </MenubarContent>
      </MenubarMenu>

      {/* EDITAR */}
      <MenubarMenu>
        <MenubarTrigger className={triggerCls}>Editar</MenubarTrigger>
        <MenubarContent align="start">
          <MenubarItem onSelect={soon("Desfazer")}>
            Desfazer<MenubarShortcut>Ctrl+Z</MenubarShortcut>
          </MenubarItem>
          <MenubarItem onSelect={soon("Refazer")}>
            Refazer<MenubarShortcut>Ctrl+Y</MenubarShortcut>
          </MenubarItem>
          <MenubarSeparator />
          <MenubarItem onSelect={soon("Recortar")}>
            Recortar<MenubarShortcut>Ctrl+X</MenubarShortcut>
          </MenubarItem>
          <MenubarItem onSelect={soon("Copiar")}>
            Copiar<MenubarShortcut>Ctrl+C</MenubarShortcut>
          </MenubarItem>
          <MenubarItem onSelect={soon("Colar")}>
            Colar<MenubarShortcut>Ctrl+V</MenubarShortcut>
          </MenubarItem>
          <MenubarSeparator />
          <MenubarItem onSelect={removeSelected}>
            Remover inserção<MenubarShortcut>Del</MenubarShortcut>
          </MenubarItem>
          <MenubarItem onSelect={() => move(-1)}>Mover inserção p/ cima</MenubarItem>
          <MenubarItem onSelect={() => move(1)}>Mover inserção p/ baixo</MenubarItem>
          <MenubarSeparator />
          <MenubarItem onSelect={soon("Localizar")}>
            Localizar arquivo…<MenubarShortcut>Ctrl+F</MenubarShortcut>
          </MenubarItem>
          <MenubarItem onSelect={soon("Selecionar tudo")}>
            Selecionar tudo<MenubarShortcut>Ctrl+A</MenubarShortcut>
          </MenubarItem>
        </MenubarContent>
      </MenubarMenu>

      {/* EXIBIR */}
      <MenubarMenu>
        <MenubarTrigger className={triggerCls}>Exibir</MenubarTrigger>
        <MenubarContent align="start">
          <MenubarSub>
            <MenubarSubTrigger>Painéis</MenubarSubTrigger>
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
            <MenubarSubTrigger>QuickStart</MenubarSubTrigger>
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
            <MenubarSubTrigger>Barras de ferramentas</MenubarSubTrigger>
            <MenubarSubContent>
              <MenubarItem onSelect={soon("Barra Solutions-Play")}>Solutions-Play</MenubarItem>
              <MenubarItem onSelect={soon("Barra Pré-Escuta")}>Pré-Escuta</MenubarItem>
              <MenubarItem onSelect={soon("Barra Displays")}>Displays</MenubarItem>
            </MenubarSubContent>
          </MenubarSub>
          <MenubarItem onSelect={soon("Guias de ancoragem")}>Guias de ancoragem</MenubarItem>
          <MenubarSeparator />
          <MenubarSub>
            <MenubarSubTrigger>Modelos de aparência</MenubarSubTrigger>
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
            {isPlaying ? "Pausar" : "Tocar"}
            <MenubarShortcut>Espaço</MenubarShortcut>
          </MenubarItem>
          <MenubarItem onSelect={() => stop()}>Parar</MenubarItem>
          <MenubarItem onSelect={() => next()}>Próxima inserção</MenubarItem>
          <MenubarSeparator />
          <MenubarCheckboxItem checked={cue} onCheckedChange={(v) => setCue(!!v)}>
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
            Hora Certa
          </MenubarItem>
          <MenubarItem onSelect={onOpenBeep}>Beep…</MenubarItem>
          <MenubarItem onSelect={() => onOpenAdvanced("mapa")}>Gerar mapas comerciais</MenubarItem>
          <MenubarSeparator />
          <MenubarItem onSelect={onOpenSecoes}>
            Seções (Arduino/LPT/Satélite/RDS/Sensores)…
          </MenubarItem>
          <MenubarItem onSelect={onOpenDevices}>Dispositivos de áudio…</MenubarItem>
          <MenubarItem onSelect={onOpenShortcuts}>Gerenciamento de atalhos…</MenubarItem>
          <MenubarSeparator />
          <MenubarSub>
            <MenubarSubTrigger>Opções</MenubarSubTrigger>
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
          <MenubarItem onSelect={() => onOpenAdvanced("ini")}>Recursos Avançados…</MenubarItem>
          <MenubarItem onSelect={() => onOpenOptions("geral")}>Personalizar…</MenubarItem>
        </MenubarContent>
      </MenubarMenu>

      {/* AJUDA */}
      <MenubarMenu>
        <MenubarTrigger className={triggerCls}>Ajuda</MenubarTrigger>
        <MenubarContent align="start">
          <MenubarItem onSelect={soon("Guia de configuração e uso")}>
            Guia de configuração e uso
          </MenubarItem>
          <MenubarItem onSelect={soon("Suporte Solutions")}>Suporte Solutions</MenubarItem>
          <MenubarItem onSelect={soon("Acesso remoto")}>Acesso remoto</MenubarItem>
          <MenubarSeparator />
          <MenubarItem onSelect={abrirReleases}>Verificar atualizações</MenubarItem>
          <MenubarItem onSelect={() => toast.info("Solutions-Play • modo demonstração • v1.0")}>
            Sobre o Solutions-Play
          </MenubarItem>
        </MenubarContent>
      </MenubarMenu>
    </Menubar>
  );
}
