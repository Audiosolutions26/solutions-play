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
import { getTrackAudioUrl, setTrackAudioUrl } from "@/lib/play-audio-files";

interface PlayerState {
  blocks: Block[];
  current: Track | null;
  currentBlockId: string | null;
  isPlaying: boolean;
  position: number;
  volume: number;
  onAir: boolean;
  cue: boolean;
  selectedId: string | null;
  playAt: (blockId: string, trackId: string) => void;
  togglePlay: () => void;
  stop: () => void;
  next: () => void;
  setVolume: (v: number) => void;
  setCue: (v: boolean) => void;
  select: (id: string) => void;
  addTrack: (blockId: string, track: Track) => void;
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
  const [volume, setVolumeState] = useState(0.5);
  const [cue, setCue] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const blocksRef = useRef(blocks);
  blocksRef.current = blocks;
  const currentRef = useRef<{ track: Track | null; blockId: string | null }>({ track: null, blockId: null });

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

  const playAt = useCallback((blockId: string, trackId: string) => {
    const block = blocksRef.current.find((b) => b.id === blockId);
    const track = block?.items.find((t) => t.id === trackId);
    if (!track) return;
    currentRef.current = { track, blockId };
    setCurrent(track);
    setCurrentBlockId(blockId);
    setSelectedId(trackId);
    setPosition(0);
    const url = getTrackAudioUrl(trackId) || track.audioUrl;
    if (url) engine.playUrl(url, 0);
    else if (track.freq > 0) engine.play(track.freq, 0);
    else engine.stop();
    setIsPlaying(true);
  }, [engine]);

  const next = useCallback(() => {
    const cur = currentRef.current;
    if (!cur.track || !cur.blockId) return;
    const nx = findNext(cur.blockId, cur.track.id);
    if (nx) playAt(nx.block.id, nx.track.id);
    else {
      engine.stop();
      setIsPlaying(false);
    }
  }, [findNext, playAt, engine]);

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

  const setVolume = useCallback((v: number) => {
    setVolumeState(v);
    engine.setVolume(v);
  }, [engine]);

  const select = useCallback((id: string) => setSelectedId(id), []);

  const addTrack = useCallback((blockId: string, track: Track) => {
    const block = blocksRef.current.find((b) => b.id === blockId);
    if (block?.clock?.locked) return; // bloco LOCKED (manual p.141)
    const t = { ...cloneTrack(track), origin: "manual" as const, moved: false };
    setBlocks((bs) => bs.map((b) => (b.id === blockId ? { ...b, items: [...b.items, t] } : b)));
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
          if (pos >= cur.duration) {
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
    blocks, current, currentBlockId, isPlaying, position, volume,
    onAir: isPlaying, cue, selectedId,
    playAt, togglePlay, stop, next, setVolume, setCue, select, addTrack, moveTrack, reorderTrack, removeTrack, replaceBlocks, setTrackAudio, setBlockClock,
    getEngine: getAudioEngine,
  }), [blocks, current, currentBlockId, isPlaying, position, volume, cue, selectedId, playAt, togglePlay, stop, next, setVolume, select, addTrack, moveTrack, reorderTrack, removeTrack, replaceBlocks, setTrackAudio, setBlockClock]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePlayer(): PlayerState {
  const c = useContext(Ctx);
  if (!c) throw new Error("usePlayer must be used within PlayerProvider");
  return c;
}