import { useEffect, useState } from "react";
import { StickyNote } from "lucide-react";
import { readString, writeString } from "@/lib/storage";
import { PanelHeader } from "./PanelHeader";

const NOTES_STORE = "solutions-play-notes";

// ---- Anotações (bloco de notas persistente) ----
export function NotesPanel() {
  const [text, setText] = useState("");
  useEffect(() => { setText(readString(NOTES_STORE)); }, []);
  useEffect(() => {
    const timer = setTimeout(() => writeString(NOTES_STORE, text), 400);
    return () => clearTimeout(timer);
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
