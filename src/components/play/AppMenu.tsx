import { toast } from "sonner";
import { usePlayer } from "@/hooks/use-player";
import {
  Menubar, MenubarMenu, MenubarTrigger, MenubarContent, MenubarItem,
  MenubarSeparator, MenubarSub, MenubarSubTrigger, MenubarSubContent,
  MenubarCheckboxItem, MenubarShortcut,
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
}

const soon = (name: string) => () => toast.info(`${name}: recurso em breve`);

const panelList = [
  "Programação", "Display No Ar", "Músicas Executadas", "Textos ao vivo",
  "Texto do dia", "Anotações", "Hoje", "Mini Site", "Aparência",
];

const triggerCls =
  "cursor-pointer rounded px-2 py-0.5 text-[12px] font-medium text-white outline-none data-[state=open]:bg-white/20 focus:bg-white/20 hover:bg-white/15";

export function AppMenu({ panels, onTogglePanel, onOpenOptions, onLogout, onSwitchOperator, onOpenQuickStart, onOpenAdvanced }: Props) {
  const { togglePlay, stop, next, isPlaying, cue, setCue, selectedId, currentBlockId, blocks, removeTrack } = usePlayer();

  const removeSelected = () => {
    if (!selectedId) {
      toast.info("Selecione uma inserção para remover");
      return;
    }
    const block = blocks.find((b) => b.items.some((t) => t.id === selectedId)) ?? blocks.find((b) => b.id === currentBlockId);
    if (block) {
      removeTrack(block.id, selectedId);
      toast.success("Inserção removida");
    }
  };

  return (
    <Menubar className="h-auto space-x-0 rounded-none border-0 bg-transparent p-0 shadow-none">
      {/* SOLUTIONS */}
      <MenubarMenu>
        <MenubarTrigger className={triggerCls}>Solutions</MenubarTrigger>
        <MenubarContent align="start">
          <MenubarItem onSelect={soon("Nova programação")}>Nova programação</MenubarItem>
          <MenubarItem onSelect={soon("Abrir programação")}>Abrir programação…</MenubarItem>
          <MenubarItem onSelect={soon("Salvar programação")}>Salvar programação</MenubarItem>
          <MenubarSeparator />
          <MenubarItem onSelect={() => onOpenAdvanced("gerar")}>Gerar programação automática</MenubarItem>
          <MenubarItem onSelect={soon("Importar áudios")}>Importar áudios…</MenubarItem>
          <MenubarItem onSelect={soon("Registrar comerciais")}>Registrar comerciais (Ligação)</MenubarItem>
          <MenubarSeparator />
          <MenubarItem onSelect={soon("Imprimir")}>Imprimir programação…</MenubarItem>
          <MenubarSeparator />
          <MenubarItem onSelect={onSwitchOperator}>Trocar operador…</MenubarItem>
          <MenubarItem onSelect={onLogout}>Sair</MenubarItem>
        </MenubarContent>
      </MenubarMenu>

      {/* EDITAR */}
      <MenubarMenu>
        <MenubarTrigger className={triggerCls}>Editar</MenubarTrigger>
        <MenubarContent align="start">
          <MenubarItem onSelect={soon("Desfazer")}>Desfazer<MenubarShortcut>Ctrl+Z</MenubarShortcut></MenubarItem>
          <MenubarItem onSelect={soon("Refazer")}>Refazer<MenubarShortcut>Ctrl+Y</MenubarShortcut></MenubarItem>
          <MenubarSeparator />
          <MenubarItem onSelect={soon("Recortar")}>Recortar<MenubarShortcut>Ctrl+X</MenubarShortcut></MenubarItem>
          <MenubarItem onSelect={soon("Copiar")}>Copiar<MenubarShortcut>Ctrl+C</MenubarShortcut></MenubarItem>
          <MenubarItem onSelect={soon("Colar")}>Colar<MenubarShortcut>Ctrl+V</MenubarShortcut></MenubarItem>
          <MenubarSeparator />
          <MenubarItem onSelect={removeSelected}>Remover inserção<MenubarShortcut>Del</MenubarShortcut></MenubarItem>
          <MenubarItem onSelect={soon("Mover para cima")}>Mover inserção p/ cima</MenubarItem>
          <MenubarItem onSelect={soon("Mover para baixo")}>Mover inserção p/ baixo</MenubarItem>
          <MenubarSeparator />
          <MenubarItem onSelect={soon("Localizar")}>Localizar arquivo…<MenubarShortcut>Ctrl+F</MenubarShortcut></MenubarItem>
          <MenubarItem onSelect={soon("Selecionar tudo")}>Selecionar tudo<MenubarShortcut>Ctrl+A</MenubarShortcut></MenubarItem>
        </MenubarContent>
      </MenubarMenu>

      {/* EXIBIR */}
      <MenubarMenu>
        <MenubarTrigger className={triggerCls}>Exibir</MenubarTrigger>
        <MenubarContent align="start">
          <MenubarSub>
            <MenubarSubTrigger>Painéis</MenubarSubTrigger>
            <MenubarSubContent>
              <MenubarCheckboxItem checked={panels.pastas} onCheckedChange={() => onTogglePanel("pastas")}>Pastas</MenubarCheckboxItem>
              <MenubarCheckboxItem checked={panels.propriedades} onCheckedChange={() => onTogglePanel("propriedades")}>Propriedades</MenubarCheckboxItem>
              <MenubarSeparator />
              {panelList.map((p) => (
                <MenubarItem key={p} onSelect={soon(p)}>{p}</MenubarItem>
              ))}
            </MenubarSubContent>
          </MenubarSub>
          <MenubarSub>
            <MenubarSubTrigger>QuickStart</MenubarSubTrigger>
            <MenubarSubContent>
              <MenubarItem onSelect={onOpenQuickStart}>Abrir painel QuickStart</MenubarItem>
              <MenubarItem onSelect={soon("QuickStart Efeitos")}>Painel Efeitos</MenubarItem>
              <MenubarSeparator />
              <MenubarItem onSelect={soon("QuickStart Configurações")}>Configurações…</MenubarItem>
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
          <MenubarItem onSelect={() => togglePlay()}>{isPlaying ? "Pausar" : "Tocar"}<MenubarShortcut>Espaço</MenubarShortcut></MenubarItem>
          <MenubarItem onSelect={() => stop()}>Parar</MenubarItem>
          <MenubarItem onSelect={() => next()}>Próxima inserção</MenubarItem>
          <MenubarSeparator />
          <MenubarCheckboxItem checked={cue} onCheckedChange={(v) => setCue(!!v)}>Pré-escuta (CUE)</MenubarCheckboxItem>
          <MenubarItem onSelect={soon("Hora Certa")}>Hora Certa</MenubarItem>
          <MenubarItem onSelect={soon("Mapas comerciais")}>Gerar mapas comerciais</MenubarItem>
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
          <MenubarItem onSelect={soon("Personalizar")}>Personalizar…</MenubarItem>
        </MenubarContent>
      </MenubarMenu>

      {/* AJUDA */}
      <MenubarMenu>
        <MenubarTrigger className={triggerCls}>Ajuda</MenubarTrigger>
        <MenubarContent align="start">
          <MenubarItem onSelect={soon("Guia de configuração e uso")}>Guia de configuração e uso</MenubarItem>
          <MenubarItem onSelect={soon("Suporte Solutions")}>Suporte Solutions</MenubarItem>
          <MenubarItem onSelect={soon("Acesso remoto")}>Acesso remoto</MenubarItem>
          <MenubarSeparator />
          <MenubarItem onSelect={soon("Verificar atualizações")}>Verificar atualizações</MenubarItem>
          <MenubarItem onSelect={() => toast.info("Solutions-Play • modo demonstração • v1.0")}>Sobre o Solutions-Play</MenubarItem>
        </MenubarContent>
      </MenubarMenu>
    </Menubar>
  );
}