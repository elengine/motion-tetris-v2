/**
 * Canvas 2D レンダラ — 新設計。
 * 座標マッピングを一元化: cellToX/cellToY の2関数だけが盤面→画面変換を担う。
 * ゴースト・現在ピース・固定ブロックはすべて同じ関数を使うため位置ズレが構造的に起きない。
 */
import { COLS, ROWS, HIDDEN_ROWS, TOTAL_ROWS, PIECES, PieceType } from '../core/pieces';
import { Game } from '../core/wasmCore';

export interface Layout {
  cell: number;       // セルサイズ(px)
  boardX: number;     // 盤面左上 X
  boardY: number;     // 盤面左上 Y
  boardW: number;
  boardH: number;
  showSide: boolean;  // 横長時にサイドパネル表示
}

export function computeLayout(w: number, h: number, reserves?: { bottom?: number; top?: number; side?: number }): Layout {
  const isLandscape = w / h >= 1.2;
  // 有名テトリスのモバイルUIと同様、盤面は「実測された UI 領域を除いた残り」にフィットさせる。
  // caller(main.layout)が touchpad/HUD の実測 getBoundingClientRect を渡す（回帰: 固定値だと実機で盤面がボタンに被る）
  const bottomReserve = Math.round(reserves?.bottom ?? 0);
  const topReserve = Math.round(reserves?.top ?? 0);
  const sideReserve = Math.round(reserves?.side ?? 0);
  // セルサイズ: 縦横の小さい方から算出（20行+α / 10列+α）
  const cellL = Math.floor((h - 24 - bottomReserve - topReserve) / ROWS);
  const cellP = Math.floor(((w - 24 - sideReserve) / (isLandscape ? 2.1 : 1)) / COLS);
  const cell = Math.max(10, Math.min(cellL, cellP, 44));
  const boardW = cell * COLS;
  const boardH = cell * ROWS;
  const boardX = isLandscape ? Math.floor(w / 2 - boardW / 2 - cell * 1.5) : Math.floor((w - sideReserve) / 2 - boardW / 2);
  const availTop = topReserve;
  const availBottom = h - bottomReserve;
  const boardY = Math.min(Math.max(availTop + 4, Math.floor((availTop + availBottom - boardH) / 2)), Math.max(availTop + 4, availBottom - boardH - 8));
  return { cell, boardX, boardY, boardW, boardH, showSide: isLandscape };
}

