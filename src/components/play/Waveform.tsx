import { useEffect, useRef, useState, useCallback } from "react";
import { usePlayer } from "@/hooks/use-player";
import { MARKER_DEFS, markerPositionSec, type Marker } from "@/lib/play-markers";
import { useTrackMarkers } from "@/hooks/use-track-markers";

export function Waveform({ zoom = 1 }: { zoom?: number }) {
  const { getEngine, isPlaying, current, jumpToMarker } = usePlayer();
  const { markers } = useTrackMarkers(current?.id);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [selectedMarker, setSelectedMarker] = useState<Marker | null>(null);
  const [draggedMarkerId, setDraggedMarkerId] = useState<string | null>(null);
  const [visibleKinds, setVisibleKinds] = useState<Set<string>>(new Set(MARKER_DEFS.map(d => d.kind)));
  const { updateMarkerPosition } = useTrackMarkers(current?.id);
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
          [...markers].sort((a, b) => markerPositionSec(a, duration) - markerPositionSec(b, duration)).forEach(marker => {
            if (!visibleKinds.has(marker.kind)) return;
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
                case "fadeInEnd": color = "#84cc16"; label = "FADE-IN"; break;
                case "fadeOutStart": color = "#f59e0b"; label = "FADE-OUT"; break;
                case "locStart": color = "#a855f7"; label = "LOC-START"; break;
                case "refraoStart": color = "#ec4899"; label = "REF-START"; break;
                case "refraoEnd": color = "#db2777"; label = "REF-END"; break;
                case "carimbo": color = "#eab308"; label = "STAMP"; break;
              }

              ctx.strokeStyle = color;
              ctx.setLineDash([4, 2]);
              ctx.beginPath();
              ctx.moveTo(x, 0);
              ctx.lineTo(x, h);
              ctx.stroke();
              
              // Se o marcador estiver fora dos limites do áudio, destaca em vermelho (validação)
              if (markerPos < 0 || markerPos > duration) {
                ctx.strokeStyle = "#ff0000";
                ctx.lineWidth = 3;
                ctx.setLineDash([]);
                ctx.stroke();
              }
              
              ctx.setLineDash([]);

              // Rótulo do marcador com fundo para visibilidade
              const labelText = label.toUpperCase();
              const labelWidth = ctx.measureText(labelText).width;
              ctx.fillStyle = "rgba(0,0,0,0.6)";
              ctx.fillRect(x + 2, h - 22, labelWidth + 4, 14);
              
              ctx.fillStyle = color;
              ctx.font = "bold 9px ui-mono, monospace";
              ctx.fillText(labelText, x + 4, h - 12);
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
  }, [getEngine, isPlaying, current, markers, visibleKinds]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !current) return;
    const engine = getEngine();
    const duration = engine.mediaDuration();
    if (duration <= 0) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const w = rect.width;
    const z = zoom;
    const pos = engine.position();
    const pixelsPerSecond = (w * z) / duration;
    const offset = w * 0.1;

    // Converte X do clique para tempo
    const clickTime = (x - offset) / pixelsPerSecond + pos;

    // Procura o marcador mais próximo do clique (threshold de 5 pixels)
    const thresholdSec = 5 / pixelsPerSecond;
    const closest = markers.find(m => {
      const mPos = markerPositionSec(m, duration);
      return Math.abs(mPos - clickTime) < thresholdSec;
    });

    if (closest) {
      setSelectedMarker(closest);
    } else {
      setSelectedMarker(null);
    }
  };

  // Atalhos de teclado para navegação entre marcadores
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.altKey || e.shiftKey) return;
      
      switch (e.key.toLowerCase()) {
        case "[": jumpToMarker("startPoint"); break;
        case "]": jumpToMarker("endPoint"); break;
        case "i": jumpToMarker("introEnd"); break;
        case "o": jumpToMarker("fadeOutStart"); break;
        case "r": jumpToMarker("refraoStart"); break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [jumpToMarker]);

  return (
    <div className="flex h-full w-full">
      <div className="relative flex-1 overflow-hidden">
        <canvas 
          ref={canvasRef} 
          onClick={handleCanvasClick}
          className="h-full w-full cursor-crosshair" 
        />
        
        {/* Filtros de marcadores */}
        <div className="absolute left-2 bottom-2 flex flex-wrap gap-1">
          {MARKER_DEFS.filter(d => markers.some(m => m.kind === d.kind)).map(def => (
            <button
              key={def.kind}
              onClick={() => {
                const next = new Set(visibleKinds);
                if (next.has(def.kind)) next.delete(def.kind);
                else next.add(def.kind);
                setVisibleKinds(next);
              }}
              className={`rounded px-1.5 py-0.5 text-[8px] font-bold uppercase transition-colors ${
                visibleKinds.has(def.kind) ? "bg-white/20 text-white" : "bg-black/40 text-white/40"
              }`}
              style={{ borderBottom: `2px solid ${visibleKinds.has(def.kind) ? def.color : 'transparent'}` }}
            >
              {def.label}
            </button>
          ))}
        </div>
      </div>

      {/* Painel lateral de detalhes do marcador */}
      {selectedMarker && (
        <div className="w-48 shrink-0 border-l border-white/10 bg-black/40 p-2 text-[10px]">
          <div className="mb-2 font-bold uppercase text-white/60">Detalhes do Marcador</div>
          <div className="flex flex-col gap-2">
            <div>
              <div className="text-white/40 uppercase">Tipo</div>
              <div className="font-bold text-white">{MARKER_DEFS.find(d => d.kind === selectedMarker.kind)?.label || selectedMarker.kind}</div>
            </div>
            <div>
              <div className="text-white/40 uppercase">Tempo</div>
              <div className="font-mono text-[12px] font-bold text-[#fffa65]">
                {markerPositionSec(selectedMarker, getEngine().mediaDuration() || current?.duration || 0).toFixed(2)}s
              </div>
            </div>
            {selectedMarker.note && (
              <div>
                <div className="text-white/40 uppercase">Nota</div>
                <div className="text-white">{selectedMarker.note}</div>
              </div>
            )}
            <button
              onClick={() => setSelectedMarker(null)}
              className="mt-2 rounded bg-white/10 py-1 hover:bg-white/20"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

