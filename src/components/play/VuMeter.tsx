import { useEffect, useRef } from "react";
import { usePlayer } from "@/hooks/use-player";

export function VuMeter({ label }: { label: string }) {
  const { getEngine, isPlaying } = usePlayer();
  const ref = useRef<HTMLDivElement>(null);
  const levelRef = useRef(0);

  useEffect(() => {
    const engine = getEngine();
    let raf = 0;
    const segs = 24;
    const draw = () => {
      const target = isPlaying ? engine.getLevel() : 0;
      levelRef.current += (target - levelRef.current) * 0.35;
      const lit = Math.round(levelRef.current * segs);
      const el = ref.current;
      if (el) {
        const children = el.children;
        for (let i = 0; i < children.length; i++) {
          const on = i < lit;
          const c = children[i] as HTMLDivElement;
          let color = "var(--color-pl-vu)";
          if (i >= segs * 0.85) color = "var(--color-pl-vu-peak)";
          else if (i >= segs * 0.65) color = "var(--color-pl-vu-warn)";
          c.style.background = on ? color : "rgba(0,0,0,0.22)";
          c.style.boxShadow = on ? `0 0 3px ${color}` : "none";
        }
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [getEngine, isPlaying]);

  return (
    <div className="flex flex-col items-center gap-0.5">
      <div ref={ref} className="flex h-3 items-center gap-px rounded-sm bg-black/40 px-1 py-0.5">
        {Array.from({ length: 24 }).map((_, i) => (
          <div key={i} className="h-2 w-1 rounded-[1px]" />
        ))}
      </div>
      <span className="text-[9px] font-semibold leading-none text-white/90">{label}</span>
    </div>
  );
}