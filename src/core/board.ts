import { COLS, ROWS, HIDDEN_ROWS, TetrominoType, TETROMINOES } from './constants';

export type CellValue = TetrominoType | null;

/** 盤面。grid[y][x]。y=0 が最上段（表示上は HIDDEN_ROWS 分隠れる） */
export class Board {
  grid: CellValue[][];

  constructor() {
    this.grid = Array.from({ length: ROWS + HIDDEN_ROWS }, () =>
      Array<CellValue>(COLS).fill(null),
    );
  }

  clone(): Board {
    const b = new Board();
    b.grid = this.grid.map((row) => [...row]);
    return b;
  }

  inBounds(x: number, y: number): boolean {
    return x >= 0 && x < COLS && y >= 0 && y < ROWS + HIDDEN_ROWS;
  }

  isEmpty(x: number, y: number): boolean {
    if (!this.inBounds(x, y)) return false;
    return this.grid[y][x] === null;
  }

  /** ピースが (x,y) に置かれているとき、全ブロックが空いているか */
  fits(piece: TetrominoType, rotation: number, x: number, y: number): boolean {
    const cells = TETROMINOES[piece].cells[rotation];
    for (const [cx, cy] of cells) {
      const bx = x + cx;
      const by = y + cy;
      // 横は範囲外NG。上方向(y<0)は許容（出現時）。下は盤内でなければNG
      if (bx < 0 || bx >= COLS) return false;
      if (by >= ROWS + HIDDEN_ROWS) return false;
      if (by >= 0 && !this.isEmpty(bx, by)) return false;
    }
    return true;
  }

  /** ピースを盤面に焼き付ける（固定） */
  lock(piece: TetrominoType, rotation: number, x: number, y: number): void {
    const cells = TETROMINOES[piece].cells[rotation];
    for (const [cx, cy] of cells) {
      const bx = x + cx;
      const by = y + cy;
      if (bx < 0 || bx >= COLS || by < 0 || by >= ROWS + HIDDEN_ROWS) continue;
      this.grid[by][bx] = piece;
    }
  }

  /** 完全に埋まった行のインデックス（y 昇順）を返す */
  fullRows(): number[] {
    const result: number[] = [];
    for (let y = 0; y < ROWS + HIDDEN_ROWS; y++) {
      let full = true;
      for (let x = 0; x < COLS; x++) {
        if (this.grid[y][x] === null) {
          full = false;
          break;
        }
      }
      if (full) result.push(y);
    }
    return result;
  }

  /** 指定行を消し、上の行を落とす。同時消去で結果を返す（下詰め） */
  clearRows(rows: number[]): void {
    if (rows.length === 0) return;
    const set = new Set(rows);
    const newGrid = Array.from({ length: ROWS + HIDDEN_ROWS }, () =>
      Array<CellValue>(COLS).fill(null),
    );
    // 下に詰める: 下にある消去行の数ぶん、各ブロックを落とす
    let drop = 0;
    for (let y = newGrid.length - 1; y >= 0; y--) {
      if (set.has(y)) {
        drop++;
        continue;
      }
      newGrid[y + drop] = [...this.grid[y]];
    }
    this.grid = newGrid;
  }

  /** ゲームオーバー判定: 消去可能行の範囲に埋まり過ぎたか、出現位置が塞がっている */
  isGameOver(): boolean {
    // 隠し領域ではなく、可視領域 y=1 あたりまで積み上がっているか簡易判定
    for (let y = 0; y < 2; y++) {
      for (let x = 0; x < COLS; x++) {
        if (this.grid[y][x] !== null) return true;
      }
    }
    return false;
  }
}
