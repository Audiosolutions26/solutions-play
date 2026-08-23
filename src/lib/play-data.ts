// Mídias reais importadas via ponteiros de ativos (Assets).
import anaCastelaAsset from "@/assets/ana_castela.asset.json";
import claytonRomarioAsset from "@/assets/clayton_romario.asset.json";
import daniloDaviApagaAsset from "@/assets/danilo_davi_apaga.asset.json";
import daniloDaviGavetasAsset from "@/assets/danilo_davi_gavetas.asset.json";
import diegoVictorAsset from "@/assets/diego_victor.asset.json";

// Demo data for Solutions-Play (local demo mode, no backend).

export type Category = "musical" | "comercial" | "vinheta" | "texto";

// Special program items that are not normal audio (manual p.15).
export type TrackKind = "audio" | "pausa" | "horacerta" | "textodia" | "locucao";
// Origin of an insertion, used to show the M marker (manual p.14-15).
export type TrackOrigin = "auto" | "manual";

export interface Track {
  id: string;
  title: string;
  artist?: string;
  duration: number; // seconds
  category: Category;
  freq: number; // synth root frequency
  album?: string;
  year?: string;
  label?: string;
  kind?: TrackKind;
  origin?: TrackOrigin; // "manual" = blue M; auto + moved = red M
  moved?: boolean;
  body?: string; // Texto do dia (manual p.36): conteúdo lido automaticamente.
  audioUrl?: string; // Locução gravada / áudio embutido na inserção (manual p.111-112).
  filePath?: string; // Caminho no Windows (atalho de pasta) — resolvido sob demanda.
}

export interface Block {
  id: string;
  title: string;
  date: string;
  time: string;
  category: "musical" | "comercial";
  items: Track[];
  clock?: BlockClock;
}

// Relógio Operacional (manual p.137-142): parâmetros por bloco.
export interface BlockClock {
  name?: string; // Parâmetro ID — nome personalizado do bloco
  fixo?: boolean; // Parâmetro FIXO — F amarelo, não pode atrasar
  mode?: "local" | "sat"; // Parâmetros LOCAL e SAT
  dur?: number; // Parâmetro DUR — duração alvo em minutos
  locked?: boolean; // Parâmetro LOCKED — cadeado amarelo, bloqueia edição
  descarte?: boolean; // Parâmetro DESCARTE — aplica cálculo de descarte no bloco
}

export interface Folder {
  id: string;
  name: string;
  color: string;
  category: Category;
  code: string;
  tracks: Track[];
}

let _id = 0;
const uid = () => `t${++_id}`;

const mk = (
  title: string,
  artist: string,
  duration: number,
  category: Category,
  freq: number,
  extra: Partial<Track> = {},
): Track => ({
  id: uid(),
  title,
  artist,
  duration,
  category,
  freq,
  kind: "audio",
  origin: "auto",
  ...extra,
});

// Formatação compartilhada da data da programação. Este bloco fica antes da
// grade inicial porque é executado durante a inicialização do módulo.
const weekdays = [
  "domingo",
  "segunda-feira",
  "terça-feira",
  "quarta-feira",
  "quinta-feira",
  "sexta-feira",
  "sábado",
];

export function todayLabel(d = new Date()): string {
  const dd = d.getDate().toString().padStart(2, "0");
  const mm = (d.getMonth() + 1).toString().padStart(2, "0");
  return `${dd}-${mm}-${d.getFullYear()} (${weekdays[d.getDay()]})`;
}

// A programação demonstrativa deve sempre abrir como a programação do dia atual.
// O gerador/importador também usa todayLabel(); manter o mesmo padrão evita
// que o Final Log inicial apareça com uma data antiga fixa.
const initialProgramDate = todayLabel();

