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
  private volume = 0.5;
  private schedTimer: ReturnType<typeof setInterval> | null = null;
  private nextNoteTime = 0;
  private step = 0;
  private secPerStep = 0.125;

  // real audio file state
  private audioEl: HTMLAudioElement | null = null;
  private mediaSrc: MediaElementAudioSourceNode | null = null;

  private ensure() {
    if (typeof window === "undefined") return;
    if (this.ctx) return;
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new Ctx();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.volume * 0.5;
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

  // ---- scheduler primitives ---------------------------------------------

  private note(time: number, freq: number, dur: number, type: OscillatorType, peak: number) {
    const ctx = this.ctx!, master = this.master!;
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
    const ctx = this.ctx!, master = this.master!;
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
      src.connect(f); f.connect(g);
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
    if (this.audioEl) {
      try { this.audioEl.pause(); } catch { /* ignore */ }
    }
  }

  // ---- public synth playback --------------------------------------------

  play(rootFreq: number, fromOffset = 0) {
    this.ensure();
    if (!this.ctx) return;
    if (this.ctx.state === "suspended") void this.ctx.resume();
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

  playUrl(url: string, fromOffset = 0) {
    this.ensure();
    if (!this.ctx) return;
    if (this.ctx.state === "suspended") void this.ctx.resume();
    this.stopScheduler();
    this.mode = "url";
    if (!this.audioEl) {
      this.audioEl = new Audio();
      this.audioEl.crossOrigin = "anonymous";
      this.mediaSrc = this.ctx.createMediaElementSource(this.audioEl);
      this.mediaSrc.connect(this.master!);
    }
    if (this.audioEl.src !== url) this.audioEl.src = url;
    try { this.audioEl.currentTime = fromOffset; } catch { /* ignore */ }
    void this.audioEl.play();
    this.playing = true;
  }

  pause() {
    if (!this.ctx) return;
    if (this.mode === "url") {
      this.offset = this.position();
      this.teardownMedia();
    } else {
      this.offset = this.position();
      this.stopScheduler();
    }
    this.playing = false;
  }

  resume(rootFreq?: number) {
    if (this.mode === "url" && this.audioEl) {
      if (this.ctx?.state === "suspended") void this.ctx.resume();
      void this.audioEl.play();
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

  position(): number {
    if (this.mode === "url" && this.audioEl) return this.audioEl.currentTime || this.offset;
    if (!this.ctx || !this.playing) return this.offset;
    return this.ctx.currentTime - this.startedAt;
  }

  isPlaying() {
    return this.playing;
  }

  setVolume(v: number) {
    this.volume = v;
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(v * 0.5, this.ctx.currentTime, 0.05);
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