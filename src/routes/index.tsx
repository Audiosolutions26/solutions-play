import { createFileRoute } from "@tanstack/react-router";
import { Toaster } from "@/components/ui/sonner";
import { PlayApp } from "@/components/play/PlayApp";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Solutions-Play — Automação de Rádio" },
      { name: "description", content: "Solutions-Play: sistema de automação e playlist para emissoras de rádio, com programação ao vivo, pastas de áudio e controle de exibição." },
      { property: "og:title", content: "Solutions-Play — Automação de Rádio" },
      { property: "og:description", content: "Sistema de automação e playlist para emissoras de rádio: programação ao vivo, pastas de áudio e controle de exibição." },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <>
      <PlayApp />
      <Toaster position="top-right" />
    </>
  );
}
