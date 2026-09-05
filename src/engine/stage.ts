import { Container, Graphics, Sprite, Texture } from 'pixi.js';
import { COLS, ROWS, HIDDEN_ROWS, TETROMINOES, TetrominoType } from '../core/constants';
import { Game, GameEventType } from '../core/game';
import { Board } from '../core/board';
import { computeLayout, makeBlockTexture, LayoutResult } from './boardView';

const PALETTE: Record<TetrominoType, { color: string; glow: string }> = {
  I: { color: '#00f0ff', glow: '#b0ffff' },
  O: { color: '#ffe600', glow: '#fffcb0' },
  T: { color: '#c86bff', glow: '#f0d0ff' },
  S: { color: '#00ff88', glow: '#b0ffd0' },
  Z: { color: '#ff4d6d', glow: '#ffb0c0' },
  J: { color: '#3f8cff', glow: '#b0d8ff' },
  L: { color: '#ff9640', glow: '#ffd0b0' },
};

export class TetrisStage {
  app: import('pixi.js').Application;
  game: Game;
  boardLayer = new Container();
  pieceLayer = new Container();
  fxLayer = new Container();
  bgLayer = new Graphics();
  layout: LayoutResult;
  private textures = new Map<TetrominoType, Texture>();
  private lineClearAnims: { rows: number[]; t: number; sprites: Sprite[] }[] = [];
  private shakeTime = 0;
  /** 回転アニメ: 実角度(回転状態×90°)と表示角度の補間 */
  private displayAngle = 0; // 表示上の角度（deg）
  private targetAngle = 0;  // 目標角度（deg、実回転状態に一致）
  private piecePivotX = 0;  // 回転中心（盤面座標、浮動小数）
  private piecePivotY = 0;
  private prevRotation = 0;

  constructor(app: import('pixi.js').Application, game: Game) {
    this.app = app;
    this.game = game;
    this.layout = computeLayout(800, 600);

    app.stage.addChild(this.bgLayer);
    app.stage.addChild(this.boardLayer);
    app.stage.addChild(this.pieceLayer);
    app.stage.addChild(this.fxLayer);

    // テクスチャ生成
    const probeCell = 32;
    for (const t of Object.keys(TETROMINOES) as TetrominoType[]) {
      const tex = makeBlockTexture(
        app.renderer,
        probeCell,
        PALETTE[t].color,
        PALETTE[t].glow,
      );
      this.textures.set(t, tex);
    }

    // 背景描画
    this.drawBackground(app.screen.width, app.screen.height);
  }

  /** 盤面（固定ブロック）を再描画 */
  refreshBoard(board: Board): void {
    this.boardLayer.removeChildren().forEach((c) => c.destroy());
    const { cell, boardX, boardY } = this.layout;
    for (let gy = HIDDEN_ROWS; gy < HIDDEN_ROWS + ROWS; gy++) {
      for (let x = 0; x < COLS; x++) {
        const v = board.grid[gy][x];
        if (!v) continue;
        const sp = new Sprite(this.textures.get(v)!);
        const pad = Math.ceil(cell * 0.3);
        sp.position.set(boardX + x * cell - pad, boardY + (gy - HIDDEN_ROWS) * cell - pad);
        sp.scale.set(cell / 32);
        this.boardLayer.addChild(sp);
      }
    }
  }

