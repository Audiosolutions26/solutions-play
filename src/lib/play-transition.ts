import { mixTimeForTrack } from "./play-mixagem";
import { firstMarker, markerPositionSec, type Marker } from "./play-markers";
import type { Track } from "./play-data";
import type { CuePoints } from "./play-cuepoints";

export interface TransitionInput {
  current: Track;
  next: Track;
  currentMarkers?: Marker[];
  nextMarkers?: Marker[];
  currentCue?: CuePoints | null;
  nextCue?: CuePoints | null;
  /** Override útil para avanço manual e testes determinísticos. */
  mixMs?: number;
  useMarkerMix?: boolean;
  useStartMix?: boolean;
}

export interface TransitionPlan {
  currentId: string;
  nextId: string;
  currentDurationSec: number;
  nextDurationSec: number;
  currentStartSec: number;
  currentEndSec: number;
  nextStartSec: number;
  nextEndSec: number;
  /** Ponto da faixa atual que representa a entrada lógica do próximo áudio. */
  transitionAtSec: number;
  /** Instante da faixa atual em que a próxima voice deve ser criada. */
  nextTriggerAtSec: number;
  /** Offset da próxima mídia ao criar a voice. */
  nextStartOffsetSec: number;
  nextMixInSec: number;
  fadeOutStartSec: number;
  fadeOutMs: number;
  fadeInEndSec: number;
  fadeInMs: number;
  mixMs: number;
  reason: "marker" | "cue" | "default";
  usedCurrentMarkers: boolean;
  usedNextMarkers: boolean;
}

function safeDuration(track: Track, cue?: CuePoints | null): number {
  const candidate = cue?.duration || track.duration;
  return Number.isFinite(candidate) && candidate > 0 ? candidate : 0;
}

function markerSec(
  markers: Marker[] | undefined,
  kind: Marker["kind"],
  duration: number,
): number | null {
  const marker = firstMarker(markers, kind, duration);
  return marker ? markerPositionSec(marker, duration) : null;
}

function clampPoint(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}

function effectiveStart(
  track: Track,
  markers: Marker[] | undefined,
  cue: CuePoints | null | undefined,
  duration: number,
): { sec: number; source: "marker" | "cue" | "default" } {
  const marked = markerSec(markers, "startPoint", duration);
  if (marked !== null) return { sec: clampPoint(marked, 0, duration), source: "marker" };
  if (cue && cue.cueIn > 0) return { sec: clampPoint(cue.cueIn, 0, duration), source: "cue" };
  return { sec: 0, source: "default" };
}

function effectiveEnd(
  track: Track,
  markers: Marker[] | undefined,
  cue: CuePoints | null | undefined,
  duration: number,
): { sec: number; source: "marker" | "cue" | "default" } {
  const marked = markerSec(markers, "endPoint", duration);
  if (marked !== null) return { sec: clampPoint(marked, 0, duration), source: "marker" };
  if (cue && cue.cueOut > 0) return { sec: clampPoint(cue.cueOut, 0, duration), source: "cue" };
  return { sec: duration, source: "default" };
}

/**
 * Resolve uma transição sem tocar áudio. Essa função é a regra única para o
 * playout e para a pré-escuta da passagem.
 */
