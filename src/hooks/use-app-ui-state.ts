import { useState } from "react";
import type { PanelVisibility } from "@/components/play/AppMenu";

interface DialogState { open: boolean; tab: string }

/**
 * Centraliza o estado de interface do shell do PlayApp: aba ativa, visibilidade
 * dos painéis laterais e abertura/seleção de abas dos diálogos. Mantém a mesma
 * semântica anterior (apenas extraído do componente para reduzir o seu tamanho).
 */
export function useAppUiState() {
  const [activeTab, setActiveTab] = useState("Programação");
  const [panels, setPanels] = useState<PanelVisibility>({ pastas: true, propriedades: true });
  const [options, setOptions] = useState<DialogState>({ open: false, tab: "geral" });
  const [advanced, setAdvanced] = useState<DialogState>({ open: false, tab: "ini" });
  const [isBeepOpen, setBeepOpen] = useState(false);
  const [isSecoesOpen, setSecoesOpen] = useState(false);
  const [isDevicesOpen, setDevicesOpen] = useState(false);
  const [isShortcutsOpen, setShortcutsOpen] = useState(false);
  const [isProgramFoldersOpen, setProgramFoldersOpen] = useState(false);

  const togglePanel = (key: keyof PanelVisibility) =>
    setPanels((prev) => ({ ...prev, [key]: !prev[key] }));
  const openOptions = (tab: string) => setOptions({ open: true, tab });
  const setOptionsOpen = (open: boolean) => setOptions((prev) => ({ ...prev, open }));
  const openAdvanced = (tab: string) => setAdvanced({ open: true, tab });
  const setAdvancedOpen = (open: boolean) => setAdvanced((prev) => ({ ...prev, open }));

  return {
    activeTab, setActiveTab,
    panels, togglePanel,
    options, openOptions, setOptionsOpen,
    advanced, openAdvanced, setAdvancedOpen,
    isBeepOpen, setBeepOpen,
    isSecoesOpen, setSecoesOpen,
    isDevicesOpen, setDevicesOpen,
    isShortcutsOpen, setShortcutsOpen,
    isProgramFoldersOpen, setProgramFoldersOpen,
  };
}
