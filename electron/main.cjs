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
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".ttf": "font/ttf",
  ".map": "application/json",
};

// Codecs/formatos de áudio suportados — o Chromium embutido decodifica
// nativamente MP3, WAV, FLAC (lossless), AAC/M4A/MP4, OGG/Opus e WebM com a
// melhor qualidade disponível. Lista ampla para aceitar as principais
// extensões do mercado.
const AUDIO_MIME = {
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".wave": "audio/wav",
  ".flac": "audio/flac",
  ".ogg": "audio/ogg",
  ".oga": "audio/ogg",
  ".opus": "audio/ogg",
  ".m4a": "audio/mp4",
  ".m4b": "audio/mp4",
  ".mp4": "audio/mp4",
  ".aac": "audio/aac",
  ".webm": "audio/webm",
  ".weba": "audio/webm",
  ".aiff": "audio/aiff",
  ".aif": "audio/aiff",
  ".aifc": "audio/aiff",
  ".wma": "audio/x-ms-wma",
  ".mka": "audio/x-matroska",
  ".3gp": "audio/3gpp",
  ".amr": "audio/amr",
  ".caf": "audio/x-caf",
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
        if (err) {
          res.writeHead(404);
          res.end("Not found");
          return;
        }
        res.writeHead(200, {
          "Content-Type": MIME[path.extname(file)] || "application/octet-stream",
        });
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
    } catch {
      /* pula arquivos ilegíveis */
    }
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

// ---- IPC: gravar arquivos de RDS (no ar + próximas) -----------------------
// Resolve a pasta RDS: caminho absoluto informado, ou
// Documentos\Solutions-Play\rds por padrão. Cria a pasta e grava os .txt.
function resolveRdsDir(dir) {
  if (dir && typeof dir === "string" && path.isAbsolute(dir)) return dir;
  const base = path.join(app.getPath("documents"), "Solutions-Play");
  return path.join(base, dir && typeof dir === "string" && dir.trim() ? dir.trim() : "rds");
}

ipcMain.handle("sp:write-rds", async (_evt, payload) => {
  try {
    const files = payload && Array.isArray(payload.files) ? payload.files : [];
    if (!files.length) return null;
    const dir = resolveRdsDir(payload && payload.dir);
    fs.mkdirSync(dir, { recursive: true });
    for (const f of files) {
      if (!f || typeof f.name !== "string") continue;
      // Nome de arquivo seguro (sem separadores de caminho).
      const safe = path.basename(f.name);
      const full = path.join(dir, safe);
      fs.writeFileSync(full, String(f.content ?? ""), "utf8");
    }
    return dir;
  } catch {
    return null;
  }
});

// ---- Pastas de programação (Mapas/Grades) na raiz do programa ------------
// A raiz do programa é Documentos\Solutions-Play. Dentro dela ficam as
// subpastas Grades (programação musical) e Mapas (programação comercial),
// onde os arquivos .txt de programação são lidos e gerados.
function appRootDir() {
  return path.join(app.getPath("documents"), "Solutions-Play");
}

function programDirs() {
  const base = appRootDir();
  return {
    base,
    grades: path.join(base, "Grades"),
    mapas: path.join(base, "Mapas"),
  };
}

// Garante que a raiz e as subpastas Grades/Mapas existam.
function ensureProgramDirs() {
  const d = programDirs();
  try {
    fs.mkdirSync(d.grades, { recursive: true });
    fs.mkdirSync(d.mapas, { recursive: true });
  } catch {
    /* ignore */
  }
  return d;
}

ipcMain.handle("sp:program-dirs", async () => ensureProgramDirs());

// Lista os arquivos .txt de Grades (musical) ou Mapas (comercial),
// dos mais recentes para os mais antigos.
ipcMain.handle("sp:list-program-files", async (_evt, kind) => {
  try {
    const d = ensureProgramDirs();
    const dir = kind === "mapas" ? d.mapas : d.grades;
    if (!fs.existsSync(dir)) return [];
    const out = [];
    for (const entry of fs.readdirSync(dir)) {
      if (!/\.txt$/i.test(entry)) continue;
      const full = path.join(dir, entry);
      try {
        const st = fs.statSync(full);
        if (!st.isFile()) continue;
        out.push({ name: entry, path: full, mtime: st.mtimeMs });
      } catch {
        /* ignore */
      }
    }
    out.sort((a, b) => b.mtime - a.mtime);
    return out;
  } catch {
    return [];
  }
});

// Lê o conteúdo de um arquivo de texto (programação) por caminho absoluto.
ipcMain.handle("sp:read-text-file", async (_evt, file) => {
  try {
    if (!file || typeof file !== "string" || !fs.existsSync(file)) return null;
    if (!fs.statSync(file).isFile()) return null;
    return fs.readFileSync(file, "utf8");
  } catch {
    return null;
  }
});

