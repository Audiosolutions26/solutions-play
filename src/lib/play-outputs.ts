// Roteamento de SAÍDAS de áudio por função (manual Playlist Digital p.111).
// Permite escolher a placa/saída de áudio para cada finalidade e gera um
// identificador ("ID para Saídas") para cada saída reconhecida, usado pelos
// painéis QuickStart para escolher em qual canal o botão será reproduzido.

import { loadDevicePrefs, saveDevicePrefs, type DeviceLists } from "./play-audio-devices";
import { getAudioEngine } from "./audio-engine";
import { refreshCueSink } from "./play-cue";

export const OUTPUT_DEFAULT = "__default__";

export type OutputFn =
  | "programacao"
  | "preEscuta"
  | "quickstart"
  | "tocar"
  | "comerciais"
  | "musicas"
  | "vinhetas";

export interface OutputFnMeta {
  fn: OutputFn;
  label: string;
  help: string;
}

// Ordem e descrições conforme o manual (p.111).
export const OUTPUT_FUNCTIONS: OutputFnMeta[] = [
  { fn: "programacao", label: "Programação (no AR)", help: "Placa que reproduz o áudio no ar." },
  { fn: "preEscuta", label: "Pré-escuta (CUE)", help: "Saída de pré-escuta, fora do ar." },
  { fn: "quickstart", label: "QuickStart", help: "Saída para o áudio dos botões QuickStart." },
  { fn: "tocar", label: "Opção Tocar", help: 'Saída usada ao exibir um áudio pela opção "Tocar".' },
  { fn: "comerciais", label: "Comerciais", help: "Saída usada para veicular comerciais." },
  { fn: "musicas", label: "Músicas", help: "Saída usada para veicular músicas." },
  { fn: "vinhetas", label: "Vinhetas", help: "Saída usada para veicular vinhetas." },
];

export type OutputRouting = Record<OutputFn, string>;

const KEY = "solutions-play-outputs";

export function defaultRouting(): OutputRouting {
  return {
    programacao: OUTPUT_DEFAULT,
    preEscuta: OUTPUT_DEFAULT,
    quickstart: OUTPUT_DEFAULT,
    tocar: OUTPUT_DEFAULT,
    comerciais: OUTPUT_DEFAULT,
    musicas: OUTPUT_DEFAULT,
    vinhetas: OUTPUT_DEFAULT,
  };
}

export function loadRouting(): OutputRouting {
  const base = defaultRouting();
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "null");
    if (raw && typeof raw === "object") Object.assign(base, raw);
  } catch { /* ignore */ }
  // Mantém compatibilidade com as preferências já existentes (Dispositivos).
  const prefs = loadDevicePrefs();
  if (base.programacao === OUTPUT_DEFAULT && prefs.outputId) base.programacao = prefs.outputId;
  if (base.preEscuta === OUTPUT_DEFAULT && prefs.cueId) base.preEscuta = prefs.cueId;
  return base;
}

export function saveRouting(routing: OutputRouting) {
  try { localStorage.setItem(KEY, JSON.stringify(routing)); } catch { /* ignore */ }
  // Espelha Programação/Pré-escuta nas preferências usadas pelo motor e pelo CUE.
  const prefs = loadDevicePrefs();
  saveDevicePrefs({
    ...prefs,
    outputId: routing.programacao === OUTPUT_DEFAULT ? undefined : routing.programacao,
    cueId: routing.preEscuta === OUTPUT_DEFAULT ? undefined : routing.preEscuta,
  });
}

// Resolve o deviceId real para uma função ("" = padrão do sistema).
export function deviceForFunction(fn: OutputFn, routing = loadRouting()): string {
  const id = routing[fn];
  return id && id !== OUTPUT_DEFAULT ? id : "";
}

// "ID para Saídas": identificador automático e estável por saída reconhecida.
// Saída padrão do sistema = "S0"; demais saídas = "S1", "S2", ... na ordem.
export function outputIds(devices: DeviceLists): Map<string, string> {
  const map = new Map<string, string>();
  map.set(OUTPUT_DEFAULT, "S0");
  devices.outputs.forEach((d, i) => {
    if (d.deviceId) map.set(d.deviceId, `S${i + 1}`);
  });
  return map;
}

export function outputIdForFunction(fn: OutputFn, devices: DeviceLists, routing = loadRouting()): string {
  const ids = outputIds(devices);
  return ids.get(routing[fn]) ?? "S0";
}

// Aplica o roteamento ao que é, de fato, controlável em tempo real:
// Programação -> destino do motor de áudio; Pré-escuta -> saída do CUE.
export async function applyRouting(routing = loadRouting()): Promise<void> {
  saveRouting(routing);
  try { await getAudioEngine().setOutputDevice(deviceForFunction("programacao", routing)); } catch { /* ignore */ }
  try { await refreshCueSink(); } catch { /* ignore */ }
}
