// Exportação do Playlist.ini e do resultado da programação (TXT1 / AUTO),
// fiel ao formato do Playlist Digital ("Recursos Avançados", manual p.81-86).

import { fmt, type Block } from "./play-data";

const weekShort = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];

// Expande variáveis %d %m %Y %y %a %w em um caminho/arquivo.
export function expandVars(template: string, d = new Date()): string {
  const dd = d.getDate().toString().padStart(2, "0");
  const mm = (d.getMonth() + 1).toString().padStart(2, "0");
  return template
    .replace(/%d/g, dd)
    .replace(/%m/g, mm)
    .replace(/%Y/g, String(d.getFullYear()))
    .replace(/%y/g, String(d.getFullYear()).slice(-2))
    .replace(/%a/g, weekShort[d.getDay()])
    .replace(/%w/g, String(d.getDay()));
}

export interface IniConfig {
  comFormat: string;
  comFile: string;
  musFormat: string;
  musFile: string;
}

// Monta o conteúdo do arquivo Playlist.ini.
export function buildPlaylistIni(cfg: IniConfig, d = new Date()): string {
  const lines = [
    "; Playlist.ini - gerado pelo Solutions-Play",
    `; Data de geração: ${d.toLocaleString("pt-BR")}`,
    "",
    "[BLOCO COMERCIAL]",
    `FORMATO=${cfg.comFormat}`,
    `ARQUIVO=${cfg.comFile}`,
    `RESOLVIDO=${expandVars(cfg.comFile, d)}`,
    "",
    "[BLOCO MUSICAL]",
    `FORMATO=${cfg.musFormat}`,
    `ARQUIVO=${cfg.musFile}`,
    `RESOLVIDO=${expandVars(cfg.musFile, d)}`,
    "",
  ];
  return lines.join("\r\n");
}

// Formato TXT1: uma inserção por linha (HH:MM<TAB>Título<TAB>Artista<TAB>Duração).
export function blocksToTxt1(blocks: Block[]): string {
  const lines: string[] = [];
  for (const b of [...blocks].sort((a, z) => a.time.localeCompare(z.time))) {
    for (const t of b.items) {
      lines.push(
        [b.time, t.title, t.artist ?? "", fmt(t.duration), b.category.toUpperCase()].join("\t"),
      );
    }
  }
  return lines.join("\r\n");
}

// Formato AUTO: grade de códigos por horário (HH:MM código, código, …).
export function blocksToAuto(blocks: Block[]): string {
  return [...blocks]
    .sort((a, z) => a.time.localeCompare(z.time))
    .map((b) => `${b.time} ${b.items.map((t) => t.title).join(", ")}`)
    .join("\r\n");
}

export function serializeResult(blocks: Block[], format: string): string {
  return format.toUpperCase() === "TXT1" ? blocksToTxt1(blocks) : blocksToAuto(blocks);
}

// Faz o navegador baixar um arquivo de texto.
export function downloadText(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Deriva apenas o nome do arquivo (sem caminho) de um template de ARQUIVO.
export function baseName(template: string, d = new Date()): string {
  const resolved = expandVars(template, d);
  const parts = resolved.split(/[\\/]/);
  return parts[parts.length - 1] || resolved;
}
