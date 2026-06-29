// Formatos/codecs de áudio suportados pelo Solutions-Play.
// O motor de reprodução usa o Chromium embutido (Electron), que oferece os
// melhores decodificadores nativos para a maioria dos formatos do mercado:
// MP3, WAV, FLAC (lossless), AAC/M4A/MP4, OGG/Opus (Vorbis/Opus) e WebM.
// Mantemos a lista ampla para aceitar as principais extensões — quando o
// codec é suportado pelo sistema, toca com a melhor qualidade disponível.

// Extensão -> MIME. Usado tanto no app web quanto no processo nativo.
export const AUDIO_MIME: Record<string, string> = {
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".wave": "audio/wav",
  ".flac": "audio/flac",
  ".ogg": "audio/ogg",
  ".oga": "audio/ogg",
  ".opus": "audio/ogg",
  ".m4a": "audio/mp4",
  ".m4b": "audio/mp4",
  ".mp4": "audio/mp4",
  ".aac": "audio/aac",
  ".webm": "audio/webm",
  ".weba": "audio/webm",
  ".aiff": "audio/aiff",
  ".aif": "audio/aiff",
  ".aifc": "audio/aiff",
  ".wma": "audio/x-ms-wma",
  ".mka": "audio/x-matroska",
  ".3gp": "audio/3gpp",
  ".amr": "audio/amr",
  ".caf": "audio/x-caf",
};

// Lista de extensões (sem ponto) para diálogos de seleção.
export const AUDIO_EXTENSIONS = Object.keys(AUDIO_MIME).map((e) => e.slice(1));

// String pronta para o atributo `accept` de <input type="file">.
// Inclui audio/* + video/mp4 (container MP4 de áudio) + extensões explícitas,
// garantindo que .flac/.mp4/.opus etc. apareçam no seletor de todos os SOs.
export const AUDIO_ACCEPT = [
  "audio/*",
  "video/mp4",
  ...Object.keys(AUDIO_MIME),
].join(",");