export const initialBlocks: Block[] = [
  {
    id: "b1",
    title: "Musical",
    date: initialProgramDate,
    time: "13:00",
    category: "musical",
    items: [
      mk("Olha Onde Eu Tô", "Ana Castela", 186, "musical", 220, {
        album: "Solteiro Forçado",
        year: "2023",
        audioUrl: anaCastelaAsset.url,
      }),
      mk("Não Namora (Ao Vivo)", "Clayton & Romário", 147, "musical", 196, {
        album: "No Churrasco",
        year: "2023",
        audioUrl: claytonRomarioAsset.url,
      }),
      mk("Apaga Apaga Apaga (Ao Vivo)", "Danilo e Davi", 190, "musical", 174, {
        album: "Pra Beber e Chorar",
        year: "2023",
        audioUrl: daniloDaviApagaAsset.url,
      }),
      mk("Não Mexe nas Minhas Gavetas (Ao Vivo)", "Danilo e Davi", 136, "musical", 246, {
        album: "Pra Beber e Chorar",
        year: "2023",
        audioUrl: daniloDaviGavetasAsset.url,
      }),
      mk("Tubarões (Ao Vivo)", "Diego & Victor Hugo", 172, "musical", 261, {
        album: "Beco do Flashback",
        year: "2023",
        audioUrl: diegoVictorAsset.url,
      }),
    ],
  },
  {
    id: "b2",
    title: "Comercial",
    date: initialProgramDate,
    time: "13:18",
    category: "comercial",
    items: [
      mk("VH Hora Certa", "Solutions", 9, "vinheta", 330),
      mk("Spot Padaria Aurora", "Comercial", 32, "comercial", 165),
      mk("VH Estabilidade", "Solutions", 6, "vinheta", 392),
      mk("Promo Sorteio do Ouvinte", "Comercial", 28, "comercial", 147),
      mk("VH Solutions PAS", "Solutions", 5, "vinheta", 440),
    ],
  },
  {
    id: "b3",
    title: "Musical",
    date: initialProgramDate,
    time: "13:30",
    category: "musical",
    items: [
      mk("Olha Onde Eu Tô", "Ana Castela", 186, "musical", 233, {
        audioUrl: anaCastelaAsset.url,
      }),
      mk("Tubarões (Ao Vivo)", "Diego & Victor Hugo", 172, "musical", 277, {
        audioUrl: diegoVictorAsset.url,
      }),
      mk("Não Namora (Ao Vivo)", "Clayton & Romário", 147, "musical", 185, {
        audioUrl: claytonRomarioAsset.url,
      }),
    ],
  },
];

export const folders: Folder[] = [
  {
    id: "f1",
    name: "Acervo de Vídeos",
    color: "#c0392b",
    category: "musical",
    code: "ACV",
    tracks: [
      mk("Olha Onde Eu Tô", "Ana Castela", 186, "musical", 220, { audioUrl: anaCastelaAsset.url }),
      mk("Não Namora (Ao Vivo)", "Clayton & Romário", 147, "musical", 246, { audioUrl: claytonRomarioAsset.url }),
      mk("Tubarões (Ao Vivo)", "Diego & Victor Hugo", 172, "musical", 174, { audioUrl: diegoVictorAsset.url }),
    ],
  },
  {
    id: "f2",
    name: "MPB",
    color: "#27ae60",
    category: "musical",
    code: "NAC",
    tracks: [
      mk("Apaga Apaga Apaga (Ao Vivo)", "Danilo e Davi", 190, "musical", 196, { audioUrl: daniloDaviApagaAsset.url }),
      mk("Não Mexe nas Minhas Gavetas (Ao Vivo)", "Danilo e Davi", 136, "musical", 165, { audioUrl: daniloDaviGavetasAsset.url }),
      mk("Olha Onde Eu Tô", "Ana Castela", 186, "musical", 207, { audioUrl: anaCastelaAsset.url }),
    ],
  },
  {
    id: "f3",
    name: "Flash Back",
    color: "#2980b9",
    category: "musical",
    code: "FB",
    tracks: [
      mk("Não Namora (Ao Vivo)", "Clayton & Romário", 147, "musical", 261, { audioUrl: claytonRomarioAsset.url }),
      mk("Tubarões (Ao Vivo)", "Diego & Victor Hugo", 172, "musical", 233, { audioUrl: diegoVictorAsset.url }),
      mk("Apaga Apaga Apaga (Ao Vivo)", "Danilo e Davi", 190, "musical", 196, { audioUrl: daniloDaviApagaAsset.url }),
    ],
  },
  {
    id: "f4",
    name: "Hit Parade",
    color: "#8e44ad",
    category: "musical",
    code: "INTER",
    tracks: [
      mk("Olha Onde Eu Tô", "Ana Castela", 186, "musical", 277, { audioUrl: anaCastelaAsset.url }),
      mk("Não Mexe nas Minhas Gavetas (Ao Vivo)", "Danilo e Davi", 136, "musical", 246, { audioUrl: daniloDaviGavetasAsset.url }),
      mk("Tubarões (Ao Vivo)", "Diego & Victor Hugo", 172, "musical", 220, { audioUrl: diegoVictorAsset.url }),
    ],
  },
  {
    id: "f5",
    name: "Vinhetas",
    color: "#f39c12",
    category: "vinheta",
    code: "VH",
    tracks: [
      mk("VH Carimbo 1", "Solutions", 6, "vinheta", 392),
      mk("VH Carimbo 2", "Solutions", 5, "vinheta", 440),
      mk("VH Hora Certa", "Solutions", 9, "vinheta", 330),
    ],
  },
  {
    id: "f6",
    name: "Comerciais",
    color: "#16a085",
    category: "comercial",
    code: "COM",
    tracks: [
      mk("Spot Loja Central", "Comercial", 30, "comercial", 147),
      mk("Promo Verão", "Comercial", 25, "comercial", 165),
    ],
  },
  {
    id: "f7",
    name: "Trilhas",
    color: "#34495e",
    category: "musical",
    code: "TRI",
    tracks: [
      mk("Trilha Notícias", "BED", 120, "musical", 110),
      mk("Trilha Esportes", "BED", 120, "musical", 130),
    ],
  },
  {
    id: "f8",
    name: "Textos",
    color: "#7f8c8d",
    category: "texto",
    code: "TXT",
    tracks: [
      mk("Testemunhal Patrocinador", "Texto ao vivo", 40, "texto", 0),
      mk("Nota Jornalística", "Texto ao vivo", 35, "texto", 0),
    ],
  },
];