// Grava um arquivo .txt em Grades/Mapas (programação gerada).
ipcMain.handle("sp:write-program-file", async (_evt, payload) => {
  try {
    const kind = payload && payload.kind;
    const name = payload && typeof payload.name === "string" ? path.basename(payload.name) : null;
    if (!name) return null;
    const d = ensureProgramDirs();
    const dir = kind === "mapas" ? d.mapas : d.grades;
    fs.mkdirSync(dir, { recursive: true });
    const full = path.join(dir, /\.txt$/i.test(name) ? name : `${name}.txt`);
    fs.writeFileSync(full, String((payload && payload.content) ?? ""), "utf8");
    return full;
  } catch {
    return null;
  }
});

// ---- IPC: sidecar de marcadores `.pkfinfo` -------------------------------
// O sidecar sempre é derivado do caminho de um áudio existente e nunca aceita
// um destino arbitrário. Isso evita que a UI grave arquivos fora da pasta da
// música. O conteúdo é pequeno, versionado e não contém o áudio nem ganho.
const PKFINFO_MAX_BYTES = 2 * 1024 * 1024;
function validAudioFile(file) {
  try {
    if (!file || typeof file !== "string" || !path.isAbsolute(file)) return null;
    const resolved = path.resolve(file);
    if (!AUDIO_MIME[path.extname(resolved).toLowerCase()]) return null;
    if (!fs.statSync(resolved).isFile()) return null;
    return resolved;
  } catch {
    return null;
  }
}

function pkfInfoPath(audioPath) {
  return `${audioPath}.pkfinfo`;
}

ipcMain.handle("sp:read-pkfinfo", async (_evt, audioPath) => {
  try {
    const audio = validAudioFile(audioPath);
    if (!audio) return null;
    
    // 1. Tenta o sidecar padrão .pkfinfo (Solutions-Play)
    const sidecar = pkfInfoPath(audio);
    if (fs.existsSync(sidecar)) {
      const stat = fs.statSync(sidecar);
      if (stat.isFile() && stat.size <= PKFINFO_MAX_BYTES) {
        return fs.readFileSync(sidecar, "utf8");
      }
    }

    // 2. Fallback: Tenta o sidecar .mrk (do editor Python) em mark/<filename>.mrk
    const audioDir = path.dirname(audio);
    const audioName = path.basename(audio);
    const markDir = path.join(audioDir, "mark");
    
    // Procura de forma robusta na pasta mark/ (caso o Windows tenha variações de case)
    if (fs.existsSync(markDir)) {
      const mrkFile = `${audioName}.mrk`;
      const files = fs.readdirSync(markDir);
      const found = files.find(f => f.toLowerCase() === mrkFile.toLowerCase());
      
      if (found) {
        const full = path.join(markDir, found);
        const stat = fs.statSync(full);
        if (stat.isFile() && stat.size <= PKFINFO_MAX_BYTES) {
          return fs.readFileSync(full, "utf8");
        }
      }
    }

    return null;
  } catch {
    return null;
  }
});

ipcMain.handle("sp:write-pkfinfo", async (_evt, payload) => {
  try {
    const audio = validAudioFile(payload && payload.audioPath);
    const content = payload && typeof payload.content === "string" ? payload.content : "";
    if (!audio || !content.trim() || Buffer.byteLength(content, "utf8") > PKFINFO_MAX_BYTES)
      return null;
    const sidecar = pkfInfoPath(audio);
    const temp = `${sidecar}.tmp-${process.pid}-${Date.now()}`;
    fs.writeFileSync(temp, content, { encoding: "utf8", flag: "wx" });
    fs.renameSync(temp, sidecar);
    return sidecar;
  } catch {
    return null;
  }
});

ipcMain.handle("sp:export-mrk", async (_evt, payload) => {
  try {
    const audio = validAudioFile(payload && payload.audioPath);
    const content = payload && typeof payload.content === "string" ? payload.content : "";
    if (!audio || !content.trim()) return null;
    
    const audioDir = path.dirname(audio);
    const audioName = path.basename(audio);
    const markDir = path.join(audioDir, "mark");
    
    fs.mkdirSync(markDir, { recursive: true });
    const mrkFile = path.join(markDir, `${audioName}.mrk`);
    
    fs.writeFileSync(mrkFile, content, "utf8");
    return mrkFile;
  } catch {
    return null;
  }
});


// Abre a pasta Grades/Mapas (ou a raiz) no Explorer do Windows.
ipcMain.handle("sp:open-program-folder", async (_evt, kind) => {
  try {
    const d = ensureProgramDirs();
    const dir = kind === "mapas" ? d.mapas : kind === "grades" ? d.grades : d.base;
    fs.mkdirSync(dir, { recursive: true });
    const err = await shell.openPath(dir);
    return !err;
  } catch {
    return false;
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
    try {
      if (fs.existsSync(current)) opts.defaultPath = current;
    } catch {
      /* ignore */
    }
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
  } catch {
    /* ignore */
  }
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
      try {
        if (!fs.statSync(full).isFile()) continue;
      } catch {
        continue;
      }
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
app.on("before-quit", () => {
  try {
    aes67.closeTx();
  } catch {
    /* ignore */
  }
});

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
    title: "Solutions Play",
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
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });
  app.whenReady().then(() => {
    ensureProgramDirs();
    createWindow();
  });
  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
  });
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
}
