# Solutions-Play — Desktop (Windows .exe)

The desktop shell wraps the same web app in Electron and serves the static
client build locally, so it runs offline as a native window.

## 1. Install desktop tooling (one time)
```bash
npm install --save-dev electron @electron/packager
```
Add to package.json:
```json
"main": "electron/main.cjs",
"scripts": {
  "desktop:dev": "electron electron/main.cjs",
  "desktop:build": "vite build && electron-packager . Solutions-Play --platform=win32 --arch=x64 --out=electron-release --overwrite"
}
```

## 2. Run in development
Start the web dev server (`npm run dev`), then:
```bash
npm run desktop:dev
```

## 3. Build the Windows app
```bash
npm run desktop:build
```
Output: `electron-release/Solutions-Play-win32-x64/Solutions-Play.exe`.

> Cross-building Windows from Linux produces the runnable `.exe` folder.
> A signed installer (`Setup.exe`) requires electron-builder on Windows.
