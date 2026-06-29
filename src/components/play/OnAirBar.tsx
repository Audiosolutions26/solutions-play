import { usePlayer } from "@/hooks/use-player";
import { Waveform } from "./Waveform";

export function OnAirBar() {
  const { onAir, current } = usePlayer();
  const text = current
    ? `${current.title}${current.artist ? " — " + current.artist : ""}`
    : "Sem áudio no ar";
  return (
    <div className="flex items-stretch border-y border-pl-toolbar-dark bg-[#1b2733]">
      <div
        className={`flex w-28 items-center justify-center text-lg font-extrabold tracking-widest ${
          onAir ? "bg-pl-banner text-white" : "bg-zinc-600 text-white/70"
        }`}
      >
        {onAir ? "NO AR" : "PARADO"}
      </div>
      <div className="relative flex-1 overflow-hidden">
        <div className="absolute inset-0">
          <Waveform />
        </div>
        <div className="pointer-events-none absolute inset-0 flex items-center overflow-hidden">
          <span className="pl-marquee whitespace-nowrap px-4 text-sm font-semibold text-pl-wave drop-shadow">
            {text}
          </span>
        </div>
      </div>
    </div>
  );
}