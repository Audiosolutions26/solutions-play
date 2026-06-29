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

  // Faz o @electron/get usar o Electron local em vez de baixar de novo.
  process.env.ELECTRON_OVERRIDE_DIST_PATH = distPath;

  const electronVersion = require(path.join(electronPkgDir, "package.json")).version;
  console.log("[pack] Usando Electron local v" + electronVersion + " (sem novo download)");
  console.log("[pack] Dist: " + distPath);

  const packager = require("@electron/packager");
  const appPaths = await packager({
    dir: root,
    name: "Solutions-Play",
    platform: "win32",
    arch: "x64",
    out: path.join(root, "electron-release"),
    overwrite: true,
    electronVersion,
    download: { mirrorOptions: {} },
    ignore: [
      /^\/src/,
      /^\/electron\/renderer/,
      /^\/electron-release/,
      /^\/node_modules/,
      /^\/\.git/,
    ],
  });

  console.log("\n[pack] ✔ App gerado em:");
  for (const p of appPaths) console.log("  " + p);
  console.log("\nExecutável: " + path.join(appPaths[0] || "", "Solutions-Play.exe"));
}

main().catch((err) => {
  console.error("\n[pack] ✖ Falha ao empacotar:\n", err && err.stack ? err.stack : err);
  process.exit(1);
});
