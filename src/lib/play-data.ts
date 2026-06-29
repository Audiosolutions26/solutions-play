// Demo data for Solutions-Play (local demo mode, no backend).

export type Category = "musical" | "comercial" | "vinheta" | "texto";

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
}

export interface Block {
  id: string;
  title: string;
  date: string;
  time: string;
  category: "musical" | "comercial";
  items: Track[];
}

export interface Folder {
  id: string;
  name: string;
  color: string;
  category: Category;
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
): Track => ({ id: uid(), title, artist, duration, category, freq, ...extra });

export const initialBlocks: Block[] = [
  {
    id: "b1",
    title: "Musical",
    date: "29-06-2026 (segunda-feira)",
    time: "13:00",
    category: "musical",
    items: [
      mk("Black Widow", "Iggy Azalea ft. Rita Ora", 209, "musical", 220, { album: "Reclassified", year: "2014", label: "Def Jam" }),
      mk("The Heat Is On", "Glenn Frey", 211, "musical", 196, { album: "Beverly Hills Cop", year: "1984", label: "MCA" }),
      mk("Unconditionally", "Katy Perry", 228, "musical", 174, { album: "Prism", year: "2013", label: "Capitol" }),
      mk("Gloria", "Donna Summer", 195, "musical", 246, { album: "Crayons", year: "2008", label: "Burgundy" }),
      mk("Candyman", "Christina Aguilera", 194, "musical", 261, { album: "Back to Basics", year: "2006", label: "RCA" }),
    ],
  },
  {
    id: "b2",
    title: "Comercial",
    date: "29-06-2026 (segunda-feira)",
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
    date: "29-06-2026 (segunda-feira)",
    time: "13:30",
    category: "musical",
    items: [
      mk("Bohemian Rhapsody (Live)", "Queen", 367, "musical", 233, { album: "Live Aid", year: "1985", label: "EMI" }),
      mk("Take On Me", "a-ha", 225, "musical", 277, { album: "Hunting High and Low", year: "1985", label: "Warner" }),
      mk("Smooth", "Santana ft. Rob Thomas", 294, "musical", 185, { album: "Supernatural", year: "1999", label: "Arista" }),
    ],
  },
];

export const folders: Folder[] = [
  {
    id: "f1", name: "Acervo de Vídeos", color: "#c0392b", category: "musical",
    tracks: [
      mk("Africa", "Toto", 295, "musical", 220),
      mk("Billie Jean", "Michael Jackson", 294, "musical", 246),
      mk("Sweet Dreams", "Eurythmics", 216, "musical", 174),
    ],
  },
  {
    id: "f2", name: "MPB", color: "#27ae60", category: "musical",
    tracks: [
      mk("Águas de Março", "Elis & Tom", 210, "musical", 196),
      mk("Construção", "Chico Buarque", 380, "musical", 165),
      mk("O Quereres", "Caetano Veloso", 250, "musical", 207),
    ],
  },
  {
    id: "f3", name: "Flash Back", color: "#2980b9", category: "musical",
    tracks: [
      mk("September", "Earth, Wind & Fire", 215, "musical", 261),
      mk("Stayin' Alive", "Bee Gees", 285, "musical", 233),
      mk("Y.M.C.A.", "Village People", 287, "musical", 196),
    ],
  },
  {
    id: "f4", name: "Hit Parade", color: "#8e44ad", category: "musical",
    tracks: [
      mk("Blinding Lights", "The Weeknd", 200, "musical", 277),
      mk("Levitating", "Dua Lipa", 203, "musical", 246),
      mk("As It Was", "Harry Styles", 167, "musical", 220),
    ],
  },
  {
    id: "f5", name: "Vinhetas", color: "#f39c12", category: "vinheta",
    tracks: [
      mk("VH Carimbo 1", "Solutions", 6, "vinheta", 392),
      mk("VH Carimbo 2", "Solutions", 5, "vinheta", 440),
      mk("VH Hora Certa", "Solutions", 9, "vinheta", 330),
    ],
  },
  {
    id: "f6", name: "Comerciais", color: "#16a085", category: "comercial",
    tracks: [
      mk("Spot Loja Central", "Comercial", 30, "comercial", 147),
      mk("Promo Verão", "Comercial", 25, "comercial", 165),
    ],
  },
  {
    id: "f7", name: "Trilhas", color: "#34495e", category: "musical",
    tracks: [
      mk("Trilha Notícias", "BED", 120, "musical", 110),
      mk("Trilha Esportes", "BED", 120, "musical", 130),
    ],
  },
  {
    id: "f8", name: "Textos", color: "#7f8c8d", category: "texto",
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