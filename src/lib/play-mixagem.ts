// Mixagem (manual Playlist Digital 5 — página 106: "Guia Inserções > Tempo de
// mixagem padrão"). Resolve, a partir das configurações salvas, o tempo de
// mixagem (crossfade) e os fades por tipo de inserção. Estes valores são
// aplicados de verdade no motor de áudio durante as transições.
import { loadConfig, type ConfigState } from "./play-config";
import type { Track } from "./play-data";
import type { CrossfadeCurve } from "./audio-analysis";

export interface MixSettings {
  comerciais: number;
  musicas: number;
  vinhetas: number;
  demais: number;
  locucoes: number;
  horaCerta: number;
  refrao: number;
  crossfadeCurve: CrossfadeCurve;
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
  crossfadeCurve: "equal-power",
  fadeInRefrao: 300,
  fadeOutRefrao: 300,
  fadeManual: 400,
};

// Lê os tempos de mixagem padrão (em ms) das configurações persistidas.
export function getMixSettings(source?: ConfigState): MixSettings {
  let c: Record<string, unknown> = {};
  try {
    c = (source ?? loadConfig()) as Record<string, unknown>;
  } catch {
    /* SSR / sem storage */
  }
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
    crossfadeCurve: getCrossfadeCurve(source),
    fadeInRefrao: n("fadeInRefrao", DEFAULTS.fadeInRefrao),
    fadeOutRefrao: n("fadeOutRefrao", DEFAULTS.fadeOutRefrao),
    fadeManual: n("fadeManual", DEFAULTS.fadeManual),
  };
}

const CURVE_VALUES: CrossfadeCurve[] = ["equal-power", "linear", "logarithmic", "s-curve"];

export function getCrossfadeCurve(source?: ConfigState): CrossfadeCurve {
  let c: Record<string, unknown> = {};
  try {
    c = (source ?? loadConfig()) as Record<string, unknown>;
  } catch {
    /* SSR / sem storage */
  }
  const value = c["insercoes.tempoMixagem.crossfadeCurve"];
  if (typeof value === "string" && CURVE_VALUES.includes(value as CrossfadeCurve)) {
    return value as CrossfadeCurve;
  }
  const equalPower = c["insercoes.deteccaoPontos.crossEqualPower"];
  return equalPower === false ? "linear" : DEFAULTS.crossfadeCurve;
}

// Tempo de mixagem (ms) para uma inserção, conforme seu tipo/categoria.
export function mixTimeForTrack(t: Track | null | undefined, source?: ConfigState): number {
  if (!t) return 0;
  const m = getMixSettings(source);
  if (t.kind === "pausa") return 0; // pausa não mixa
  if (t.kind === "locucao") return m.locucoes;
  if (t.kind === "horacerta") return m.horaCerta;
  switch (t.category) {
    case "musical":
      return m.musicas;
    case "comercial":
      return m.comerciais;
    case "vinheta":
      return m.vinhetas;
    default:
      return m.demais; // texto/demais
  }
}

function configBoolean(key: string, fallback = true): boolean {
  try {
    const c = loadConfig() as Record<string, unknown>;
    const value = c[`insercoes.${key}`];
    return typeof value === "boolean" ? value : fallback;
  } catch {
    return fallback;
  }
}

/** Define se os marcadores de mix-out/entrada devem governar esta inserção. */
export function markerMixEnabled(t: Track | null | undefined): boolean {
  if (!t || t.kind === "pausa") return false;
  if (t.kind === "locucao") return configBoolean("marcLocucoes.locMarcMix");
  if (t.kind === "horacerta") return configBoolean("marcHoraCerta.hcMarcMix");
  switch (t.category) {
    case "musical":
      return configBoolean("marcMusicas.musMarcMix");
    case "comercial":
      return configBoolean("marcComerciais.comMarcMix");
    case "vinheta":
      return configBoolean("marcVinhetas.vinMarcMix");
    default:
      return true;
  }
}

/** Define se o cue-in/mix-in da faixa entrante deve ser aplicado. */
export function markerStartEnabled(t: Track | null | undefined): boolean {
  if (!t || t.kind === "pausa") return false;
  if (t.kind === "locucao") return configBoolean("marcLocucoes.locMarcInicio");
  if (t.kind === "horacerta") return configBoolean("marcHoraCerta.hcMarcInicio");
  switch (t.category) {
    case "musical":
      return configBoolean("marcMusicas.musMarcInicio");
    case "comercial":
      return configBoolean("marcComerciais.comMarcInicio");
    case "vinheta":
      return configBoolean("marcVinhetas.vinMarcInicio");
    default:
      return true;
  }
}

// Fade (ms) aplicado nas passagens manuais (botão "Próxima").
export function manualFadeMs(): number {
  return getMixSettings().fadeManual;
}
