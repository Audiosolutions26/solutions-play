import { Globe, Music, Megaphone } from "lucide-react";
import { PanelHeader } from "./PanelHeader";

// ---- Mini site (navegador interno da emissora) ----
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
