import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { usePlayer } from "@/hooks/use-player";
import {
  MARKER_DEFS,
  markerPositionSec,
  pseudoWave,
  type Marker,
  validateMarkers,
} from "@/lib/play-markers";
import { useTrackMarkers } from "@/hooks/use-track-markers";
import { getCachedCuePoints } from "@/lib/play-cuepoints";
import { getTrackAudioUrl } from "@/lib/play-audio-files";
import { getEffectiveMarkers } from "@/lib/play-effective-markers";
import { useConfig } from "@/hooks/use-config";
import { Activity, Zap } from "lucide-react";

export function Waveform({ zoom = 1 }: { zoom?: number }) {
  const { getEngine, isPlaying, current, jumpToMarker } = usePlayer();
  const { markers, undo, redo, canUndo, canRedo } = useTrackMarkers(current?.id);
  const { config } = useConfig();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [selectedMarker, setSelectedMarker] = useState<Marker | null>(null);
  const [draggedMarkerId, setDraggedMarkerId] = useState<string | null>(null);
  const [visibleKinds, setVisibleKinds] = useState<Set<string>>(
    new Set(MARKER_DEFS.map((d) => d.kind)),
  );
  const { updateMarkerPosition } = useTrackMarkers(current?.id);
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;
  const cuePoints = useMemo(() => {
    if (!current) return undefined;
    const url = getTrackAudioUrl(current.id) || current.audioUrl;
    return url ? getCachedCuePoints(url) : undefined;
  }, [current]);
  const fallbackPeaks = useMemo(
    () => (current ? Float32Array.from(pseudoWave(current.duration * 7 + 1)) : undefined),
    [current],
  );
  const effectiveMarkers = useMemo(() => {
    if (!current) return [];
    const duration = getEngine().mediaDuration() || cuePoints?.duration || current.duration || 0;
    return getEffectiveMarkers(current, markers, duration, {
      cue: cuePoints,
      peaks: fallbackPeaks,
      config,
    });
  }, [config, current, cuePoints, fallbackPeaks, getEngine, markers]);

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

        // 2b. Rampas de FADE — verde na entrada, vermelha na saída.
        {
          const url = current ? getTrackAudioUrl(current.id) || current.audioUrl : null;
          const cue = url ? getCachedCuePoints(url) : null;
          const mk = (kind: string) => {
            const m = effectiveMarkers.find((x) => x.kind === kind);
            return m ? markerPositionSec(m, duration) : null;
          };
          const cueIn = mk("startPoint") ?? (cue && cue.cueIn > 0 ? cue.cueIn : 0);
          const cueOut = mk("endPoint") ?? (cue && cue.cueOut > 0 ? cue.cueOut : duration);
          const defFade = 0.8;
          const fadeInEnd = Math.min(mk("fadeInEnd") ?? cueIn + defFade, cueOut);
          const fadeOutStart = Math.max(mk("fadeOutStart") ?? cueOut - defFade, cueIn);
          const xOf = (s: number) => (s - pos) * pixelsPerSecond + offset;

          const ramp = (from: number, to: number, rising: boolean, rgb: string) => {
            if (!(to > from)) return;
            const x1 = xOf(from);
            const x2 = xOf(to);
            if (x2 < 0 || x1 > w) return;
            const yTop = 4;
            const yBottom = h - 4;
            ctx.beginPath();
            ctx.moveTo(x1, rising ? yBottom : yTop);
            ctx.lineTo(x2, rising ? yTop : yBottom);
            ctx.lineTo(x2, yBottom);
            ctx.lineTo(x1, yBottom);
            ctx.closePath();
            ctx.fillStyle = `rgba(${rgb},0.14)`;
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(x1, rising ? yBottom : yTop);
            ctx.lineTo(x2, rising ? yTop : yBottom);
            ctx.strokeStyle = `rgb(${rgb})`;
            ctx.lineWidth = 3;
            ctx.lineCap = "round";
            ctx.stroke();
            ctx.lineWidth = 1;
          };

          ramp(cueIn, fadeInEnd, true, "34,197,94");
          ramp(fadeOutStart, cueOut, false, "239,68,68");
        }

        // 3. Desenha Linha Central
        ctx.strokeStyle = "rgba(255,255,255,0.1)";
        ctx.beginPath();
        ctx.moveTo(0, h / 2);
        ctx.lineTo(w, h / 2);
        ctx.stroke();

        // 4. Desenha MARCAÇÕES (Markers) - CUE-IN, CUE-OUT, etc.
        if (current) {
          [...effectiveMarkers]
            .sort((a, b) => markerPositionSec(a, duration) - markerPositionSec(b, duration))
            .forEach((marker) => {
              if (!visibleKinds.has(marker.kind)) return;
              const markerPos = markerPositionSec(marker, duration);
              const x = (markerPos - pos) * pixelsPerSecond + offset;

              if (x >= 0 && x <= w) {
                // Estilo por tipo de marcador
                let color = "#ffffff";
                let label = marker.kind as string;

                switch (marker.kind as string) {
                  case "startPoint":
                    color = "#2ecc71";
                    label = "CUE-IN";
                    break;
                  case "endPoint":
                    color = "#e74c3c";
                    label = "CUE-OUT";
                    break;
                  case "nextEntry":
                    color = "#f1c40f";
                    label = "MIX-OUT";
                    break;
                  case "introEnd":
                    color = "#3498db";
                    label = "INTRO";
                    break;
                  case "mixIn":
                    color = "#0ea5e9";
                    label = "MIX-IN";
                    break;
                  case "fadeInEnd":
                    color = "#84cc16";
                    label = "FADE-IN";
                    break;
                  case "fadeOutStart":
                    color = "#f59e0b";
                    label = "FADE-OUT";
                    break;
                  case "locStart":
                    color = "#a855f7";
                    label = "LOC-START";
                    break;
                  case "refraoStart":
                    color = "#ec4899";
                    label = "REF-START";
                    break;
                  case "refraoEnd":
                    color = "#db2777";
                    label = "REF-END";
                    break;
                  case "carimbo":
                    color = "#eab308";
                    label = "STAMP";
                    break;
                }

                const isDragged = draggedMarkerId === marker.id;
                const isInvalid = markerPos < 0 || markerPos > duration;

                ctx.strokeStyle = isInvalid ? "#ff0000" : color;
                ctx.lineWidth = isDragged ? 3 : isInvalid ? 2 : 1;
                ctx.setLineDash(isDragged ? [] : [4, 2]);

                // Efeito de brilho se inválido ou arrastando
                if (isInvalid || isDragged) {
                  ctx.shadowBlur = 10;
                  ctx.shadowColor = isInvalid ? "#ff0000" : color;
                }

                ctx.beginPath();
                ctx.moveTo(x, 0);
                ctx.lineTo(x, h);
                ctx.stroke();

                ctx.shadowBlur = 0;
                ctx.setLineDash([]);
                ctx.lineWidth = 1;

                // Rótulo do marcador
                const labelText = label.toUpperCase();
                const labelWidth = ctx.measureText(labelText).width;

                // Se inválido, mostra o offset
                let infoText = labelText;
                if (isInvalid && duration > 0) {
                  const offset = markerPos > duration ? markerPos - duration : markerPos;
                  infoText += ` (${offset > 0 ? "+" : ""}${offset.toFixed(2)}s)`;
                } else if (isDragged) {
                  infoText += ` [${markerPos.toFixed(2)}s]`;
                }

                const infoWidth = ctx.measureText(infoText).width;
                ctx.fillStyle = isInvalid ? "rgba(220, 38, 38, 0.9)" : "rgba(0,0,0,0.6)";
                ctx.fillRect(x + 2, h - 22, infoWidth + 6, 14);

                ctx.fillStyle = isInvalid ? "#ffffff" : color;
                ctx.font = "bold 9px ui-mono, monospace";
                ctx.fillText(infoText, x + 5, h - 12);
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
  }, [config, effectiveMarkers, getEngine, isPlaying, current, visibleKinds, draggedMarkerId]);

  const validation = useMemo(() => {
    const duration = getEngine().mediaDuration();
    if (duration <= 0) return { valid: true, errors: [] };
    return validateMarkers(markers, duration);
  }, [markers, getEngine]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
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

    // Procura o marcador mais próximo do clique (threshold aumentado para 15 pixels para facilitar drag)
    const thresholdSec = 15 / pixelsPerSecond;
    const closest = markers.find((m) => {
      const mPos = markerPositionSec(m, duration);
      return Math.abs(mPos - clickTime) < thresholdSec;
    });

    if (closest) {
      setDraggedMarkerId(closest.id || null);
      setSelectedMarker(closest);
    } else {
      setSelectedMarker(null);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!draggedMarkerId || !current) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
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

    // Converte X do mouse para tempo
    let newTime = (x - offset) / pixelsPerSecond + pos;

    // Snapping (0.1s)
    newTime = Math.round(newTime * 10) / 10;

    // Limites (0 a duração + uma margem pequena para visualização de erro se desejado)
    // Deixamos passar um pouco para o usuário ver a validação de erro
    newTime = Math.max(-2, Math.min(duration + 2, newTime));

    updateMarkerPosition(draggedMarkerId, newTime);
  };

  const handleMouseUp = () => {
    setDraggedMarkerId(null);
  };

  // Atalhos de teclado para navegação e undo/redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Atalhos de marcadores
      if (!e.ctrlKey && !e.altKey && !e.shiftKey) {
        switch (e.key.toLowerCase()) {
          case "[":
            jumpToMarker("startPoint");
            break;
          case "]":
            jumpToMarker("endPoint");
            break;
          case "i":
            jumpToMarker("introEnd");
            break;
          case "o":
            jumpToMarker("fadeOutStart");
            break;
          case "r":
            jumpToMarker("refraoStart");
            break;
        }
      }

      // Undo/Redo (Ctrl+Z, Ctrl+Y)
      if (e.ctrlKey && !e.altKey && !e.shiftKey) {
        if (e.key.toLowerCase() === "z") {
          e.preventDefault();
          undo();
        }
        if (e.key.toLowerCase() === "y") {
          e.preventDefault();
          redo();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [jumpToMarker, undo, redo]);

  return (
    <div className="flex h-full w-full">
      <div className="relative flex-1 overflow-hidden">
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          className="h-full w-full cursor-crosshair"
        />

        {/* Indicadores de Processamento Automático */}
        {cuePoints && (
          <div className="absolute top-2 right-2 flex flex-col items-end gap-1 pointer-events-none">
            <div className="flex items-center gap-2 bg-blue-600/90 text-white text-[9px] font-bold px-2 py-0.5 rounded shadow-lg backdrop-blur-sm animate-in fade-in slide-in-from-top-2">
              <Zap className="w-3 h-3" />
              <span>AUTO-MIX ATIVO</span>
            </div>
            {cuePoints.bpm && (
              <div className="bg-black/60 text-white/90 text-[8px] px-1.5 py-0.5 rounded backdrop-blur-sm border border-white/10">
                BPM: <span className="text-[#fffa65] font-mono">{cuePoints.bpm}</span>
              </div>
            )}
            {cuePoints.loudness && (
              <div className="bg-black/60 text-white/90 text-[8px] px-1.5 py-0.5 rounded backdrop-blur-sm border border-white/10">
                LUFS: <span className="text-blue-300 font-mono">{cuePoints.loudness} dB</span>
              </div>
            )}
          </div>
        )}

        {/* Motivo da Mixagem (Bottom Right) */}
        {cuePoints?.autoMixReason && (
          <div className="absolute bottom-2 right-2 max-w-[200px] bg-black/40 backdrop-blur-md p-1.5 rounded border border-white/5 pointer-events-none">
            <div className="text-[7px] text-white/40 uppercase mb-0.5 font-bold tracking-widest">
              Ajuste Inteligente
            </div>
            <div className="text-[8px] text-white/70 italic leading-tight">
              {cuePoints.autoMixReason}
            </div>
          </div>
        )}

        {/* Filtros de marcadores */}
        <div className="absolute left-2 bottom-2 flex flex-wrap gap-1">
          {MARKER_DEFS.filter((d) => markers.some((m) => m.kind === d.kind)).map((def) => (
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
              style={{
                borderBottom: `2px solid ${visibleKinds.has(def.kind) ? def.color : "transparent"}`,
              }}
            >
              {def.label}
            </button>
          ))}
        </div>
      </div>

      {/* Painel lateral de detalhes e validação */}
      {(selectedMarker || validation.errors.length > 0) && (
        <div className="w-56 shrink-0 border-l border-white/10 bg-black/40 p-2 text-[10px] flex flex-col gap-3">
          {selectedMarker && (
            <div>
              <div className="mb-2 font-bold uppercase text-white/60">Detalhes do Marcador</div>
              <div className="flex flex-col gap-2">
                <div>
                  <div className="text-white/40 uppercase">Tipo</div>
                  <div className="font-bold text-white">
                    {MARKER_DEFS.find((d) => d.kind === selectedMarker.kind)?.label ||
                      selectedMarker.kind}
                  </div>
                </div>
                <div>
                  <div className="text-white/40 uppercase">Tempo</div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="0.01"
                      className="w-20 rounded bg-white/10 px-2 py-1 font-mono text-[12px] font-bold text-[#fffa65] outline-none focus:ring-1 focus:ring-[#fffa65]/50"
                      value={markerPositionSec(
                        selectedMarker,
                        getEngine().mediaDuration() || current?.duration || 0,
                      ).toFixed(2)}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        if (!isNaN(val)) updateMarkerPosition(selectedMarker.id!, val);
                      }}
                    />
                    <span className="text-white/40">s</span>
                  </div>
                </div>
                {selectedMarker.note && (
                  <div>
                    <div className="text-white/40 uppercase">Nota</div>
                    <div className="text-white">{selectedMarker.note}</div>
                  </div>
                )}
                <div className="flex gap-1 mt-2">
                  <button
                    onClick={() => undo()}
                    disabled={!canUndo}
                    className="flex-1 rounded bg-white/10 py-1 hover:bg-white/20 text-white/80 disabled:opacity-30"
                  >
                    Undo
                  </button>
                  <button
                    onClick={() => redo()}
                    disabled={!canRedo}
                    className="flex-1 rounded bg-white/10 py-1 hover:bg-white/20 text-white/80 disabled:opacity-30"
                  >
                    Redo
                  </button>
                </div>
                <button
                  onClick={() => setSelectedMarker(null)}
                  className="mt-1 w-full rounded bg-white/10 py-1 hover:bg-white/20 text-white/80"
                >
                  Fechar Detalhes
                </button>
              </div>
            </div>
          )}

          {validation.errors.length > 0 && (
            <div className="border-t border-white/10 pt-2">
              <div className="mb-2 font-bold uppercase text-red-400">Erros de Sincronia</div>
              <ul className="flex flex-col gap-1 list-disc pl-3 text-red-300/80">
                {validation.errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
