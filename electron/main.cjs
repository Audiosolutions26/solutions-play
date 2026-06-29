// Electron main process for Solutions-Play (Windows desktop / .exe).
// Loads the bundled web app. In production it serves the static client build
// from ../dist via a tiny local HTTP server (works fully offline); in dev it
// points to the Vite dev server.
const { app, BrowserWindow, Menu, ipcMain, dialog, session, shell } = require("electron");
const path = require("path");
const http = require("http");
const fs = require("fs");
const aes67 = require("./aes67.cjs");

const DEV_URL = process.env.SP_DEV_URL || "http://localhost:8080";
const isDev = !app.isPackaged;

const MIME = {
  ".html": "text/html", ".js": "text/javascript", ".css": "text/css",
  ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg",
  ".svg": "image/svg+xml", ".ico": "image/x-icon", ".woff2": "font/woff2",
  ".woff": "font/woff", ".ttf": "font/ttf", ".map": "application/json",
};

// Codecs/formatos de áudio suportados — o Chromium embutido decodifica
// nativamente MP3, WAV, FLAC (lossless), AAC/M4A/MP4, OGG/Opus e WebM com a
// melhor qualidade disponível. Lista ampla para aceitar as principais
// extensões do mercado.
const AUDIO_MIME = {
  ".mp3": "audio/mpeg", ".wav": "audio/wav", ".wave": "audio/wav",
  ".flac": "audio/flac", ".ogg": "audio/ogg", ".oga": "audio/ogg",
  ".opus": "audio/ogg", ".m4a": "audio/mp4", ".m4b": "audio/mp4",
  ".mp4": "audio/mp4", ".aac": "audio/aac", ".webm": "audio/webm",
  ".weba": "audio/webm", ".aiff": "audio/aiff", ".aif": "audio/aiff",
  ".aifc": "audio/aiff", ".wma": "audio/x-ms-wma", ".mka": "audio/x-matroska",
  ".3gp": "audio/3gpp", ".amr": "audio/amr", ".caf": "audio/x-caf",
};

function fileToDataUrl(file) {
  const ext = path.extname(file).toLowerCase();
  const mime = AUDIO_MIME[ext] || "application/octet-stream";
  const buf = fs.readFileSync(file);
  return `data:${mime};base64,${buf.toString("base64")}`;
}

// Serve the static client build (SPA fallback to index.html).
function startStaticServer(root) {
  const rootResolved = path.resolve(root);
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      let urlPath = "/";
      try {
        urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
      } catch {
        urlPath = "/";
      }
      // Resolve dentro do root e bloqueia path traversal (../) para fora dele.
      let file = path.resolve(rootResolved, "." + urlPath);
      if (file !== rootResolved && !file.startsWith(rootResolved + path.sep)) {
        file = path.join(rootResolved, "index.html");
      }
      if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) {
        const asPage = path.join(file, "index.html");
        file = fs.existsSync(asPage) ? asPage : path.join(rootResolved, "index.html");
      }
      fs.readFile(file, (err, data) => {
        if (err) { res.writeHead(404); res.end("Not found"); return; }
        res.writeHead(200, { "Content-Type": MIME[path.extname(file)] || "application/octet-stream" });
        res.end(data);
      });
    });
    server.listen(0, "127.0.0.1", () => resolve(`http://127.0.0.1:${server.address().port}`));
  });
}

// ---- IPC: seletor de arquivos nativo + leitura por caminho ----------------
ipcMain.handle("sp:pick-audio-files", async () => {
  const result = await dialog.showOpenDialog({
    title: "Selecionar áudios / locuções",
    properties: ["openFile", "multiSelections"],
    filters: [
      { name: "Áudio", extensions: Object.keys(AUDIO_MIME).map((e) => e.slice(1)) },
      { name: "Todos os arquivos", extensions: ["*"] },
    ],
  });
  if (result.canceled) return [];
  const files = [];
  for (const file of result.filePaths) {
    try {
      files.push({
        path: file,
        name: path.basename(file).replace(/\.[^.]+$/, ""),
        dataUrl: fileToDataUrl(file),
      });
    } catch { /* pula arquivos ilegíveis */ }
  }
  return files;
});

