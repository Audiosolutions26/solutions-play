# Solutions-Play — Desktop (Windows .exe)

The desktop build wraps the same UI in Electron. Because the app is fully
client-side, the desktop build is a standalone SPA (`vite.electron.config.ts`)
bundled into `dist/` and served locally by `electron/main.cjs` — runs offline.

Everything is pre-wired. After cloning from GitHub:

## 1. Install
```bash
npm install
```
(`electron` and `@electron/packager` are already in devDependencies.)

## 2. Run in development
```bash
npm run dev          # terminal 1 — web dev server on :8080
npm run desktop:start # terminal 2 — opens the Electron window
```

## 3. Build the Windows app (.exe)
```bash
npm run desktop:build
```
Produces: `electron-release/Solutions-Play-win32-x64/Solutions-Play.exe`
(a runnable, self-contained folder — copy/zip it to distribute).

## Notes
- `npm run desktop:web` just builds the offline SPA into `dist/` (no packaging).
- Cross-building Windows from macOS/Linux produces the runnable `.exe` folder.
  A signed `Setup.exe` installer would additionally need electron-builder on Windows.
- The wrapper is offline-first: no network is required at runtime.