  /** 現在ピースとゴーストを描画（回転は90°スムース補間） */
  refreshPiece(): void {
    this.pieceLayer.removeChildren().forEach((c) => c.destroy());
    if (this.game.over) return;
    const { cell, boardX, boardY } = this.layout;
    const pad = Math.ceil(cell * 0.3);
    const g = this.game;
    const cells = TETROMINOES[g.current].cells[g.currentRotation];

    // ゴースト位置計算
    let gy = g.currentY;
    while (
      g.board.fits(g.current, g.currentRotation, g.currentX, gy + 1) &&
      gy < ROWS + HIDDEN_ROWS + 2
    ) {
      gy++;
    }
    // ゴースト
    if (gy > g.currentY) {
      for (const [cx, cy] of cells) {
        const sp = new Sprite(this.textures.get(g.current)!);
        sp.alpha = 0.22;
        sp.scale.set(cell / 32);
        sp.position.set(boardX + (g.currentX + cx) * cell - pad, boardY + (gy - HIDDEN_ROWS + cy) * cell - pad);
        this.pieceLayer.addChild(sp);
      }
    }
    // 現在ピース: 回転アニメ用に angle 補間 & ピボット回転
    // rotation 変化を検知 → targetAngle 更新（カウンタ回転の連続性維持）
    if (g.currentRotation !== this.prevRotation) {
      const diff = g.currentRotation - this.prevRotation;
      const step = ((diff % 4) + 4) % 4 === 3 ? -1 : ((diff % 4) + 4) % 4; // 1:CW, 3:CCW
      this.targetAngle += step * 90;
      this.prevRotation = g.currentRotation;
      // ピボット = 現在位置＋回転セル重心
      const gx0 = Math.min(...cells.map((q) => q[0]));
      const gx1 = Math.max(...cells.map((q) => q[0]));
      const gy0 = Math.min(...cells.map((q) => q[1]));
      const gy1 = Math.max(...cells.map((q) => q[1]));
      this.piecePivotX = g.currentX + (gx0 + gx1 + 1) / 2;
      this.piecePivotY = g.currentY + (gy0 + gy1 + 1) / 2;
    }
    if (g.current !== this.lastPieceType) {
      // 新ピース: 角度リセット（連続性の崩れ防止）
      this.lastPieceType = g.current;
      this.displayAngle = 0;
      this.targetAngle = 0;
      this.prevRotation = 0;
    }
    // 現在ピース
    const pivotScreenX = boardX + this.piecePivotX * cell;
    const pivotScreenY = boardY + (this.piecePivotY - HIDDEN_ROWS) * cell;
    for (const [cx, cy] of cells) {
      const sy = g.currentY + cy - HIDDEN_ROWS;
      if (sy < -1) continue;
      const sp = new Sprite(this.textures.get(g.current)!);
      sp.scale.set(cell / 32);
      sp.anchor.set(0);
      sp.position.set(boardX + (g.currentX + cx) * cell - pad, boardY + sy * cell - pad);
      // ピボットまわりに表示角度を適用
      const rad = (this.displayAngle * Math.PI) / 180;
      const dx = sp.x + cell / 2 - pivotScreenX;
      const dy = sp.y + cell / 2 - pivotScreenY;
      sp.pivot.set(cell / 2, cell / 2);
      sp.position.set(pivotScreenX + dx * Math.cos(rad) - dy * Math.sin(rad),
        pivotScreenY + dx * Math.sin(rad) + dy * Math.cos(rad));
      sp.rotation = rad;
      this.pieceLayer.addChild(sp);
    }
  }

  private lastPieceType: TetrominoType | null = null;

