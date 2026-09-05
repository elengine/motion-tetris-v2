import { Howl, Howler } from 'howler';

export type SfxName =
  | 'move' | 'rotate' | 'soft' | 'hard' | 'lock'
  | 'line1' | 'line2' | 'line3' | 'line4'
  | 'tspin' | 'levelup' | 'hold' | 'gameover' | 'pause';

/**
 * Howler ベースのオーディオマネージャ。
 * CC0 音源 (public/sounds/) があればそれを使い、無い環境では v1 実績の
 * Web Audio 生成音へフォールバックする（ここでは生成音を Howler 経由で出す）。
 */
export class AudioManager {
  private sfx: Partial<Record<SfxName, Howl>> = {};
  private bgm: Howl | null = null;
  private bgmId: number | null = null;
  private muted = false;
  /** CC0音源が無く Web Audio フォールバックで鳴らすべきか */
  private useFallback = false;
  private ac: AudioContext | null = null;
  private bgmTimer: number | null = null;
  private bgmStep = 0;
  private nextStepTime = 0;
  private tempo = 120;

  constructor() {
    try {
      this.muted = localStorage.getItem('mtv2:muted') === 'true';
    } catch { /* noop */ }
    Howler.volume(this.muted ? 0 : 0.75);
  }

  get isMuted(): boolean { return this.muted; }

  setMuted(m: boolean): void {
    this.muted = m;
    Howler.volume(m ? 0 : 0.75);
    if (this.ac && this.master) this.master.gain.value = m ? 0 : 0.8;
    try { localStorage.setItem('mtv2:muted', String(m)); } catch { /* noop */ }
  }

