import { markerMixEnabled, markerStartEnabled, mixTimeForTrack } from "./play-mixagem";
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
  const rawMixMs = Math.max(0, Math.round(input.mixMs ?? mixTimeForTrack(input.current)));
  // Nunca aceita mixagem zero em áudio "tocável": sem sobreposição o ar fica
  // com buraco entre as faixas.
  const mixMs = rawMixMs > 0 ? Math.max(300, rawMixMs) : 0;
  const mixSec = mixMs / 1000;

  const hardEnd = currentEnd.sec || currentDurationSec;
  // Limite de segurança: a transição não pode começar antes do cue-in nem
  // antes de ~15% do áudio já tocado.
  const earliest = Math.max(
    currentStart.sec,
    currentStart.sec + (hardEnd - currentStart.sec) * 0.15,
  );
  // Ponto padrão de passagem: recua o tempo de mixagem a partir do cue-out,
  // garantindo sobreposição real entre a atual e a próxima.
  let defaultTransition = clampPoint(hardEnd - mixSec, Math.min(earliest, hardEnd), hardEnd);

  // Ajuste de batida (Beat Alignment): quantiza o ponto já recuado.
  const currentBpm = input.currentCue?.bpm || 0;
  if (currentBpm > 60) {
    const beatLen = 60 / currentBpm;
    let aligned = Math.round(defaultTransition / beatLen) * beatLen;
    while (aligned > hardEnd - 0.05) aligned -= beatLen;
    if (aligned > earliest && aligned > currentStart.sec) defaultTransition = aligned;
  }

  const rawMarkedTransition =
    input.useMarkerMix === false || !markerMixEnabled(input.current)
      ? null
      : markerSec(currentMarkers, "nextEntry", currentDurationSec);
  // Alguns .pk registram o mix-out depois do endPoint físico. Esse ponto é
  // preservado na edição, mas não pode ser usado para iniciar uma passagem;
  // nesse caso voltamos ao mix padrão para manter a sobreposição audível.
  const markedTransition =
    rawMarkedTransition !== null && rawMarkedTransition > earliest && rawMarkedTransition < hardEnd
      ? rawMarkedTransition
      : null;

  const transitionAtSec = clampPoint(
    markedTransition ?? defaultTransition,
    currentStart.sec,
    hardEnd,
  );
  const rawNextMixIn =
    input.useStartMix === false || !markerStartEnabled(input.next)
      ? null
      : markerSec(nextMarkers, "mixIn", nextDurationSec);
  const nextMixInSec =
    rawNextMixIn !== null && rawNextMixIn >= nextStart.sec && rawNextMixIn < nextEnd.sec
      ? Math.max(0, rawNextMixIn)
      : 0;
  const nextTriggerAtSec = clampPoint(
    transitionAtSec - nextMixInSec,
    currentStart.sec,
    hardEnd,
  );
  const rawFadeOutMarked = markerSec(currentMarkers, "fadeOutStart", currentDurationSec);
  const fadeOutMarked =
    rawFadeOutMarked !== null && rawFadeOutMarked > currentStart.sec && rawFadeOutMarked < hardEnd
      ? rawFadeOutMarked
      : null;
  const fadeOutStartSec = clampPoint(
    fadeOutMarked ?? transitionAtSec,
    currentStart.sec,
    hardEnd,
  );
  // O fade-out sempre termina no cue-out: a rampa cobre exatamente a janela
  // de sobreposição com a próxima faixa.
  const fadeOutMs = Math.max(0, Math.round((hardEnd - fadeOutStartSec) * 1000)) || mixMs;
  const rawFadeInMarked = markerSec(nextMarkers, "fadeInEnd", nextDurationSec);
  const fadeInMarked =
    rawFadeInMarked !== null && rawFadeInMarked > nextStart.sec && rawFadeInMarked < nextEnd.sec
      ? rawFadeInMarked
      : null;
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
