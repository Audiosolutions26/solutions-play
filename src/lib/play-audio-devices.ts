// Permissões e dispositivos de áudio (microfone e saída) — para gravação de
// Locuções e pré-escuta funcionarem sem falhas no Windows (Electron/Chromium).

export interface AudioDevicePrefs {
  inputId?: string;  // microfone (entrada)
  outputId?: string; // saída PRINCIPAL (no ar)
  cueId?: string;    // saída de PRÉ-ESCUTA (CUE / fora do ar)
}

const KEY = "solutions-play-audio-devices";

export function loadDevicePrefs(): AudioDevicePrefs {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "{}");
  } catch {
    return {};
  }
}

export function saveDevicePrefs(p: AudioDevicePrefs) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch { /* ignore */ }
}

export type MicPermission = "granted" | "denied" | "unsupported";

// Solicita permissão de microfone. No Windows/Electron isso aciona o prompt
// do sistema na primeira vez; depois fica memorizado.
export async function ensureMicPermission(): Promise<MicPermission> {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
    return "unsupported";
  }
  try {
    const prefs = loadDevicePrefs();
    const stream = await navigator.mediaDevices.getUserMedia(micConstraints(prefs.inputId));
    stream.getTracks().forEach((t) => t.stop());
    return "granted";
  } catch {
    return "denied";
  }
}

export function micConstraints(inputId?: string): MediaStreamConstraints {
  return {
    audio: inputId
      ? { deviceId: { exact: inputId }, echoCancellation: false, noiseSuppression: true }
      : { echoCancellation: false, noiseSuppression: true },
  };
}

export interface DeviceLists {
  inputs: MediaDeviceInfo[];
  outputs: MediaDeviceInfo[];
}

export async function listAudioDevices(): Promise<DeviceLists> {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.enumerateDevices) {
    return { inputs: [], outputs: [] };
  }
  const devices = await navigator.mediaDevices.enumerateDevices();
  return {
    inputs: devices.filter((d) => d.kind === "audioinput"),
    outputs: devices.filter((d) => d.kind === "audiooutput"),
  };
}

// Aplica o dispositivo de saída a um <audio>/<video> (setSinkId — Chromium).
export async function applyOutput(el: HTMLMediaElement, outputId?: string): Promise<boolean> {
  const anyEl = el as HTMLMediaElement & { setSinkId?: (id: string) => Promise<void> };
  if (!outputId || typeof anyEl.setSinkId !== "function") return false;
  try {
    await anyEl.setSinkId(outputId);
    return true;
  } catch {
    return false;
  }
}
