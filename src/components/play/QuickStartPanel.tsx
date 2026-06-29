import { useCallback, useEffect, useRef, useState } from "react";
import { Zap, Pencil, Plus, X, Check, Shuffle, FileAudio, ChevronLeft, ChevronRight, GripVertical } from "lucide-react";
import { toast } from "sonner";
import { getAudioEngine } from "@/lib/audio-engine";
import { readAudioFile } from "@/lib/play-audio-files";
import { deviceForFunction } from "@/lib/play-outputs";
import { AUDIO_ACCEPT } from "@/lib/audio-formats";

// QuickStart / Instant replay — botões personalizáveis (manual p.27-35).
interface Pad {
  id: string;
  label: string;
  freq: number;
  dur: number;
  color: string;
  key?: string;     // tecla de atalho (manual p.33), ex.: "F1"
  url?: string;     // áudio real carregado
  random?: boolean; // sorteia outro áudio (manual p.31)
}

const PALETTE = ["#f39c12", "#e67e22", "#d35400", "#27ae60", "#16a085", "#2980b9", "#8e44ad", "#c0392b", "#2c3e50", "#7f8c8d", "#e84393", "#0984e3"];

const defaultPads: Pad[] = [
  { id: "p1", label: "Vinheta Abertura", freq: 330, dur: 1.2, color: "#f39c12", key: "F1" },
  { id: "p2", label: "Vinheta ID", freq: 392, dur: 0.9, color: "#e67e22", key: "F2" },
  { id: "p3", label: "Vinheta PAS", freq: 440, dur: 0.7, color: "#d35400", key: "F3" },
  { id: "p4", label: "Aplausos", freq: 180, dur: 1.5, color: "#27ae60", key: "F4" },
  { id: "p5", label: "Risada", freq: 260, dur: 1.0, color: "#16a085", key: "F5" },
  { id: "p6", label: "Tambor", freq: 110, dur: 0.8, color: "#2980b9", key: "F6" },
  { id: "p7", label: "Sino", freq: 880, dur: 1.4, color: "#8e44ad", key: "F7" },
  { id: "p8", label: "Buzina", freq: 147, dur: 0.6, color: "#c0392b", key: "F8" },
  { id: "p9", label: "Hora Certa", freq: 523, dur: 1.0, color: "#2c3e50", key: "F9" },
  { id: "p10", label: "Spot Rápido", freq: 165, dur: 1.1, color: "#7f8c8d", key: "F10" },
  { id: "p11", label: "Stinger", freq: 660, dur: 0.5, color: "#e84393", key: "F11" },
  { id: "p12", label: "Sweep", freq: 220, dur: 1.3, color: "#0984e3", key: "F12" },
];

const STORE = "solutions-play-quickstart";

