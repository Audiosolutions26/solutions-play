import { useEffect, useState } from "react";

export function Clock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  const hh = now ? now.toLocaleTimeString("pt-BR", { hour12: false }) : "--:--:--";
  return (
    <div className="flex items-center gap-1 rounded bg-black/40 px-2 py-0.5 font-mono text-[15px] font-bold tracking-wider text-pl-vu shadow-inner">
      {hh}
    </div>
  );
}