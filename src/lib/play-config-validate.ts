// Validação de campos críticos das Configurações (Ferramentas › Opções)
// e do Playlist.ini, evitando configurações inconsistentes.

import { configGuides, type ConfigField, type ConfigState, type ConfigValue } from "./play-config";

// ---------- Validadores reutilizáveis ----------

const isBlank = (v: ConfigValue) => v === undefined || v === null || String(v).trim() === "";

function vPort(v: ConfigValue): string | null {
  const n = Number(v);
  if (isBlank(v) || Number.isNaN(n)) return "Informe uma porta numérica.";
  if (!Number.isInteger(n) || n < 1 || n > 65535) return "Porta deve estar entre 1 e 65535.";
  return null;
}

// Aceita host:porta (porta opcional, mas se houver deve ser válida).
function vHostPort(v: ConfigValue, required = false): string | null {
  const s = String(v ?? "").trim();
  if (!s) return required ? "Campo obrigatório (host:porta)." : null;
  const m = s.match(/^([^\s:]+)(?::(\d+))?$/);
  if (!m) return "Formato inválido. Use host ou host:porta.";
  if (m[2]) {
    const p = Number(m[2]);
    if (p < 1 || p > 65535) return "Porta deve estar entre 1 e 65535.";
  }
  return null;
}

function vHost(v: ConfigValue, required = false): string | null {
  const s = String(v ?? "").trim();
  if (!s) return required ? "Informe o servidor (nome ou IP)." : null;
  if (/\s/.test(s)) return "Nome/IP não pode conter espaços.";
  return null;
}

function vPath(v: ConfigValue, ext?: string, required = false): string | null {
  const s = String(v ?? "").trim();
  if (!s) return required ? "Informe um caminho." : null;
  if (/[<>"|?*]/.test(s)) return 'Caminho contém caracteres inválidos (< > " | ? *).';
  if (ext && !s.toLowerCase().endsWith(ext)) return `O arquivo deve terminar com ${ext}.`;
  return null;
}

// ---------- Mapa de validadores por chave (field.key) ----------

const fieldValidators: Record<string, (v: ConfigValue) => string | null> = {
  // Portas
  psPorta: vPort,
  advPorta: vPort,
  // Hosts
  psServidor: (v) => vHost(v, true),
  advComputadorAR: (v) => vHost(v, true),
  // host:porta (opcionais)
  advProxy: (v) => vHostPort(v),
  ccEndereco: (v) => vHostPort(v),
  vlcEndereco: (v) => vHostPort(v),
  stAvra: (v) => vHostPort(v),
  xmlUdp: (v) => vHostPort(v),
  // Caminhos
  xmlArquivo: (v) => vPath(v, ".xml"),
  dvPastaTrilhas: (v) => vPath(v),
};

// ---------- Validação genérica de um campo ----------

export function validateFieldValue(field: ConfigField, value: ConfigValue): string | null {
  if (field.type === "number") {
    const n = Number(value);
    if (value === "" || value === undefined || Number.isNaN(n)) return "Valor numérico obrigatório.";
    if (field.min !== undefined && n < field.min) return `Mínimo: ${field.min}${field.unit ? " " + field.unit : ""}.`;
    if (field.max !== undefined && n > field.max) return `Máximo: ${field.max}${field.unit ? " " + field.unit : ""}.`;
  }
  const custom = fieldValidators[field.key];
  if (custom) return custom(value);
  return null;
}

// ---------- Validação do estado completo ----------

export function validateConfigState(state: ConfigState): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const guide of configGuides) {
    for (const section of guide.sections) {
      for (const field of section.fields) {
        const fullKey = `${guide.id}.${section.id}.${field.key}`;
        const value = state[fullKey] ?? field.default;
        const err = validateFieldValue(field, value);
        if (err) errors[fullKey] = err;
      }
    }
  }
  return errors;
}

// ---------- Validação do Playlist.ini ----------

const VALID_VARS = ["%d", "%m", "%Y", "%y", "%a", "%w"];

export function validateIniFile(template: string, label: string): string | null {
  const s = template.trim();
  if (!s) return `${label}: informe o caminho do arquivo.`;
  if (/[<>"|?*]/.test(s)) return `${label}: contém caracteres inválidos.`;
  // Variáveis desconhecidas (qualquer %X fora da lista)
  const vars = s.match(/%[a-zA-Z]/g) ?? [];
  const invalid = vars.filter((v) => !VALID_VARS.includes(v));
  if (invalid.length) return `${label}: variável(is) inválida(s): ${[...new Set(invalid)].join(", ")}.`;
  if (!/\.[a-zA-Z0-9]{1,4}$/.test(s)) return `${label}: o arquivo deve ter extensão (ex.: .txt).`;
  return null;
}

export function validateIniFormat(format: string, label: string): string | null {
  if (!["AUTO", "TXT1"].includes(format.toUpperCase())) return `${label}: formato deve ser AUTO ou TXT1.`;
  return null;
}
