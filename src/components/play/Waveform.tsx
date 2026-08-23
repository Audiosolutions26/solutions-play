import { useEffect, useRef } from "react";
import { usePlayer } from "@/hooks/use-player";

export function Waveform({ zoom = 1 }: { zoom?: number }) {
  const { getEngine, isPlaying } = usePlayer();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;

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
      ctx.fillStyle = "#050505";
      ctx.fillRect(0, 0, w, h);
      
      const engine = getEngine();
      const pos = engine.position();
      const duration = engine.mediaDuration();
      
      // Desenha grid de tempo (segundos)
      if (duration > 0) {
        ctx.strokeStyle = "rgba(255,255,255,0.15)";
        ctx.fillStyle = "rgba(255,255,255,0.4)";
        ctx.font = "8px monospace";
        const z = zoomRef.current;
        const pixelsPerSecond = (w * z) / duration;
        const startSec = Math.floor(pos);
        const visibleRange = duration / z;
        
        for (let s = 0; s <= duration; s += 1) {
          const x = (s - pos) * pixelsPerSecond + (w * 0.1); // 10% de margem esquerda
          if (x >= 0 && x <= w) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, h);
            ctx.stroke();
            if (s % 5 === 0) {
              ctx.fillText(`${s}s`, x + 2, 8);
            }
          }
        }
      }

      ctx.strokeStyle = "rgba(255,255,255,0.07)";
      ctx.beginPath();
      ctx.moveTo(0, h / 2);
      ctx.lineTo(w, h / 2);
      ctx.stroke();

      if (isPlaying) {
        engine.getWaveform(buf);
        ctx.strokeStyle = "#f08a24";
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        const z = zoomRef.current;
        const visible = Math.max(16, Math.floor(buf.length / z));
        const step = visible / w;
        for (let x = 0; x < w; x++) {
          const v = (buf[Math.floor(x * step)] - 128) / 128;
          const y = h / 2 + Math.max(-1, Math.min(1, v * z)) * (h / 2) * 0.95;
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
