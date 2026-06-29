import { useEffect, useRef } from "react";
import { usePlayer } from "@/hooks/use-player";

export function Waveform() {
  const { getEngine, isPlaying } = usePlayer();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const engine = getEngine();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const buf = new Uint8Array(new ArrayBuffer(1024));
    let raf = 0;
    const resize = () => {
      const r = canvas.getBoundingClientRect();
      canvas.width = r.width;
      canvas.height = r.height;
    };
    resize();
    window.addEventListener("resize", resize);
    const draw = () => {
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = "#1b2733";
      ctx.fillRect(0, 0, w, h);
      // center line
      ctx.strokeStyle = "rgba(255,255,255,0.08)";
      ctx.beginPath();
      ctx.moveTo(0, h / 2);
      ctx.lineTo(w, h / 2);
      ctx.stroke();
      if (isPlaying) {
        engine.getWaveform(buf);
        ctx.strokeStyle = "var(--color-pl-wave)";
        ctx.fillStyle = "rgba(232,130,30,0.35)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        const step = buf.length / w;
        for (let x = 0; x < w; x++) {
          const v = (buf[Math.floor(x * step)] - 128) / 128;
          const y = h / 2 + v * (h / 2) * 0.95;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [getEngine, isPlaying]);

  return <canvas ref={canvasRef} className="h-full w-full" />;
}