export function resolveTransitionPlan(input: TransitionInput): TransitionPlan {
  const currentDurationSec = safeDuration(input.current, input.currentCue);
  const nextDurationSec = safeDuration(input.next, input.nextCue);
  const currentMarkers = input.currentMarkers ?? [];
  const nextMarkers = input.nextMarkers ?? [];
  const currentStart = effectiveStart(
    input.current,
    currentMarkers,
    input.currentCue,
    currentDurationSec,
  );
  const currentEnd = effectiveEnd(
    input.current,
    currentMarkers,
    input.currentCue,
    currentDurationSec,
  );
  const nextStart = effectiveStart(input.next, nextMarkers, input.nextCue, nextDurationSec);
  const nextEnd = effectiveEnd(input.next, nextMarkers, input.nextCue, nextDurationSec);
  const mixMs = Math.max(0, Math.round(input.mixMs ?? mixTimeForTrack(input.current)));
  
  // Ajuste de batida (Beat Alignment)
  // Se o BPM for conhecido, tenta alinhar a transição ao tempo da batida (60/BPM)
  const currentBpm = input.currentCue?.bpm || 0;
  let beatAlignedAt = 0;
  if (currentBpm > 60) {
    const beatLen = 60 / currentBpm;
    // Quantiza o ponto final para a batida mais próxima
    beatAlignedAt = Math.round(currentEnd.sec / beatLen) * beatLen;
  }

  const defaultTransition = beatAlignedAt > 0 
    ? Math.max(currentStart.sec, beatAlignedAt - mixMs / 1000)
    : Math.max(currentStart.sec, currentEnd.sec - mixMs / 1000);

  const markedTransition =
    input.useMarkerMix === false
      ? null
      : markerSec(currentMarkers, "nextEntry", currentDurationSec);
  
  const transitionAtSec = clampPoint(
    markedTransition ?? defaultTransition,
    currentStart.sec,
    currentEnd.sec || currentDurationSec,
  );
  const nextMixInSec =
    input.useStartMix === false
      ? 0
      : Math.max(0, markerSec(nextMarkers, "mixIn", nextDurationSec) ?? 0);
  const nextTriggerAtSec = clampPoint(
    transitionAtSec - nextMixInSec,
    currentStart.sec,
    currentEnd.sec || currentDurationSec,
  );
  const fadeOutMarked = markerSec(currentMarkers, "fadeOutStart", currentDurationSec);
  const fadeOutStartSec = clampPoint(
    fadeOutMarked ?? Math.max(currentStart.sec, transitionAtSec),
    currentStart.sec,
    currentEnd.sec || currentDurationSec,
  );
  const fadeOutMs =
    fadeOutMarked !== null
      ? Math.max(0, Math.round((currentEnd.sec - fadeOutStartSec) * 1000))
      : mixMs;
  const fadeInMarked = markerSec(nextMarkers, "fadeInEnd", nextDurationSec);
  const fallbackFadeInMs = Math.max(0, Math.round(mixMs));
  const fadeInEndSec =
    fadeInMarked !== null
      ? clampPoint(fadeInMarked, nextStart.sec, nextEnd.sec || nextDurationSec)
      : clampPoint(
          nextStart.sec + fallbackFadeInMs / 1000,
          nextStart.sec,
          nextEnd.sec || nextDurationSec,
        );
  const fadeInMs = Math.max(0, Math.round((fadeInEndSec - nextStart.sec) * 1000));
  const reason =
    markedTransition !== null
      ? "marker"
      : currentEnd.source === "cue" || nextStart.source === "cue"
        ? "cue"
        : "default";
  return {
    currentId: input.current.id,
    nextId: input.next.id,
    currentDurationSec,
    nextDurationSec,
    currentStartSec: currentStart.sec,
    currentEndSec: currentEnd.sec,
    nextStartSec: nextStart.sec,
    nextEndSec: nextEnd.sec,
    transitionAtSec,
    nextTriggerAtSec,
    nextStartOffsetSec: nextStart.sec,
    nextMixInSec,
    fadeOutStartSec,
    fadeOutMs,
    fadeInEndSec,
    fadeInMs,
    mixMs,
    reason,
    usedCurrentMarkers: currentMarkers.length > 0,
    usedNextMarkers: nextMarkers.length > 0,
  };
}

export function passagePreviewStartSec(plan: TransitionPlan, leadSec = 5): number {
  return Math.max(plan.currentStartSec, plan.nextTriggerAtSec - Math.max(0, leadSec));
}

export function transitionSummary(plan: TransitionPlan): string {
  return `${plan.currentId} → ${plan.nextId} @ ${plan.nextTriggerAtSec.toFixed(3)}s (${plan.reason})`;
}
