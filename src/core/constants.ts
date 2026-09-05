// ゲーム全体の定数
export const COLS = 10;
export const ROWS = 20;
export const HIDDEN_ROWS = 2; // 盤面の上にある待機行（SRS 動作のための余白）

export type TetrominoType = 'I' | 'O' | 'T' | 'S' | 'Z' | 'J' | 'L';

export const TETROMINO_ORDER: TetrominoType[] = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];

export interface TetrominoDef {
  type: TetrominoType;
  color: string;
  glow: string;
  /** 回転状態 0..3 ごとのブロック座標 (x,y)。原点(0,0) 基準、y は下が正 */
  cells: [number, number][][];
  isI: boolean;
}

// 各ピース定義。cells[r] = 回転状態 r の [(x,y), ...]。
// 消去行は y=ROWS に達した時の基準。→ 実際は描画時に補正。
export const TETROMINOES: Record<TetrominoType, TetrominoDef> = {
  I: {
    type: 'I',
    color: '#00f0ff',
    glow: '#b0ffff',
    isI: true,
    cells: [
      [[0, 0], [1, 0], [2, 0], [3, 0]],
      [[1, -1], [1, 0], [1, 1], [1, 2]],
      [[0, 0], [1, 0], [2, 0], [3, 0]],
      [[1, -1], [1, 0], [1, 1], [1, 2]],
    ],
  },
  O: {
    type: 'O',
    color: '#ffe600',
    glow: '#fffcb0',
    isI: false,
    cells: [
      [[0, 0], [1, 0], [0, 1], [1, 1]],
      [[0, 0], [1, 0], [0, 1], [1, 1]],
      [[0, 0], [1, 0], [0, 1], [1, 1]],
      [[0, 0], [1, 0], [0, 1], [1, 1]],
    ],
  },
  T: {
    type: 'T',
    color: '#c86bff',
    glow: '#f0d0ff',
    isI: false,
    cells: [
      // state0: 上が平ら、下中央に突起（下向きT）
      [[0, 0], [1, 0], [2, 0], [1, 1]],
      // state1: 右が平ら、左中央に突起（左向きT）
      [[1, 0], [0, 1], [1, 1], [1, 2]],
      // state2: 下が平ら、上中央に突起（上向きT）
      [[1, 0], [0, 1], [1, 1], [2, 1]],
      // state3: 左が平ら、右中央に突起（右向きT）
      [[1, 0], [1, 1], [2, 1], [1, 2]],
    ],
  },
  S: {
    type: 'S',
    color: '#00ff88',
    glow: '#b0ffd0',
    isI: false,
    cells: [
      [[1, 0], [2, 0], [0, 1], [1, 1]],
      [[1, 0], [1, 1], [2, 1], [2, 2]],
      [[1, 1], [2, 1], [0, 2], [1, 2]],
      [[0, 0], [0, 1], [1, 1], [1, 2]],
    ],
  },
  Z: {
    type: 'Z',
    color: '#ff4d6d',
    glow: '#ffb0c0',
    isI: false,
    cells: [
      [[0, 0], [1, 0], [1, 1], [2, 1]],
      [[2, 0], [1, 1], [2, 1], [1, 2]],
      [[0, 1], [1, 1], [1, 2], [2, 2]],
      [[1, 0], [0, 1], [1, 1], [0, 2]],
    ],
  },
  J: {
    type: 'J',
    color: '#3f8cff',
    glow: '#b0d8ff',
    isI: false,
    cells: [
      [[0, 0], [0, 1], [1, 1], [2, 1]],
      [[1, 0], [2, 0], [1, 1], [1, 2]],
      [[0, 1], [1, 1], [2, 1], [2, 2]],
      [[1, 0], [1, 1], [0, 2], [1, 2]],
    ],
  },
  L: {
    type: 'L',
    color: '#ff9640',
    glow: '#ffd0b0',
    isI: false,
    cells: [
      [[2, 0], [0, 1], [1, 1], [2, 1]],
      [[1, 0], [1, 1], [1, 2], [2, 2]],
      [[0, 1], [1, 1], [2, 1], [0, 2]],
      [[0, 0], [1, 0], [1, 1], [1, 2]],
    ],
  },
};
