// Seções / Integrações de hardware (manual — automação): Arduino, porta
// paralela, satélite, RDS e sensores. Em modo web é simulação; no app desktop
// (Windows) os caminhos/portas ficam persistidos para a integração real.

export type SectionKind = "arduino" | "paralela" | "satelite" | "rds" | "sensores";

export interface SectionConfig {
  kind: SectionKind;
  enabled: boolean;
  port: string;       // COM3, LPT1, etc.
  param: string;      // baud rate / endereço / texto RDS / pino do sensor
  status: "online" | "offline";
}

export interface SectionMeta {
  kind: SectionKind;
  label: string;
  help: string;
  portLabel: string;
  paramLabel: string;
  paramPlaceholder: string;
}

export const SECTION_META: SectionMeta[] = [
  {
    kind: "arduino", label: "Arduino", portLabel: "Porta serial", paramLabel: "Baud rate",
    paramPlaceholder: "9600", help: "Aciona relés/efeitos via placa Arduino conectada por USB serial.",
  },
  {
    kind: "paralela", label: "Porta paralela (LPT)", portLabel: "Porta", paramLabel: "Pinos/Máscara",
    paramPlaceholder: "0x378", help: "Comanda equipamentos de estúdio pela porta paralela (modo legado).",
  },
  {
    kind: "satelite", label: "Satélite", portLabel: "Entrada/cue", paramLabel: "Rede",
    paramPlaceholder: "EMISSORA-SAT", help: "Sincroniza blocos via cue tones recebidos do satélite.",
  },
  {
    kind: "rds", label: "RDS", portLabel: "Codificador (porta)", paramLabel: "Texto RadioText",
    paramPlaceholder: "SOLUTIONS FM", help: "Envia título/artista no ar para o codificador RDS.",
  },
  {
    kind: "sensores", label: "Sensores", portLabel: "Entrada", paramLabel: "Pino/Canal",
    paramPlaceholder: "A0", help: "Lê sensores (silêncio/falha) e dispara ações automáticas.",
  },
];

const KEY = "solutions-play-sections";

export function defaultSections(): SectionConfig[] {
  return SECTION_META.map((m) => ({
    kind: m.kind, enabled: false, port: "", param: m.paramPlaceholder, status: "offline" as const,
  }));
}

export function loadSections(): SectionConfig[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const saved = JSON.parse(raw) as SectionConfig[];
      // mescla com defaults para garantir todas as seções.
      return defaultSections().map((d) => saved.find((s) => s.kind === d.kind) ?? d);
    }
  } catch { /* ignore */ }
  return defaultSections();
}

export function saveSections(list: SectionConfig[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch { /* ignore */ }
}
