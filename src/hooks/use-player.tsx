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
import { initialBlocks, type Block, type Track, cloneTrack } from "@/lib/play-data";

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
  removeTrack: (blockId: string, trackId: string) => void;
  replaceBlocks: (blocks: Block[]) => void;
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
    if (track.freq > 0) engine.play(track.freq, 0);
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
      if (cur.track.freq > 0) engine.resume(cur.track.freq);
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
    setBlocks((bs) => bs.map((b) => (b.id === blockId ? { ...b, items: [...b.items, cloneTrack(track)] } : b)));
  }, []);

  const removeTrack = useCallback((blockId: string, trackId: string) => {
    setBlocks((bs) => bs.map((b) => (b.id === blockId ? { ...b, items: b.items.filter((t) => t.id !== trackId) } : b)));
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
          const pos = cur.freq > 0 ? engine.position() : position + 0.2;
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
    playAt, togglePlay, stop, next, setVolume, setCue, select, addTrack, removeTrack, replaceBlocks,
    getEngine: getAudioEngine,
  }), [blocks, current, currentBlockId, isPlaying, position, volume, cue, selectedId, playAt, togglePlay, stop, next, setVolume, select, addTrack, removeTrack, replaceBlocks]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePlayer(): PlayerState {
  const c = useContext(Ctx);
  if (!c) throw new Error("usePlayer must be used within PlayerProvider");
  return c;
}