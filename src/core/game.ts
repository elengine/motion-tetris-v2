import { Board } from './board';
import { Randomizer } from './randomizer';
import { Score } from './score';
import { COLS, TETROMINOES, TetrominoType } from './constants';

/** SRS ウォールキック。回転前state→後state ごとの試すオフセット列 */
const JLSTZ_KICKS: Record<string, [number, number][]> = {
  '0>1': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
  '1>0': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
  '1>2': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
  '2>1': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
  '2>3': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
  '3>2': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
  '3>0': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
  '0>3': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
};

const I_KICKS: Record<string, [number, number][]> = {
  '0>1': [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]],
  '1>0': [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]],
  '1>2': [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]],
  '2>1': [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]],
  '2>3': [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]],
  '3>2': [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]],
  '3>0': [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]],
  '0>3': [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]],
};

export type GameEventType =
  | 'land' // ピースが接地（消去判定前）
  | 'lineClear'
  | 'tspinNoLines' // Tスピンだがライン消去なし
  | 'hardDrop'
  | 'levelUp'
  | 'gameOver';

export class Game {
  board = new Board();
  score = new Score();
  rng: Randomizer;
  queue: TetrominoType[] = [];
  current!: TetrominoType;
  currentRotation = 0;
  currentX = 0;
  currentY = 0;
  hold: TetrominoType | null = null;
  holdUsed = false;
  over = false;
  paused = false;
  /** 落下前の入力バッファ（ロック遅延的動作） */
  private gravityTimer = 0;
  /** 接地後のロックディレイタイマー(ms) */
  private groundTimer = 0;
  /** ロックディレイ中に移動/回転でリセットした回数（無限回避のため上限あり） */
  private groundResets = 0;
  /** 最近の回転履歴（Tスピン検出用） */
  private lastMoveWasRotation = false;
  private lastKickIndex = 0;
  onEvent: (event: GameEventType, data?: unknown) => void = () => {};

  /** Tスピン検出結果（注意: spawn/lock でリセットされる） */
  lastTSpin: 'none' | 'mini' | 'full' = 'none';

  constructor(seedRng: () => number = Math.random) {
    this.rng = new Randomizer(seedRng);
    this.queue = [this.rng.next(), this.rng.next(), this.rng.next()];
    this.spawn();
  }

  private nextFromQueue(): TetrominoType {
    const piece = this.queue[0];
    this.queue = [...this.queue.slice(1), this.rng.next()];
    return piece;
  }

  /** 出現位置（盤面の上の方・中央）に配置 */
  private spawn(): void {
    this.current = this.nextFromQueue();
    this.currentRotation = 0;
    this.currentX = Math.floor(10 / 2) - 1;
    this.currentY = -1;
    this.holdUsed = false;
    // 出現時に衝突 → ゲームオーバー
    if (!this.board.fits(this.current, 0, this.currentX, this.currentY)) {
      this.over = true;
      this.onEvent('gameOver');
    }
  }

  /** 1ゲームをやり直す */
  reset(): void {
    this.board = new Board();
    this.score = new Score();
    this.hold = null;
    this.holdUsed = false;
    this.over = false;
    this.paused = false;
    this.queue = [this.rng.next(), this.rng.next(), this.rng.next()];
    this.spawn();
  }

  moveLeft(): boolean {
    if (this.over) return false;
    if (this.board.fits(this.current, this.currentRotation, this.currentX - 1, this.currentY)) {
      this.currentX--;
      this.lastMoveWasRotation = false;
      if (this.groundTimer > 0 && this.groundResets < 15) { this.groundTimer = 0; this.groundResets++; }
      return true;
    }
    return false;
  }

  moveRight(): boolean {
    if (this.over) return false;
    if (this.board.fits(this.current, this.currentRotation, this.currentX + 1, this.currentY)) {
      this.currentX++;
      this.lastMoveWasRotation = false;
      if (this.groundTimer > 0 && this.groundResets < 15) { this.groundTimer = 0; this.groundResets++; }
      return true;
    }
    return false;
  }

  softDrop(): boolean {
    if (this.over) return false;
    if (this.board.fits(this.current, this.currentRotation, this.currentX, this.currentY + 1)) {
      this.currentY++;
      return true;
    }
    return false; // 接地時は即固定しない（ロックディレイ側で固定）
  }

  /** SRS 回転（ウォールキック込み）+ Tスピン検出フラグ更新。dir=1: CW, -1: CCW */
  rotate(dir: 1 | -1): boolean {
    if (this.over) return false;
    const piece = TETROMINOES[this.current];
    const from = this.currentRotation;
    const to = (from + dir + 4) % 4;
    const kicks = piece.isI ? I_KICKS : JLSTZ_KICKS;
    const key = `${from}>${to}`;
    const offsets = kicks[key] ?? [[0, 0]];
    for (let i = 0; i < offsets.length; i++) {
      const [dx, dy] = offsets[i];
      if (this.board.fits(this.current, to, this.currentX + dx, this.currentY - dy)) {
        this.currentRotation = to;
        this.currentX += dx;
        this.currentY -= dy;
        // Tスピン検出用: 最後の操作が回転か・キックを何番目まで使ったか
        this.lastMoveWasRotation = true;
        this.lastKickIndex = i;
        if (this.groundTimer > 0 && this.groundResets < 15) { this.groundTimer = 0; this.groundResets++; }
        return true;
      }
    }
    return false;
  }

