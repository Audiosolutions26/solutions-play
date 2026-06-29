// Gerenciamento de atalhos (manual p.145-149 — "Config Manager").
// Cada atalho aponta para uma pasta de trabalho exibida na guia "Pastas",
// organizado por categoria (Músicas, Comerciais, Hora Certa, Vinhetas, ...).

import { folders, type Folder } from "./play-data";

export type ShortcutType =
  | "musicas" | "comerciais" | "horacerta" | "vinhetas" | "trilhas" | "textos";

export interface ShortcutTypeMeta {
  type: ShortcutType;
  label: string; // Tipo exibido no manual
  category: Folder["category"];
  defaultColor: string;
}

// Categorias na ordem em que o Config Manager as organiza (manual p.146-148).
export const SHORTCUT_TYPES: ShortcutTypeMeta[] = [
  { type: "musicas",    label: "Músicas",    category: "musical",   defaultColor: "#2980b9" },
  { type: "comerciais", label: "Comerciais", category: "comercial", defaultColor: "#16a085" },
  { type: "horacerta",  label: "Hora Certa", category: "vinheta",   defaultColor: "#d35400" },
  { type: "vinhetas",   label: "Vinhetas",   category: "vinheta",   defaultColor: "#f39c12" },
  { type: "trilhas",    label: "Trilhas",    category: "musical",   defaultColor: "#34495e" },
  { type: "textos",     label: "Textos",     category: "texto",     defaultColor: "#7f8c8d" },
];

export function typeMeta(type: ShortcutType): ShortcutTypeMeta {
  return SHORTCUT_TYPES.find((t) => t.type === type) ?? SHORTCUT_TYPES[0];
}

export function typeLabel(type: ShortcutType): string {
  return typeMeta(type).label;
}

export const PALETTE = [
  "#c0392b", "#e67e22", "#f39c12", "#16a085", "#27ae60",
  "#2980b9", "#8e44ad", "#34495e", "#7f8c8d", "#d35400",
];

// Atalho = pasta de trabalho com metadados do Config Manager.
export interface Shortcut extends Folder {
  type: ShortcutType;
  directory: string;   // Diretório (caminho da pasta)
  registered: boolean; // Registrar (programável automaticamente)
}

function inferType(f: Folder): ShortcutType {
  const n = f.name.toLowerCase();
  if (f.category === "comercial") return "comerciais";
  if (f.category === "texto") return "textos";
  if (f.category === "vinheta") return n.includes("hora") ? "horacerta" : "vinhetas";
  if (n.includes("trilha")) return "trilhas";
  return "musicas";
}

function defaultShortcuts(): Shortcut[] {
  return folders.map((f) => ({
    ...f,
    type: inferType(f),
    directory: `C:\\Playlist\\Pgm\\Pastas\\${f.name}`,
    registered: f.category === "comercial",
  }));
}

const KEY = "solplay.shortcuts.v1";

export function loadShortcuts(): Shortcut[] {
  if (typeof window === "undefined") return defaultShortcuts();
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return defaultShortcuts();
    const arr = JSON.parse(raw) as Shortcut[];
    return Array.isArray(arr) && arr.length ? arr : defaultShortcuts();
  } catch {
    return defaultShortcuts();
  }
}

export function saveShortcuts(list: Shortcut[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(list));
}

export function makeShortcut(type: ShortcutType): Shortcut {
  const meta = typeMeta(type);
  return {
    id: `sc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    name: "Nova pasta",
    color: meta.defaultColor,
    category: meta.category,
    code: "",
    tracks: [],
    type,
    directory: "",
    registered: false,
  };
}
