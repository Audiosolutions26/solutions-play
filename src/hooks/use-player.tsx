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
import { initialBlocks, type Block, type BlockClock, type Track, cloneTrack } from "@/lib/play-data";
import { getTrackAudioUrl, setTrackAudioUrl, resolveTrackAudio } from "@/lib/play-audio-files";
import { mixTimeForTrack, manualFadeMs } from "@/lib/play-mixagem";
import { analyzeCuePoints, getCachedCuePoints, cueDetectionEnabled, equalPowerEnabled, type CuePoints } from "@/lib/play-cuepoints";
import { updateRds } from "@/lib/play-rds";

interface PlayerState {
  blocks: Block[];
  current: Track | null;
  currentBlockId: string | null;
  isPlaying: boolean;
  position: number;
  onAir: boolean;
  cue: boolean;
  selectedId: string | null;
  playAt: (blockId: string, trackId: string) => void;
  togglePlay: () => void;
  stop: () => void;
  next: () => void;
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

  const blocksRef = useRef(blocks);
  blocksRef.current = blocks;
  const currentRef = useRef<{ track: Track | null; blockId: string | null }>({ track: null, blockId: null });
  // Evita disparar a mixagem (crossfade) mais de uma vez na mesma transição.
  const transitioningRef = useRef(false);
  // Pontos de mixagem (cue-in/cue-out) detectados para a faixa atual.
  const cueRef = useRef<CuePoints | null>(null);

  const findNext = useCallback((blockId: string, trackId: string): { block: Block; track: Track } | null => {
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
  }, []);

  // Próximas N inserções a partir de uma posição (para o arquivo de RDS).
  const upcomingFrom = useCallback((blockId: string | null, trackId: string | null, n: number): Track[] => {
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
  }, [findNext]);

  // Resolve a URL tocável de uma faixa (cache, audioUrl ou arquivo de pasta).
  const trackUrl = useCallback(async (t: Track): Promise<string | undefined> => {
    const direct = getTrackAudioUrl(t.id) || t.audioUrl;
    if (direct) return direct;
    if (t.filePath) return (await resolveTrackAudio(t)) ?? undefined;
    return undefined;
  }, []);

  // Pré-analisa a próxima faixa para que o "segue" (cue-in/cue-out) já esteja
  // pronto no momento da transição — mixagem firme, sem buracos no ar.
  const prefetchCue = useCallback((blockId: string, trackId: string) => {
    if (!cueDetectionEnabled()) return;
    const nx = findNext(blockId, trackId);
    if (!nx) return;
    void trackUrl(nx.track).then((u) => { if (u) void analyzeCuePoints(u); });
  }, [findNext, trackUrl]);

