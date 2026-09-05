import { Howl, Howler } from 'howler';

export type SfxName =
  | 'move' | 'rotate' | 'soft' | 'hard' | 'lock'
  | 'line1' | 'line2' | 'line3' | 'line4'
  | 'levelup' | 'hold' | 'gameover' | 'pause';

/**
 * Howler ベースのオーディオマネージャ。
 * CC0 音源の読み込みとフォールバック生成音（音源が無い環境向け）を内包。
 */
export class AudioManager {
  private sfx: Partial<Record<SfxName, Howl>> = {};
  private bgm: Howl | null = null;
  private bgmId: number | null = null;
  private muted = false;

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
    try { localStorage.setItem('mtv2:muted', String(m)); } catch { /* noop */ }
  }

  /** ユーザー操作で一回呼ぶ（モバイル再生制約の解除） */
  unlock(): void {
    Howler.ctx?.resume?.();
  }

  /**
   * 音源読み込み。CC0音源ファイルが public/sounds/ にあれば使い、
   * 無ければ Web Audio でのフォールバック生成音を使用する。
   */
  async load(): Promise<void> {
    const defs: Record<SfxName, string> = {
      move: 'sounds/sfx/move.webm',
      rotate: 'sounds/sfx/rotate.webm',
      soft: 'sounds/sfx/soft.webm',
      hard: 'sounds/sfx/hard.webm',
      lock: 'sounds/sfx/lock.webm',
      line1: 'sounds/sfx/line1.webm',
      line2: 'sounds/sfx/line2.webm',
      line3: 'sounds/sfx/line3.webm',
      line4: 'sounds/sfx/line4.webm',
      levelup: 'sounds/sfx/levelup.webm',
      hold: 'sounds/sfx/hold.webm',
      gameover: 'sounds/sfx/gameover.webm',
      pause: 'sounds/sfx/pause.webm',
    };
    for (const [name, src] of Object.entries(defs)) {
      const h = new Howl({ src: [src.replace('.webm', '.mp3'), src], volume: 0.8, preload: false });
      this.sfx[name as SfxName] = h;
    }
    this.bgm = new Howl({
      src: ['sounds/bgm/main.mp3', 'sounds/bgm/main.webm'],
      loop: true, volume: 0.45, preload: false,
    });
    try {
      await Promise.all(
        [...Object.values(this.sfx), this.bgm].map(
          (h) => new Promise<void>((res) => {
            if (!h) return res();
            const id = h.load();
            // 読み込み失敗時も継続（フォールバックに任せる）
            h.once('loaderror', () => res());
            h.once('load', () => res());
            void id;
            setTimeout(() => res(), 4000);
          }),
        ),
      );
    } catch { /* noop */ }
  }

  play(name: SfxName, rate = 1): void {
    if (this.muted) return;
    const h = this.sfx[name];
    if (h) {
      if (!h.state() || h.state() === 'unloaded') return; // 無い音は無音でOK
      h.rate(rate);
      h.play();
    }
  }

  startBGM(rate = 1): void {
    if (!this.bgm || this.muted) return;
    if (this.bgm.state() !== 'loaded') return;
    if (this.bgmId !== null) return;
    this.bgm.rate(rate);
    this.bgmId = this.bgm.play();
  }

  stopBGM(): void {
    if (this.bgm && this.bgmId !== null) {
      this.bgm.stop(this.bgmId);
      this.bgmId = null;
    }
  }
}
