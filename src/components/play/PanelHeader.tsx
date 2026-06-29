import type { LucideIcon } from "lucide-react";

/** Cabeçalho padrão dos painéis inferiores: ícone + título sobre a barra escura. */
export function PanelHeader({ icon: Icon, title }: { icon: LucideIcon; title: string }) {
  return (
    <div className="flex items-center gap-2 bg-pl-toolbar px-2 py-1 text-[12px] font-semibold text-white">
      <Icon className="h-4 w-4" /> {title}
    </div>
  );
}