ipcMain.handle("sp:read-audio-path", async (_evt, file) => {
  try {
    if (!file || !fs.existsSync(file)) return null;
    return fileToDataUrl(file);
  } catch {
    return null;
  }
});

// ---- IPC: seletor de PASTA nativo (árvore do Windows) ---------------------
// Abre a árvore de diretórios do Windows para apontar o atalho a uma pasta.
ipcMain.handle("sp:pick-folder", async (_evt, current) => {
  const opts = {
    title: "Selecionar pasta de trabalho",
    properties: ["openDirectory", "createDirectory"],
  };
  if (current && typeof current === "string") {
    try { if (fs.existsSync(current)) opts.defaultPath = current; } catch { /* ignore */ }
  }
  const result = await dialog.showOpenDialog(opts);
  if (result.canceled || !result.filePaths.length) return null;
  const dir = result.filePaths[0];
  let audioCount = 0;
  try {
    for (const entry of fs.readdirSync(dir)) {
      const ext = path.extname(entry).toLowerCase();
      if (AUDIO_MIME[ext]) audioCount++;
    }
  } catch { /* ignore */ }
  return { path: dir, name: path.basename(dir), audioCount };
});

// ---- IPC: abrir a pasta no Explorer do Windows ----------------------------
ipcMain.handle("sp:open-folder", async (_evt, dir) => {
  try {
    if (!dir || typeof dir !== "string") return false;
    if (!fs.existsSync(dir)) return false;
    const err = await shell.openPath(dir);
    return !err; // string vazia = sucesso
  } catch {
    return false;
  }
});

// ---- IPC: listar os áudios de uma pasta (carrega as músicas do atalho) -----
// Lê o diretório e devolve a lista de arquivos de áudio { path, name } para
// que o atalho mostre as músicas reais da pasta apontada.
ipcMain.handle("sp:list-folder-audio", async (_evt, dir) => {
  try {
    if (!dir || typeof dir !== "string") return [];
    if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) return [];
    const out = [];
    for (const entry of fs.readdirSync(dir)) {
      const ext = path.extname(entry).toLowerCase();
      if (!AUDIO_MIME[ext]) continue;
      const full = path.join(dir, entry);
      try { if (!fs.statSync(full).isFile()) continue; } catch { continue; }
      out.push({ path: full, name: entry.replace(/\.[^.]+$/, "") });
    }
    out.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
    return out;
  } catch {
    return [];
  }
});

// ---- IPC: validar se um diretório existe (atalho não pode apontar p/ vazio) -
ipcMain.handle("sp:folder-exists", async (_evt, dir) => {
  try {
    if (!dir || typeof dir !== "string") return false;
    const stat = fs.statSync(dir);
    return stat.isDirectory();
  } catch {
    return false;
  }
});

// ---- IPC: AES67 TX (RTP/SAP) + loopback -----------------------------------
aes67.register(ipcMain);
app.on("before-quit", () => { try { aes67.closeTx(); } catch { /* ignore */ } });

async function createWindow() {
  // Concede acesso a microfone/saída de áudio (gravação de locuções no Windows)
  // e nega o restante por padrão.
  session.defaultSession.setPermissionRequestHandler((_wc, permission, cb) => {
    cb(permission === "media" || permission === "audioCapture");
  });

  const win = new BrowserWindow({
    width: 1366,
    height: 900,
    minWidth: 1024,
    minHeight: 640,
    backgroundColor: "#1b2733",
    title: "Solutions-Play",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  Menu.setApplicationMenu(null);

  if (isDev) {
    await win.loadURL(DEV_URL);
  } else {
    const dist = path.join(__dirname, "..", "dist");
    const base = await startStaticServer(dist);
    await win.loadURL(base);
  }
}

// Garante instância única (evita conflito de sockets RTP/SAP do AES67).
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    const win = BrowserWindow.getAllWindows()[0];
    if (win) { if (win.isMinimized()) win.restore(); win.focus(); }
  });
  app.whenReady().then(createWindow);
  app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });
  app.on("activate", () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
}
