import { useEffect, useRef } from "react";
import { usePlayer } from "@/hooks/use-player";
import { useVuMode } from "@/lib/play-vu";

const SEGS = 24;

// Faixa angular do ponteiro analógico (graus a partir da vertical).
const ANG_MIN = -52;
const ANG_MAX = 52;

export function VuMeter({ label }: { label: string }) {
  const { getEngine, isPlaying } = usePlayer();
  const mode = useVuMode();
  const barsRef = useRef<HTMLDivElement>(null);
  const needleRef = useRef<SVGGElement>(null);
  const levelRef = useRef(0);

  useEffect(() => {
    const engine = getEngine();
    let raf = 0;
    const draw = () => {
      const target = isPlaying ? engine.getLevel() : 0;
      levelRef.current += (target - levelRef.current) * 0.35;
      const lvl = Math.max(0, Math.min(1, levelRef.current));

      // --- Digital (barras de LED) ---
      const bars = barsRef.current;
      if (bars) {
        const lit = Math.round(lvl * SEGS);
        const children = bars.children;
        for (let i = 0; i < children.length; i++) {
          const on = i < lit;
          const c = children[i] as HTMLDivElement;
          let color = "var(--color-pl-vu)";
          if (i >= SEGS * 0.85) color = "var(--color-pl-vu-peak)";
          else if (i >= SEGS * 0.65) color = "var(--color-pl-vu-warn)";
          c.style.background = on ? color : "rgba(0,0,0,0.22)";
          c.style.boxShadow = on ? `0 0 3px ${color}` : "none";
        }
      }

      // --- Analógico (ponteiro) ---
      const needle = needleRef.current;
      if (needle) {
        const ang = ANG_MIN + lvl * (ANG_MAX - ANG_MIN);
        needle.setAttribute("transform", `rotate(${ang.toFixed(2)} 50 56)`);
      }

      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [getEngine, isPlaying]);

  if (mode === "analogico") {
    return (
      <div className="flex flex-col items-center gap-0.5">
        <AnalogFace needleRef={needleRef} />
        <span className="text-[9px] font-semibold leading-none text-white/90">{label}</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-0.5">
      <div ref={barsRef} className="flex h-3 items-center gap-px rounded-sm bg-black/40 px-1 py-0.5">
        {Array.from({ length: SEGS }).map((_, i) => (
          <div key={i} className="h-2 w-1 rounded-[1px]" />
        ))}
      </div>
      <span className="text-[9px] font-semibold leading-none text-white/90">{label}</span>
    </div>
  );
}

// Mostrador analógico clássico: face creme, arco graduado, zona vermelha à
// direita, ponteiro e legenda "VU".
function AnalogFace({ needleRef }: { needleRef: React.RefObject<SVGGElement | null> }) {
  const pivotX = 50;
  const pivotY = 56;
  const rTick = 40;
  const tick = (frac: number, len: number) => {
    const ang = (ANG_MIN + frac * (ANG_MAX - ANG_MIN)) * (Math.PI / 180);
    const x1 = pivotX + (rTick - len) * Math.sin(ang);
    const y1 = pivotY - (rTick - len) * Math.cos(ang);
    const x2 = pivotX + rTick * Math.sin(ang);
    const y2 = pivotY - rTick * Math.cos(ang);
    return { x1, y1, x2, y2 };
  };
  const ticks = Array.from({ length: 11 }, (_, i) => i / 10);

  return (
    <svg viewBox="0 0 100 60" className="h-9 w-[58px] rounded-sm" role="img" aria-label="VU analógico">
      <defs>
        <linearGradient id="vuFace" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fbf3d8" />
          <stop offset="1" stopColor="#e7d3a1" />
        </linearGradient>
      </defs>
      <rect x="1" y="1" width="98" height="58" rx="4" fill="url(#vuFace)" stroke="#000" strokeOpacity="0.55" />
      {/* arco da escala */}
      <path
        d={`M ${pivotX + rTick * Math.sin((ANG_MIN * Math.PI) / 180)} ${pivotY - rTick * Math.cos((ANG_MIN * Math.PI) / 180)}
            A ${rTick} ${rTick} 0 0 1 ${pivotX + rTick * Math.sin((ANG_MAX * Math.PI) / 180)} ${pivotY - rTick * Math.cos((ANG_MAX * Math.PI) / 180)}`}
        fill="none"
        stroke="#3a3322"
        strokeWidth="0.8"
      />
      {ticks.map((f, i) => {
        const t = tick(f, f >= 0.8 ? 7 : 5);
        const red = f >= 0.8;
        return (
          <line key={i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} stroke={red ? "#c0241c" : "#2a2418"} strokeWidth={red ? 1.4 : 0.9} />
        );
      })}
      {/* zona vermelha em arco */}
      <path
        d={`M ${pivotX + (rTick + 1) * Math.sin((ANG_MIN + 0.8 * (ANG_MAX - ANG_MIN)) * Math.PI / 180)} ${pivotY - (rTick + 1) * Math.cos((ANG_MIN + 0.8 * (ANG_MAX - ANG_MIN)) * Math.PI / 180)}
            A ${rTick + 1} ${rTick + 1} 0 0 1 ${pivotX + (rTick + 1) * Math.sin((ANG_MAX) * Math.PI / 180)} ${pivotY - (rTick + 1) * Math.cos((ANG_MAX) * Math.PI / 180)}`}
        fill="none"
        stroke="#c0241c"
        strokeWidth="1.6"
      />
      <text x="50" y="50" textAnchor="middle" fontSize="8" fontWeight="700" fill="#2a2418" fontFamily="serif">VU</text>
      <text x="14" y="40" textAnchor="middle" fontSize="6" fill="#2a2418">-20</text>
      <text x="86" y="40" textAnchor="middle" fontSize="6" fill="#c0241c">+3</text>
      {/* ponteiro */}
      <g ref={needleRef} transform={`rotate(${ANG_MIN} 50 56)`}>
        <line x1="50" y1="56" x2="50" y2="14" stroke="#111" strokeWidth="1.3" strokeLinecap="round" />
      </g>
      <circle cx="50" cy="56" r="3" fill="#2a2418" />
    </svg>
  );
}