function loadPads(): Pad[] {
  try {
    const raw = localStorage.getItem(STORE);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return defaultPads;
}

export function QuickStartPanel() {
  const [pads, setPads] = useState<Pad[]>(loadPads);
  const [active, setActive] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [cols, setCols] = useState(4);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const fileTarget = useRef<string | null>(null);
  const padsRef = useRef(pads);
  padsRef.current = pads;

  useEffect(() => {
    // Áudios reais (object URLs) não são serializáveis entre sessões — salvamos sem url.
    const persist = pads.map((p) => ({ ...p, url: p.url ? undefined : undefined }));
    try { localStorage.setItem(STORE, JSON.stringify(persist)); } catch { /* ignore */ }
  }, [pads]);

  const fire = useCallback((p: Pad) => {
    if (p.url) getAudioEngine().fireUrl(p.url, p.dur, deviceForFunction("quickstart"));
    else getAudioEngine().fire(p.freq, p.dur);
    setActive(p.id);
    window.setTimeout(() => setActive((cur) => (cur === p.id ? null : cur)), p.dur * 1000);
  }, []);

  // Disparo por tecla de atalho (manual p.33).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable)) return;
      if (e.key === "Escape") { setEditMode(false); return; }
      const pad = padsRef.current.find((p) => p.key && p.key.toLowerCase() === e.key.toLowerCase());
      if (pad) { e.preventDefault(); fire(pad); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [fire]);

  const update = (id: string, patch: Partial<Pad>) => setPads((ps) => ps.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  const remove = (id: string) => setPads((ps) => ps.filter((p) => p.id !== id));
  const move = (id: string, dir: -1 | 1) => setPads((ps) => {
    const i = ps.findIndex((p) => p.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= ps.length) return ps;
    const next = [...ps];
    [next[i], next[j]] = [next[j], next[i]];
    return next;
  });
  const reorder = (srcId: string, targetId: string) => setPads((ps) => {
    if (srcId === targetId) return ps;
    const from = ps.findIndex((p) => p.id === srcId);
    const to = ps.findIndex((p) => p.id === targetId);
    if (from < 0 || to < 0) return ps;
    const next = [...ps];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    return next;
  });
  const addPad = () => {
    const id = `p${Date.now()}`;
    setPads((ps) => [...ps, { id, label: "Novo botão", freq: 300, dur: 1, color: PALETTE[ps.length % PALETTE.length] }]);
  };

  const onPickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    const id = fileTarget.current;
    if (!file || !id) return;
    try {
      const { url, duration } = await readAudioFile(file);
      update(id, { url, dur: Math.max(0.5, Math.min(duration || 1, 8)), label: file.name.replace(/\.[^.]+$/, "") });
      toast.success(`Áudio carregado: ${file.name}`);
    } catch { toast.error("Não foi possível carregar o áudio."); }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 bg-pl-toolbar px-2 py-1 text-[12px] font-semibold text-white">
        {!embedded && (<><Zap className="h-4 w-4" /> QuickStart — disparo instantâneo</>)}
        <div className="ml-auto flex items-center gap-2">
          <label className="flex items-center gap-1 text-[11px] font-normal">
            Colunas
            <select value={cols} onChange={(e) => setCols(Number(e.target.value))} className="rounded bg-white/15 px-1 py-0.5 text-white">
              {[2, 3, 4, 5, 6].map((n) => <option key={n} value={n} className="text-black">{n}</option>)}
            </select>
          </label>
          <button
            onClick={() => setEditMode((v) => !v)}
            className={`flex items-center gap-1 rounded px-2 py-0.5 text-[11px] ${editMode ? "bg-white text-pl-toolbar" : "bg-white/15 hover:bg-white/30"}`}
          >
            {editMode ? <Check className="h-3.5 w-3.5" /> : <Pencil className="h-3.5 w-3.5" />} {editMode ? "Concluir" : "Editar"}
          </button>
        </div>
      </div>
      <div className="pl-scroll flex-1 overflow-y-auto bg-pl-row p-3">
        <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
          {pads.map((p) => {
            const isActive = active === p.id;
            return (
              <div
                key={p.id}
                draggable={editMode}
                onDragStart={(e) => { if (!editMode) return; setDragId(p.id); e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", p.id); }}
                onDragOver={(e) => { if (!editMode) return; e.preventDefault(); e.dataTransfer.dropEffect = "move"; setDragOverId(p.id); }}
                onDragLeave={() => setDragOverId((d) => (d === p.id ? null : d))}
                onDrop={(e) => { if (!editMode) return; e.preventDefault(); const src = dragId ?? e.dataTransfer.getData("text/plain"); setDragOverId(null); setDragId(null); if (src) reorder(src, p.id); }}
                onDragEnd={() => { setDragOverId(null); setDragId(null); }}
                className={`relative ${dragId === p.id ? "opacity-50" : ""} ${dragOverId === p.id ? "ring-2 ring-pl-toolbar rounded-lg" : ""}`}
              >
                <button
                  onClick={() => (editMode ? undefined : fire(p))}
                  className={`group relative flex aspect-square w-full flex-col items-center justify-center gap-2 rounded-lg border-b-4 text-center text-white shadow-md transition active:translate-y-0.5 ${
                    isActive ? "scale-[0.97] brightness-125" : "hover:brightness-110"
                  }`}
                  style={{ backgroundColor: p.color, borderBottomColor: "rgba(0,0,0,0.35)" }}
                >
                  {p.url ? <FileAudio className="h-7 w-7 drop-shadow" /> : <Zap className="h-7 w-7 drop-shadow" />}
                  <span className="px-1 text-[12px] font-bold leading-tight drop-shadow">{p.label}</span>
                  {p.key && <span className="absolute right-1.5 top-1.5 rounded bg-black/25 px-1 text-[10px] font-mono">{p.key}</span>}
                  {p.random && <Shuffle className="absolute left-1.5 top-1.5 h-3.5 w-3.5 opacity-80" />}
                  {isActive && (
                    <span className="absolute inset-x-2 bottom-2 h-1 overflow-hidden rounded bg-black/20">
                      <span className="block h-full w-full origin-left animate-[ql_var(--d)_linear] bg-white/80" style={{ ["--d" as string]: `${p.dur}s` }} />
                    </span>
                  )}
                </button>
                {editMode && (
                  <button onClick={() => remove(p.id)} title="Excluir botão" className="absolute -right-2 -top-2 grid h-5 w-5 place-items-center rounded-full bg-destructive text-white shadow">
                    <X className="h-3 w-3" />
                  </button>
                )}
                {editMode && (
                  <span className="pointer-events-none absolute left-1.5 top-1.5 z-10 text-white/80"><GripVertical className="h-3.5 w-3.5 drop-shadow" /></span>
                )}
                {editMode && (
                  <div className="mt-1 space-y-1 rounded border border-pl-panel-dark/30 bg-white/70 p-1.5 text-[10px]">
                    <input
                      value={p.label}
                      onChange={(e) => update(p.id, { label: e.target.value })}
                      className="w-full rounded border border-pl-panel-dark/40 px-1 py-0.5"
                      placeholder="Nome"
                    />
                    <div className="flex items-center gap-1">
                      <button onClick={() => move(p.id, -1)} title="Mover para trás" className="grid h-6 flex-1 place-items-center rounded bg-muted hover:brightness-95">
                        <ChevronLeft className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => move(p.id, 1)} title="Mover para frente" className="grid h-6 flex-1 place-items-center rounded bg-muted hover:brightness-95">
                        <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="flex items-center gap-1">
                      <select value={p.key ?? ""} onChange={(e) => update(p.id, { key: e.target.value || undefined })} className="flex-1 rounded border border-pl-panel-dark/40 px-1 py-0.5">
                        <option value="">sem tecla</option>
                        {Array.from({ length: 12 }, (_, i) => `F${i + 1}`).map((k) => <option key={k} value={k}>{k}</option>)}
                      </select>
                      <input type="color" value={p.color} onChange={(e) => update(p.id, { color: e.target.value })} className="h-6 w-7 cursor-pointer rounded border-0 bg-transparent p-0" />
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => { fileTarget.current = p.id; fileRef.current?.click(); }}
                        className="flex flex-1 items-center justify-center gap-1 rounded bg-pl-toolbar px-1 py-0.5 text-white"
                      >
                        <FileAudio className="h-3 w-3" /> Áudio
                      </button>
                      <button
                        onClick={() => update(p.id, { random: !p.random })}
                        className={`flex items-center justify-center gap-1 rounded px-1.5 py-0.5 ${p.random ? "bg-pl-toolbar text-white" : "bg-muted"}`}
                        title="Sorteia outro áudio da pasta"
                      >
                        <Shuffle className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {editMode && (
            <button onClick={addPad} className="flex aspect-square items-center justify-center rounded-lg border-2 border-dashed border-pl-panel-dark/40 text-pl-text/60 hover:bg-white/40">
              <Plus className="h-8 w-8" />
            </button>
          )}
        </div>
        <p className="mt-4 text-center text-[11px] text-pl-text/60">
          {editMode
            ? "Modo de edição: renomeie, escolha cor, tecla de atalho (F1–F12) e áudio. Esc para sair."
            : "Clique no pad ou use a tecla de atalho (F1–F12) para disparar por cima do ar."}
        </p>
      </div>
      <input ref={fileRef} type="file" accept={AUDIO_ACCEPT} className="hidden" onChange={onPickFile} />
    </div>
  );
}