/**
 * Web Audio 完全生成サウンド — アセット不要で必ず鳴る。
 * 効果音: 合成トーン/ノイズ。BGM: 8分音符シーケンサ（ネオンテクノ調）。
 */
export type SfxName =
  | 'move' | 'rotate' | 'soft' | 'hard' | 'lock'
  | 'line1' | 'line2' | 'line3' | 'line4'
  | 'tspin' | 'levelup' | 'hold' | 'gameover' | 'pause';

export class SoundEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private bgmGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private bgmTimer: number | null = null;
  private step = 0;
  private nextTime = 0;
  private tempo = 122;
  private muted = false;

  constructor() {
    try { this.muted = localStorage.getItem('ntv2:muted') === 'true'; } catch { /* noop */ }
  }

  get isMuted(): boolean { return this.muted; }

  /** ユーザー操作で一回呼ぶ */
  unlock(): void {
    if (!this.ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.8;
      this.master.connect(this.ctx.destination);
      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = 0.9;
      this.sfxGain.connect(this.master);
      this.bgmGain = this.ctx.createGain();
      this.bgmGain.gain.value = 0.4;
      this.bgmGain.connect(this.master);
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  setMuted(m: boolean): void {
    this.muted = m;
    if (this.master) this.master.gain.value = m ? 0 : 0.8;
    try { localStorage.setItem('ntv2:muted', String(m)); } catch { /* noop */ }
  }

  private tone(freq: number, dur: number, type: OscillatorType, vol: number, when = 0, target: GainNode | null = null): void {
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime + when;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(target ?? this.sfxGain!);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  private noise(dur: number, vol: number, when = 0, cutoff = 1400): void {
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime + when;
    const buf = this.ctx.createBuffer(1, Math.max(1, Math.floor(this.ctx.sampleRate * dur)), this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const g = this.ctx.createGain();
    g.gain.value = vol;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = cutoff;
    src.connect(filter); filter.connect(g); g.connect(this.sfxGain!);
    src.start(t0);
  }

  play(name: SfxName): void {
    if (typeof (window as any) !== 'undefined' && (window as any).__sfxLog) (window as any).__sfxLog.push(name);
    if (!this.ctx || this.muted) return;
    switch (name) {
      case 'move': this.tone(220, 0.05, 'square', 0.1); break;
      case 'rotate': this.tone(330, 0.07, 'triangle', 0.16); this.tone(495, 0.05, 'triangle', 0.1, 0.03); break;
      case 'soft': this.tone(170, 0.04, 'square', 0.08); break;
      case 'hard': this.noise(0.14, 0.4, 0, 2200); this.tone(90, 0.16, 'sine', 0.35); break;
      case 'lock': this.tone(190, 0.06, 'triangle', 0.18); break;
      case 'line1': this.tone(440, 0.12, 'square', 0.25); this.tone(660, 0.15, 'square', 0.2, 0.08); break;
      case 'line2':
        this.tone(440, 0.1, 'square', 0.24); this.tone(660, 0.1, 'square', 0.24, 0.07);
        this.tone(880, 0.16, 'square', 0.24, 0.14); break;
      case 'line3':
        this.tone(440, 0.09, 'square', 0.24); this.tone(587, 0.09, 'square', 0.24, 0.06);
        this.tone(739, 0.09, 'square', 0.24, 0.12); this.tone(880, 0.18, 'square', 0.24, 0.18); break;
      case 'line4':
        [523, 659, 784, 1046, 1318].forEach((f, i) => this.tone(f, 0.18, 'square', 0.26, i * 0.06));
        this.noise(0.4, 0.3); break;
      case 'tspin': [740, 988, 1319].forEach((f, i) => this.tone(f, 0.13, 'triangle', 0.3, i * 0.06)); break;
      case 'levelup': [392, 523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.15, 'triangle', 0.26, i * 0.07)); break;
      case 'hold': this.tone(300, 0.06, 'triangle', 0.16); this.tone(450, 0.08, 'triangle', 0.16, 0.05); break;
      case 'gameover': [440, 392, 330, 262, 196].forEach((f, i) => this.tone(f, 0.3, 'sawtooth', 0.2, i * 0.13)); break;
      case 'pause': this.tone(260, 0.09, 'triangle', 0.14); break;
    }
  }

  // ---- BGM ----
  startBGM(level = 1): void {
    this.stopBGM();
    this.tempo = 112 + (level - 1) * 7;
    if (!this.ctx) return;
    this.step = 0;
    this.nextTime = this.ctx.currentTime + 0.06;
    const tick = () => {
      this.schedule();
      this.bgmTimer = window.setTimeout(tick, Math.max(0, (this.nextTime - (this.ctx?.currentTime ?? 0)) * 1000));
    };
    tick();
  }

  private schedule(): void {
    if (!this.ctx || this.muted) return;
    const spb = 60 / this.tempo / 2;
    while (this.nextTime < this.ctx.currentTime + 0.14) {
      this.playStep(this.step, this.nextTime - this.ctx.currentTime);
      this.step = (this.step + 1) % 16;
      this.nextTime += spb;
    }
  }

  /** 16ステップ×A小調・ネオンテクノベース＋ハイハット風ノイズ */
  private playStep(step: number, when: number): void {
    if (!this.ctx || !this.bgmGain) return;
    const bassLine = [110, 0, 110, 0, 164.8, 0, 110, 130.8, 0, 130.8, 98, 0, 87.3, 0, 110, 0];
    const f = bassLine[step];
    if (f > 0) {
      this.tone(f, 0.2, 'sawtooth', 0.16, when, this.bgmGain);
      this.tone(f / 2, 0.22, 'triangle', 0.22, when, this.bgmGain);
    }
    if (step % 4 === 2) this.noiseBgm(0.04, 0.05, when); // ハイハット
    if (step === 0 || step === 8) this.tone(440, 0.07, 'sine', 0.05, when, this.bgmGain);
    if (step % 8 === 6) this.tone(880, 0.05, 'sine', 0.035, when, this.bgmGain);
  }

  private noiseBgm(dur: number, vol: number, when: number): void {
    if (!this.ctx || !this.bgmGain) return;
    const t0 = this.ctx.currentTime + when;
    const buf = this.ctx.createBuffer(1, Math.max(1, Math.floor(this.ctx.sampleRate * dur)), this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const g = this.ctx.createGain();
    g.gain.value = vol;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 6000;
    src.connect(filter); filter.connect(g); g.connect(this.bgmGain);
    src.start(t0);
  }

  stopBGM(): void {
    if (this.bgmTimer !== null) { clearTimeout(this.bgmTimer); this.bgmTimer = null; }
  }
}
