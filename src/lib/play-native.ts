// Ponte com o app desktop (Electron/Windows). Fornece seletor de arquivos
// nativo e leitura por caminho para Locuções/áudios, com fallback web.

export interface NativePickedFile {
  path: string;
  name: string;
  dataUrl: string; // base64 data URL pronto para tocar
}

interface NativeBridge {
  desktop?: boolean;
  platform?: string;
  pickAudioFiles?: () => Promise<NativePickedFile[]>;
  readAudioPath?: (path: string) => Promise<string | null>; // retorna data URL
  pickFolder?: (current?: string) => Promise<NativePickedFolder | null>;
  openFolder?: (dir: string) => Promise<boolean>;
  folderExists?: (dir: string) => Promise<boolean>;
  listFolderAudio?: (dir: string) => Promise<NativeFolderAudio[]>;
}

export interface NativePickedFolder {
  path: string;
  name: string;
  audioCount: number;
}

export interface NativeFolderAudio {
  path: string;
  name: string;
}

export function nativeBridge(): NativeBridge | null {
  if (typeof window === "undefined") return null;
  return (window as unknown as { solutionsPlay?: NativeBridge }).solutionsPlay ?? null;
}

export function isDesktop(): boolean {
  return !!nativeBridge()?.desktop;
}

export function platformLabel(): string {
  const p = nativeBridge()?.platform;
  if (p === "win32") return "Windows";
  if (p === "darwin") return "macOS";
  if (p === "linux") return "Linux";
  return "Web";
}

// Abre o diálogo nativo do Windows e devolve os arquivos escolhidos (com
// caminho persistível e dataUrl tocável). Retorna null quando não há ponte
// nativa (modo web) — nesse caso use <input type="file">.
export async function pickAudioFilesNative(): Promise<NativePickedFile[] | null> {
  const b = nativeBridge();
  if (!b?.pickAudioFiles) return null;
  try {
    return await b.pickAudioFiles();
  } catch {
    return [];
  }
}

// Recarrega um áudio a partir de um caminho persistido (sessões seguintes).
export async function readAudioPathNative(path: string): Promise<string | null> {
  const b = nativeBridge();
  if (!b?.readAudioPath) return null;
  try {
    return await b.readAudioPath(path);
  } catch {
    return null;
  }
}

// Abre a árvore de pastas do Windows para apontar um atalho a uma pasta.
// Retorna null quando não há ponte nativa (modo web) ou quando o usuário cancela.
export async function pickFolderNative(current?: string): Promise<NativePickedFolder | null> {
  const b = nativeBridge();
  if (!b?.pickFolder) return null;
  try {
    return await b.pickFolder(current);
  } catch {
    return null;
  }
}

// Abre uma pasta no Explorer do Windows. Retorna false em modo web.
export async function openFolderNative(dir: string): Promise<boolean> {
  const b = nativeBridge();
  if (!b?.openFolder) return false;
  try {
    return await b.openFolder(dir);
  } catch {
    return false;
  }
}

// Valida se um diretório existe. Retorna null em modo web (não há como checar).
export async function folderExistsNative(dir: string): Promise<boolean | null> {
  const b = nativeBridge();
  if (!b?.folderExists) return null;
  try {
    return await b.folderExists(dir);
  } catch {
    return false;
  }
}

// Lista os áudios de uma pasta (carrega as músicas reais do atalho).
// Retorna null em modo web (não há acesso ao sistema de arquivos).
export async function listFolderAudioNative(dir: string): Promise<NativeFolderAudio[] | null> {
  const b = nativeBridge();
  if (!b?.listFolderAudio) return null;
  try {
    return await b.listFolderAudio(dir);
  } catch {
    return [];
  }
}
