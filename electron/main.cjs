// Electron main process for Solutions-Play (Windows desktop / .exe).
// Loads the bundled web app. In production it serves the static client build
// from ../dist via a tiny local HTTP server (works fully offline); in dev it
// points to the Vite dev server.
const { app, BrowserWindow, Menu } = require("electron");
const path = require("path");
const http = require("http");
const fs = require("fs");

const DEV_URL = process.env.SP_DEV_URL || "http://localhost:8080";
const isDev = !app.isPackaged;

const MIME = {
  ".html": "text/html", ".js": "text/javascript", ".css": "text/css",
  ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg",
  ".svg": "image/svg+xml", ".ico": "image/x-icon", ".woff2": "font/woff2",
  ".woff": "font/woff", ".ttf": "font/ttf", ".map": "application/json",
};

// Serve the static client build (SPA fallback to index.html).
function startStaticServer(root) {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      let p = decodeURIComponent((req.url || "/").split("?")[0]);
      let file = path.join(root, p);
      if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) {
        const asPage = path.join(root, p, "index.html");
        file = fs.existsSync(asPage) ? asPage : path.join(root, "index.html");
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

async function createWindow() {
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

app.whenReady().then(createWindow);
app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });
app.on("activate", () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
