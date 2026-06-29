// Mixagem (manual Playlist Digital 5 — página 106: "Guia Inserções > Tempo de
// mixagem padrão"). Resolve, a partir das configurações salvas, o tempo de
// mixagem (crossfade) e os fades por tipo de inserção. Estes valores são
// aplicados de verdade no motor de áudio durante as transições.
import { loadConfig } from "./play-config";
import type { Track } from "./play-data";

export interface MixSettings {
  comerciais: number;
  musicas: number;
  vinhetas: number;
  demais: number;
  locucoes: number;
  horaCerta: number;
  refrao: number;
  fadeInRefrao: number;
  fadeOutRefrao: number;
  fadeManual: number;
}

const DEFAULTS: MixSettings = {
  comerciais: 500,
  musicas: 800,
  vinhetas: 300,
  demais: 500,
  locucoes: 600,
  horaCerta: 400,
  refrao: 500,
  fadeInRefrao: 300,
  fadeOutRefrao: 300,
  fadeManual: 400,
};

// Lê os tempos de mixagem padrão (em ms) das configurações persistidas.
export function getMixSettings(): MixSettings {
  let c: Record<string, unknown> = {};
  try { c = loadConfig() as Record<string, unknown>; } catch { /* SSR / sem storage */ }
  const n = (key: string, def: number) => {
    const v = c[`insercoes.tempoMixagem.${key}`];
    return typeof v === "number" && v >= 0 ? v : def;
  };
  return {
    comerciais: n("mixComerciais", DEFAULTS.comerciais),
    musicas: n("mixMusicas", DEFAULTS.musicas),
    vinhetas: n("mixVinhetas", DEFAULTS.vinhetas),
    demais: n("mixDemais", DEFAULTS.demais),
    locucoes: n("mixLocucoes", DEFAULTS.locucoes),
    horaCerta: n("mixHoraCerta", DEFAULTS.horaCerta),
    refrao: n("mixRefrao", DEFAULTS.refrao),
    fadeInRefrao: n("fadeInRefrao", DEFAULTS.fadeInRefrao),
    fadeOutRefrao: n("fadeOutRefrao", DEFAULTS.fadeOutRefrao),
    fadeManual: n("fadeManual", DEFAULTS.fadeManual),
  };
}

// Tempo de mixagem (ms) para uma inserção, conforme seu tipo/categoria.
export function mixTimeForTrack(t: Track | null | undefined): number {
  if (!t) return 0;
  const m = getMixSettings();
  if (t.kind === "pausa") return 0;            // pausa não mixa
  if (t.kind === "locucao") return m.locucoes;
  if (t.kind === "horacerta") return m.horaCerta;
  switch (t.category) {
    case "musical": return m.musicas;
    case "comercial": return m.comerciais;
    case "vinheta": return m.vinhetas;
    default: return m.demais;                   // texto/demais
  }
}

// Fade (ms) aplicado nas passagens manuais (botão "Próxima").
export function manualFadeMs(): number {
  return getMixSettings().fadeManual;
}
