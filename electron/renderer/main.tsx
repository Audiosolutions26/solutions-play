import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { PlayApp } from "@/components/play/PlayApp";
import { Toaster } from "@/components/ui/sonner";
import "@/styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <PlayApp />
    <Toaster position="top-right" />
  </StrictMode>,
);
