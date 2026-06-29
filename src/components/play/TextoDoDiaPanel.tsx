import { useEffect, useState } from "react";
import { Newspaper, Trash2, Plus, ListPlus } from "lucide-react";
import { toast } from "sonner";
import { usePlayer } from "@/hooks/use-player";
import { makeTextoDoDia } from "@/lib/play-data";
import { readJson, writeJson } from "@/lib/storage";
import { PanelHeader } from "./PanelHeader";

interface DayText { id: string; date: string; title: string; body: string; }
const DAYTEXT_STORE = "solutions-play-textodia";

// ---- Texto do dia (notícias / informações do dia, criadas pelo operador) ----
export function TextoDoDiaPanel() {
  const { blocks, currentBlockId, addTrack } = usePlayer();
  const [items, setItems] = useState<DayText[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  useEffect(() => {
    const stored = readJson<DayText[]>(DAYTEXT_STORE, []);
    if (stored.length) {
      setItems(stored);
      setActiveId(stored[0]?.id ?? null);
    }
  }, []);

  const persist = (next: DayText[]) => {
    setItems(next);
    writeJson(DAYTEXT_STORE, next);
  };

  const active = items.find((item) => item.id === activeId) ?? null;

  const startNew = () => { setActiveId(null); setTitle(""); setBody(""); };

  const save = () => {
    if (!title.trim() && !body.trim()) return;
    const date = new Date().toLocaleDateString("pt-BR");
    if (active) {
      persist(items.map((item) => (item.id === active.id ? { ...item, title: title || item.title, body } : item)));
    } else {
      const item: DayText = { id: `dt${Date.now()}`, date, title: title || "Texto do dia", body };
      persist([item, ...items]);
      setActiveId(item.id);
    }
  };

  const open = (item: DayText) => { setActiveId(item.id); setTitle(item.title); setBody(item.body); };
  const remove = (id: string) => {
    const next = items.filter((item) => item.id !== id);
    persist(next);
    if (activeId === id) startNew();
  };

  // Insere o texto na programação para ser lido automaticamente (manual p.36).
  const insertProgram = () => {
    if (!body.trim()) { toast.info("Escreva o texto antes de inserir."); return; }
    const blockId = currentBlockId ?? blocks[0]?.id;
    if (!blockId) { toast.error("Nenhum bloco disponível."); return; }
    addTrack(blockId, makeTextoDoDia(title || "Texto do dia", body));
    toast.success("Texto do dia inserido na programação (leitura automática).");
  };

  return (
    <div className="flex h-full flex-col">
      <PanelHeader icon={Newspaper} title="Texto do dia" />
      <div className="flex min-h-0 flex-1">
        <div className="pl-scroll flex w-1/3 flex-col overflow-y-auto border-r border-pl-panel-dark/30 bg-pl-row">
          <button onClick={startNew} className="flex items-center gap-1 border-b border-pl-panel-dark/20 bg-muted px-2 py-1.5 text-left text-[12px] font-semibold hover:bg-pl-toolbar-light/30">
            <Plus className="h-3.5 w-3.5" /> Novo texto
          </button>
          {items.map((item) => (
            <button
              key={item.id}
              onClick={() => open(item)}
              className={`flex items-center justify-between gap-1 border-b border-pl-panel-dark/20 px-2 py-1.5 text-left text-[12px] ${activeId === item.id ? "bg-pl-toolbar-light/40 font-semibold" : "hover:bg-muted"}`}
            >
              <span className="min-w-0">
                <span className="block truncate">{item.title}</span>
                <span className="block text-[10px] text-muted-foreground">{item.date}</span>
              </span>
              <Trash2 className="h-3 w-3 shrink-0 text-destructive opacity-60 hover:opacity-100" onClick={(e) => { e.stopPropagation(); remove(item.id); }} />
            </button>
          ))}
          {items.length === 0 && <p className="p-3 text-[11px] text-muted-foreground">Nenhum texto do dia ainda.</p>}
        </div>
        <div className="flex flex-1 flex-col gap-2 bg-pl-row p-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Título da notícia / informação"
            className="h-8 rounded border border-pl-panel-dark/40 px-2 text-[13px] font-semibold outline-none"
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Digite o texto do dia. Ao salvar, fica disponível na lista (Playlist\Pgm\Textos)."
            className="flex-1 resize-none rounded border border-pl-panel-dark/40 p-2 text-[13px] outline-none"
          />
          <div className="flex justify-end">
            <button onClick={insertProgram} className="mr-auto inline-flex items-center gap-1 rounded border border-pl-toolbar px-3 py-1.5 text-[12px] font-semibold text-pl-toolbar hover:bg-pl-toolbar/10">
              <ListPlus className="h-3.5 w-3.5" /> Inserir na programação
            </button>
            <button onClick={save} className="inline-flex items-center gap-1 rounded bg-pl-toolbar px-4 py-1.5 text-[12px] font-semibold text-white hover:brightness-110">
              {active ? "Atualizar" : "Salvar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
