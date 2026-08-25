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

function rmrf(p) {
  if (fs.existsSync(p)) fs.rmSync(p, { recursive: true, force: true });
}
function copy(src, dst) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    fs.mkdirSync(dst, { recursive: true });
    for (const entry of fs.readdirSync(src)) {
      copy(path.join(src, entry), path.join(dst, entry));
    }
    return;
  }

  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.copyFileSync(src, dst);
}

function countFiles(dir) {
  let count = 0;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    count += entry.isDirectory() ? countFiles(full) : 1;
  }
  return count;
}

function findElectronBinary(dir) {
  const wanted = new Set(["electron.exe", "Electron.exe", "electron"]);
  const stack = [dir];

  while (stack.length) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(full);
      } else if (entry.isFile() && wanted.has(entry.name)) {
        return full;
      }
    }
  }

  return null;
}

function main() {
  const root = path.resolve(__dirname, "..");
  const electronPkgDir = path.dirname(require.resolve("electron/package.json"));
  let electronSrcBin;

  try {
    electronSrcBin = require("electron");
  } catch (err) {
    console.error("[pack] A instalação local do Electron está incompleta.");
    console.error("[pack] Rode: npm rebuild electron");
    console.error("[pack] Se não resolver, rode: npm install");
    console.error("[pack] Detalhe: " + (err && err.message ? err.message : err));
    process.exit(1);
  }

  const distSrc = path.dirname(electronSrcBin);

  if (!fs.existsSync(electronSrcBin)) {
    console.error("[pack] Binário local do Electron não existe em:\n  " + electronSrcBin);
    console.error("[pack] Rode: npm rebuild electron");
    console.error("[pack] Se não resolver, apague node_modules e rode: npm install");
    process.exit(1);
  }
  if (!fs.existsSync(path.join(root, "dist", "index.html"))) {
    console.error(
      "[pack] Build web não encontrado (dist/index.html). Rode `npm run desktop:web` antes.",
    );
    process.exit(1);
  }

  const ev = require(path.join(electronPkgDir, "package.json")).version;
  const outDir = path.join(root, "electron-release", "Solutions-Play-win32-x64");
  console.log("[pack] Electron local v" + ev + " (offline, sem download)");
  console.log("[pack] Origem: " + distSrc);
  console.log("[pack] Arquivos do runtime: " + countFiles(distSrc));
  console.log("[pack] Copiando runtime do Electron...");

  rmrf(outDir);
  copy(distSrc, outDir);

  // Renomeia o binário do Electron para Solutions-Play.exe.
  // Em alguns Windows/Node, a cópia pode ficar aninhada; por isso procuramos
  // recursivamente e usamos a pasta real do runtime como destino do app.
  const electronBin = findElectronBinary(outDir);
  if (!electronBin) {
    console.error("[pack] Binário do Electron não encontrado em " + outDir);
    console.error("[pack] Conteúdo encontrado: " + fs.readdirSync(outDir).join(", "));
    process.exit(1);
  }

  const runtimeDir = path.dirname(electronBin);
  const exeName =
    process.platform === "win32" || electronBin.toLowerCase().endsWith(".exe")
      ? "Solutions Play.exe"
      : "Solutions Play";
  const exe = path.join(runtimeDir, exeName);
  if (electronBin !== exe) fs.renameSync(electronBin, exe);

  // Remove o app de exemplo embutido no Electron.
  rmrf(path.join(runtimeDir, "resources", "default_app.asar"));

  // Monta resources/app com apenas o necessário.
  const appDir = path.join(runtimeDir, "resources", "app");
  rmrf(appDir);
  fs.mkdirSync(path.join(appDir, "electron"), { recursive: true });

  for (const f of ["main.cjs", "preload.cjs", "aes67.cjs"]) {
    const s = path.join(root, "electron", f);
    if (fs.existsSync(s)) copy(s, path.join(appDir, "electron", f));
  }
  copy(path.join(root, "dist"), path.join(appDir, "dist"));
  if (fs.existsSync(path.join(root, "program-defaults"))) {
    copy(path.join(root, "program-defaults"), path.join(appDir, "program-defaults"));
  }

  // package.json mínimo só com o que o Electron precisa em runtime.
  fs.writeFileSync(
    path.join(appDir, "package.json"),
    JSON.stringify(
      {
        name: "solutions-play",
        productName: "Solutions Play",
        version: "1.0.0",
        main: "electron/main.cjs",
      },
      null,
      2,
    ),
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
