import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { getAudioEngine } from "@/lib/audio-engine";
import {
  initialBlocks,
  type Block,
  type BlockClock,
  type Track,
  cloneTrack,
} from "@/lib/play-data";
import { getTrackAudioUrl, setTrackAudioUrl, resolveTrackAudio } from "@/lib/play-audio-files";
import { mixTimeForTrack, manualFadeMs } from "@/lib/play-mixagem";
import {
  analyzeCuePoints,
  getCachedCuePoints,
  cueDetectionEnabled,
  equalPowerEnabled,
  type CuePoints,
} from "@/lib/play-cuepoints";
import { updateRds } from "@/lib/play-rds";
import { getMarkers, markerPositionSec } from "@/lib/play-markers";
import { importMrkInfoForTrack } from "@/lib/play-mrk";
import { addEvent } from "@/lib/play-events";
import { resolveTransitionPlan, type TransitionPlan } from "@/lib/play-transition";
import { applyTrackOutput, type OutputFn } from "@/lib/play-outputs";

export type OperationMode = "AUTO" | "MANUAL" | "RE-BROADCAST" | "OFFLINE";

interface PlayerState {
  blocks: Block[];
  current: Track | null;
  currentBlockId: string | null;
  isPlaying: boolean;
  position: number;
  onAir: boolean;
  mode: OperationMode;
  setMode: (mode: OperationMode) => void;
  cue: boolean;
  selectedId: string | null;
  playAt: (
    blockId: string,
    trackId: string,
    fadeMs?: number,
    fromOffset?: number,
    outputFn?: OutputFn,
  ) => void;
  togglePlay: () => void;
  stop: () => void;
  next: (fadeMs?: number, fromOffset?: number, outputFn?: OutputFn) => void;
  nextManual: () => void;
  setCue: (v: boolean) => void;
  select: (id: string) => void;
  addTrack: (blockId: string, track: Track) => void;
  addTrackAt: (targetId: string, track: Track, place?: "before" | "after") => void;
  moveTrack: (trackId: string, dir: -1 | 1) => void;
  reorderTrack: (sourceId: string, targetId: string, place?: "before" | "after") => void;
  removeTrack: (blockId: string, trackId: string) => void;
  replaceBlocks: (blocks: Block[]) => void;
  setTrackAudio: (blockId: string, trackId: string, url: string, duration: number) => void;
  setBlockClock: (blockId: string, clock: BlockClock) => void;
  getEngine: typeof getAudioEngine;
}

const Ctx = createContext<PlayerState | null>(null);

