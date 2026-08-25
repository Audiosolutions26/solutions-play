import { type Marker } from "./play-markers";

export interface PkData {
  durationMs: number;
  mixOutMs: number;
  introMs: number;
  endMs: number;
  peaks: number[];
}

/**
 * Lê o cabeçalho conhecido dos sidecars binários .pk da Playlist Digital.
 * O parser é deliberadamente tolerante: arquivos antigos podem variar o
 * tamanho da tabela de picos, mas os campos temporais permanecem no cabeçalho.
 */
export function parsePkFile(buffer: ArrayBuffer): PkData | null {
  if (buffer.byteLength < 0x70) return null;
  const view = new DataView(buffer);
  const readMs = (offset: number) => {
    const value = view.getUint32(offset, true);
    return value === 0xffffffff ? 0 : value;
  };
  const durationMs = readMs(0x08);
  if (durationMs <= 0) return null;

  const peaks: number[] = [];
  const peakStart = Math.min(0x90, buffer.byteLength - 1);
  for (let i = peakStart; i < buffer.byteLength - 1; i += 2) peaks.push(view.getUint8(i) / 255);
  return {
    durationMs,
    mixOutMs: readMs(0x20),
    introMs: readMs(0x2c),
    endMs: readMs(0x30),
    peaks,
  };
}

function marker(kind: Marker["kind"], seconds: number, durationSec: number, id: string): Marker {
  const clamped = Math.max(0, Math.min(durationSec, seconds));
  return { kind, pos: durationSec > 0 ? clamped / durationSec : 0, positionSec: clamped, id };
}

export function pkToMarkers(pk: PkData, durationSec: number): Marker[] {
  const duration = durationSec > 0 ? durationSec : pk.durationMs / 1000;
  const sourceDuration = pk.durationMs / 1000 || duration;
  const markers: Marker[] = [];
  if (pk.introMs > 0 && pk.introMs < pk.durationMs) {
    markers.push(marker("introEnd", pk.introMs / 1000, duration, "pk-intro"));
  }
  if (pk.mixOutMs > 0 && pk.mixOutMs < pk.durationMs) {
    markers.push(marker("nextEntry", pk.mixOutMs / 1000, duration, "pk-mixout"));
  }
  if (pk.endMs > 0 && pk.endMs < pk.durationMs) {
    markers.push(marker("endPoint", pk.endMs / 1000, duration, "pk-end"));
  }
  // Se o áudio carregado tem uma duração diferente do sidecar, a posição
  // continua em segundos e é limitada ao áudio real; isso evita pos inválida.
  if (sourceDuration !== duration) {
    return markers.map((m) => ({ ...m, pos: duration > 0 ? (m.positionSec ?? 0) / duration : 0 }));
  }
  return markers;
}
