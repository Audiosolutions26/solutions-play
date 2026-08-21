// Browser-only audio engine for Solutions-Play.
// Two real, analysable sources feed a shared AnalyserNode so the waveform
// and VU meters always reflect the ACTUAL audio in real time:
//   1) Real audio files loaded by the user (MediaElementSource).
//   2) A live step-sequencer synth (beats + melody) for demo tracks, which
//      produces genuinely time-varying output (not a static chord).

export interface SynthVoiceSpec {
  freq: number; // root frequency
}

// Pentatonic-ish scale (semitone offsets) for pleasant, varied melodies.
const SCALE = [0, 2, 4, 7, 9, 12, 14];
const semis = (n: number) => Math.pow(2, n / 12);

type Mode = "synth" | "url" | null;

// Curvas de crossfade de POTÊNCIA CONSTANTE (equal-power). Diferente do fade
// linear (que provoca uma "barriga" de volume no meio da mixagem), as curvas
// seno/cosseno mantêm a energia percebida constante durante toda a passagem —
// é o que os softwares profissionais de rádio/DJ usam para mixar músicas.
const EP_STEPS = 64;
const EP_IN = new Float32Array(EP_STEPS);
const EP_OUT = new Float32Array(EP_STEPS);
for (let i = 0; i < EP_STEPS; i++) {
  const x = i / (EP_STEPS - 1);
  EP_IN[i] = Math.sin((x * Math.PI) / 2); // 0 → 1 (entra)
  EP_OUT[i] = Math.cos((x * Math.PI) / 2); // 1 → 0 (sai)
}

// Só usar crossOrigin="anonymous" para URLs http(s) remotas. Em data:/blob:/file:
// (áudios locais e de pasta) definir crossOrigin "tainta" o MediaElementSource,
// fazendo o AnalyserNode ler SILÊNCIO — o som toca, mas VU/waveform ficam zerados.
function applyCrossOrigin(el: HTMLAudioElement, url: string) {
  if (/^https?:/i.test(url)) el.crossOrigin = "anonymous";
  else el.removeAttribute("crossorigin");
}