export function PlayerProvider({ children }: { children: ReactNode }) {
  const engine = getAudioEngine();
  const [blocks, setBlocks] = useState<Block[]>(initialBlocks);
  const [current, setCurrent] = useState<Track | null>(null);
  const [currentBlockId, setCurrentBlockId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [cue, setCue] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mode, setModeState] = useState<OperationMode>("AUTO");

  const setMode = useCallback(
    (nextMode: OperationMode) => {
      setModeState(nextMode);
      if (nextMode === "OFFLINE") {
        engine.stop();
        setIsPlaying(false);
      }
    },
    [engine],
  );

  const blocksRef = useRef(blocks);
  blocksRef.current = blocks;
  const currentRef = useRef<{ track: Track | null; blockId: string | null }>({
    track: null,
    blockId: null,
  });
  // Evita disparar a mixagem (crossfade) mais de uma vez na mesma transição.
  const transitioningRef = useRef(false);
  // Pontos de mixagem (cue-in/cue-out) detectados para a faixa atual.
  const cueRef = useRef<CuePoints | null>(null);
  // Plano calculado uma vez por passagem para impedir que o loop de progresso
  // dispare duas transições com regras diferentes.
  const transitionRef = useRef<TransitionPlan | null>(null);

  const findNext = useCallback(
    (blockId: string, trackId: string): { block: Block; track: Track } | null => {
      const bs = blocksRef.current;
      const bi = bs.findIndex((b) => b.id === blockId);
      if (bi < 0) return null;
      const ti = bs[bi].items.findIndex((t) => t.id === trackId);
      if (ti >= 0 && ti < bs[bi].items.length - 1) {
        return { block: bs[bi], track: bs[bi].items[ti + 1] };
      }
      for (let j = bi + 1; j < bs.length; j++) {
        if (bs[j].items.length) return { block: bs[j], track: bs[j].items[0] };
      }
      return null;
    },
    [],
  );

  // Próximas N inserções a partir de uma posição (para o arquivo de RDS).
  const upcomingFrom = useCallback(
    (blockId: string | null, trackId: string | null, n: number): Track[] => {
      if (!blockId || !trackId) return [];
      const out: Track[] = [];
      let bId = blockId;
      let tId = trackId;
      for (let k = 0; k < n; k++) {
        const nx = findNext(bId, tId);
        if (!nx) break;
        out.push(nx.track);
        bId = nx.block.id;
        tId = nx.track.id;
      }
      return out;
    },
    [findNext],
  );

  // Resolve a URL tocável de uma faixa (cache, audioUrl ou arquivo de pasta).
  const trackUrl = useCallback(async (t: Track): Promise<string | undefined> => {
    const direct = getTrackAudioUrl(t.id) || t.audioUrl;
    if (direct) return direct;
    if (t.filePath) return (await resolveTrackAudio(t)) ?? undefined;
    return undefined;
  }, []);

  // Pré-analisa a próxima faixa para que o "segue" (cue-in/cue-out) já esteja
  // pronto no momento da transição — mixagem firme, sem buracos no ar.
  const prefetchCue = useCallback(
    (blockId: string, trackId: string) => {
      if (!cueDetectionEnabled()) return;
      const nx = findNext(blockId, trackId);
      if (!nx) return;
      
      void trackUrl(nx.track).then(async (u) => {
        if (!u) return;
        
        // Antes de analisar o cue, garante que os marcadores externos (.mrk) foram lidos
        if (nx.track.filePath && getMarkers(nx.track.id).length === 0) {
          await importMrkInfoForTrack(nx.track);
        }
        
        void analyzeCuePoints(u);
      });
    },
    [findNext, trackUrl],
  );

  const playAt = useCallback(
    (
      blockId: string,
      trackId: string,
      fadeMs = 0,
      fromOffset?: number,
      outputFn?: OutputFn,
      fadeOutMs = fadeMs,
    ) => {
      if (mode === "OFFLINE") return;
      const block = blocksRef.current.find((b) => b.id === blockId);
      const track = block?.items.find((t) => t.id === trackId);
      if (!track) return;
      currentRef.current = { track, blockId };
      transitioningRef.current = false;
      transitionRef.current = null;
      cueRef.current = null;
      setCurrent(track);
      setCurrentBlockId(blockId);
      setSelectedId(trackId);
      setPosition(Math.max(0, fromOffset ?? 0));
      // Inicia uma URL aplicando os pontos de mixagem detectados (corta o
      // silêncio inicial) e a curva de potência constante na passagem.
      const startUrl = async (u: string) => {
        await applyTrackOutput(track, outputFn);
        if (currentRef.current.track?.id !== trackId) return;
        const detect = cueDetectionEnabled();
        const ep = equalPowerEnabled();
        const cached = detect ? getCachedCuePoints(u) : undefined;
        let markers = getMarkers(track.id);
        
        // Se não há marcadores, tenta importar o .mrk just-in-time
        if (markers.length === 0 && track.filePath) {
          const res = await importMrkInfoForTrack(track);
          if (res.success) {
            markers = getMarkers(track.id);
            addEvent("audio", `Importado ${res.count} marcadores do editor externo para: ${track.title}`, "info");
          }
        }

        const markedStart =
          track.duration > 0 ? markers.find((marker) => marker.kind === "startPoint") : undefined;
        const markerStart = markedStart ? markerPositionSec(markedStart, track.duration) : 0;
        const startAt =
          typeof fromOffset === "number"
            ? Math.max(0, fromOffset)
            : markerStart > 0
              ? markerStart
              : cached && cached.cueIn > 0
                ? cached.cueIn
                : 0;
        cueRef.current = cached && cached.cueOut > 0 ? cached : null;
        engine.playUrl(u, startAt, fadeMs, ep, fadeOutMs);
        if (detect) {
          void analyzeCuePoints(u).then((cp) => {
            if (currentRef.current.track?.id === trackId) {
              cueRef.current = cp.cueOut > 0 ? cp : null;
            }
          });
        }
        prefetchCue(blockId, trackId);
      };
      const url = getTrackAudioUrl(trackId) || track.audioUrl;
      if (url) void startUrl(url);
      else if (track.filePath) {
        void resolveTrackAudio(track).then((u) => {
          if (u && currentRef.current.track?.id === trackId) void startUrl(u);
          else if (!u && track.freq > 0)
            void applyTrackOutput(track, outputFn).then(() => engine.play(track.freq, 0));
        });
      } else if (track.freq > 0)
        void applyTrackOutput(track, outputFn).then(() => engine.play(track.freq, 0));
      else engine.stop();
      setIsPlaying(true);
    },
    [engine, mode, prefetchCue],
  );

  const next = useCallback(
    (fadeMs = 0, fromOffset = 0, outputFn?: OutputFn, fadeOutMs = fadeMs) => {
      const cur = currentRef.current;
      if (!cur.track || !cur.blockId) return;
      const nx = findNext(cur.blockId, cur.track.id);
      if (nx) playAt(nx.block.id, nx.track.id, fadeMs, fromOffset, outputFn, fadeOutMs);
      else {
        engine.stop();
        setIsPlaying(false);
      }
    },
    [findNext, playAt, engine],
  );

  // Avanço automático confiável: quando a inserção atual termina de verdade
  // (evento "ended" do arquivo), pula para a próxima — mesmo que a duração
  // não tenha sido detectada. Sem isto, faixas sem metadados de duração ficam
  // paradas no fim e o crossfade nunca dispara.
  useEffect(() => {
    engine.setOnEnded(() => {
      if (mode === "AUTO" && !transitioningRef.current) next();
    });
    return () => engine.setOnEnded(null);
  }, [engine, mode, next]);

  // Passagem manual (botão "Próxima"): aplica o fade configurado em
  // "Fade nas passagens manuais" (manual p.106).
  const nextManual = useCallback(() => {
    next(manualFadeMs());
  }, [next]);

  // Gera/atualiza os arquivos de RDS (no ar + 5 próximas) sempre que a
  // grade ou a inserção no ar mudam. No desktop grava na pasta RDS; no modo
  // web é silenciosamente ignorado.
  useEffect(() => {
    const up = upcomingFrom(currentBlockId, current?.id ?? null, 5);
    updateRds(current, up);
  }, [blocks, current, currentBlockId, upcomingFrom]);

  const togglePlay = useCallback(() => {
    const cur = currentRef.current;
    if (!cur.track) {
      const first = blocksRef.current.find((b) => b.items.length);
      if (first) playAt(first.id, first.items[0].id);
      return;
    }
    if (isPlaying) {
      engine.pause();
      setIsPlaying(false);
    } else {
      if (getTrackAudioUrl(cur.track.id) || cur.track.audioUrl || cur.track.freq > 0)
        engine.resume(cur.track.freq);
      setIsPlaying(true);
    }
  }, [isPlaying, engine, playAt]);

  const stop = useCallback(() => {
    engine.stop();
    setIsPlaying(false);
    setPosition(0);
  }, [engine]);

  const select = useCallback((id: string) => setSelectedId(id), []);

  const addTrack = useCallback((blockId: string, track: Track) => {
    const block = blocksRef.current.find((b) => b.id === blockId);
    if (block?.clock?.locked) return; // bloco LOCKED (manual p.141)
    const t = { ...cloneTrack(track), origin: "manual" as const, moved: false };
    setBlocks((bs) => bs.map((b) => (b.id === blockId ? { ...b, items: [...b.items, t] } : b)));
  }, []);

  // Inserir um áudio (vindo das Pastas) numa posição específica da Programação,
  // arrastando e soltando sobre uma inserção alvo (clicar, arrastar e soltar).
  const addTrackAt = useCallback(
    (targetId: string, track: Track, place: "before" | "after" = "before") => {
      setBlocks((bs) => {
        const dstBlock = bs.find((b) => b.items.some((t) => t.id === targetId));
        if (!dstBlock || dstBlock.clock?.locked) return bs; // bloco LOCKED (manual p.141)
        const t = { ...cloneTrack(track), origin: "manual" as const, moved: false };
        return bs.map((b) => {
          if (b.id !== dstBlock.id) return b;
          const idx = b.items.findIndex((x) => x.id === targetId);
          if (idx < 0) return b;
          const at = place === "after" ? idx + 1 : idx;
          return { ...b, items: [...b.items.slice(0, at), t, ...b.items.slice(at)] };
        });
      });
    },
    [],
  );

  // Move an insertion up/down within its block (manual p.16-17).
  // Auto items moved manually get flagged so the UI shows a red M.
  const moveTrack = useCallback((trackId: string, dir: -1 | 1) => {
    setBlocks((bs) =>
      bs.map((b) => {
        if (b.clock?.locked) return b; // bloco LOCKED (manual p.141)
        const i = b.items.findIndex((t) => t.id === trackId);
        if (i < 0) return b;
        const j = i + dir;
        if (j < 0 || j >= b.items.length) return b;
        const items = [...b.items];
        const moved = { ...items[i], moved: items[i].origin === "auto" ? true : items[i].moved };
        items[i] = items[j];
        items[j] = moved;
        return { ...b, items };
      }),
    );
  }, []);

  const removeTrack = useCallback((blockId: string, trackId: string) => {
    setBlocks((bs) =>
      bs.map((b) =>
        b.id === blockId && !b.clock?.locked
          ? { ...b, items: b.items.filter((t) => t.id !== trackId) }
          : b,
      ),
    );
  }, []);

  // Arrastar e soltar para reposicionar inserções (clicar, arrastar e soltar).
  // Funciona dentro do mesmo bloco e entre blocos, respeitando blocos LOCKED.
  const reorderTrack = useCallback(
    (sourceId: string, targetId: string, place: "before" | "after" = "before") => {
      if (sourceId === targetId) return;
      setBlocks((bs) => {
        const srcBlock = bs.find((b) => b.items.some((t) => t.id === sourceId));
        const dstBlock = bs.find((b) => b.items.some((t) => t.id === targetId));
        if (!srcBlock || !dstBlock) return bs;
        if (srcBlock.clock?.locked || dstBlock.clock?.locked) return bs;
        const moving = srcBlock.items.find((t) => t.id === sourceId);
        if (!moving) return bs;
        const flagged = { ...moving, moved: moving.origin === "auto" ? true : moving.moved };
        return bs.map((b) => {
          let items = b.items;
          if (b.id === srcBlock.id) items = items.filter((t) => t.id !== sourceId);
          if (b.id === dstBlock.id) {
            const idx = items.findIndex((t) => t.id === targetId);
            if (idx < 0) return { ...b, items };
            const at = place === "after" ? idx + 1 : idx;
            items = [...items.slice(0, at), flagged, ...items.slice(at)];
          }
          return items === b.items ? b : { ...b, items };
        });
      });
    },
    [],
  );

  const setTrackAudio = useCallback(
    (blockId: string, trackId: string, url: string, duration: number) => {
      setTrackAudioUrl(trackId, url);
      setBlocks((bs) =>
        bs.map((b) =>
          b.id === blockId
            ? {
                ...b,
                items: b.items.map((t) =>
                  t.id === trackId
                    ? { ...t, duration: duration > 0 ? Math.round(duration) : t.duration }
                    : t,
                ),
              }
            : b,
        ),
      );
    },
    [],
  );

  const replaceBlocks = useCallback(
    (bs: Block[]) => {
      engine.stop();
      currentRef.current = { track: null, blockId: null };
      setBlocks(bs);
      setCurrent(null);
      setCurrentBlockId(null);
      setSelectedId(null);
      setIsPlaying(false);
      setPosition(0);
    },
    [engine],
  );

  // Relógio Operacional (manual p.137-142): define parâmetros do bloco.
  const setBlockClock = useCallback((blockId: string, clock: BlockClock) => {
    setBlocks((bs) =>
      bs.map((b) => (b.id === blockId ? { ...b, clock: { ...b.clock, ...clock } } : b)),
    );
  }, []);

  // progress + auto-advance loop
  useEffect(() => {
    if (!isPlaying) return;
    let raf = 0;
    let last = 0;
    const tick = (ts: number) => {
      if (ts - last > 200) {
        last = ts;
        const cur = currentRef.current.track;
        if (cur) {
          const hasAudio = !!(getTrackAudioUrl(cur.id) || cur.audioUrl);
          const pos = hasAudio || cur.freq > 0 ? engine.position() : position + 0.2;
          // Prefere a duração REAL do arquivo (precisa para crossfade e avanço);
          // só usa a duração armazenada como fallback quando a real é desconhecida.
          const media = hasAudio ? engine.mediaDuration() : 0;
          const dur = media > 0 ? media : cur.duration > 0 ? cur.duration : 0;
          // Resolve a relação entre a faixa atual e a próxima. O mesmo plano
          // é consumido pelo CUE de passagem, evitando que a pré-escuta e o ar
          // calculem pontos diferentes.
          const cp = cueRef.current;
          const liveBlockId = currentRef.current.blockId;
          const nx = liveBlockId ? findNext(liveBlockId, cur.id) : null;
          const plan = nx
            ? resolveTransitionPlan({
                current: cur,
                next: nx.track,
                currentMarkers: getMarkers(cur.id),
                nextMarkers: getMarkers(nx.track.id),
                currentCue: cp,
                mixMs: mixTimeForTrack(cur),
                useMarkerMix: true,
                useStartMix: true,
              })
            : null;
          transitionRef.current = plan;
          const endPoint = plan?.currentEndSec || (cp && cp.cueOut > 0 ? cp.cueOut : dur);
          // Assim que o arquivo informa a duração real, grava de volta no track
          // para que o tempo apareça na Programação e o avanço funcione.
          if (cur.duration <= 0 && dur > 0) {
            const rounded = Math.round(dur * 10) / 10;
            const fixed = { ...cur, duration: rounded };
            currentRef.current.track = fixed;
            setCurrent(fixed);
            setBlocks((bs) =>
              bs.map((b) => ({
                ...b,
                items: b.items.map((t) => (t.id === cur.id ? { ...t, duration: rounded } : t)),
              })),
            );
          }
          // Mixagem não destrutiva: a próxima voice é aberta no instante
          // calculado pelo `nextEntry` da atual e pelo `mixIn` da próxima.
          if (
            mode === "AUTO" &&
            hasAudio &&
            plan &&
            !transitioningRef.current &&
            pos >= plan.nextTriggerAtSec
          ) {
            transitioningRef.current = true;
            next(plan.fadeInMs, plan.nextStartOffsetSec, undefined, plan.fadeOutMs);
            return;
          }
          if (mode === "AUTO" && endPoint > 0 && pos >= endPoint) {
            next();
            return;
          }
          setPosition(pos);
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, mode, next, engine]);

  const value = useMemo<PlayerState>(
    () => ({
      blocks,
      current,
      currentBlockId,
      isPlaying,
      position,
      onAir: isPlaying,
      mode,
      setMode,
      cue,
      selectedId,
      playAt,
      togglePlay,
      stop,
      next,
      nextManual,
      setCue,
      select,
      addTrack,
      addTrackAt,
      moveTrack,
      reorderTrack,
      removeTrack,
      replaceBlocks,
      setTrackAudio,
      setBlockClock,
      getEngine: getAudioEngine,
    }),
    [
      blocks,
      current,
      currentBlockId,
      isPlaying,
      position,
      mode,
      setMode,
      cue,
      selectedId,
      playAt,
      togglePlay,
      stop,
      next,
      nextManual,
      select,
      addTrack,
      addTrackAt,
      moveTrack,
      reorderTrack,
      removeTrack,
      replaceBlocks,
      setTrackAudio,
      setBlockClock,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePlayer(): PlayerState {
  const c = useContext(Ctx);
  if (!c) throw new Error("usePlayer must be used within PlayerProvider");
  return c;
}
