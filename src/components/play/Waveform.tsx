import { useEffect, useRef } from "react";
import { usePlayer } from "@/hooks/use-player";
import { getMarkers, markerPositionSec } from "@/lib/play-markers";

export function Waveform({ zoom = 1 }: { zoom?: number }) {
  const { getEngine, isPlaying, current } = usePlayer();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;

  useEffect(() => {
    const engine = getEngine();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
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
      
      // Fundo escuro
      ctx.fillStyle = "#050505";
      ctx.fillRect(0, 0, w, h);
      
      const pos = engine.position();
      const duration = engine.mediaDuration();
      const z = zoomRef.current;
      
      if (duration > 0) {
        const pixelsPerSecond = (w * z) / duration;
        const offset = w * 0.1; // Margem de 10% para o cursor

        // 1. Desenha Grid de tempo e rédea
        ctx.strokeStyle = "rgba(255,255,255,0.15)";
        ctx.fillStyle = "rgba(255,255,255,0.4)";
        ctx.font = "9px monospace";
        
        for (let s = 0; s <= duration; s += 1) {
          const x = (s - pos) * pixelsPerSecond + offset;
          if (x >= 0 && x <= w) {
            if (s % 5 === 0) {
              ctx.beginPath();
              ctx.moveTo(x, 0);
              ctx.lineTo(x, h);
              ctx.stroke();
              ctx.fillText(`${s}s`, x + 2, 10);
            } else if (z > 2) {
              ctx.beginPath();
              ctx.moveTo(x, h - 5);
              ctx.lineTo(x, h);
              ctx.stroke();
            }
          }
        }

        // 2. Desenha Waveform (Real-time Analyser)
        if (isPlaying) {
          const buf = new Uint8Array(1024);
          engine.getWaveform(buf);
          ctx.strokeStyle = "#f08a24";
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          
          const visibleSamples = Math.floor(buf.length / z);
          const step = visibleSamples / w;
          
          for (let x = 0; x < w; x++) {
            const sampleIdx = Math.floor(x * step);
            const v = (buf[sampleIdx] - 128) / 128;
            const y = h / 2 + v * (h / 2) * 0.8;
            if (x === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.stroke();
        }

        // 3. Desenha Linha Central
        ctx.strokeStyle = "rgba(255,255,255,0.1)";
        ctx.beginPath();
        ctx.moveTo(0, h / 2);
        ctx.lineTo(w, h / 2);
        ctx.stroke();

        // 4. Desenha MARCAÇÕES (Markers) - CUE-IN, CUE-OUT, etc.
        if (current) {
          const markers = getMarkers(current.id);
          markers.forEach(marker => {
            const markerPos = markerPositionSec(marker, duration);
            const x = (markerPos - pos) * pixelsPerSecond + offset;
            
            if (x >= 0 && x <= w) {
              // Estilo por tipo de marcador
              let color = "#ffffff";
              let label = marker.kind as string;
              
              switch(marker.kind as string) {
                case "startPoint": color = "#2ecc71"; label = "CUE-IN"; break;
                case "endPoint": color = "#e74c3c"; label = "CUE-OUT"; break;
                case "nextEntry": color = "#f1c40f"; label = "MIX-OUT"; break;
                case "introEnd": color = "#3498db"; label = "INTRO"; break;
                case "mixIn": color = "#0ea5e9"; label = "MIX-IN"; break;
              }

              ctx.strokeStyle = color;
              ctx.setLineDash([4, 2]);
              ctx.beginPath();
              ctx.moveTo(x, 0);
              ctx.lineTo(x, h);
              ctx.stroke();
              ctx.setLineDash([]);

              // Rótulo do marcador
              ctx.fillStyle = color;
              ctx.font = "bold 10px sans-serif";
              ctx.fillText(label.toUpperCase(), x + 4, h - 10);
            }
          });
        }

        // 5. Cursor (Posição atual)
        ctx.strokeStyle = "#ff0000";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(offset, 0);
        ctx.lineTo(offset, h);
        ctx.stroke();
      }

      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [getEngine, isPlaying, current]);

  return <canvas ref={canvasRef} className="h-full w-full cursor-crosshair" />;
}

