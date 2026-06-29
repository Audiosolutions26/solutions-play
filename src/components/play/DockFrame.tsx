import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Plus, Minus, X } from "lucide-react";

// Moldura padrão de um grid encaixável: cabeçalho com título e os controles
// pedidos (aumentar / diminuir tamanho e fechar). Também serve de "alça" para
// arrastar (fixar novos grids).
export function DockFrame({
  title,
  icon: Icon,
  grow,
  onGrow,
  onShrink,
  onClose,
  draggable,
  onDragStart,
  children,
}: {
  title: string;
  icon: LucideIcon;
  grow: number;
  onGrow: () => void;
  onShrink: () => void;
  onClose: () => void;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-0 flex-col" style={{ flexGrow: grow, flexBasis: 0 }}>
      <div
        className="flex items-center gap-2 bg-pl-toolbar px-2 py-1 text-[12px] font-semibold text-white"
        draggable={draggable}
        onDragStart={onDragStart}
      >
        <Icon className="h-4 w-4 shrink-0" />
        <span className="break-words">{title}</span>
        <div className="ml-auto flex shrink-0 items-center gap-0.5">
          <button
            onClick={onShrink}
            title="Diminuir o tamanho"
            className="grid h-5 w-5 place-items-center rounded hover:bg-white/20"
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={onGrow}
            title="Aumentar o tamanho"
            className="grid h-5 w-5 place-items-center rounded hover:bg-white/20"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={onClose}
            title="Fechar painel"
            className="grid h-5 w-5 place-items-center rounded hover:bg-red-500"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
    </div>
  );
}
