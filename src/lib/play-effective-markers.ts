import type { Track } from "./play-data";
import {
  markerPositionSec,
  normalizeMarker,
  type Marker,
  type MarkerKind,
  sortMarkers,
} from "./play-markers";
import { loadConfig, type ConfigState } from "./play-config";
import { cueDetectionEnabled, getCachedCuePoints, type CuePoints } from "./play-cuepoints";
import { detectMixPoints, type WaveformPeaks } from "./play-waveform";
import { mixTimeForTrack } from "./play-mixagem";

export interface EffectiveMarkerOptions {
  /** Estado atual do painel de opções; usado para recalcular sem esperar outro ciclo. */
  config?: ConfigState;
  /** Cue points reais já decodificados pelo player. */
  cue?: CuePoints | null;
  /** Envelope real do deck; tem prioridade sobre o cache de cue points. */
  peaks?: Float32Array | null;
  /** BPM usado para alinhar o mix-out ao pulso, quando disponível. */
  bpm?: number;
}

function configuredCueThresholdDb(source?: ConfigState): number {
  try {
    const value = (source ?? loadConfig())["insercoes.deteccaoPontos.cueThresholdDb"];
    return typeof value === "number" && value > 0 ? value : 45;
  } catch {
    return 45;
  }
}

/**
 * Traduz a sensibilidade em dB da tela de opções para o envelope normalizado
 * usado pelo detector do waveform. O cálculo mantém a semântica de dBFS e
 * limita apenas extremos que poderiam fazer uma onda normalizada ficar sem
 * ponto de entrada ou saída.
 */
export function configuredWaveformThreshold(source?: ConfigState): number {
  const db = configuredCueThresholdDb(source);
  const amplitude = Math.pow(10, -db / 20);
  return Math.max(0.005, Math.min(0.35, amplitude));
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}

function derived(kind: MarkerKind, seconds: number, duration: number, note: string): Marker {
  const sec = clamp(seconds, 0, duration);
  return normalizeMarker(
    {
      id: `auto-${kind}`,
      kind,
      pos: duration > 0 ? sec / duration : 0,
      positionSec: sec,
      note,
      locked: false,
    },
    duration,
  );
}

function firstSeconds(markers: Marker[], kind: MarkerKind, duration: number): number | null {
  const marker = markers.find((item) => item.kind === kind);
  return marker ? markerPositionSec(marker, duration) : null;
}

function alignedMixOut(start: number, end: number, mixMs: number, bpm?: number): number {
  const mixSec = Math.max(0, mixMs) / 1000;
  const earliest = Math.max(start, start + (end - start) * 0.15);
  let point = clamp(end - mixSec, Math.min(earliest, end), end);
  if (bpm && bpm > 60) {
    const beatLen = 60 / bpm;
    let aligned = Math.round(point / beatLen) * beatLen;
    while (aligned > end - 0.05) aligned -= beatLen;
    if (aligned > earliest && aligned > start) point = aligned;
  }
  return point;
}

function cachedCueForTrack(track: Track | null | undefined): CuePoints | undefined {
  if (!track || typeof window === "undefined") return undefined;
  const url = track.audioUrl;
  return url ? getCachedCuePoints(url) : undefined;
}

/**
 * Gera a visão efetiva dos marcadores sem sobrescrever o sidecar salvo.
 *
 * Marcadores manuais/importados sempre vencem. Na ausência deles, as opções
 * globais fornecem cue-in/cue-out e o tempo de mixagem cria o MIX-OUT e as
 * rampas que os decks desenham. O mesmo resultado é usado pelo player para
 * que a linha visual e a passagem de áudio permaneçam coerentes.
 */
export function getEffectiveMarkers(
  track: Track | null | undefined,
  storedMarkers: Marker[] = [],
  durationHint = 0,
  options: EffectiveMarkerOptions = {},
): Marker[] {
  if (!track) return [];
  const cue = options.cue ?? cachedCueForTrack(track);
  const duration = Math.max(0, cue?.duration || durationHint || track.duration || 0);
  if (duration <= 0) return storedMarkers;

  const markers = storedMarkers.map((marker, index) =>
    normalizeMarker(marker, duration, `${marker.kind}-${index}`),
  );
  const has = (kind: MarkerKind) => markers.some((marker) => marker.kind === kind);
  const detectionOn =
    typeof options.config?.["insercoes.deteccaoPontos.detectarPontos"] === "boolean"
      ? options.config["insercoes.deteccaoPontos.detectarPontos"] === true
      : cueDetectionEnabled();
  const detectionNote = `Automático pelas opções · sensibilidade ${configuredCueThresholdDb(options.config)} dB`;

  let detectedIn = 0;
  let detectedOut = duration;
  const detectedBpm = options.bpm ?? cue?.bpm;
  if (detectionOn && options.peaks?.length) {
    const detected = detectMixPoints(
      options.peaks,
      duration,
      configuredWaveformThreshold(options.config),
      250,
    );
    detectedIn = clamp(detected.mixInSec, 0, duration);
    detectedOut = clamp(detected.mixOutSec || duration, detectedIn, duration);
  } else if (detectionOn && cue) {
    detectedIn = clamp(cue.cueIn, 0, duration);
    detectedOut = clamp(cue.cueOut || duration, detectedIn, duration);
  }

  const start = firstSeconds(markers, "startPoint", duration) ?? detectedIn;
  const end = firstSeconds(markers, "endPoint", duration) ?? detectedOut;
  const safeEnd = Math.max(start, end || duration);
  const mixMs = mixTimeForTrack(track, options.config);
  const mixOut = alignedMixOut(start, safeEnd, mixMs, detectedBpm);
  const fadeLength = Math.max(0.05, mixMs / 1000);

  // Esses pontos derivados ficam somente na camada visual/runtime. Ao salvar
  // manualmente, o operador ainda decide quais marcadores virarão sidecar.
  if (!has("startPoint"))
    markers.push(
      derived(
        "startPoint",
        start,
        duration,
        detectionOn ? detectionNote : "Padrão pelas opções de mixagem",
      ),
    );
  if (!has("endPoint"))
    markers.push(
      derived(
        "endPoint",
        safeEnd,
        duration,
        detectionOn ? detectionNote : "Padrão pelas opções de mixagem",
      ),
    );
  if (!has("mixIn"))
    markers.push(derived("mixIn", start, duration, `Mix-in automático · ${mixMs} ms`));
  if (!has("nextEntry"))
    markers.push(derived("nextEntry", mixOut, duration, `Mix-out padrão · ${mixMs} ms`));
  if (!has("fadeInEnd"))
    markers.push(
      derived(
        "fadeInEnd",
        Math.min(safeEnd, start + fadeLength),
        duration,
        `Fade-in padrão · ${mixMs} ms`,
      ),
    );
  if (!has("fadeOutStart"))
    markers.push(derived("fadeOutStart", mixOut, duration, `Fade-out padrão · ${mixMs} ms`));

  return sortMarkers(markers, duration);
}
