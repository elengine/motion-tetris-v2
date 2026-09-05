import { Board } from './board';
import { Randomizer } from './randomizer';
import { Score } from './score';
import { TETROMINOES, TetrominoType } from './constants';

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
  onEvent: (event: GameEventType, data?: unknown) => void = () => {};

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
      return true;
    }
    return false;
  }

  moveRight(): boolean {
    if (this.over) return false;
    if (this.board.fits(this.current, this.currentRotation, this.currentX + 1, this.currentY)) {
      this.currentX++;
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
    this.lockFall();
    return false;
  }

  /** SRS 回転（ウォールキック込み） */
  rotate(dir: 1 | -1): boolean {
    if (this.over) return false;
    const piece = TETROMINOES[this.current];
    const from = this.currentRotation;
    const to = (from + dir + 4) % 4;
    const kicks = piece.isI ? I_KICKS : JLSTZ_KICKS;
    const key = `${from}>${to}`;
    const offsets = kicks[key] ?? [[0, 0]];
    for (const [dx, dy] of offsets) {
      if (this.board.fits(this.current, to, this.currentX + dx, this.currentY - dy)) {
        this.currentRotation = to;
        this.currentX += dx;
        this.currentY -= dy;
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

  /** 現在ピースを接地・固定し、消去 → 次ピースを出現 */
  private lockFall(): void {
    if (this.over) return;
    this.board.lock(this.current, this.currentRotation, this.currentX, this.currentY);
    const fullRows = this.board.fullRows();
    this.onEvent('land', fullRows.length);
    if (fullRows.length > 0) {
      const before = this.score.score;
      this.score.applyLineClear(fullRows.length);
      this.board.clearRows(fullRows);
      this.onEvent('lineClear', { rows: fullRows.length, gained: this.score.score - before });
    } else {
      this.score.resetComboOnLand(true);
    }
    if (this.score.level !== 1 && this.score.levelChanged) {
      // (レベルアップ検知は Score 内で、ここでは不要)
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

  /** 重力の積算。落下間隔分進むたび1段下げる */
  tick(dt: number): boolean {
    if (this.over || this.paused) return false;
    this.gravityTimer += dt;
    const interval = this.score.dropInterval;
    let moved = false;
    while (this.gravityTimer >= interval) {
      this.gravityTimer -= interval;
      if (this.board.fits(this.current, this.currentRotation, this.currentX, this.currentY + 1)) {
        this.currentY++;
        moved = true;
      } else {
        this.lockFall();
        this.gravityTimer = 0;
        return true; // 接地して固定
      }
    }
    return moved;
  }

  get nextPieces(): TetrominoType[] {
    return this.queue.slice(0, 3);
  }
}
