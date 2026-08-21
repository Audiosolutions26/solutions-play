import {
  makeFolderAudioTrack,
  makeTrack,
  todayLabel,
  type Block,
  type Category,
  type Track,
} from "./play-data";
import type { ImportResult, ImportStats } from "./play-program-import";

const BLOCK_SELECTOR = "block,bloco,hour,clock,program,playlist";
const ITEM_SELECTOR = "item,track,entry,audio,insercao,song,media,content";
const AUDIO_EXT = /\.(mp3|wav|ogg|m4a|aac|flac|wma|aif|aiff|opus)$/i;

function attr(node: Element, ...names: string[]): string {
  for (const name of names) {
    const value = node.getAttribute(name) ?? node.getAttribute(name.toLowerCase());
    if (value?.trim()) return value.trim();
  }
  return "";
}

function childText(node: Element, ...names: string[]): string {
  for (const name of names) {
    const found = node.querySelector(`:scope > ${name}`)?.textContent?.trim();
    if (found) return found;
  }
  return "";
}

function numberAttr(node: Element, ...names: string[]): number {
  const raw = attr(node, ...names).replace(",", ".");
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function categoryFor(value: string, fallback: Category): Category {
  const low = value.toLowerCase();
  if (low.includes("comer") || low.includes("spot") || low.includes("advert")) return "comercial";
  if (low.includes("vinhet") || low.includes("sweep") || low.includes("jingle")) return "vinheta";
  if (low.includes("texto") || low.includes("text")) return "texto";
  return fallback;
}

function itemSource(node: Element): string {
  return (
    attr(node, "url", "src", "path", "file", "filename", "name") ||
    childText(node, "url", "src", "path", "file", "filename")
  );
}

function titleFor(node: Element, source: string): string {
  return (
    attr(node, "title", "label", "description") ||
    childText(node, "title", "label", "description") ||
    source.split(/[\\/]/).pop()?.replace(AUDIO_EXT, "") ||
    "Inserção PXML"
  );
}

function trackFromNode(node: Element, fallback: Category): Track | null {
  const source = itemSource(node);
  const title = titleFor(node, source);
  const artist =
    attr(node, "artist", "author", "performer") || childText(node, "artist", "author", "performer");
  const category = categoryFor(
    attr(node, "category", "type", "kind") || childText(node, "category", "type", "kind"),
    fallback,
  );
  const duration = numberAttr(node, "duration", "durationSec", "seconds", "length");
  const freq = numberAttr(node, "frequency", "freq") || 220;
  if (!source) return makeTrack(title, artist, duration, category, freq);
  if (/^https?:\/\//i.test(source)) {
    const track = makeTrack(title, artist, duration, category, freq);
    track.audioUrl = source;
    return track;
  }
  if (AUDIO_EXT.test(source) || /[\\/]/.test(source))
    return makeFolderAudioTrack(title, source, category);
  return makeTrack(title, artist, duration, category, freq);
}

function directBlockNodes(doc: XMLDocument): Element[] {
  const all = Array.from(doc.querySelectorAll(BLOCK_SELECTOR));
  return all.filter((node) => !node.parentElement?.closest(BLOCK_SELECTOR));
}

function blockFromNode(node: Element, fallback: Category, index: number): Block | null {
  const itemNodes = Array.from(node.querySelectorAll(ITEM_SELECTOR));
  const items = itemNodes
    .map((item) => trackFromNode(item, fallback))
    .filter((item): item is Track => Boolean(item));
  if (!items.length) return null;
  const category = categoryFor(
    attr(node, "category", "type", "kind") || childText(node, "category", "type", "kind"),
    fallback,
  );
  const rawTime =
    attr(node, "time", "start", "startTime", "hour", "horario") ||
    childText(node, "time", "start", "startTime", "hour", "horario");
  const time = /^\d{1,2}:\d{2}$/.test(rawTime)
    ? rawTime
    : `${String(index % 24).padStart(2, "0")}:00`;
  const fixed = /\bFIXO|FIXED\b/i.test(attr(node, "flags", "clock", "mode"));
  const title =
    attr(node, "title", "name", "label", "id") ||
    childText(node, "title", "name", "label") ||
    "PXML";
  return {
    id: `pxml-${time.replace(":", "-")}-${index}`,
    title,
    date: todayLabel(),
    time,
    category: category === "comercial" ? "comercial" : "musical",
    items,
    clock: fixed ? { fixo: true } : undefined,
  };
}

/**
 * Importa PXML/XML3 sem impor um esquema privado: aceita nomes comuns de
 * elementos/atributos e mantém a grade TXT existente como fallback. O parser
 * não executa conteúdo XML nem faz requisições externas.
 */
export function parseProgramXml(
  text: string,
  defaultCategory: Category = "musical",
): ImportResult | null {
  if (typeof DOMParser === "undefined" || !text.trim()) return null;
  const doc = new DOMParser().parseFromString(text, "application/xml");
  if (doc.querySelector("parsererror")) return null;
  const blockNodes = directBlockNodes(doc);
  const blocks = blockNodes.length
    ? blockNodes
        .map((node, index) => blockFromNode(node, defaultCategory, index))
        .filter((block): block is Block => Boolean(block))
    : (() => {
        const items = Array.from(doc.querySelectorAll(ITEM_SELECTOR))
          .map((node) => trackFromNode(node, defaultCategory))
          .filter((item): item is Track => Boolean(item));
        const blockCategory: Block["category"] =
          defaultCategory === "comercial" ? "comercial" : "musical";
        return items.length
          ? [
              {
                id: "pxml-00-00-0",
                title: "Programação PXML",
                date: todayLabel(),
                time: "00:00",
                category: blockCategory,
                items,
              },
            ]
          : [];
      })();
  const stats: ImportStats = {
    blocks: blocks.length,
    inserts: blocks.reduce((sum, block) => sum + block.items.length, 0),
    resolved: blocks.reduce(
      (sum, block) =>
        sum + block.items.filter((item) => Boolean(item.audioUrl || item.filePath)).length,
      0,
    ),
    unresolved: blocks.reduce(
      (sum, block) =>
        sum +
        block.items.filter((item) => !item.audioUrl && !item.filePath && item.duration <= 0).length,
      0,
    ),
  };
  return { blocks, stats };
}
