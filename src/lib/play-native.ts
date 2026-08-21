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
  writeRds?: (payload: RdsWritePayload) => Promise<string | null>;
  programDirs?: () => Promise<ProgramDirs>;
  listProgramFiles?: (kind: ProgramKind) => Promise<ProgramFile[]>;
  readTextFile?: (file: string) => Promise<string | null>;
  writeProgramFile?: (payload: ProgramWritePayload) => Promise<string | null>;
  openProgramFolder?: (kind: ProgramKind | "base") => Promise<boolean>;
  readPkfInfo?: (audioPath: string) => Promise<string | null>;
  writePkfInfo?: (payload: PkfInfoWritePayload) => Promise<string | null>;
}

export interface RdsFile {
  name: string;
  content: string;
}
export interface RdsWritePayload {
  dir?: string;
  files: RdsFile[];
}

// "grades" = programação musical · "mapas" = programação comercial.
export type ProgramKind = "grades" | "mapas";
export interface ProgramDirs {
  base: string;
  grades: string;
  mapas: string;
}
export interface ProgramFile {
  name: string;
  path: string;
  mtime: number;
}
export interface ProgramWritePayload {
  kind: ProgramKind;
  name: string;
  content: string;
}
export interface PkfInfoWritePayload {
  audioPath: string;
  content: string;
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

// Grava os arquivos de RDS (no ar + próximas) na pasta RDS. Retorna a pasta
// gravada ou null em modo web (sem acesso ao sistema de arquivos).
export async function writeRdsNative(payload: RdsWritePayload): Promise<string | null> {
  const b = nativeBridge();
  if (!b?.writeRds) return null;
  try {
    return await b.writeRds(payload);
  } catch {
    return null;
  }
}

// Raiz do programa + pastas Grades (musical) e Mapas (comercial).
// Retorna null em modo web (sem sistema de arquivos).
export async function programDirsNative(): Promise<ProgramDirs | null> {
  const b = nativeBridge();
  if (!b?.programDirs) return null;
  try {
    return await b.programDirs();
  } catch {
    return null;
  }
}

// Lista os arquivos .txt das pastas Grades/Mapas. Null em modo web.
export async function listProgramFilesNative(kind: ProgramKind): Promise<ProgramFile[] | null> {
  const b = nativeBridge();
  if (!b?.listProgramFiles) return null;
  try {
    return await b.listProgramFiles(kind);
  } catch {
    return [];
  }
}

// Lê o conteúdo de um arquivo de programação por caminho. Null em modo web.
export async function readTextFileNative(file: string): Promise<string | null> {
  const b = nativeBridge();
  if (!b?.readTextFile) return null;
  try {
    return await b.readTextFile(file);
  } catch {
    return null;
  }
}

// Grava um .txt em Grades/Mapas. Retorna o caminho gravado ou null em modo web.
export async function writeProgramFileNative(payload: ProgramWritePayload): Promise<string | null> {
  const b = nativeBridge();
  if (!b?.writeProgramFile) return null;
  try {
    return await b.writeProgramFile(payload);
  } catch {
    return null;
  }
}

// Abre a pasta Grades/Mapas (ou a raiz) no Explorer. False em modo web.
export async function openProgramFolderNative(kind: ProgramKind | "base"): Promise<boolean> {
  const b = nativeBridge();
  if (!b?.openProgramFolder) return false;
  try {
    return await b.openProgramFolder(kind);
  } catch {
    return false;
  }
}

export async function readPkfInfoNative(audioPath: string): Promise<string | null> {
  const b = nativeBridge();
  if (!b?.readPkfInfo) return null;
  try {
    return await b.readPkfInfo(audioPath);
  } catch {
    return null;
  }
}

export async function writePkfInfoNative(payload: PkfInfoWritePayload): Promise<string | null> {
  const b = nativeBridge();
  if (!b?.writePkfInfo) return null;
  try {
    return await b.writePkfInfo(payload);
  } catch {
    return null;
  }
}
