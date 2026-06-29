// Empacota o app Electron (Windows .exe) reutilizando o binário do Electron
// que o `npm install` já baixou em node_modules/electron/dist.
//
// Por que: o `electron-packager` tenta baixar o Electron uma 2ª vez (~100 MB)
// pelo @electron/get. Em redes/antivírus corporativos esse download falha e o
// empacotamento aborta sem criar a pasta de saída. Ao definir
// ELECTRON_OVERRIDE_DIST_PATH para a dist local, o download é dispensado e o
// build funciona 100% offline.
const path = require("path");
const fs = require("fs");

// Garante que QUALQUER falha apareça no terminal (nada de saída silenciosa).
process.on("unhandledRejection", (err) => {
  console.error("\n[pack] ✖ unhandledRejection:\n", err && err.stack ? err.stack : err);
  process.exit(1);
});
process.on("uncaughtException", (err) => {
  console.error("\n[pack] ✖ uncaughtException:\n", err && err.stack ? err.stack : err);
  process.exit(1);
});

async function main() {
  const root = path.resolve(__dirname, "..");
  const electronPkgDir = path.dirname(require.resolve("electron/package.json"));
  const distPath = path.join(electronPkgDir, "dist");

  if (!fs.existsSync(distPath)) {
    console.error(
      "[pack] Electron local não encontrado em:\n  " + distPath +
      "\nRode `npm install` antes de empacotar."
    );
    process.exit(1);
  }
  if (!fs.existsSync(path.join(root, "dist", "index.html"))) {
    console.error("[pack] Build web não encontrado (dist/index.html). Rode `npm run desktop:web` antes.");
    process.exit(1);
  }

  // Faz o @electron/get usar o Electron local em vez de baixar de novo.
  process.env.ELECTRON_OVERRIDE_DIST_PATH = distPath;

  const electronVersion = require(path.join(electronPkgDir, "package.json")).version;
  const outDir = path.join(root, "electron-release");
  console.log("[pack] Usando Electron local v" + electronVersion + " (sem novo download)");
  console.log("[pack] Dist: " + distPath);
  console.log("[pack] Saída: " + outDir);
  console.log("[pack] Empacotando... (pode levar 1-2 min copiando os arquivos)");

  const packager = require("@electron/packager");
  const appPaths = await packager({
    dir: root,
    name: "Solutions-Play",
    platform: "win32",
    arch: "x64",
    out: outDir,
    overwrite: true,
    electronVersion,
    // Desativa o "prune" (não chama npm nem rede) — empacotamos só dist/ + electron/.
    prune: false,
    derefSymlinks: true,
    ignore: [
      /^\/src($|\/)/,
      /^\/electron\/renderer($|\/)/,
      /^\/electron-release($|\/)/,
      /^\/node_modules($|\/)/,
      /^\/\.git($|\/)/,
      /^\/public($|\/)/,
    ],
  });

  const appDir = appPaths[0];
  const exe = appDir ? path.join(appDir, "Solutions-Play.exe") : "";
  if (!appDir || !fs.existsSync(exe)) {
    console.error("\n[pack] ✖ Empacotador retornou, mas o .exe não foi encontrado em:\n  " + exe);
    process.exit(1);
  }

  console.log("\n[pack] ✔ App gerado com sucesso!");
  console.log("  Pasta: " + appDir);
  console.log("  Executável: " + exe);
  console.log("\nDê duplo clique no Solutions-Play.exe (funciona offline).");
}

main().catch((err) => {
  console.error("\n[pack] ✖ Falha ao empacotar:\n", err && err.stack ? err.stack : err);
  process.exit(1);
});