// Uma "voz" de reprodução de URL: elemento de áudio + nó de origem + ganho
// próprio (para fade/crossfade independente das outras vozes).
interface UrlVoice {
  el: HTMLAudioElement;
  src: MediaElementAudioSourceNode;
  gain: GainNode;
  sourceUrl: string;
  streamRetries: number;
  retryTimer: number | null;
}

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private analyser: AnalyserNode | null = null;
  private noiseBuf: AudioBuffer | null = null;

  // synth sequencer state
  private mode: Mode = null;
  private rootFreq = 220;
  private startedAt = 0;
  private offset = 0;
  private playing = false;
  private schedTimer: ReturnType<typeof setInterval> | null = null;
  private nextNoteTime = 0;
  private step = 0;
  private secPerStep = 0.125;

  // real audio file state
  // Vozes de URL (uma por inserção em reprodução). Durante a mixagem
  // (crossfade) coexistem temporariamente duas vozes: a que sai e a que entra.
  private mainVoice: UrlVoice | null = null;
  // Callback disparado quando a inserção atual (voz principal) termina
  // naturalmente — usado para o avanço automático mesmo sem duração conhecida.
  private onEndedCb: (() => void) | null = null;

  private ensure() {
    if (typeof window === "undefined") return;
    if (this.ctx) return;
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    // latencyHint "playback" prioriza QUALIDADE sobre latência (ideal para
    // playout de rádio), deixando o motor usar a taxa de amostragem nativa
    // do hardware sem reamostragem desnecessária.
    this.ctx = new Ctx({ latencyHint: "playback" });
    this.master = this.ctx.createGain();
    // Ganho de saída SEMPRE unitário (1.0): a reprodução fica exatamente no
    // nível original do arquivo. Não há controle de volume do usuário — apenas
    // os fades e crossfades automáticos alteram o ganho, sempre voltando a 1.0.
    this.master.gain.value = 1;
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 1024;
    this.analyser.smoothingTimeConstant = 0.6;
    this.master.connect(this.analyser);
    this.analyser.connect(this.ctx.destination);
    // white-noise buffer reused for percussion (hi-hats / snare).
    const len = Math.floor(this.ctx.sampleRate * 0.4);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.noiseBuf = buf;
  }

  getAnalyser(): AnalyserNode | null {
    return this.analyser;
  }

  // Registra o callback de "fim da faixa atual" (avanço automático confiável).
  setOnEnded(cb: (() => void) | null) {
    this.onEndedCb = cb;
  }

  // ---- vozes de URL (para mixagem/crossfade real) -----------------------

  private makeVoice(url: string): UrlVoice | null {
    if (!this.ctx || !this.master) return null;
    const el = new Audio();
    applyCrossOrigin(el, url);
    // Preserva o tom em qualquer mudança de velocidade e desativa filtros que
    // degradam o sinal — mantém a fidelidade máxima do arquivo original.
    el.preservesPitch = true;
    el.preload = "auto";
    el.src = url;
    const src = this.ctx.createMediaElementSource(el);
    const gain = this.ctx.createGain();
    src.connect(gain);
    gain.connect(this.master);
    const voice: UrlVoice = { el, src, gain, sourceUrl: url, streamRetries: 0, retryTimer: null };
    // Streams remotos podem cair. Faz no máximo três tentativas graduais e
    // nunca deixa uma falha externa disparar avanço falso da programação.
    el.addEventListener("error", () => {
      if (
        voice !== this.mainVoice ||
        !/^https?:/i.test(voice.sourceUrl) ||
        voice.streamRetries >= 3
      )
        return;
      const delay = 500 * 2 ** voice.streamRetries;
      voice.streamRetries++;
      voice.retryTimer = window.setTimeout(() => {
        if (voice !== this.mainVoice || !this.playing) return;
        try {
          voice.el.load();
        } catch {
          /* ignore */
        }
        void voice.el.play().catch(() => undefined);
      }, delay);
    });
    el.addEventListener("playing", () => {
      voice.streamRetries = 0;
      if (voice.retryTimer !== null) {
        window.clearTimeout(voice.retryTimer);
        voice.retryTimer = null;
      }
    });
    // Avanço automático no fim real do arquivo. Só a voz PRINCIPAL dispara
    // (vozes antigas em crossfade são ignoradas para não pular duas vezes).
    el.addEventListener("ended", () => {
      if (voice === this.mainVoice && this.onEndedCb) this.onEndedCb();
    });
    return voice;
  }

  private disposeVoice(v: UrlVoice | null) {
    if (!v) return;
    if (v.retryTimer !== null) {
      window.clearTimeout(v.retryTimer);
      v.retryTimer = null;
    }
    try {
      v.el.pause();
    } catch {
      /* ignore */
    }
    try {
      v.gain.disconnect();
    } catch {
      /* ignore */
    }
    try {
      v.src.disconnect();
    } catch {
      /* ignore */
    }
  }

  private disposeVoiceAfter(v: UrlVoice, seconds: number) {
    window.setTimeout(() => this.disposeVoice(v), seconds * 1000 + 60);
  }

  // ---- scheduler primitives ---------------------------------------------

  private note(time: number, freq: number, dur: number, type: OscillatorType, peak: number) {
    const ctx = this.ctx!,
      master = this.master!;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, time);
    g.gain.linearRampToValueAtTime(peak, time + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, time + dur);
    osc.connect(g);
    g.connect(master);
    osc.start(time);
    osc.stop(time + dur + 0.02);
  }

  private perc(time: number, dur: number, peak: number, hp = false) {
    const ctx = this.ctx!,
      master = this.master!;
    if (!this.noiseBuf) return;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const g = ctx.createGain();
    g.gain.setValueAtTime(peak, time);
    g.gain.exponentialRampToValueAtTime(0.0001, time + dur);
    if (hp) {
      const f = ctx.createBiquadFilter();
      f.type = "highpass";
      f.frequency.value = 6000;
      src.connect(f);
      f.connect(g);
    } else {
      src.connect(g);
    }
    g.connect(master);
    src.start(time);
    src.stop(time + dur + 0.02);
  }

  private scheduleStep(stepIndex: number, time: number) {
    const s = stepIndex % 16;
    const root = this.rootFreq;
    // Kick on beats, snare on backbeat -> strong VU pulses.
    if (s % 4 === 0) this.note(time, root * 0.5, 0.18, "sine", 0.9);
    if (s === 4 || s === 12) this.perc(time, 0.18, 0.5);
    // Hi-hats on every 8th -> continuous waveform texture.
    if (s % 2 === 0) this.perc(time, 0.05, 0.18, true);
    // Bassline.
    if (s % 4 === 0) {
      const bn = SCALE[(Math.floor(s / 4) * 2) % SCALE.length];
      this.note(time, root * 0.5 * semis(bn), this.secPerStep * 3.2, "triangle", 0.35);
    }
    // Melody arpeggio (varies per step -> moving waveform).
    if (s % 2 === 1 || s % 8 === 6) {
      const idx = (s * 3 + stepIndex * 5) % SCALE.length;
      this.note(time, root * semis(SCALE[idx] + 12), this.secPerStep * 1.6, "sawtooth", 0.22);
    }
  }

  private startScheduler() {
    const ctx = this.ctx!;
    this.nextNoteTime = ctx.currentTime + 0.05;
    const lookahead = 0.12;
    const tick = () => {
      if (!this.ctx || this.mode !== "synth" || !this.playing) return;
      while (this.nextNoteTime < this.ctx.currentTime + lookahead) {
        this.scheduleStep(this.step, this.nextNoteTime);
        this.nextNoteTime += this.secPerStep;
        this.step++;
      }
    };
    this.stopScheduler();
    this.schedTimer = setInterval(tick, 25);
    tick();
  }

  private stopScheduler() {
    if (this.schedTimer != null) {
      clearInterval(this.schedTimer);
      this.schedTimer = null;
    }
  }

  private teardownMedia() {
    this.disposeVoice(this.mainVoice);
    this.mainVoice = null;
  }

  // ---- public synth playback --------------------------------------------

  play(rootFreq: number, fromOffset = 0) {
    this.ensure();
    if (!this.ctx) return;
    if (this.ctx.state === "suspended") void this.ctx.resume();
    // Garante o nível base original (1.0) caso um fade-out anterior tenha
    // baixado o master.
    if (this.master) this.master.gain.setValueAtTime(1, this.ctx.currentTime);
    this.teardownMedia();
    this.stopScheduler();
    this.mode = "synth";
    this.rootFreq = rootFreq;
    // tempo varies per track so each one sounds distinct.
    const bpm = 92 + (Math.round(rootFreq) % 44);
    this.secPerStep = 60 / bpm / 4;
    this.offset = fromOffset;
    this.startedAt = this.ctx.currentTime - fromOffset;
    this.step = Math.max(0, Math.round(fromOffset / this.secPerStep));
    this.playing = true;
    this.startScheduler();
  }

  // ---- public real-file playback ----------------------------------------

  // Toca uma URL. Com fadeMs > 0 e uma voz já tocando, faz a MIXAGEM
  // (crossfade) entre a inserção que sai e a que entra — manual p.106.
  playUrl(url: string, fromOffset = 0, fadeMs = 0, equalPower = true) {
    this.ensure();
    if (!this.ctx || !this.master) return;
    if (this.ctx.state === "suspended") void this.ctx.resume();
    // Master sempre em 1.0: o nível de cada faixa é o do próprio arquivo.
    this.master.gain.cancelScheduledValues(this.ctx.currentTime);
    this.master.gain.setValueAtTime(1, this.ctx.currentTime);
    this.stopScheduler();
    this.mode = "url";

    const prev = this.mainVoice;
    const voice = this.makeVoice(url);
    if (!voice) return;
    try {
      voice.el.currentTime = fromOffset;
    } catch {
      /* ignore */
    }

    const now = this.ctx.currentTime;
    const fade = Math.max(0, fadeMs) / 1000;

    if (prev && this.playing && fade > 0) {
      // Crossfade: nova voz sobe de 0→1; voz anterior desce 1→0 e é descartada.
      // Equal-power (padrão) mantém o volume percebido constante na mixagem.
      const gIn = voice.gain.gain;
      gIn.cancelScheduledValues(now);
      gIn.setValueAtTime(0, now);
      const gOut = prev.gain.gain;
      gOut.cancelScheduledValues(now);
      gOut.setValueAtTime(gOut.value, now);
      if (equalPower) {
        gIn.setValueCurveAtTime(EP_IN, now, fade);
        gOut.setValueCurveAtTime(EP_OUT, now, fade);
      } else {
        gIn.linearRampToValueAtTime(1, now + fade);
        gOut.linearRampToValueAtTime(0, now + fade);
      }
      this.disposeVoiceAfter(prev, fade);
    } else {
      // Sem mixagem: corta a anterior e entra direto.
      this.disposeVoice(prev);
      voice.gain.gain.setValueAtTime(1, now);
    }

    void voice.el.play();
    this.mainVoice = voice;
    this.playing = true;
  }

  pause() {
    if (!this.ctx) return;
    this.offset = this.position();
    if (this.mode === "url") {
      if (this.mainVoice) {
        try {
          this.mainVoice.el.pause();
        } catch {
          /* ignore */
        }
      }
    } else {
      this.stopScheduler();
    }
    this.playing = false;
  }

  resume(rootFreq?: number) {
    if (this.mode === "url" && this.mainVoice) {
      if (this.ctx?.state === "suspended") void this.ctx.resume();
      void this.mainVoice.el.play();
      this.playing = true;
      return;
    }
    this.play(rootFreq ?? this.rootFreq, this.offset);
  }

  stop() {
    this.stopScheduler();
    this.teardownMedia();
    this.offset = 0;
    this.playing = false;
  }

  // One-shot sound for QuickStart pads (independent of main playback)
  fire(rootFreq: number, duration = 0.9) {
    this.ensure();
    const ctx = this.ctx;
    const master = this.master;
    if (!ctx || !master) return;
    if (ctx.state === "suspended") void ctx.resume();
    const t0 = ctx.currentTime;
    const ratios = [1, 1.5, 2];
    const types: OscillatorType[] = ["triangle", "sine", "sine"];
    ratios.forEach((r, i) => {
      const osc = ctx.createOscillator();
      osc.type = types[i];
      osc.frequency.value = rootFreq * r;
      const gain = ctx.createGain();
      const peak = 0.3 / (i + 1);
      gain.gain.setValueAtTime(0, t0);
      gain.gain.linearRampToValueAtTime(peak, t0 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
      osc.connect(gain);
      gain.connect(master);
      osc.start(t0);
      osc.stop(t0 + duration + 0.05);
    });
  }

  // One-shot real-audio playback for QuickStart pads (over the air, doesn't
  // interrupt the main program).
  // Sem deviceId: toca através do analyser compartilhado (VU/waveform refletem).
  // Com deviceId: roteia para a saída escolhida (manual p.111 — saída QuickStart)
  // usando setSinkId em um elemento dedicado, fora do AudioContext.
  fireUrl(url: string, duration = 2, deviceId?: string) {
    if (deviceId) {
      this.fireUrlOn(url, deviceId, duration);
      return;
    }
    this.ensure();
    const ctx = this.ctx;
    const master = this.master;
    if (!ctx || !master) return;
    if (ctx.state === "suspended") void ctx.resume();
    const el = new Audio();
    applyCrossOrigin(el, url);
    el.src = url;
    try {
      const src = ctx.createMediaElementSource(el);
      src.connect(master);
    } catch {
      /* ignore */
    }
    void el.play();
    if (duration > 0) {
      window.setTimeout(() => {
        try {
          el.pause();
        } catch {
          /* ignore */
        }
      }, duration * 1000);
    }
  }

  // Toca um áudio one-shot diretamente em uma saída específica (setSinkId).
  private fireUrlOn(url: string, deviceId: string, duration = 2) {
    const el = new Audio() as HTMLAudioElement & { setSinkId?: (id: string) => Promise<void> };
    applyCrossOrigin(el, url);
    el.src = url;
    const start = () => {
      void el.play();
      if (duration > 0) {
        window.setTimeout(() => {
          try {
            el.pause();
          } catch {
            /* ignore */
          }
        }, duration * 1000);
      }
    };
    if (typeof el.setSinkId === "function") {
      el.setSinkId(deviceId).then(start).catch(start);
    } else {
      start();
    }
  }

  position(): number {
    if (this.mode === "url" && this.mainVoice) return this.mainVoice.el.currentTime || this.offset;
    if (!this.ctx || !this.playing) return this.offset;
    return this.ctx.currentTime - this.startedAt;
  }

  // Duração real do áudio de URL em reprodução (0 quando indisponível).
  // Usado para inserções de pasta que ainda não têm duração conhecida.
  mediaDuration(): number {
    if (this.mode === "url" && this.mainVoice) {
      const d = this.mainVoice.el.duration;
      return Number.isFinite(d) ? d : 0;
    }
    return 0;
  }

  isPlaying() {
    return this.playing;
  }

  // Fade-out AUTOMÁTICO (marcador de Início do Fade-Out, manual p.113-119).
  // Atua sobre o ganho da própria inserção em reprodução (url) ou sobre o
  // master (synth de demonstração), sem nunca mexer no nível base do arquivo.
  // Em url, é descartável: a próxima faixa cria uma nova voz com ganho 1.0.
  fadeOutCurrent(durationSec: number) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const dur = Math.max(0.05, durationSec);
    const param =
      this.mode === "url" && this.mainVoice ? this.mainVoice.gain.gain : this.master?.gain;
    if (!param) return;
    param.cancelScheduledValues(now);
    param.setValueAtTime(param.value, now);
    param.linearRampToValueAtTime(0.0001, now + dur);
  }

  // Define o dispositivo de saída (setSinkId — Chromium/Electron no Windows).
  async setOutputDevice(deviceId: string): Promise<boolean> {
    this.ensure();
    const ctx = this.ctx as (AudioContext & { setSinkId?: (id: string) => Promise<void> }) | null;
    if (!ctx || typeof ctx.setSinkId !== "function") return false;
    try {
      await ctx.setSinkId(deviceId || "");
      return true;
    } catch {
      return false;
    }
  }

  // RMS level 0..1 for VU meters
  getLevel(): number {
    if (!this.analyser) return 0;
    const buf = new Uint8Array(new ArrayBuffer(this.analyser.fftSize));
    this.analyser.getByteTimeDomainData(buf);
    let sum = 0;
    for (let i = 0; i < buf.length; i++) {
      const x = (buf[i] - 128) / 128;
      sum += x * x;
    }
    return Math.min(1, Math.sqrt(sum / buf.length) * 2.4);
  }

  getWaveform(out: Uint8Array<ArrayBuffer>): Uint8Array<ArrayBuffer> {
    if (this.analyser) this.analyser.getByteTimeDomainData(out);
    return out;
  }
}

let singleton: AudioEngine | null = null;
export function getAudioEngine(): AudioEngine {
  if (!singleton) singleton = new AudioEngine();
  return singleton;
}
