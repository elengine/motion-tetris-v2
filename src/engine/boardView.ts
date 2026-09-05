import { Graphics, RenderTexture } from 'pixi.js';
import { COLS, ROWS, HIDDEN_ROWS, TetrominoType } from '../core/constants';
import type { Board } from '../core/board';

export type Orientation = 'portrait' | 'landscape';

export interface LayoutResult {
  boardX: number;
  boardY: number;
  cell: number;
  boardW: number;
  boardH: number;
  panelW: number;
  panelX: number; // landscape時の右パネル開始X（portrait時は未使用=0）
  panelY: number;
}

/**
 * Fold8 展開 4:3横長 → 盤面左・パネル右の2カラム
 * カバー縦長 → 盤面上・パネル上・操作下の1カラム
 */
export function computeLayout(vw: number, vh: number): LayoutResult {
  const orientation: Orientation = vw / vh >= 1.2 ? 'landscape' : 'portrait';
  const gap = Math.max(8, Math.min(24, vw * 0.02));
  const panelW = orientation === 'landscape' ? Math.min(260, vw * 0.24) : 0;

  let cell: number;
  if (orientation === 'landscape') {
    const availW = vw - gap * 3 - panelW;
    cell = Math.floor(Math.min((vh - gap * 2) / ROWS, availW / COLS));
  } else {
    // 縦長: 下部操作領域(約150px)と上部HUD(約54px)を残して盤面を中央に
    const touchH = 150;
    const hudH = 60;
    cell = Math.floor(Math.min((vw - gap * 2) / COLS, (vh - hudH - touchH - gap) / ROWS));
    cell = Math.max(12, Math.min(cell, vw / COLS));
  }
  cell = Math.max(10, cell);
  const boardW = cell * COLS;
  const boardH = cell * ROWS;

  let boardX: number;
  let panelX = 0;
  if (orientation === 'landscape') {
    boardX = Math.round((vw - panelW - gap - boardW) / 2);
    panelX = Math.round(boardX + boardW + gap);
  } else {
    boardX = Math.round((vw - boardW) / 2);
  }
  const boardY = orientation === 'portrait' ? Math.round(gap + 66) : Math.round((vh - boardH) / 2);

  return { boardX, boardY, cell, boardW, boardH, panelW, panelX, panelY: Math.round((vh - boardH) / 2) };
}

/** ネオンボックスのテクスチャを生成（発光＋内側ハイライト＋角丸） */
export function makeBlockTexture(
  renderer: import('pixi.js').Renderer,
  size: number,
  color: string,
  glowColor: string,
): import('pixi.js').Texture {
  const pad = Math.ceil(size * 0.3);
  const full = size + pad * 2;
  const c = RenderTexture.create({ width: full, height: full });
  const g = new Graphics();

  // 外側の発光(グロー)
  g.roundRect(pad, pad, size, size, size * 0.18);
  g.fill({ color: glowColor, alpha: 0.35 });

  // 本体
  g.roundRect(pad + 1, pad + 1, size - 2, size - 2, size * 0.16);
  g.fill({ color });

  // 上部ハイライト
  g.roundRect(pad + 2, pad + 2, size - 4, size * 0.42, size * 0.14);
  g.fill({ color: 0xffffff, alpha: 0.28 });

  // 内側の縁(明るいライン)
  g.roundRect(pad + 2, pad + 2, size - 4, size - 4, size * 0.14);
  g.stroke({ width: Math.max(1.5, size * 0.05), color: 0xffffff, alpha: 0.5 });

  renderer.render({ container: g, target: c });
  g.destroy();
  return c;
}

/** 盤面全体を描画するコンテナ（固定ブロック層を管理） */
export class BoardView {
  container: import('pixi.js').Container;
  private cells: (import('pixi.js').Sprite | null)[][] = [];

  constructor(
    private pixi: typeof import('pixi.js'),
    private textures: Map<TetrominoType, import('pixi.js').Texture>,
    board: Board,
  ) {
    this.container = new pixi.Container();
    for (let y = 0; y < ROWS + HIDDEN_ROWS; y++) {
      this.cells.push(new Array(COLS).fill(null));
    }
    this.rebuild(board);
  }

  /** 盤面の状態から固定ブロックスプライトを再構築 */
  rebuild(board: Board): void {
    for (let y = 0; y < ROWS + HIDDEN_ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const v = board.grid[y][x];
        const sp = this.cells[y][x];
        if (v) {
          if (sp) {
            if (sp.texture !== this.textures.get(v)) {
              sp.texture = this.textures.get(v)!;
            }
          } else {
            const s = new this.pixi.Sprite(this.textures.get(v)!);
            this.cells[y][x] = s;
            this.container.addChild(s);
          }
          const sp2 = this.cells[y][x]!;
          void sp2;
        } else if (sp) {
          sp.destroy();
          this.cells[y][x] = null;
          void sp;
        }
      }
    }
  }

  /** セル座標 → スプライト位置を設定 */
  positionCells(cell: number, boardX: number, boardY: number): void {
    for (let gy = HIDDEN_ROWS; gy < HIDDEN_ROWS + ROWS; gy++) {
      for (let x = 0; x < COLS; x++) {
        const sp = this.cells[gy][x];
        if (sp) {
          const pad = Math.ceil(cell * 0.3);
          sp.position.set(
            boardX + x * cell - pad,
            boardY + (gy - HIDDEN_ROWS) * cell - pad,
          );
        }
      }
    }
  }
}
