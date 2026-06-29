// Preload seguro: expõe seletor de arquivos nativo e leitura por caminho,
// usados pelas Locuções/áudios no Windows (manual p.111-112).
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("solutionsPlay", {
  desktop: true,
  platform: process.platform,
  // Abre o diálogo nativo do Windows e devolve arquivos { path, name, dataUrl }.
  pickAudioFiles: () => ipcRenderer.invoke("sp:pick-audio-files"),
  // Recarrega um áudio a partir de um caminho persistido (data URL).
  readAudioPath: (path) => ipcRenderer.invoke("sp:read-audio-path", path),
});
