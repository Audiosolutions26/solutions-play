import { useState } from "react";
import { Mic2, Trash2, Plus } from "lucide-react";
import { PanelHeader } from "./PanelHeader";

interface LiveText { id: string; title: string; body: string; }

const INITIAL_LIVE_TEXTS: LiveText[] = [
  { id: "lt1", title: "Boas-vindas", body: "Bom dia! Você está ouvindo a Estação Demo FM. Continue conosco." },
  { id: "lt2", title: "Promoção", body: "Participe do sorteio do ouvinte! Cadastre-se em nosso site." },
];

// ---- Textos ao vivo (leitura do locutor) ----
export function LiveTextPanel() {
  const [items, setItems] = useState<LiveText[]>(INITIAL_LIVE_TEXTS);
  const [active, setActive] = useState<LiveText | null>(items[0]);
  const [draft, setDraft] = useState("");

  const addLiveText = () => {
    if (!draft.trim()) return;
    const item = { id: `lt${Date.now()}`, title: draft.slice(0, 30), body: draft };
    setItems((prev) => [...prev, item]); setActive(item); setDraft("");
  };

  return (
    <div className="flex h-full flex-col">
      <PanelHeader icon={Mic2} title="Textos ao vivo" />
      <div className="flex min-h-0 flex-1">
        <div className="pl-scroll w-1/3 overflow-y-auto border-r border-pl-panel-dark/30 bg-pl-row">
          {items.map((item) => (
            <button
              key={item.id}
              onClick={() => setActive(item)}
              className={`flex w-full items-center justify-between gap-1 border-b border-pl-panel-dark/20 px-2 py-1.5 text-left text-[12px] ${active?.id === item.id ? "bg-pl-toolbar-light/40 font-semibold" : "hover:bg-muted"}`}
            >
              <span className="break-words">{item.title}</span>
              <Trash2 className="h-3 w-3 shrink-0 text-destructive opacity-60 hover:opacity-100" onClick={(e) => { e.stopPropagation(); setItems((prev) => prev.filter((x) => x.id !== item.id)); }} />
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
              onKeyDown={(e) => e.key === "Enter" && addLiveText()}
              placeholder="Novo texto ao vivo…"
              className="h-8 flex-1 rounded border border-pl-panel-dark/40 px-2 text-[12px] outline-none"
            />
            <button onClick={addLiveText} className="inline-flex items-center gap-1 rounded bg-pl-toolbar px-3 text-[12px] font-semibold text-white hover:brightness-110"><Plus className="h-3.5 w-3.5" /> Add</button>
          </div>
        </div>
      </div>
    </div>
  );
}
