import { useEffect } from "react";
import { usePlayer } from "./use-player";

/**
 * Texto do dia (manual p.36): ao chegar a vez na programação, abre o painel e
 * lê o texto automaticamente por voz (TTS). Cancela a fala em qualquer outra
 * inserção.
 */
export function useTextoDoDiaAutoPlay(onOpen: () => void): void {
  const { current } = usePlayer();
  useEffect(() => {
    if (current?.kind === "textodia") {
      onOpen();
      try {
        const synth = window.speechSynthesis;
        synth.cancel();
        const utterance = new SpeechSynthesisUtterance(current.body || current.title);
        utterance.lang = "pt-BR";
        utterance.rate = 1;
        synth.speak(utterance);
      } catch { /* ignore */ }
    } else {
      try { window.speechSynthesis?.cancel(); } catch { /* ignore */ }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id]);
}
