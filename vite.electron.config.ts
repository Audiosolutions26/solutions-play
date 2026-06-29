// Standalone SPA build for the Electron desktop app (Windows .exe).
// The Solutions-Play UI is fully client-side, so the desktop build bypasses
// TanStack Start SSR and bundles a plain single-page app into ./dist, which
// electron/main.cjs serves locally (fully offline).
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const rootDir = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  base: "./",
  root: resolve(rootDir, "electron/renderer"),
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { "@": resolve(rootDir, "src") },
  },
  build: {
    outDir: resolve(rootDir, "dist"),
    emptyOutDir: true,
    chunkSizeWarningLimit: 2000,
  },
});