  /** ユーザー操作で一回呼ぶ（モバイル再生制約の解除） */
  unlock(): void {
    Howler.ctx?.resume?.();
    if (this.useFallback || this.ac) {
      if (!this.ac) {
        const AC = window.AudioContext ||
          (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (AC) {
          this.ac = new AC();
          this.master = this.ac.createGain();
          this.master.gain.value = this.muted ? 0 : 0.8;
          this.master.connect(this.ac.destination);
        }
      }
      if (this.ac?.state === 'suspended') void this.ac.resume();
    }
  }

  private master: GainNode | null = null;

  /**
   * 音源読み込み。CC0音源ファイルが public/sounds/ にあれば使い、
   * 全て無ければ Web Audio でのフォールバック生成音を使用する。
   */
  async load(): Promise<void> {
    const defs: Record<SfxName, string> = {
      move: 'sounds/sfx/move', rotate: 'sounds/sfx/rotate', soft: 'sounds/sfx/soft',
      hard: 'sounds/sfx/hard', lock: 'sounds/sfx/lock',
      line1: 'sounds/sfx/line1', line2: 'sounds/sfx/line2', line3: 'sounds/sfx/line3',
      line4: 'sounds/sfx/line4', tspin: 'sounds/sfx/tspin', levelup: 'sounds/sfx/levelup',
      hold: 'sounds/sfx/hold', gameover: 'sounds/sfx/gameover', pause: 'sounds/sfx/pause',
    };
    // HEAD リクエストで音源の存在確認（存在チェックが速い・preload=false で余計な404を減らす）
    let found = 0;
    for (const [name, base] of Object.entries(defs)) {
      let ok = false;
      for (const ext of ['.webm', '.mp3']) {
        try {
          const res = await fetch(base + ext, { method: 'HEAD' });
          if (res.ok) {
            ok = true;
            this.sfx[name as SfxName] = new Howl({ src: [base + ext], volume: 0.8 });
            break;
          }
        } catch { /* try next */ }
      }
      if (ok) found++;
    }
    this.useFallback = found === 0; // 1つでも音源があれば CC0 全揃いとみなす

    if (!this.useFallback) {
      // BGM のみ別途チェック
      for (const ext of ['.webm', '.mp3']) {
        try {
          const res = await fetch('sounds/bgm/main' + ext, { method: 'HEAD' });
          if (res.ok) {
            this.bgm = new Howl({ src: ['sounds/bgm/main' + ext], loop: true, volume: 0.45 });
            void this.bgm.load();
            break;
          }
        } catch { /* noop */ }
      }
    }
  }

  // ---- Web Audio フォールバック生成音（v1 から移植） ----
  private tone(freq: number, dur: number, type: OscillatorType, vol: number, when = 0, target: GainNode | null = null): void {
    if (!this.ac) return;
    const t0 = this.ac.currentTime + when;
    const osc = this.ac.createOscillator();
    const g = this.ac.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(target ?? this.master!);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  private noise(dur: number, vol: number, when = 0): void {
    if (!this.ac) return;
    const t0 = this.ac.currentTime + when;
    const buf = this.ac.createBuffer(1, Math.max(1, Math.floor(this.ac.sampleRate * dur)), this.ac.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    const src = this.ac.createBufferSource();
    src.buffer = buf;
    const g = this.ac.createGain();
    g.gain.value = vol;
    const filter = this.ac.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1400;
    src.connect(filter);
    filter.connect(g);
    g.connect(this.master!);
    src.start(t0);
  }

  private playFallback(name: SfxName): void {
    if (!this.ac) return;
    switch (name) {
      case 'move': this.tone(220, 0.05, 'square', 0.12); break;
      case 'rotate': this.tone(320, 0.08, 'triangle', 0.18); break;
      case 'soft': this.tone(180, 0.05, 'square', 0.1); break;
      case 'hard': this.noise(0.12, 0.35); this.tone(100, 0.14, 'sine', 0.3); break;
      case 'lock': this.tone(180, 0.07, 'triangle', 0.2); break;
      case 'line1': this.tone(440, 0.12, 'square', 0.25); this.tone(660, 0.15, 'square', 0.22, 0.08); break;
      case 'line2':
        this.tone(440, 0.1, 'square', 0.25); this.tone(660, 0.1, 'square', 0.25, 0.07);
        this.tone(880, 0.16, 'square', 0.25, 0.14); break;
      case 'line3':
        this.tone(440, 0.09, 'square', 0.25); this.tone(587, 0.09, 'square', 0.25, 0.06);
        this.tone(739, 0.09, 'square', 0.25, 0.12); this.tone(880, 0.18, 'square', 0.25, 0.18); break;
      case 'line4':
        [523, 659, 784, 1046, 1318].forEach((f, i) => this.tone(f, 0.18, 'square', 0.28, i * 0.06));
        this.noise(0.4, 0.3); break;
      case 'tspin': [660, 880, 1174].forEach((f, i) => this.tone(f, 0.14, 'triangle', 0.3, i * 0.07)); break;
      case 'levelup': [392, 523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.15, 'triangle', 0.28, i * 0.07)); break;
      case 'hold': this.tone(300, 0.06, 'triangle', 0.18); this.tone(450, 0.08, 'triangle', 0.18, 0.05); break;
      case 'gameover': [440, 392, 330, 262, 196].forEach((f, i) => this.tone(f, 0.28, 'sawtooth', 0.22, i * 0.12)); break;
      case 'pause': this.tone(260, 0.08, 'triangle', 0.15); break;
    }
  }

  play(name: SfxName, rate = 1): void {
    if (this.muted) return;
    if (this.useFallback) {
      this.unlock();
      this.playFallback(name);
      return;
    }
    const h = this.sfx[name];
    if (h && h.state() === 'loaded') {
      h.rate(rate);
      h.play();
    } else {
      // 個別音源が無い場合もフォールバック生成音で鳴らす
      this.unlock();
      this.playFallback(name);
    }
  }

  startBGM(rate = 1): void {
    if (this.muted) return;
    this.tempo = 120 * rate;
    if (!this.useFallback && this.bgm && this.bgm.state() === 'loaded') {
      if (this.bgmId !== null) return;
      this.bgm.rate(rate);
      this.bgmId = this.bgm.play();
      return;
    }
    // フォールバック BGM（Web Audio シーケンサ・v1移植）
    this.unlock();
    if (!this.ac || this.bgmTimer !== null) return;
    this.bgmStep = 0;
    this.nextStepTime = this.ac.currentTime + 0.05;
    const tick = () => {
      this.scheduleBgm();
      this.bgmTimer = window.setTimeout(tick, Math.max(0, (this.nextStepTime - (this.ac?.currentTime ?? 0)) * 1000));
    };
    tick();
  }

  private scheduleBgm(): void {
    if (!this.ac || this.muted) return;
    const spb = 60 / this.tempo / 2;
    while (this.nextStepTime < this.ac.currentTime + 0.12) {
      this.playBgmStep(this.bgmStep, this.nextStepTime - this.ac.currentTime);
      this.bgmStep = (this.bgmStep + 1) % 8;
      this.nextStepTime += spb;
    }
  }

  private playBgmStep(step: number, when: number): void {
    if (!this.ac || !this.master) return;
    const bassNotes = [110, 110, 164.8, 110, 130.8, 130.8, 98, 87.3];
    const f = bassNotes[step];
    this.tone(f, 0.22, 'triangle', 0.5, when, this.master);
    if (step % 2 === 0) this.tone(f * 2, 0.12, 'sine', 0.2, when, this.master);
    if (step === 0 || step === 4) this.tone(440, 0.1, 'sine', 0.06, when, this.master);
  }

  stopBGM(): void {
    if (this.bgmId !== null) {
      this.bgm?.stop(this.bgmId);
      this.bgmId = null;
    }
    if (this.bgmTimer !== null) {
      clearTimeout(this.bgmTimer);
      this.bgmTimer = null;
    }
  }
}