  /** フレーム更新（アニメ進行・シェイク・回転補間） */
  tick(dt: number): void {
    const fDt = this.app.ticker.deltaMS / 1000;
    void dt;
    // 回転スムース補間（0.12秒で90°、exponent 的な追従）
    if (Math.abs(this.targetAngle - this.displayAngle) > 0.5) {
      const k = Math.min(1, fDt / 0.12 * 0.35);
      this.displayAngle += (this.targetAngle - this.displayAngle) * k;
    } else {
      this.displayAngle = this.targetAngle;
    }
    // 補間中は描画更新
    if (Math.abs(this.targetAngle - this.displayAngle) > 0.01) {
      this.refreshPiece();
    }
    // ライン消去アニメ
    for (let i = this.lineClearAnims.length - 1; i >= 0; i--) {
      const a = this.lineClearAnims[i];
      a.t += fDt;
      const p = Math.min(1, a.t / 0.45);
      for (const sp of a.sprites) {
        sp.alpha = 1 - p;
        sp.scale.set((this.layout.cell / 32) * (1 + p * 0.5));
        sp.x += 0;
      }
      if (p >= 1) {
        a.sprites.forEach((s) => s.destroy());
        this.lineClearAnims.splice(i, 1);
      }
    }
    // シェイク
    if (this.shakeTime > 0) {
      this.shakeTime -= fDt;
      const amp = Math.max(0, this.shakeTime / 0.25) * 6;
      this.app.stage.position.set(
        (Math.random() - 0.5) * amp,
        (Math.random() - 0.5) * amp,
      );
    } else {
      this.app.stage.position.set(0, 0);
    }
  }

  /** ライン消去エフェクト */
  lineClearFx(rows: number[], count: number): void {
    const { cell, boardX, boardY } = this.layout;
    const sprites: Sprite[] = [];
    for (const row of rows) {
      const sy = row - HIDDEN_ROWS;
      if (sy < 0 || sy >= ROWS) continue;
      for (let x = 0; x < COLS; x++) {
        const v = this.game.board.grid[row]?.[x];
        const color = v ?? 'I';
        const sp = new Sprite(this.textures.get(color as TetrominoType)!);
        sp.scale.set(cell / 32);
        sp.position.set(boardX + x * cell - Math.ceil(cell * 0.3), boardY + sy * cell - Math.ceil(cell * 0.3));
        this.fxLayer.addChild(sp);
        sprites.push(sp);
      }
    }
    this.lineClearAnims.push({ rows, t: 0, sprites });
    if (count >= 4) this.shakeTime = 0.3;
    else if (count >= 2) this.shakeTime = 0.15;
  }

  shake(mag = 1): void {
    this.shakeTime = 0.2 * mag;
  }

  /** リサイズ時のレイアウト再計算と背景更新 */
  resize(): void {
    const vv = window.visualViewport;
    const vw = vv ? vv.width : window.innerWidth;
    const vh = vv ? vv.height : window.innerHeight;
    this.layout = computeLayout(vw, vh);
    this.bgLayer.clear();
    this.drawBackground(vw, vh);
    this.refreshBoard(this.game.board);
    this.refreshPiece();
  }

  private drawBackground(w: number, h: number): void {
    const g = this.bgLayer;
    g.clear();
    // ネオングラデ背景（ダークネイビー→紫がかり）
    g.rect(0, 0, w, h);
    g.fill({ color: 0x0a0e27 });
    // 盤面周りのグロー
    const { boardX, boardY, boardW, boardH } = this.layout;
    g.rect(boardX - 10, boardY - 10, boardW + 20, boardH + 20);
    g.fill({ color: 0x131a45, alpha: 0.9 });
    g.rect(boardX - 10, boardY - 10, boardW + 20, boardH + 20);
    g.stroke({ width: 2, color: 0x4c6fff, alpha: 0.35 });
    // グリッド線
    const { cell } = this.layout;
    for (let x = 1; x < COLS; x++) {
      g.moveTo(boardX + x * cell, boardY);
      g.lineTo(boardX + x * cell, boardY + boardH);
      g.stroke({ width: 1, color: 0x4c6fff, alpha: 0.08 });
    }
    for (let y = 1; y < ROWS; y++) {
      g.moveTo(boardX, boardY + y * cell);
      g.lineTo(boardX + boardW, boardY + y * cell);
      g.stroke({ width: 1, color: 0x4c6fff, alpha: 0.08 });
    }
  }

  /** ゲームイベント → 演出 */
  attachEvents(onEvent: (ev: GameEventType, data?: unknown) => void): void {
    this.game.onEvent = (ev, data) => {
      onEvent(ev, data);
    };
  }
}
