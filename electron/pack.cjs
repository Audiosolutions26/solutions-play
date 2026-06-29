// Empacotador PORTÁTIL do Solutions-Play (Windows .exe), sem @electron/packager.
//
// Por que manual: o @electron/packager saía em silêncio (exit 0) logo após
// "Packaging app..." no Windows, sem gerar a pasta. Aqui montamos o app à mão
// a partir do Electron que o `npm install` já baixou (node_modules/electron),
// de forma 100% offline e determinística:
//
//   electron-release/Solutions-Play-win32-x64/
//     Solutions-Play.exe        (electron.exe renomeado)
//     *.dll, *.pak, ...         (runtime do Electron)
//     resources/app/
//       package.json            (main -> electron/main.cjs)
//       electron/{main,preload,aes67}.cjs
//       dist/                   (SPA offline)
const path = require("path");
const fs = require("fs");

function rmrf(p) { if (fs.existsSync(p)) fs.rmSync(p, { recursive: true, force: true }); }
function copy(src, dst) { fs.cpSync(src, dst, { recursive: true, dereference: true }); }

function main() {
  const root = path.resolve(__dirname, "..");
  const electronPkgDir = path.dirname(require.resolve("electron/package.json"));
  const distSrc = path.join(electronPkgDir, "dist");

  if (!fs.existsSync(distSrc)) {
    console.error("[pack] Electron local não encontrado em:\n  " + distSrc + "\nRode `npm install`.");
    process.exit(1);
  }
  if (!fs.existsSync(path.join(root, "dist", "index.html"))) {
    console.error("[pack] Build web não encontrado (dist/index.html). Rode `npm run desktop:web` antes.");
    process.exit(1);
  }

  const ev = require(path.join(electronPkgDir, "package.json")).version;
  const outDir = path.join(root, "electron-release", "Solutions-Play-win32-x64");
  console.log("[pack] Electron local v" + ev + " (offline, sem download)");
  console.log("[pack] Copiando runtime do Electron...");

  rmrf(outDir);
  copy(distSrc, outDir);

  // Renomeia o binário do Electron para Solutions-Play.exe.
  const winBin = path.join(outDir, "electron.exe");
  const nixBin = path.join(outDir, "electron");
  let exe;
  if (fs.existsSync(winBin)) {
    exe = path.join(outDir, "Solutions-Play.exe");
    fs.renameSync(winBin, exe);
  } else if (fs.existsSync(nixBin)) {
    exe = path.join(outDir, "Solutions-Play");
    fs.renameSync(nixBin, exe);
  } else {
    console.error("[pack] Binário do Electron não encontrado em " + outDir);
    process.exit(1);
  }

  // Remove o app de exemplo embutido no Electron.
  rmrf(path.join(outDir, "resources", "default_app.asar"));

  // Monta resources/app com apenas o necessário.
  const appDir = path.join(outDir, "resources", "app");
  rmrf(appDir);
  fs.mkdirSync(path.join(appDir, "electron"), { recursive: true });

  for (const f of ["main.cjs", "preload.cjs", "aes67.cjs"]) {
    const s = path.join(root, "electron", f);
    if (fs.existsSync(s)) copy(s, path.join(appDir, "electron", f));
  }
  copy(path.join(root, "dist"), path.join(appDir, "dist"));

  // package.json mínimo só com o que o Electron precisa em runtime.
  fs.writeFileSync(
    path.join(appDir, "package.json"),
    JSON.stringify(
      { name: "solutions-play", productName: "Solutions-Play", version: "1.0.0", main: "electron/main.cjs" },
      null,
      2
    )
  );

  console.log("\n[pack] ✔ App gerado com sucesso!");
  console.log("  Pasta: " + outDir);
  console.log("  Executável: " + exe);
  console.log("\nDê duplo clique no Solutions-Play.exe (funciona offline).");
  console.log("Para distribuir, zipe a pasta Solutions-Play-win32-x64 inteira.");
}

try {
  main();
} catch (err) {
  console.error("\n[pack] ✖ Falha ao empacotar:\n", err && err.stack ? err.stack : err);
  process.exit(1);
}