  hardDrop(): number {
    if (this.over) return 0;
    let dist = 0;
    while (this.board.fits(this.current, this.currentRotation, this.currentX, this.currentY + 1)) {
      this.currentY++;
      dist++;
    }
    this.score.addHardDrop(dist);
    this.onEvent('hardDrop', dist);
    this.lockFall();
    return dist;
  }

  /**
   * Tスピン検出（3-corner rule + SRS mini 判定）。
   * 事前に lastMoveWasRotation が true であること。
   */
  private detectTSpin(): 'none' | 'mini' | 'full' {
    if (this.current !== 'T') return 'none';
    if (!this.lastMoveWasRotation) return 'none';
    // 実セルテーブル準拠: Tボックス = x:[cx..cx+2], y:[cy..cy+1] (全回転共通)
    // 4隅の絶対座標
    const cornerAbs: [number, number][] = [
      [this.currentX, this.currentY],         [this.currentX + 2, this.currentY],
      [this.currentX, this.currentY + 1],     [this.currentX + 2, this.currentY + 1],
    ];
    const occupied = cornerAbs.map(([bx, by]) => {
      if (bx < 0 || bx >= COLS || by >= this.board.grid.length) return true; // 壁/外も塞がり扱い
      return by >= 0 && this.board.grid[by][bx] !== null;
    });
    const filled = occupied.filter(Boolean).length;
    if (filled < 3) return 'none';
    // 実テーブル準拠: rot0=下向き, rot1=左向き, rot2=上向き, rot3=右向き
    // 前面 = 尖り側の2隅。cornerAbs index: 0=(左上),1=(右上),2=(左下),3=(右下)
    const frontIdxByRotation: number[][] = [
      [2, 3], // rot0 下向き: 下2隅
      [0, 2], // rot1 左向き: 左2隅
      [0, 1], // rot2 上向き: 上2隅
      [1, 3], // rot3 右向き: 右2隅
    ];
    const frontIdx = frontIdxByRotation[this.currentRotation];
    const frontFilled = frontIdx.filter((i) => occupied[i]).length;
    // SRS仕様: キックテーブル5番目(最後)使用の回転は full 判定
    if (frontFilled === 2) return 'full';
    return this.lastKickIndex === 4 ? 'full' : 'mini';
  }

  /**
   * Tスピン検出結果を含むライン消去イベント。
   * (T-Spin lines / T-Spin no-lines でも game 側で演出可能なよう data に格納)
   */
  private lockFall(): void {
    if (this.over) return;
    const tspin = this.detectTSpin();
    this.board.lock(this.current, this.currentRotation, this.currentX, this.currentY);
    const fullRows = this.board.fullRows();
    this.lastTSpin = tspin;
    this.onEvent('land', fullRows.length);
    if (fullRows.length > 0) {
      const before = this.score.score;
      this.score.applyLineClear(fullRows.length, tspin);
      this.board.clearRows(fullRows);
      this.onEvent('lineClear', { rows: fullRows.length, gained: this.score.score - before, tspin });
    } else if (tspin !== 'none') {
      // T-Spin no-line もボーナス（mini 100, full 400）
      const bonus = (tspin === 'full' ? 400 : 100) * this.score.level;
      this.score.score += bonus;
      this.onEvent('tspinNoLines', { tspin, gained: bonus });
    } else {
      this.score.resetComboOnLand(true);
    }
    this.spawn();
  }

  doHold(): boolean {
    if (this.over || this.holdUsed) return false;
    if (this.hold === null) {
      this.hold = this.current;
      this.spawn();
    } else {
      const tmp = this.current;
      this.current = this.hold;
      this.currentRotation = 0;
      this.currentX = Math.floor(10 / 2) - 1;
      this.currentY = -1;
      this.hold = tmp;
      if (!this.board.fits(this.current, 0, this.currentX, this.currentY)) {
        this.over = true;
        this.onEvent('gameOver');
      }
    }
    this.holdUsed = true;
    return true;
  }

  /** 重力の積算。落下間隔分進むたび1段下げる。接地後はロックディレイ(500ms)経過で固定 */
  tick(dt: number): boolean {
    if (this.over || this.paused) return false;
    const grounded = !this.board.fits(this.current, this.currentRotation, this.currentX, this.currentY + 1);
    if (grounded) {
      // ロックディレイ: 移動/回転でリセット（上限15回）
      this.groundTimer += dt;
      if (this.groundTimer >= 500) {
        this.lockFall();
        this.groundTimer = 0;
        this.groundResets = 0;
        this.gravityTimer = 0;
        return true; // 接地して固定
      }
      return false;
    }
    // 空中にいる: タイマーリセット
    this.groundTimer = 0;
    this.groundResets = 0;
    this.gravityTimer += dt;
    const interval = this.score.dropInterval;
    let moved = false;
    while (this.gravityTimer >= interval) {
      this.gravityTimer -= interval;
      if (this.board.fits(this.current, this.currentRotation, this.currentX, this.currentY + 1)) {
        this.currentY++;
        moved = true;
      } else {
        break; // 接地 → 次フレームからロックディレイ開始
      }
    }
    return moved;
  }

  get nextPieces(): TetrominoType[] {
    return this.queue.slice(0, 3);
  }
}