/** 盤面座標 → 画面座標（乱用防止のため export glBeginer 経由のみ） */
export function cellToPx(l: Layout, x: number, y: number): { px: number; py: number } {
  return { px: l.boardX + x * l.cell, py: l.boardY + (y - HIDDEN_ROWS) * l.cell };
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawBlock(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, def: typeof PIECES[PieceType], alpha = 1) {
  const r = size * 0.16;
  ctx.save();
  ctx.globalAlpha = alpha;
  // グロー
  ctx.shadowColor = def.glow;
  ctx.shadowBlur = size * 0.45;
  ctx.fillStyle = def.color;
  roundRect(ctx, x + 1, y + 1, size - 2, size - 2, r);
  ctx.fill();
  // ハイライト
  ctx.shadowBlur = 0;
  ctx.fillStyle = 'rgba(255,255,255,0.28)';
  roundRect(ctx, x + 2, y + 2, size - 4, size * 0.42, r * 0.6);
  ctx.fill();
  // 枠
  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  ctx.lineWidth = Math.max(1, size * 0.045);
  roundRect(ctx, x + 1, y + 1, size - 2, size - 2, r);
  ctx.stroke();
  ctx.restore();
}

export class Renderer {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  layout: Layout;
  dpr = Math.min(window.devicePixelRatio || 1, 2);

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.layout = computeLayout(canvas.clientWidth || 800, canvas.clientHeight || 600);
  }

  reserves: { bottom?: number; top?: number; side?: number } = {};
  setReserves(res: { bottom?: number; top?: number; side?: number }): void {
    this.reserves = res;
    const w = this.canvas.clientWidth, h = this.canvas.clientHeight;
    this.layout = computeLayout(w, h, res);
  }
  resize(): void {
    const el = this.canvas;
    const w = el.clientWidth, h = el.clientHeight;
    el.width = Math.floor(w * this.dpr);
    el.height = Math.floor(h * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.layout = computeLayout(w, h, this.reserves);
  }

  /** 1フレーム描画 */
  draw(game: Game, fx: FxState): void {
    const { ctx, layout: l } = this;
    const w = this.canvas.clientWidth, h = this.canvas.clientHeight;
    ctx.clearRect(0, 0, w, h);

    // 背景
    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, '#0a0e27');
    grad.addColorStop(1, '#141a45');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // 盤面枠
    ctx.save();
    ctx.fillStyle = 'rgba(10,14,39,0.85)';
    ctx.fillRect(l.boardX - 8, l.boardY - 8, l.boardW + 16, l.boardH + 16);
    ctx.strokeStyle = 'rgba(110,130,255,0.4)';
    ctx.lineWidth = 2;
    ctx.strokeRect(l.boardX - 8, l.boardY - 8, l.boardW + 16, l.boardH + 16);
    ctx.restore();

    // グリッド
    ctx.strokeStyle = 'rgba(110,130,255,0.09)';
    ctx.lineWidth = 1;
    for (let x = 1; x < COLS; x++) {
      ctx.beginPath(); ctx.moveTo(l.boardX + x * l.cell, l.boardY); ctx.lineTo(l.boardX + x * l.cell, l.boardY + l.boardH); ctx.stroke();
    }
    for (let y = 1; y < ROWS; y++) {
      ctx.beginPath(); ctx.moveTo(l.boardX, l.boardY + y * l.cell); ctx.lineTo(l.boardX + l.boardW, l.boardY + y * l.cell); ctx.stroke();
    }

    // 固定ブロック（隠し領域上は表示しない）
    const grid: string = game.getGrid();
    for (let y = HIDDEN_ROWS; y < TOTAL_ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const ch = grid[y * COLS + x];
        if (ch === '.') continue;
        const def = PIECES[ch as PieceType];
        if (!def) continue;
        const { px, py } = cellToPx(l, x, y);
        drawBlock(ctx, px, py, l.cell, def);
      }
    }

    if (game.state === 1 /* Playing */ && game.currentPiece() !== undefined) {
      const cells = game.currentCells() as { x: number; y: number }[];
      const piece = game.currentPiece()!;
      const pieceKey = (typeof piece === 'number' ? 'IOTSZJL'[piece] : piece) as PieceType;
      const def = PIECES[pieceKey];
      const ghostY = game.ghostY;

      // ゴースト
      for (const c of cells) {
        const { px, py } = cellToPx(l, c.x, ghostY + (c.y - game.curY));
        drawBlock(ctx, px, py, l.cell, def, 0.18);
      }
      // 現在ピース（スムース回転オフセット）
      // 偏差は ±90° 以内に正規化し、重力（落下）方向が回って見えないよう
      // 盤面Y軸は常に下向き固定のまま、セル位置のみを重心まわりで回す。
      const rotOff = fx.rotOffset; // main 側で常に ±90°以内の偏差に正規化済み（回帰: 180°多重回転修正）
      for (const c of cells) {
        const { px, py } = cellToPx(l, c.x, c.y);
        if (c.y < HIDDEN_ROWS) continue;
        let ax = px, ay = py;
        if (Math.abs(rotOff) > 0.01) {
          const cxp = l.boardX + ((fx.pivotX) + 0.5) * l.cell;
          const cyp = l.boardY + (fx.pivotY - HIDDEN_ROWS + 0.5) * l.cell;
          const cos = Math.cos(rotOff), sin = Math.sin(rotOff);
          const dx = px + l.cell / 2 - cxp, dy = py + l.cell / 2 - cyp;
          ax = cxp + dx * cos - dy * sin - l.cell / 2;
          ay = cyp + dx * sin + dy * cos - l.cell / 2;
        }
        drawBlock(ctx, ax, ay, l.cell, def);
      }
    }

    // ライン消去フラッシュ
    for (const a of fx.clearRows) {
      const { py } = cellToPx(l, 0, a.row);
      ctx.save();
      ctx.globalAlpha = a.alpha;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(l.boardX, py, l.boardW, l.cell);
      ctx.restore();
    }
  }
}

export interface FxState {
  rotOffset: number;   // 表示用回転ラジアン
  pivotX: number; pivotY: number;
  clearRows: { row: number; t: number }[] & { alpha: number }[] | any[];
}