  const playAt = useCallback((blockId: string, trackId: string, fadeMs = 0) => {
    const block = blocksRef.current.find((b) => b.id === blockId);
    const track = block?.items.find((t) => t.id === trackId);
    if (!track) return;
    currentRef.current = { track, blockId };
    transitioningRef.current = false;
    cueRef.current = null;
    setCurrent(track);
    setCurrentBlockId(blockId);
    setSelectedId(trackId);
    setPosition(0);
    // Inicia uma URL aplicando os pontos de mixagem detectados (corta o
    // silêncio inicial) e a curva de potência constante na passagem.
    const startUrl = (u: string) => {
      const detect = cueDetectionEnabled();
      const ep = equalPowerEnabled();
      const cached = detect ? getCachedCuePoints(u) : undefined;
      const startAt = cached && cached.cueIn > 0 ? cached.cueIn : 0;
      cueRef.current = cached && cached.cueOut > 0 ? cached : null;
      engine.playUrl(u, startAt, fadeMs, ep);
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
    if (url) startUrl(url);
    else if (track.filePath) {
      void resolveTrackAudio(track).then((u) => {
        if (u && currentRef.current.track?.id === trackId) startUrl(u);
        else if (!u && track.freq > 0) engine.play(track.freq, 0);
      });
    }
    else if (track.freq > 0) engine.play(track.freq, 0);
    else engine.stop();
    setIsPlaying(true);
  }, [engine, prefetchCue]);

  const next = useCallback((fadeMs = 0) => {
    const cur = currentRef.current;
    if (!cur.track || !cur.blockId) return;
    const nx = findNext(cur.blockId, cur.track.id);
    if (nx) playAt(nx.block.id, nx.track.id, fadeMs);
    else {
      engine.stop();
      setIsPlaying(false);
    }
  }, [findNext, playAt, engine]);

  // Avanço automático confiável: quando a inserção atual termina de verdade
  // (evento "ended" do arquivo), pula para a próxima — mesmo que a duração
  // não tenha sido detectada. Sem isto, faixas sem metadados de duração ficam
  // paradas no fim e o crossfade nunca dispara.
  useEffect(() => {
    engine.setOnEnded(() => {
      if (!transitioningRef.current) next();
    });
    return () => engine.setOnEnded(null);
  }, [engine, next]);

  // Passagem manual (botão "Próxima"): aplica o fade configurado em
  // "Fade nas passagens manuais" (manual p.106).
  const nextManual = useCallback(() => {
    next(manualFadeMs());
  }, [next]);

  // Gera/atualiza os arquivos de RDS (no ar + 3 próximas) sempre que a grade
  // (blocks) ou a inserção no ar mudam. No desktop grava na pasta RDS; no
  // modo web é silenciosamente ignorado.
  useEffect(() => {
    const up = upcomingFrom(currentBlockId, current?.id ?? null, 3);
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
      if (getTrackAudioUrl(cur.track.id) || cur.track.audioUrl || cur.track.freq > 0) engine.resume(cur.track.freq);
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
  const addTrackAt = useCallback((targetId: string, track: Track, place: "before" | "after" = "before") => {
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
  }, []);

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
  const reorderTrack = useCallback((sourceId: string, targetId: string, place: "before" | "after" = "before") => {
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
  }, []);

  const setTrackAudio = useCallback((blockId: string, trackId: string, url: string, duration: number) => {
    setTrackAudioUrl(trackId, url);
    setBlocks((bs) =>
      bs.map((b) =>
        b.id === blockId
          ? { ...b, items: b.items.map((t) => (t.id === trackId ? { ...t, duration: duration > 0 ? Math.round(duration) : t.duration } : t)) }
          : b,
      ),
    );
  }, []);

  const replaceBlocks = useCallback((bs: Block[]) => {
    engine.stop();
    currentRef.current = { track: null, blockId: null };
    setBlocks(bs);
    setCurrent(null);
    setCurrentBlockId(null);
    setSelectedId(null);
    setIsPlaying(false);
    setPosition(0);
  }, [engine]);

  // Relógio Operacional (manual p.137-142): define parâmetros do bloco.
  const setBlockClock = useCallback((blockId: string, clock: BlockClock) => {
    setBlocks((bs) => bs.map((b) => (b.id === blockId ? { ...b, clock: { ...b.clock, ...clock } } : b)));
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
          const dur = media > 0 ? media : (cur.duration > 0 ? cur.duration : 0);
          // Ponto de saída efetivo: o cue-out detectado (fim real do áudio,
          // sem a cauda de silêncio) quando disponível; senão, a duração total.
          const cp = cueRef.current;
          const endPoint = cp && cp.cueOut > 0 ? cp.cueOut : dur;
          // Assim que o arquivo informa a duração real, grava de volta no track
          // para que o "tempo" apareça na Programação e o avanço automático
          // funcione (músicas de pasta entram com 0:00).
          if (cur.duration <= 0 && dur > 0) {
            const rounded = Math.round(dur);
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
          // Mixagem real (crossfade): inicia a próxima inserção ANTES do fim
          // da atual, sobrepondo pelo tempo de mixagem do tipo (manual p.106).
          // Só vale para inserções com áudio real (URL).
          if (hasAudio && !transitioningRef.current) {
            const mixMs = mixTimeForTrack(cur);
            const mixSec = mixMs / 1000;
            if (mixSec > 0.05 && endPoint > 0 && pos >= endPoint - mixSec) {
              transitioningRef.current = true;
              next(mixMs);
              return;
            }
          }
          if (endPoint > 0 && pos >= endPoint) {
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
  }, [isPlaying, next, engine]);

  const value = useMemo<PlayerState>(() => ({
    blocks, current, currentBlockId, isPlaying, position,
    onAir: isPlaying, cue, selectedId,
    playAt, togglePlay, stop, next, nextManual, setCue, select, addTrack, addTrackAt, moveTrack, reorderTrack, removeTrack, replaceBlocks, setTrackAudio, setBlockClock,
    getEngine: getAudioEngine,
  }), [blocks, current, currentBlockId, isPlaying, position, cue, selectedId, playAt, togglePlay, stop, next, nextManual, select, addTrack, addTrackAt, moveTrack, reorderTrack, removeTrack, replaceBlocks, setTrackAudio, setBlockClock]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePlayer(): PlayerState {
  const c = useContext(Ctx);
  if (!c) throw new Error("usePlayer must be used within PlayerProvider");
  return c;
}