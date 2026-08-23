/**
 * Formato de metadados sidecar .mrk do mrk_editor.
 *
 * Estes arquivos são gerados pelo editor Python e ficam em uma subpasta 'mark/'
 * relativa ao áudio original, com o nome '<audio_filename>.mrk'.
 */

import { type Marker, type MarkerKind, normalizeMarker, sortMarkers } from "./play-markers";
import { readPkfInfoNative } from "./play-native";
import type { Track } from "./play-data";
import { saveMarkers, getMarkers } from "./play-markers";

export interface MrkMarker {
  id: string;
  type: string; // 'mix_in', 'mix_out', 'intro', 'voice', 'stamp', 'chorus', 'custom'
  name: string;
  time_ms: number;
  locked: boolean;
}

export interface MrkDocument {
  audio: {
    filename: string;
    relative_path: string;
    duration_ms: number;
  };
  markers: MrkMarker[];
}

const MRK_TYPE_MAP: Record<string, MarkerKind> = {
  mix_in: "startPoint",
  mix_out: "endPoint",
  intro: "introEnd",
  voice: "locStart",
  stamp: "carimbo",
  chorus: "refraoStart",
  custom: "annotation",
};

/** Converte o documento .mrk para o formato interno de Markers. */
export function mrkToMarkers(doc: MrkDocument, durationSec: number): Marker[] {
  return doc.markers.map((m) => {
    const kind = MRK_TYPE_MAP[m.type] || "annotation";
    const positionSec = m.time_ms / 1000;
    return normalizeMarker(
      {
        kind,
        pos: durationSec > 0 ? positionSec / durationSec : 0,
        positionSec,
        id: m.id,
        note: m.name,
        locked: m.locked,
      },
      durationSec,
    );
  });
}

/** 
 * Tenta ler o sidecar .mrk (do editor Python) para uma faixa.
 * O Electron deve estar configurado para procurar na pasta 'mark/' relativa ao arquivo.
 */
export async function importMrkInfoForTrack(track: Track): Promise<{ success: boolean; count: number }> {
  if (!track.filePath) return { success: false, count: 0 };

  try {
    // O Electron agora tenta ler .mrk se .pkfinfo não existir no mesmo handler sp:read-pkfinfo.
    const raw = await readPkfInfoNative(track.filePath);
    if (!raw) return { success: false, count: 0 };

    // Detecta se é o formato .mrk verificando a presença de audio.duration_ms
    const parsedRaw = JSON.parse(raw);
    if (!parsedRaw.audio || typeof parsedRaw.audio.duration_ms !== 'number') return { success: false, count: 0 };

    const doc = parsedRaw as MrkDocument;
    const durationSec = doc.audio.duration_ms / 1000;
    const markers = mrkToMarkers(doc, durationSec);

    // Salva os marcadores se forem válidos
    if (markers.length > 0) {
      const existing = getMarkers(track.id);
      const existingLocked = existing.filter((m) => m.locked);
      
      // Filtra marcadores entrantes, dando preferência aos já travados no sistema
      const incoming = markers.filter(
        (m) => !existingLocked.some((locked) => locked.kind === m.kind)
      );
      
      saveMarkers(track.id, sortMarkers([...existingLocked, ...incoming], durationSec));
      return { success: true, count: markers.length };
    }
  } catch (e) {
    console.warn("Falha ao importar .mrk:", e);
  }
  return { success: false, count: 0 };
}
