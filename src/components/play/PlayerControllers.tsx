import { BeepController } from "./BeepDialog";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { useMarkerController } from "@/hooks/use-marker-controller";
import { useProgramLogger } from "@/hooks/use-program-logger";
import { useTextoDoDiaAutoPlay } from "@/hooks/use-texto-do-dia-autoplay";
import { useLiveTextAutoOpen } from "@/hooks/use-live-text-autoopen";

/**
 * Agrupa os controladores sem interface do player (atalhos, beeps, marcadores,
 * log de programa e aberturas automáticas de painel). Renderizado dentro dos
 * providers; não produz UI própria.
 */
export function PlayerControllers({
  onOpenTextoDoDia,
  onOpenLiveText,
}: {
  onOpenTextoDoDia: () => void;
  onOpenLiveText: () => void;
}) {
  useKeyboardShortcuts();
  useMarkerController();
  useProgramLogger();
  useTextoDoDiaAutoPlay(onOpenTextoDoDia);
  useLiveTextAutoOpen(onOpenLiveText);
  return <BeepController />;
}
