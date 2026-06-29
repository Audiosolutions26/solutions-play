import { useEffect, useState } from "react";
import { History, CalendarDays, StickyNote, Mic2, Globe, Music, Megaphone, Trash2, Plus } from "lucide-react";
import { usePlayer } from "@/hooks/use-player";
import { fmt } from "@/lib/play-data";

function PanelHeader({ icon: Icon, title }: { icon: typeof History; title: string }) {
  return (
    <div className="flex items-center gap-2 bg-pl-toolbar px-2 py-1 text-[12px] font-semibold text-white">
      <Icon className="h-4 w-4" /> {title}
    </div>
  );
}

// ---- Músicas executadas (histórico / comprovação ECAD) ----
export function PlayedPanel() {
  const { blocks, current } = usePlayer();
  const [log, setLog] = useState<{ id: string; title: string; artist?: string; cat: string; time: string; dur: number }[]>([]);

  useEffect(() => {
    if (!current) return;
    setLog((prev) => {
      if (prev[0]?.id === current.id) return prev;
      const now = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
      return [{ id: current.id, title: current.title, artist: current.artist, cat: current.category, time: now, dur: current.duration }, ...prev].slice(0, 60);
    });
  }, [current]);

  const totalTracks = blocks.reduce((s, b) => s + b.items.length, 0);

  return (
    <div className="flex h-full flex-col">
      <PanelHeader icon={History} title="Músicas executadas (comprovação)" />
      <div className="border-b border-pl-panel-dark/30 px-2 py-1 text-[11px] text-muted-foreground">
        {log.length} execuções registradas nesta sessão • {totalTracks} inserções na grade
      </div>
      <div className="pl-scroll flex-1 overflow-y-auto bg-pl-row">
        {log.length === 0 ? (
          <p className="p-3 text-[12px] text-muted-foreground">Nenhuma execução ainda. Toque uma inserção na Programação.</p>
        ) : (
          <table className="w-full text-[12px]">
            <thead className="sticky top-0 bg-muted">
              <tr><th className="px-2 py-1 text-left">Hora</th><th className="px-2 py-1 text-left">Título</th><th className="px-2 py-1 text-left">Tipo</th><th className="px-2 py-1 text-right">Duração</th></tr>
            </thead>
            <tbody>
              {log.map((e, i) => (
                <tr key={`${e.id}-${i}`} className="border-t border-pl-panel-dark/20">
                  <td className="px-2 py-1 font-mono tabular-nums">{e.time}</td>
                  <td className="px-2 py-1">{e.title}{e.artist ? <span className="opacity-70"> — {e.artist}</span> : null}</td>
                  <td className="px-2 py-1 capitalize">{e.cat}</td>
                  <td className="px-2 py-1 text-right font-mono tabular-nums">{fmt(e.dur)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ---- Hoje (efemérides / fatos do dia) ----
export function TodayPanel() {
  const today = new Date();
  const fmtD = today.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
  const facts = [
    "Dia Mundial do Rock — boas pautas para vinhetas temáticas.",
    "Lembrete: revisar o bloco comercial das 18h.",
    "Aniversário de fundação de várias rádios brasileiras.",
    "Dica: alternar trilhas para textos ao vivo melhora a dinâmica.",
  ];
  return (
    <div className="flex h-full flex-col">
      <PanelHeader icon={CalendarDays} title="Hoje" />
      <div className="pl-scroll flex-1 overflow-y-auto bg-pl-row p-3">
        <div className="mb-3 rounded border border-pl-panel-dark/30 bg-white/60 p-3">
          <div className="text-[13px] font-bold capitalize text-pl-toolbar">{fmtD}</div>
          <div className="text-[12px] text-muted-foreground">Detalhes, fatos históricos e jornalísticos do dia.</div>
        </div>
        <ul className="space-y-2">
          {facts.map((f, i) => (
            <li key={i} className="flex gap-2 rounded border border-pl-panel-dark/30 bg-white/40 p-2 text-[12px]">
              <span className="font-bold text-pl-toolbar">•</span> {f}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// ---- Anotações (bloco de notas persistente) ----
export function NotesPanel() {
  const [text, setText] = useState("");
  useEffect(() => { setText(localStorage.getItem("solutions-play-notes") || ""); }, []);
  useEffect(() => {
    const t = setTimeout(() => localStorage.setItem("solutions-play-notes", text), 400);
    return () => clearTimeout(t);
  }, [text]);
  return (
    <div className="flex h-full flex-col">
      <PanelHeader icon={StickyNote} title="Anotações" />
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Bloco de notas do operador (salvo automaticamente)…"
        className="flex-1 resize-none bg-pl-row p-3 text-[13px] text-pl-text outline-none"
      />
    </div>
  );
}

// ---- Textos ao vivo (leitura do locutor) ----
interface LiveText { id: string; title: string; body: string; }
export function LiveTextPanel() {
  const [items, setItems] = useState<LiveText[]>([
    { id: "lt1", title: "Boas-vindas", body: "Bom dia! Você está ouvindo a Estação Demo FM. Continue conosco." },
    { id: "lt2", title: "Promoção", body: "Participe do sorteio do ouvinte! Cadastre-se em nosso site." },
  ]);
  const [active, setActive] = useState<LiveText | null>(items[0]);
  const [draft, setDraft] = useState("");

  const add = () => {
    if (!draft.trim()) return;
    const it = { id: `lt${Date.now()}`, title: draft.slice(0, 30), body: draft };
    setItems((p) => [...p, it]); setActive(it); setDraft("");
  };

  return (
    <div className="flex h-full flex-col">
      <PanelHeader icon={Mic2} title="Textos ao vivo" />
      <div className="flex min-h-0 flex-1">
        <div className="pl-scroll w-1/3 overflow-y-auto border-r border-pl-panel-dark/30 bg-pl-row">
          {items.map((t) => (
            <button
              key={t.id}
              onClick={() => setActive(t)}
              className={`flex w-full items-center justify-between gap-1 border-b border-pl-panel-dark/20 px-2 py-1.5 text-left text-[12px] ${active?.id === t.id ? "bg-pl-toolbar-light/40 font-semibold" : "hover:bg-muted"}`}
            >
              <span className="truncate">{t.title}</span>
              <Trash2 className="h-3 w-3 shrink-0 text-destructive opacity-60 hover:opacity-100" onClick={(e) => { e.stopPropagation(); setItems((p) => p.filter((x) => x.id !== t.id)); }} />
            </button>
          ))}
        </div>
        <div className="flex flex-1 flex-col bg-pl-row p-3">
          {active ? (
            <div className="mb-2 flex-1 rounded border border-pl-panel-dark/30 bg-white/60 p-3 text-[14px] leading-relaxed text-pl-text">
              {active.body}
            </div>
          ) : <div className="flex-1" />}
          <div className="flex gap-1">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && add()}
              placeholder="Novo texto ao vivo…"
              className="h-8 flex-1 rounded border border-pl-panel-dark/40 px-2 text-[12px] outline-none"
            />
            <button onClick={add} className="inline-flex items-center gap-1 rounded bg-pl-toolbar px-3 text-[12px] font-semibold text-white hover:brightness-110"><Plus className="h-3.5 w-3.5" /> Add</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---- Mini site ----
export function MiniSitePanel() {
  return (
    <div className="flex h-full flex-col">
      <PanelHeader icon={Globe} title="Mini site" />
      <div className="pl-scroll flex-1 overflow-y-auto bg-white p-6 text-center">
        <div className="mx-auto max-w-md">
          <div className="mb-2 inline-flex h-14 w-14 items-center justify-center rounded-full bg-pl-toolbar text-white"><Globe className="h-7 w-7" /></div>
          <h2 className="text-lg font-bold text-pl-text">Estação Demo FM</h2>
          <p className="mt-1 text-[13px] text-muted-foreground">Mini navegador interno (Playlist\Pgm\Minisite\Index.htm). Aqui a emissora monta uma página local para o operador.</p>
          <div className="mt-4 grid grid-cols-2 gap-2 text-left text-[12px]">
            <div className="flex items-center gap-2 rounded border p-2"><Music className="h-4 w-4 text-pl-toolbar" /> Programação musical</div>
            <div className="flex items-center gap-2 rounded border p-2"><Megaphone className="h-4 w-4 text-pl-toolbar" /> Comerciais do dia</div>
          </div>
        </div>
      </div>
    </div>
  );
}
