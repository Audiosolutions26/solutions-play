import { useState } from "react";
import { Zap, Volume2, Bell, Music2, Megaphone, Radio, Clock3 } from "lucide-react";
import { getAudioEngine } from "@/lib/audio-engine";

interface Pad {
  label: string;
  freq: number;
  dur: number;
  color: string;
  icon: typeof Zap;
}

const pads: Pad[] = [
  { label: "Vinheta Abertura", freq: 330, dur: 1.2, color: "#f39c12", icon: Radio },
  { label: "Vinheta ID", freq: 392, dur: 0.9, color: "#e67e22", icon: Radio },
  { label: "Vinheta PAS", freq: 440, dur: 0.7, color: "#d35400", icon: Radio },
  { label: "Aplausos", freq: 180, dur: 1.5, color: "#27ae60", icon: Volume2 },
  { label: "Risada", freq: 260, dur: 1.0, color: "#16a085", icon: Volume2 },
  { label: "Tambor", freq: 110, dur: 0.8, color: "#2980b9", icon: Music2 },
  { label: "Sino", freq: 880, dur: 1.4, color: "#8e44ad", icon: Bell },
  { label: "Buzina", freq: 147, dur: 0.6, color: "#c0392b", icon: Megaphone },
  { label: "Hora Certa", freq: 523, dur: 1.0, color: "#2c3e50", icon: Clock3 },
  { label: "Spot Rápido", freq: 165, dur: 1.1, color: "#7f8c8d", icon: Megaphone },
  { label: "Stinger", freq: 660, dur: 0.5, color: "#e84393", icon: Zap },
  { label: "Sweep", freq: 220, dur: 1.3, color: "#0984e3", icon: Zap },
];

export function QuickStartPanel() {
  const [active, setActive] = useState<number | null>(null);

  const fire = (i: number, p: Pad) => {
    getAudioEngine().fire(p.freq, p.dur);
    setActive(i);
    window.setTimeout(() => setActive((cur) => (cur === i ? null : cur)), p.dur * 1000);
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 bg-pl-toolbar px-2 py-1 text-[12px] font-semibold text-white">
        <Zap className="h-4 w-4" /> QuickStart — disparo instantâneo
      </div>
      <div className="pl-scroll flex-1 overflow-y-auto bg-pl-row p-3">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {pads.map((p, i) => {
            const Icon = p.icon;
            const isActive = active === i;
            return (
              <button
                key={p.label}
                onClick={() => fire(i, p)}
                className={`group relative flex aspect-square flex-col items-center justify-center gap-2 rounded-lg border-b-4 text-center text-white shadow-md transition active:translate-y-0.5 ${
                  isActive ? "scale-[0.97] brightness-125" : "hover:brightness-110"
                }`}
                style={{ backgroundColor: p.color, borderBottomColor: "rgba(0,0,0,0.35)" }}
              >
                <Icon className="h-7 w-7 drop-shadow" />
                <span className="px-1 text-[12px] font-bold leading-tight drop-shadow">{p.label}</span>
                <span className="absolute right-1.5 top-1.5 rounded bg-black/25 px-1 text-[10px] font-mono">F{i + 1}</span>
                {isActive && (
                  <span className="absolute inset-x-2 bottom-2 h-1 overflow-hidden rounded bg-black/20">
                    <span className="block h-full w-full origin-left animate-[ql_var(--d)_linear] bg-white/80" style={{ ["--d" as string]: `${p.dur}s` }} />
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <p className="mt-4 text-center text-[11px] text-pl-text/60">
          Clique em um pad para disparar a vinheta/efeito por cima do ar. Modo demonstração.
        </p>
      </div>
    </div>
  );
}