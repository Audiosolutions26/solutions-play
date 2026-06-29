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