export function fmt(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

export function cloneTrack(t: Track): Track {
  return { ...t, id: uid() };
}

// Special insertions (manual p.15): Pausa paralisa a programação; Hora Certa
// exibe a hora gravada. Não dão opção de escolha de conteúdo.
export function makePause(): Track {
  return mk("Pausa", "Programação paralisada", 0, "texto", 0, { kind: "pausa", origin: "manual" });
}

export function makeHoraCerta(): Track {
  return mk("Hora Certa", "Hora gravada", 9, "vinheta", 330, {
    kind: "horacerta",
    origin: "manual",
  });
}

// Texto do dia (manual p.36): inserção que é lida automaticamente (TTS) quando
// chega a sua vez na programação. A duração é estimada pelo tamanho do texto.
export function makeTextoDoDia(title: string, body: string): Track {
  const words = body.trim().split(/\s+/).filter(Boolean).length;
  const dur = Math.max(8, Math.round(words / 2.6)); // ~2.6 palavras/seg
  return mk(title || "Texto do dia", "Texto do dia", dur, "texto", 0, {
    kind: "textodia",
    origin: "manual",
    body,
  });
}

// Locução gravada (manual p.111-112): inserção com áudio real embutido.
export function makeLocucao(title: string, audioUrl: string, duration: number): Track {
  return mk(title || "Locução", "Locução gravada", Math.max(1, Math.round(duration)), "texto", 0, {
    kind: "locucao",
    origin: "manual",
    audioUrl,
  });
}

// Áudio de uma pasta de trabalho (atalho do Windows): guarda o caminho do
// arquivo, que é resolvido sob demanda quando o áudio vai tocar (manual p.145-149).
export function makeFolderAudioTrack(name: string, filePath: string, category: Category): Track {
  return mk(name || "Áudio", "", 0, category, 0, { filePath });
}

// ---- Recursos Avançados (Grade / Mapa / Playlist.ini) ----

// Build a fresh track for generator output (codes that aren't real folders).
export function makeTrack(
  title: string,
  artist: string,
  duration: number,
  category: Category,
  freq: number,
): Track {
  return mk(title, artist, duration, category, freq);
}

export function folderByCode(code: string): Folder | undefined {
  return folders.find((f) => f.code.toUpperCase() === code.trim().toUpperCase());
}

// Default Grade (musical) and Mapa (commercial) examples — faithful to manual p.85-86.
export const DEFAULT_GRADE = `06:00 VH, NAC, VHC, HC, INTER, VH, FB
06:15 VH, INTER, VHC, HC, FB, VH, INTER
06:30 VH, FB, VHC, HC, NAC, VH, INTER
06:45 VH, NAC, VHC, HC, INTER, VH, FB
07:00 VH, INTER, VHC, HC, FB, VH, INTER`;

export const DEFAULT_MAPA = `06:00 VH, 55, 23, VH, 62, 12, VH, 42, VHC, HC
06:15 VH, 45, HC, 18, 03, VHC, HC
06:30 VH, 23, 62, 12, 42, 55, VHC, HC
06:45 VH, 62, 12, 42, 55, 23, VHC, HC
07:00 VH, 12, 42, 55, 23, 62, VHC, HC`;
