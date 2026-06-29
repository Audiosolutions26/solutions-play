// Minimal, safe preload. Exposes only a version flag to the renderer.
const { contextBridge } = require("electron");
contextBridge.exposeInMainWorld("solutionsPlay", { desktop: true, platform: process.platform });
