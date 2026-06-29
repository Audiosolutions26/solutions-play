// Beep (manual p.143): som disparado pelo Playlist Digital num intervalo de
// minutos pré-determinado (ex.: 00, 15, 30, 45) sobre o áudio no ar.

export interface BeepConfig {
  enabled: boolean;
  minutes: number[]; // minutos da hora em que o beep dispara
  freq: number;      // tom do beep (modo demo, sem arquivo)
  url?: string;      // arquivo .mp3 real opcional
}

const STORE = "solutions-play-beep";

export const defaultBeep: BeepConfig = {
  enabled: false,
  minutes: [0, 15, 30, 45],
  freq: 880,
};

export function loadBeep(): BeepConfig {
  try {
    const raw = localStorage.getItem(STORE);
    if (raw) return { ...defaultBeep, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return { ...defaultBeep };
}

export function saveBeep(cfg: BeepConfig): void {
  try {
    // object URLs não persistem entre sessões.
    const { url: _url, ...rest } = cfg;
    localStorage.setItem(STORE, JSON.stringify(rest));
  } catch { /* ignore */ }
}
