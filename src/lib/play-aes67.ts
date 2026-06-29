// AES67 TX (áudio sobre IP / RTP multicast) — manual de integração.
// Cálculos e validações em JS puro (funcionam no web e no desktop). As funções
// reais de rede (validar interfaces ao vivo, abrir TX/SAP, loopback) usam a
// ponte nativa do Electron quando disponível (window.solutionsPlay.aes67).

import { nativeBridge } from "./play-native";

export type Aes67Bits = "L16" | "L24";

export interface Aes67Config {
  name: string;        // s= (nome da sessão no SDP)
  group: string;       // c= (endereço multicast IPv4)
  port: number;        // porta RTP
  ttl: number;         // TTL do multicast
  channels: number;    // 1 | 2 | 4 | 6 | 8
  sampleRate: number;  // 44100 | 48000 | 96000
  bits: Aes67Bits;     // L16 | L24
  ptime: number;       // ms: 0.125 .. 4
}

export const CHANNEL_OPTS = [1, 2, 4, 6, 8] as const;
export const RATE_OPTS = [44100, 48000, 96000] as const;
export const BITS_OPTS: Aes67Bits[] = ["L16", "L24"];
export const PTIME_OPTS = [0.125, 0.25, 0.5, 1, 2, 4] as const;

export const DEFAULT_AES67: Aes67Config = {
  name: "Solutions-Play TX 1",
  group: "239.69.0.1",
  port: 5004,
  ttl: 32,
  channels: 2,
  sampleRate: 48000,
  bits: "L24",
  ptime: 1,
};

const KEY = "solutions-play-aes67";
const KEY_RX = "solutions-play-aes67-rx";
const MTU = 1500;

export function loadAes67(): Aes67Config {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "null");
    return raw ? { ...DEFAULT_AES67, ...raw } : { ...DEFAULT_AES67 };
  } catch {
    return { ...DEFAULT_AES67 };
  }
}

export function saveAes67(cfg: Aes67Config) {
  try { localStorage.setItem(KEY, JSON.stringify(cfg)); } catch { /* ignore */ }
}

// Preset de ENTRADA (RX) importado de um arquivo .sdp.
export interface Aes67Input extends Aes67Config { sourceIp?: string }

export function loadAes67Rx(): Aes67Input | null {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY_RX) || "null");
    return raw ? { ...DEFAULT_AES67, ...raw } : null;
  } catch {
    return null;
  }
}

export function saveAes67Rx(rx: Aes67Input | null) {
  try {
    if (rx) localStorage.setItem(KEY_RX, JSON.stringify(rx));
    else localStorage.removeItem(KEY_RX);
  } catch { /* ignore */ }
}

export function bytesPerSample(bits: Aes67Bits): number {
  return bits === "L24" ? 3 : 2;
}

export interface PacketMetrics {
  samplesPerPacket: number; // amostras por canal por pacote
  payloadBytes: number;     // bytes de áudio no pacote
  rtpBytes: number;         // RTP header + payload
  ipPacketBytes: number;    // IP+UDP+RTP+payload (na rede)
  mtu: number;
  withinMtu: boolean;
}

// Métricas em tempo real (samples/packet, payload, pacote total vs MTU 1500).
export function packetMetrics(cfg: Aes67Config): PacketMetrics {
  const samplesPerPacket = Math.max(1, Math.round((cfg.sampleRate * cfg.ptime) / 1000));
  const payloadBytes = samplesPerPacket * cfg.channels * bytesPerSample(cfg.bits);
  const rtpBytes = 12 + payloadBytes;             // RTP header = 12B
  const ipPacketBytes = 20 + 8 + rtpBytes;        // IPv4 (20) + UDP (8)
  return {
    samplesPerPacket,
    payloadBytes,
    rtpBytes,
    ipPacketBytes,
    mtu: MTU,
    withinMtu: ipPacketBytes <= MTU,
  };
}

