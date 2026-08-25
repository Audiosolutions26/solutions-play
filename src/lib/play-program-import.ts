// Importação de programação no formato real do Playlist Digital / Solutions.
//
// Cada linha do arquivo de programação (ex.: "ter.txt", "sex.txt") descreve um
// bloco e tem o formato:
//
//   HH:MM (ID=Nome do bloco) item,item,item,...
//   HH:MM (FIXO ID=VOZ DO BRASIL) vht,vozbrasil
//
// Onde cada "item" é:
//   • um arquivo explícito  → "ARTISTA - MUSICA.MP3"  (entre aspas)
//   • mus                   → música livre (sorteada das pastas de trabalho)
//   • vht                   → vinheta (sorteada das pastas de vinhetas)
//   • vozbrasil             → programa "A Voz do Brasil"
//
// Os arquivos referenciados pelo nome "ARTISTA - MUSICA.EXT" são procurados nos
// ATALHOS cadastrados nas "Pastas de trabalho". Quando encontrado, a inserção
// herda os metadados reais (e o caminho do atalho). Quando não encontrado, a
// inserção é montada a partir do próprio nome do arquivo (artista, título e
// extensão), apontando para a pasta de trabalho onde deverá ser buscado.

import {
  cloneTrack, makeTrack, todayLabel,
  type Block, type BlockClock, type Track,
} from "./play-data";
import { loadShortcuts, type Shortcut } from "./play-shortcuts";

const AUDIO_EXT = /\.(mp3|wav|ogg|m4a|aac|flac|wma|aif|aiff)$/i;

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Frequência sintética estável a partir do texto (varia o VU por faixa).
function freqFor(text: string): number {
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) >>> 0;
  return 170 + (h % 130); // 170–300 Hz
}

