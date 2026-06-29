// Browser-only synth audio engine for Solutions-Play.
// Generates pleasant, lively "music-like" tones per track so VU meters and
// waveform animate for real, without needing audio files (local demo mode).

export interface SynthVoiceSpec {
  freq: number; // root frequency
}

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private analyser: AnalyserNode | null = null;
  private voices: { osc: OscillatorNode; gain: GainNode; lfo: OscillatorNode; lfoGain: GainNode }[] = [];
  private startedAt = 0;
  private offset = 0;
  private playing = false;
  private volume = 0.5;

  private ensure() {
    if (typeof window === "undefined") return;
    if (this.ctx) return;
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new Ctx();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.volume * 0.18;
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 1024;
    this.analyser.smoothingTimeConstant = 0.75;
    this.master.connect(this.analyser);
    this.analyser.connect(this.ctx.destination);
  }

  getAnalyser(): AnalyserNode | null {
    return this.analyser;
  }

  private clearVoices() {
    const ctx = this.ctx;
    if (!ctx) return;
    for (const v of this.voices) {
      try {
        v.gain.gain.cancelScheduledValues(ctx.currentTime);
        v.gain.gain.setTargetAtTime(0, ctx.currentTime, 0.05);
        v.osc.stop(ctx.currentTime + 0.3);
        v.lfo.stop(ctx.currentTime + 0.3);
      } catch {
        /* ignore */
      }
    }
    this.voices = [];
  }

  private buildVoices(rootFreq: number) {
    const ctx = this.ctx!;
    const master = this.master!;
    // a simple major-ish chord with octave + fifth for a "musical" texture
    const ratios = [1, 1.5, 2, 2.5];
    const types: OscillatorType[] = ["sawtooth", "triangle", "sine", "sine"];
    this.voices = ratios.map((r, i) => {
      const osc = ctx.createOscillator();
      osc.type = types[i];
      osc.frequency.value = rootFreq * r;
      const gain = ctx.createGain();
      gain.gain.value = 0;
      // LFO to modulate amplitude -> lively, music-like dynamics
      const lfo = ctx.createOscillator();
      lfo.type = "sine";
      lfo.frequency.value = 2 + Math.random() * 5;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 0.12;
      lfo.connect(lfoGain);
      lfoGain.connect(gain.gain);
      osc.connect(gain);
      gain.connect(master);
      const base = 0.22 / (i + 1);
      gain.gain.setTargetAtTime(base, ctx.currentTime + 0.02, 0.08);
      osc.start();
      lfo.start();
      return { osc, gain, lfo, lfoGain };
    });
  }

  play(rootFreq: number, fromOffset = 0) {
    this.ensure();
    if (!this.ctx) return;
    if (this.ctx.state === "suspended") void this.ctx.resume();
    this.clearVoices();
    this.buildVoices(rootFreq);
    this.offset = fromOffset;
    this.startedAt = this.ctx.currentTime;
    this.playing = true;
  }

  pause() {
    if (!this.ctx) return;
    this.offset = this.position();
    this.clearVoices();
    this.playing = false;
  }

  resume(rootFreq: number) {
    this.play(rootFreq, this.offset);
  }

  stop() {
    this.clearVoices();
    this.offset = 0;
    this.playing = false;
  }

  position(): number {
    if (!this.ctx || !this.playing) return this.offset;
    return this.offset + (this.ctx.currentTime - this.startedAt);
  }

  isPlaying() {
    return this.playing;
  }

  setVolume(v: number) {
    this.volume = v;
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(v * 0.18, this.ctx.currentTime, 0.05);
    }
  }

  // RMS level 0..1 for VU meters
  getLevel(): number {
    if (!this.analyser) return 0;
    const buf = new Uint8Array(this.analyser.fftSize);
    this.analyser.getByteTimeDomainData(buf);
    let sum = 0;
    for (let i = 0; i < buf.length; i++) {
      const x = (buf[i] - 128) / 128;
      sum += x * x;
    }
    return Math.min(1, Math.sqrt(sum / buf.length) * 2.4);
  }

  getWaveform(out: Uint8Array): Uint8Array {
    if (this.analyser) this.analyser.getByteTimeDomainData(out);
    return out;
  }
}

let singleton: AudioEngine | null = null;
export function getAudioEngine(): AudioEngine {
  if (!singleton) singleton = new AudioEngine();
  return singleton;
}