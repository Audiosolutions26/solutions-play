// Persistência (localStorage) de presets de Grade/Mapa e regras de geração.
// Inclui textos da Grade e do Mapa e as regras do Playlist.ini (FORMATO/ARQUIVO).

export interface GenPreset {
  name: string;
  grade: string;
  mapa: string;
  comFormat: string;
  comFile: string;
  musFormat: string;
  musFile: string;
  updatedAt: number;
}

const KEY = "solplay.gen.presets.v1";

export function loadPresets(): GenPreset[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as GenPreset[];
    return Array.isArray(arr) ? arr.sort((a, b) => a.name.localeCompare(b.name)) : [];
  } catch {
    return [];
  }
}

function persist(list: GenPreset[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(list));
}

// Cria ou atualiza (por nome, case-insensitive) um preset.
export function savePreset(preset: Omit<GenPreset, "updatedAt">): GenPreset[] {
  const list = loadPresets();
  const entry: GenPreset = { ...preset, name: preset.name.trim(), updatedAt: Date.now() };
  const idx = list.findIndex((p) => p.name.toLowerCase() === entry.name.toLowerCase());
  if (idx >= 0) list[idx] = entry;
  else list.push(entry);
  list.sort((a, b) => a.name.localeCompare(b.name));
  persist(list);
  return list;
}

export function deletePreset(name: string): GenPreset[] {
  const list = loadPresets().filter((p) => p.name.toLowerCase() !== name.trim().toLowerCase());
  persist(list);
  return list;
}

export function getPreset(name: string): GenPreset | undefined {
  return loadPresets().find((p) => p.name.toLowerCase() === name.trim().toLowerCase());
}