// Normaliza um nome de arquivo p/ comparação (sem extensão, maiúsculas, espaços).
function normName(name: string): string {
  return name
    .replace(/^['\"]|['\"]$/g, "")
    .replace(AUDIO_EXT, "")
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

// Quebra "ARTISTA - MUSICA (extra).MP3" em artista, título e extensão.
function fileToMeta(file: string): { artist: string; title: string; ext: string } {
  const ext = (file.match(AUDIO_EXT)?.[0].slice(1) ?? "mp3").toLowerCase();
  const noExt = file.replace(AUDIO_EXT, "").trim();
  const sep = noExt.indexOf(" - ");
  if (sep >= 0) {
    return { artist: noExt.slice(0, sep).trim(), title: noExt.slice(sep + 3).trim(), ext };
  }
  return { artist: "", title: noExt, ext };
}

// Índice dos arquivos disponíveis nos atalhos (pastas de trabalho).
interface FileIndexEntry { track: Track; shortcut: Shortcut }

function buildFileIndex(shortcuts: Shortcut[]): Map<string, FileIndexEntry> {
  const idx = new Map<string, FileIndexEntry>();
  const add = (key: string, entry: FileIndexEntry) => {
    const normalized = normName(key);
    if (normalized && !idx.has(normalized)) idx.set(normalized, entry);
  };
  for (const sc of shortcuts) {
    for (const t of sc.tracks) {
      const entry = { track: t, shortcut: sc };
      const candidate = t.artist ? `${t.artist} - ${t.title}` : t.title;
      add(candidate, entry);
      add(t.title, entry);
      add(t.id, entry);
      // Também aceita o código da pasta quando ela contém uma única faixa.
      if (sc.code && sc.tracks.length === 1) add(sc.code, entry);
    }
  }
  return idx;
}

function shortcutPath(sc: Shortcut, file: string): string {
  const dir = (sc.directory || "").replace(/[\\/]+$/, "");
  return dir ? `${dir}\\${file}` : file;
}

export interface ImportStats {
  blocks: number;
  inserts: number;
  resolved: number;   // arquivos encontrados nas pastas de trabalho
  unresolved: number; // arquivos não localizados (montados pelo nome)
}

interface ResolveCtx {
  index: Map<string, FileIndexEntry>;
  music: Shortcut[];
  vinhetas: Shortcut[];
  defaultMusicDir: Shortcut | null;
  stats: ImportStats;
}

function resolveFile(file: string, ctx: ResolveCtx): Track {
  const hit = ctx.index.get(normName(file));
  if (hit) {
    ctx.stats.resolved++;
    const t = cloneTrack(hit.track);
    t.filePath = shortcutPath(hit.shortcut, file);
    t.origin = "auto";
    return t;
  }
  // Não localizado: monta a inserção a partir do nome do arquivo.
  ctx.stats.unresolved++;
  const { artist, title } = fileToMeta(file);
  const t = makeTrack(title, artist, 0, "musical", freqFor(file));
  if (ctx.defaultMusicDir) t.filePath = shortcutPath(ctx.defaultMusicDir, file);
  return t;
}

function pickFromShortcuts(list: Shortcut[]): Track | null {
  const withTracks = list.filter((s) => s.tracks.length);
  if (!withTracks.length) return null;
  const sc = pick(withTracks);
  const t = cloneTrack(pick(sc.tracks));
  t.filePath = t.filePath ?? shortcutPath(sc, t.artist ? `${t.artist} - ${t.title}.mp3` : `${t.title}.mp3`);
  return t;
}

function resolveToken(raw: string, ctx: ResolveCtx): Track {
  const item = raw.trim();
  if (AUDIO_EXT.test(item)) return resolveFile(item, ctx);

  const low = item.toLowerCase();
  // Nome completo sem extensão e códigos também são resolvidos pelo mesmo índice.
  const named = ctx.index.get(normName(item));
  if (named) {
    ctx.stats.resolved++;
    const t = cloneTrack(named.track);
    const file = t.artist ? `${t.artist} - ${t.title}.mp3` : `${t.title}.mp3`;
    t.filePath = t.filePath ?? shortcutPath(named.shortcut, file);
    t.origin = "auto";
    return t;
  }
  if (low === "mus") {
    return pickFromShortcuts(ctx.music)
      ?? makeTrack("Música (livre)", "—", 0, "musical", freqFor(item + Math.random()));
  }
  if (low === "vht") {
    return pickFromShortcuts(ctx.vinhetas)
      ?? makeTrack("Vinheta", "Solutions", 6, "vinheta", 392);
  }
  if (low === "vozbrasil") {
    return makeTrack("A Voz do Brasil", "EBC", 3600, "vinheta", 262);
  }
  // Token desconhecido: trata como placeholder musical.
  return makeTrack(item, "Atalho", 0, "musical", freqFor(item));
}

// Divide a lista de itens respeitando aspas (vírgulas dentro de aspas não cortam).
function splitItems(rest: string): string[] {
  const out: string[] = [];
  let cur = "";
  let quoted = false;
  for (const ch of rest) {
    if (ch === '"') { quoted = !quoted; continue; }
    if (ch === "," && !quoted) { out.push(cur.trim()); cur = ""; continue; }
    cur += ch;
  }
  if (cur.trim()) out.push(cur.trim());
  return out.filter(Boolean);
}

// Lê a especificação do bloco "(... )" com parênteses balanceados.
function readClockSpec(rest: string): { spec: string | null; rest: string } {
  if (rest[0] !== "(") return { spec: null, rest };
  let depth = 0;
  for (let i = 0; i < rest.length; i++) {
    if (rest[i] === "(") depth++;
    else if (rest[i] === ")") {
      depth--;
      if (depth === 0) {
        return { spec: rest.slice(1, i).trim(), rest: rest.slice(i + 1).trim() };
      }
    }
  }
  return { spec: rest.slice(1).trim(), rest: "" }; // sem fechamento
}

function parseClock(spec: string | null): BlockClock | undefined {
  if (!spec) return undefined;
  const fixo = /\bFIXO\b/i.test(spec);
  const idMatch = spec.match(/ID\s*=\s*(.+)$/i);
  const name = idMatch ? idMatch[1].trim() : undefined;
  return { name, fixo: fixo || undefined };
}

export interface ImportResult { blocks: Block[]; stats: ImportStats }

export function parseProgramText(
  text: string,
  defaultCategory: Block["category"] = "musical",
): ImportResult {
  const shortcuts = loadShortcuts();
  const music = shortcuts.filter((s) => s.category === "musical");
  const vinhetas = shortcuts.filter((s) => s.category === "vinheta");
  const stats: ImportStats = { blocks: 0, inserts: 0, resolved: 0, unresolved: 0 };
  const ctx: ResolveCtx = {
    index: buildFileIndex(shortcuts),
    music,
    vinhetas,
    defaultMusicDir: music.find((s) => s.registered) ?? music[0] ?? null,
    stats,
  };

  const date = todayLabel();
  const blocks: Block[] = [];

  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const m = line.match(/^(\d{1,2}:\d{2})\s*(.*)$/);
    if (!m) continue;
    const time = m[1];
    const { spec, rest } = readClockSpec(m[2]);
    const clock = parseClock(spec);
    const items = splitItems(rest).map((it) => resolveToken(it, ctx));
    if (!items.length) continue;
    stats.inserts += items.length;
    blocks.push({
      id: `prog-${time}-${Math.random().toString(36).slice(2, 7)}`,
      title: clock?.name ?? "Programação",
      date,
      time,
      category: defaultCategory,
      items,
      clock,
    });
  }

  stats.blocks = blocks.length;
  blocks.sort((a, b) => a.time.localeCompare(b.time));
  return { blocks, stats };
}
