// Geração dos arquivos de RDS (RadioText) em disco. Mantém dois arquivos TXT
// dentro da pasta RDS, atualizados em tempo real:
//   • no_ar.txt    -> a música/inserção que está NO AR agora;
//   • proximas.txt -> a do ar + as 5 próximas da grade (Programação).
// Os arquivos só são (re)gravados quando o conteúdo muda, e apenas no app
// desktop (no modo web não há acesso ao sistema de arquivos).

import { writeRdsNative } from "./play-native";
import { loadConfig } from "./play-config";
import type { Track } from "./play-data";

// Formata uma inserção como "Artista - Título" (ou só o que existir).
export function rdsLabel(t: Track | null | undefined): string {
  if (!t) return "";
  const title = (t.title || "").trim();
  const artist = (t.artist || "").trim();
  if (artist && title && artist.toLowerCase() !== title.toLowerCase())
    return `${artist} - ${title}`;
  return title || artist || "";
}

function cfg(): Record<string, unknown> {
  try {
    return loadConfig() as Record<string, unknown>;
  } catch {
    return {};
  }
}

function enabled(): boolean {
  return cfg()["configuracoes.rds.rdsGerarArquivos"] !== false; // padrão ligado
}

function rdsDir(): string | undefined {
  const v = cfg()["configuracoes.rds.rdsPasta"];
  return typeof v === "string" && v.trim() ? v.trim() : undefined; // undefined -> padrão no main
}

function rdsTipo(): string {
  const v = cfg()["configuracoes.rds.rdsTipo"];
  return typeof v === "string" ? v : "txt";
}

let lastOnAir = "\u0000";
let lastNext = "\u0000";

// Atualiza os arquivos de RDS a partir da inserção no ar e das próximas.
export function updateRds(current: Track | null, upcoming: Track[]): void {
  if (!enabled()) return;

  const type = rdsTipo();
  const onAir = rdsLabel(current);
  const nextTracks = upcoming.slice(0, 3);
  
  let onAirContent = "";
  let nextContent = "";
  let ext = "txt";

  if (type === "xml") {
    ext = "xml";
    onAirContent = `<?xml version="1.0" encoding="UTF-8"?>\n<rds>\n  <item type="on_air">${onAir}</item>\n</rds>`;
    nextContent = `<?xml version="1.0" encoding="UTF-8"?>\n<rds>\n${nextTracks.map((t, i) => `  <item type="next" index="${i + 1}">${rdsLabel(t)}</item>`).join("\n")}\n</rds>`;
  } else if (type === "json") {
    ext = "json";
    onAirContent = JSON.stringify({ onAir }, null, 2);
    nextContent = JSON.stringify({ next: nextTracks.map(rdsLabel) }, null, 2);
  } else {
    // txt padrão
    onAirContent = onAir;
    nextContent = nextTracks.map((t, i) => `${i + 1}: ${rdsLabel(t)}`).join("\r\n");
  }

  const metadataContent =
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        nowPlaying: current
          ? {
              id: current.id,
              title: current.title,
              artist: current.artist ?? "",
              category: current.category,
            }
          : null,
        upcoming: upcoming.slice(0, 5).map((track) => ({
          id: track.id,
          title: track.title,
          artist: track.artist ?? "",
          category: track.category,
        })),
      },
      null,
      2,
    ) + "\n";

  if (onAirContent === lastOnAir && nextContent === lastNext) return;
  lastOnAir = onAirContent;
  lastNext = nextContent;

  void writeRdsNative({
    dir: rdsDir(),
    files: [
      { name: `no_ar.${ext}`, content: onAirContent },
      { name: `proximas.${ext}`, content: nextContent },
      { name: "now_playing.json", content: metadataContent },
    ],
  });
}
