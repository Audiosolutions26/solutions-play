// Auto-generation of programming from Grade (musical) and Mapa (commercial),
// faithful to Playlist Digital "Recursos Avançados" (manual p.81-86).

import {
  folders, folderByCode, cloneTrack, makeTrack, todayLabel,
  type Block, type Track,
} from "./play-data";

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Resolve a single code into a track (random pick where applicable).
function resolveCode(code: string): Track | null {
  const c = code.trim().toUpperCase();
  if (!c) return null;

  // Vinhetas
  if (c === "VH" || c === "VHT") {
    const f = folderByCode("VH");
    return f && f.tracks.length ? cloneTrack(pick(f.tracks)) : makeTrack("Vinheta", "Solutions", 6, "vinheta", 392);
  }
  if (c === "VHC") return makeTrack("VH Carimbo (hora certa)", "Solutions", 6, "vinheta", 392);
  if (c === "VHP") return makeTrack("VH Passagem", "Solutions", 5, "vinheta", 440);

  // Hora certa
  if (c === "HC") return makeTrack("Hora Certa", "Locução", 8, "vinheta", 523);

  // Comercial numeric code (rodízio) — pick from Comerciais, rename to código
  if (/^\d+$/.test(c)) {
    const f = folderByCode("COM");
    const t = f && f.tracks.length ? cloneTrack(pick(f.tracks)) : makeTrack("Comercial", "Comercial", 30, "comercial", 165);
    t.title = `Comercial ${c}`;
    t.category = "comercial";
    return t;
  }

  // Folder shortcut code -> random track from that folder
  const folder = folderByCode(c);
  if (folder && folder.tracks.length) return cloneTrack(pick(folder.tracks));

  // Unknown code -> placeholder
  return makeTrack(`Código ${c}`, "Atalho", 180, "musical", 220);
}

function parseGrid(text: string, category: "musical" | "comercial"): Block[] {
  const date = todayLabel();
  const blocks: Block[] = [];
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    const m = line.match(/^(\d{1,2}:\d{2})\s+(.*)$/);
    if (!m) continue;
    const time = m[1];
    const items = m[2]
      .split(",")
      .map(resolveCode)
      .filter((t): t is Track => !!t);
    if (!items.length) continue;
    blocks.push({
      id: `gen-${category}-${time}-${Math.random().toString(36).slice(2, 7)}`,
      title: category === "musical" ? "Musical" : "Comercial",
      date,
      time,
      category,
      items,
    });
  }
  return blocks;
}

// Generate full programming from grade + mapa, ordered by time (blocks interleaved).
export function generateProgram(gradeText: string, mapaText: string): Block[] {
  const musical = parseGrid(gradeText, "musical");
  const comercial = parseGrid(mapaText, "comercial");
  return [...musical, ...comercial].sort((a, b) => a.time.localeCompare(b.time));
}

// Folder code legend for the UI.
export const codeLegend = folders.map((f) => ({ code: f.code, name: f.name }));