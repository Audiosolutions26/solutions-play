// Preload seguro (contextIsolation): expõe apenas a allow-list de canais IPC
// para o renderer. Cada método abaixo tem um handler correspondente:
//   sp:pick-audio-files / sp:read-audio-path  -> electron/main.cjs
//   aes67:tx:validate / aes67:tx:open /
//   aes67:tx:close / aes67:loopback:run       -> electron/aes67.cjs
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("solutionsPlay", {
  desktop: true,
  platform: process.platform,

  // --- Áudios / Locuções (manual p.111-112) ---
  // Abre o diálogo nativo do Windows e devolve arquivos { path, name, dataUrl }.
  pickAudioFiles: () => ipcRenderer.invoke("sp:pick-audio-files"),
  // Recarrega um áudio a partir de um caminho persistido (data URL).
  readAudioPath: (filePath) => ipcRenderer.invoke("sp:read-audio-path", filePath),

  // --- Pastas de trabalho / Atalhos (manual p.145-149) ---
  // Abre a árvore de pastas do Windows e devolve { path, name, audioCount }.
  pickFolder: (current) => ipcRenderer.invoke("sp:pick-folder", current),
  // Abre a pasta apontada pelo atalho no Explorer do Windows.
  openFolder: (dir) => ipcRenderer.invoke("sp:open-folder", dir),
  // Valida se o diretório do atalho existe (evita atalho quebrado).
  folderExists: (dir) => ipcRenderer.invoke("sp:folder-exists", dir),
  // Lista os arquivos de áudio da pasta apontada pelo atalho.
  listFolderAudio: (dir) => ipcRenderer.invoke("sp:list-folder-audio", dir),

  // --- RDS: gravar arquivos TXT (no ar + próximas) ---
  // payload: { dir?, files: [{ name, content }] } -> devolve a pasta gravada.
  writeRds: (payload) => ipcRenderer.invoke("sp:write-rds", payload),

  // --- AES67 TX (áudio sobre IP / RTP multicast) ---
  aes67: {
    // Validação ao vivo (faixa multicast, porta, MTU, interfaces, conflitos).
    validate: (cfg) => ipcRenderer.invoke("aes67:tx:validate", cfg),
    // Abre TX real (fluxo RTP contínuo + anúncio SAP/SDP).
    openTx: (cfg) => ipcRenderer.invoke("aes67:tx:open", cfg),
    // Encerra a TX ativa e envia o SAP de remoção.
    closeTx: () => ipcRenderer.invoke("aes67:tx:close"),
    // Teste de loopback: codifica L16/L24 BE, recebe e mede SNR/continuidade.
    loopback: (cfg) => ipcRenderer.invoke("aes67:loopback:run", cfg),
  },
});