// SDP padrão AES67 publicado via SAP.
export function buildSdp(cfg: Aes67Config, sourceIp: string): string {
  const pt = 96;
  const id = Math.floor(Date.now() / 1000);
  const lines = [
    "v=0",
    `o=- ${id} ${id} IN IP4 ${sourceIp}`,
    `s=${cfg.name}`,
    "t=0 0",
    `c=IN IP4 ${cfg.group}/${cfg.ttl}`,
    `m=audio ${cfg.port} RTP/AVP ${pt}`,
    `a=rtpmap:${pt} ${cfg.bits}/${cfg.sampleRate}/${cfg.channels}`,
    `a=ptime:${cfg.ptime}`,
    "a=ts-refclk:ptp=IEEE1588-2008:00-00-00-00-00-00-00-00:0",
    "a=mediaclk:direct=0",
    "a=recvonly",
  ];
  return lines.join("\r\n") + "\r\n";
}

export interface ValidationIssue { level: "error" | "warning"; msg: string }
export interface LocalInterface { name: string; address: string }
export interface ValidationResult {
  ok: boolean;
  issues: ValidationIssue[];
  interfaces: LocalInterface[];
  metrics: PacketMetrics;
  source: "bridge" | "web";
}

function ipParts(ip: string): number[] | null {
  const p = ip.split(".").map((x) => Number(x));
  if (p.length !== 4 || p.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return null;
  return p;
}

// Validação local em JS (espelha a do bridge). Sem interfaces ao vivo no web.
export function validateLocal(cfg: Aes67Config): ValidationResult {
  const issues: ValidationIssue[] = [];
  const parts = ipParts(cfg.group);
  if (!parts) issues.push({ level: "error", msg: "Endereço multicast IPv4 inválido." });
  else if (parts[0] < 224 || parts[0] > 239)
    issues.push({ level: "error", msg: `Fora da faixa multicast 224–239 (1º octeto = ${parts[0]}).` });

  if (!Number.isInteger(cfg.port) || cfg.port < 1024 || cfg.port > 65535)
    issues.push({ level: "error", msg: "Porta RTP deve estar entre 1024 e 65535." });
  else if (cfg.port % 2 !== 0)
    issues.push({ level: "warning", msg: "Porta ímpar — convenção RTP usa porta par (RTCP = porta+1)." });

  if (cfg.sampleRate !== 48000)
    issues.push({ level: "warning", msg: "AES67 exige 48 kHz para interoperabilidade plena." });

  if (cfg.ttl < 1 || cfg.ttl > 255)
    issues.push({ level: "warning", msg: "TTL recomendado entre 1 e 255." });

  const metrics = packetMetrics(cfg);
  if (!metrics.withinMtu)
    issues.push({ level: "error", msg: `Pacote ${metrics.ipPacketBytes}B excede a MTU ${MTU}B — reduza ptime ou canais.` });

  return {
    ok: !issues.some((i) => i.level === "error"),
    issues,
    interfaces: [],
    metrics,
    source: "web",
  };
}

// ---- Ponte nativa (Electron / Windows) -----------------------------------

interface Aes67Bridge {
  validate?: (cfg: Aes67Config) => Promise<{ ok: boolean; issues: ValidationIssue[]; interfaces: LocalInterface[] }>;
  openTx?: (cfg: Aes67Config) => Promise<{ ok: boolean; sdp?: string; sourceIp?: string; error?: string }>;
  closeTx?: () => Promise<{ ok: boolean }>;
  loopback?: (cfg: Aes67Config & { packets?: number }) => Promise<LoopbackResult>;
}

function aes67Bridge(): Aes67Bridge | null {
  const b = nativeBridge() as unknown as { aes67?: Aes67Bridge } | null;
  return b?.aes67 ?? null;
}

export function aes67Supported(): boolean {
  return !!aes67Bridge()?.openTx;
}

// Validação ao vivo: usa o bridge (interfaces reais + conflito de TX ativa)
// e combina com a validação/métricas locais.
export async function validateAes67(cfg: Aes67Config): Promise<ValidationResult> {
  const local = validateLocal(cfg);
  const b = aes67Bridge();
  if (!b?.validate) return local;
  try {
    const r = await b.validate(cfg);
    const merged = [...local.issues];
    for (const i of r.issues) if (!merged.some((m) => m.msg === i.msg)) merged.push(i);
    return {
      ok: r.ok && !merged.some((i) => i.level === "error"),
      issues: merged,
      interfaces: r.interfaces || [],
      metrics: local.metrics,
      source: "bridge",
    };
  } catch {
    return local;
  }
}

export interface TxResult { ok: boolean; sdp?: string; sourceIp?: string; error?: string }

export async function openTxAes67(cfg: Aes67Config): Promise<TxResult> {
  const b = aes67Bridge();
  if (!b?.openTx) {
    // Web: sem rede real — devolve o SDP que SERIA publicado.
    return { ok: false, sdp: buildSdp(cfg, "0.0.0.0"), error: "TX real disponível apenas no app desktop (Windows)." };
  }
  try { return await b.openTx(cfg); } catch (e) { return { ok: false, error: String(e) }; }
}

export async function closeTxAes67(): Promise<{ ok: boolean }> {
  const b = aes67Bridge();
  if (!b?.closeTx) return { ok: true };
  try { return await b.closeTx(); } catch { return { ok: false }; }
}

export interface LoopbackResult {
  ok?: boolean;
  packetsSent: number;
  packetsReceived: number;
  expectedPayloadBytes: number;
  actualPayloadBytes: number;
  payloadOk: boolean;
  seqGaps: number;
  seqContinuous: boolean;
  snrDb: number;
  snrThreshold: number;
  pass: boolean;
  bits: Aes67Bits;
  channels: number;
  sampleRate: number;
  ptime: number;
  samplesPerPacket: number;
  error?: string;
}

export async function loopbackAes67(cfg: Aes67Config, packets = 120): Promise<LoopbackResult | null> {
  const b = aes67Bridge();
  if (!b?.loopback) return null; // só no desktop
  try { return await b.loopback({ ...cfg, packets }); } catch (e) {
    const m = packetMetrics(cfg);
    return {
      packetsSent: 0, packetsReceived: 0,
      expectedPayloadBytes: m.payloadBytes, actualPayloadBytes: 0, payloadOk: false,
      seqGaps: 0, seqContinuous: false, snrDb: -1, snrThreshold: cfg.bits === "L24" ? 80 : 60,
      pass: false, bits: cfg.bits, channels: cfg.channels, sampleRate: cfg.sampleRate,
      ptime: cfg.ptime, samplesPerPacket: m.samplesPerPacket, error: String(e),
    };
  }
}

// ---- Arquivo de acesso (.sdp): gerar p/ saídas, importar p/ entradas ------

export function downloadAccessFile(cfg: Aes67Config, sourceIp = "0.0.0.0") {
  const sdp = buildSdp(cfg, sourceIp);
  const blob = new Blob([sdp], { type: "application/sdp" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${cfg.name.replace(/[^\w.-]+/g, "_") || "aes67"}.sdp`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Importa um SDP (entrada) e devolve uma config AES67 (RX) reaproveitável.
export function parseAccessFile(text: string): Partial<Aes67Config> & { sourceIp?: string } {
  const out: Partial<Aes67Config> & { sourceIp?: string } = {};
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (line.startsWith("s=")) out.name = line.slice(2).trim();
    else if (line.startsWith("o=")) {
      const m = line.match(/IN IP4 ([\d.]+)/);
      if (m) out.sourceIp = m[1];
    } else if (line.startsWith("c=")) {
      const m = line.match(/IN IP4 ([\d.]+)(?:\/(\d+))?/);
      if (m) { out.group = m[1]; if (m[2]) out.ttl = Number(m[2]); }
    } else if (line.startsWith("m=audio")) {
      const m = line.match(/m=audio\s+(\d+)/);
      if (m) out.port = Number(m[1]);
    } else if (line.startsWith("a=rtpmap:")) {
      const m = line.match(/a=rtpmap:\d+\s+(L16|L24)\/(\d+)(?:\/(\d+))?/i);
      if (m) {
        out.bits = m[1].toUpperCase() as Aes67Bits;
        out.sampleRate = Number(m[2]);
        if (m[3]) out.channels = Number(m[3]);
      }
    } else if (line.startsWith("a=ptime:")) {
      out.ptime = Number(line.slice(8).trim());
    }
  }
  return out;
}
