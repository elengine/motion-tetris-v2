/**
 * NEON TETRIS v2 — ゼロから再設計版 エントリ。
 * Wasm コア + Canvas 2D + Web Audio 生成音。
 * 座標変換は renderer の cellToPx に一本化 → ズレ・消滅バグの構造的排除。
 */
import './styles.css';
import { loadCore, Game, GameMode, GameState } from './core/wasmCore';
import { Renderer, cellToPx } from './engine/renderer';
import { SoundEngine, SfxName } from './audio/soundEngine';
import { PIECES, PieceType, COLS, ROWS, TOTAL_ROWS, HIDDEN_ROWS } from './core/pieces';
import { initialOffset, offsetAt } from './engine/rotanim';

// ----- DOM -----
document.getElementById('app');
const hudScore = document.getElementById('hud-score')!;
const hudLevel = document.getElementById('hud-level')!;
const hudLines = document.getElementById('hud-lines')!;
const hudBest = document.getElementById('hud-best')!;
const hudTime = document.getElementById('hud-time')!;
const overlay = document.getElementById('overlay')!;
const ovTitle = document.getElementById('ov-title')!;
const ovSub = document.getElementById('ov-sub')!;
const ovBody = document.getElementById('ov-body')!;
const ovAction = document.getElementById('ov-action') as HTMLButtonElement;
const pauseBtn = document.getElementById('pause-btn') as HTMLButtonElement;
const muteBtn = document.getElementById('mute-btn') as HTMLButtonElement;
const modeSel = document.getElementById('mode-select') as HTMLSelectElement;
const nextCanvas = document.getElementById('next-canvas') as HTMLCanvasElement;
const holdCanvas = document.getElementById('hold-canvas') as HTMLCanvasElement;
const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;

// ----- 状態 -----
const sound = new SoundEngine();
(window as any).__sfxLog = []; // sfx ログは SoundEngine.play 内で push される（テスト/検証用）
let renderer: Renderer;
let game: Game | null = null;
let running = false;
let paused = false;
let bestScore = Number(localStorage.getItem('ntv2:best') || 0);

// 演出状態
interface FloatText { text: string; color: string; x: number; y: number; t: number; size: number }
const floats: FloatText[] = [];
const clearFx: { row: number; t: number }[] = [];
let rotAnimOffset = 0;  // 表示中の一時回転オフセット(rad) — 常に[-π/2,π/2]で累積しない
let rotAnimDir = 1;     // 回転方向
let rotAnimElapsed = 0; // 経過ms
let pivotX = 0, pivotY = 0;

// ----- 初期化 -----
async function main(): Promise<void> {
  await loadCore();
  renderer = new Renderer(canvas);
  renderer.resize();
  game = new Game(BigInt(Date.now() & 0x7fffffff));

  window.addEventListener('resize', layout);
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', layout);
    window.visualViewport.addEventListener('scroll', layout);
  }
  layout();

  let last = performance.now();
  const loop = (now: number) => {
    const dt = Math.min(100, now - last); last = now;
    tick(dt);
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);

  showOverlay(
    'NEON TETRIS',
    'Wasm × ガイドライン完全準拠',
    '<b>PC</b>: ←→ 移動 / ↑・Z・X 回転 / ↓ ソフト / Space ハード / C ホールド<br><b>スマホ</b>: 下部ボタン + スワイプ（盤面タップ=回転）',
    'はじめる',
  );
}

function layout(): void {
  if (!renderer) return;
  renderer.resize();
  const vv = window.visualViewport;
  const vw = vv ? vv.width : window.innerWidth;
  const vh = vv ? vv.height : window.innerHeight;
  const offTop = vv ? vv.offsetTop : 0;
  const isLandscape = vw / vh >= 1.2;
  const hud = document.getElementById('hud')!;
  const panels = document.getElementById('panels')!;
  const pad = document.getElementById('touchpad')!;
  hud.style.top = `${offTop + 10}px`;
  hud.style.left = '10px';
  if (isLandscape) {
    panels.style.display = 'grid';
    panels.style.top = `${offTop + 10}px`;
    panels.style.right = '10px';
    pad.style.display = 'grid';
    pad.style.bottom = '10px';
    pad.style.left = '10px';
    pad.style.right = 'auto';
    pad.style.width = 'auto';
    pad.style.gridTemplateColumns = 'repeat(5, 1fr)';
    pad.style.width = 'calc(100% - 320px)';
  } else {
    panels.style.display = 'grid';
    panels.style.top = `${offTop + 10}px`;
    panels.style.right = '10px';
    pad.style.bottom = 'calc(8px + env(safe-area-inset-bottom))';
    pad.style.left = '0';
    pad.style.right = '0';
    pad.style.width = 'auto';
    pad.style.gridTemplateColumns = 'repeat(7, 1fr)';
  }
}

// ----- メインループ -----
function tick(dt: number): void {
  if (!game || !renderer) return;
  if (running && !paused && game.state === GameState.Playing) {
    game.tick(dt);
    handleRepeat(dt);
    processEvents();
  }
  // 回転アニメ補間: 偏差 rotAnimOffset を 90ms で 0 に減衰させる（旧回転状態→新状態へ見た目だけ回る）
  if (Math.abs(rotAnimOffset) > 0.01) {
    rotAnimElapsed += dt;
    const k = Math.min(1, rotAnimElapsed / 90);
    rotAnimOffset = offsetAt(rotAnimDir as 1 | -1, k);
    if (k >= 1) { rotAnimOffset = 0; }
  }

  const visualOffset = (rotAnimOffset + Math.PI) % (Math.PI * 2) - Math.PI; // [-π,π) 正規化（保険）
  const fx = { rotOffset: visualOffset, pivotX, pivotY, clearRows: [] as any, flashAlpha: 0 };
  (window as any).__debug = { rotAnim: visualOffset, rotTarget: game ? game.curRot : 0, curRot: game ? game.curRot : 0, curX: game ? game.curX : 0, curY: game ? game.curY : 0 };
  // ライン消去フラッシュ更新
  for (let i = clearFx.length - 1; i >= 0; i--) {
    clearFx[i].t += dt;
    if (clearFx[i].t > 300) clearFx.splice(i, 1);
  }
  (fx as any).clearRows = clearFx.map((c) => ({
    row: c.row,
    alpha: 1 - c.t / 300,
  }));

  renderer.draw(game, fx as any);
  drawFloatTexts(dt);
  drawMini();
  updateHUD();
}

function updateHUD(): void {
  if (!game) return;
  hudScore.textContent = String(game.score);
  hudLevel.textContent = String(game.level);
  hudLines.textContent = String(game.lines);
  hudBest.textContent = bestScore > 0 ? String(bestScore) : '-';
  const el = game.elapsedMs;
  const sec = Math.floor(Number(el) / 1000);
  hudTime.textContent = `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`;
}

function processEvents(): void {
  if (!game) return;
  const evs = game.popEvents() as Array<{ lines: number; tspin: number; b2b: boolean; combo: number; perfect_clear: boolean; points: number; action: string }>;
  if (!Array.isArray(evs)) return;
  for (const ev of evs) {
    if (ev.action === 'gameover') { gameOver(); continue; }
    if (ev.action === 'lock') { sound.play('lock'); continue; } // 自然落下で位置が確定した時の効果音（回帰修正）
    audioOnClear(ev);
  }
}

function audioOnClear(ev: { lines: number; tspin: number; perfect_clear: boolean; action: string; points: number }): void {
  ellipse(ev);
}
function ellipse(ev: { lines: number; tspin: number; perfect_clear: boolean; action: string; points: number }): void {
  if (ev.action === 'tetris') sound.play('line4');
  else if (ev.tspin > 0) sound.play('tspin');
  else if (ev.lines > 0) sound.play(`line${Math.min(ev.lines, 3)}` as SfxName);
  else if (ev.action) { /* lock音は audioOnLock で */ }
  if (ev.lines > 0 || ev.tspin > 0) {
    if (ev.action.startsWith('tspin')) {
      const label = ev.action.replace('tspin_', 'T-SPIN ').replace('_', ' ').toUpperCase();
      float(label.toUpperCase(), '#ff5ec8', 34);
    } else if (ev.action !== '') {
      float(`+${ev.points}`, ev.lines >= 3 ? '#c86bff' : '#00f0ff', 26);
      if (ev.action === 'tetris') float('TETRIS!', '#c86bff', 40);
    }
  }
}

function gameOver(): void {
  running = false;
  sound.stopBGM();
  sound.play('gameover');
  const sc = Number(game!.score);
  if (sc > bestScore) { bestScore = sc; localStorage.setItem('ntv2:best', String(sc)); }
  const el = Number(game!.elapsedMs);
  const sec = Math.floor(el / 1000);
  showOverlay('GAME OVER',
    `SCORE ${sc} / LINES ${game!.lines} / LEVEL ${game!.level}`,
    game!.mode === GameMode.Sprint || game!.mode === GameMode.Ultra ? `TIME ${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}` : '',
    'もう一度遊ぶ');
}

// ----- 操作 -----
function startGame(): void {
  if (!game) return;
  const mode = modeSel.value === 'sprint' ? GameMode.Sprint : modeSel.value === 'ultra' ? GameMode.Ultra : GameMode.Marathon;
  game.startGame(mode, BigInt(Date.now() & 0x7fffffff));
  running = true; paused = false;
  sound.unlock();
  sound.startBGM(1);
  hideOverlay();
  (window as any).__game = game; // デバッグ/テスト用
}

function togglePause(): void {
  if (!running || !game) return;
  game.pause_toggle();
  paused = game.state === GameState.Paused;
  pauseBtn.textContent = paused ? '▶' : '⏸';
  if (paused) { sound.stopBGM(); showOverlay('PAUSED', '一時停止中', '', 'つづける'); }
  else { sound.startBGM(game.level); hideOverlay(); }
}

// key handling: DAS/ARR
const keyState: Record<string, { timer: number; fired: number }> = {};
const DAS = 140, ARR = 45;

window.addEventListener('keydown', (e) => {
  if (['ArrowLeft', 'ArrowRight', 'ArrowDown', 'ArrowUp', ' '].includes(e.key)) e.preventDefault();
  if (e.repeat) return;
  sound.unlock();
  firstPress(e.key);
  if (['ArrowLeft', 'ArrowRight', 'ArrowDown'].includes(e.key)) keyState[e.key] = { timer: 0, fired: 0 };
});
window.addEventListener('keyup', (e) => { delete keyState[e.key]; });

function firstPress(key: string): void {
  if (!running || paused || !game || game.state !== GameState.Playing) return;
  switch (key) {
    case 'ArrowLeft': if (game.move_h(-1)) sound.play('move'); break;
    case 'ArrowRight': if (game.move_h(1)) sound.play('move'); break;
    case 'ArrowDown': if (game.soft_drop()) sound.play('soft'); break;
    case 'ArrowUp': case 'x': case 'X': beginRotate(1); break;
    case 'z': case 'Z': beginRotate(-1); break;
    case ' ': game.hard_drop(); sound.play('hard'); break;
    case 'c': case 'C': if (game.do_hold()) sound.play('hold'); break;
    case 'p': case 'P': case 'Escape': togglePause(); break;
  }
}

function handleRepeat(dt: number): void {
  for (const k of Object.keys(keyState)) {
    const st = keyState[k];
    st.timer += dt;
    if (st.timer >= DAS) {
      st.fired += dt;
      while (st.fired >= ARR) {
        st.fired -= ARR;
        if (!game || paused) break;
        if (k === 'ArrowLeft') { if (game.move_h(-1)) sound.play('move'); }
        else if (k === 'ArrowRight') { if (game.move_h(1)) sound.play('move'); }
        else if (k === 'ArrowDown') { if (game.soft_drop()) sound.play('soft'); }
      }
    }
  }
}

/** 90°回転 + 表示アニメ開始 */
function beginRotate(dir: 1 | -1): void {
  if (!game) return;
  prevCells = game.currentCells() as { x: number; y: number }[];
  if (prevCells.length) {
    pivotX = prevCells.reduce((s, c) => s + c.x, 0) / prevCells.length;
    pivotY = prevCells.reduce((s, c) => s + c.y, 0) / prevCells.length;
  }
  if (game.rotate(dir)) {
    // 偏差ベース: 常に「旧回転状態→新回転状態」の −90°〜+90° の一時補間のみ
    rotAnimDir = dir;
    rotAnimElapsed = 0;
    rotAnimOffset = initialOffset(dir);
    sound.play('rotate');
  }
}

// 回転アニメ中の「前のセル位置」を保持（描画は旧位置→新位置の補間に固定）
let prevCells: { x: number; y: number }[] | null = null;

// pivot は回転時に都度計算するため不要

// ----- タッチ -----
document.querySelectorAll('.tc').forEach((btn) => {
  const act = (btn as HTMLElement).dataset.action;
  const handler = (e: Event) => {
    e.preventDefault();
    sound.unlock();
    if (!running || paused || !game || game.state !== GameState.Playing) return;
    switch (act) {
      case 'left': if (game.move_h(-1)) sound.play('move'); break;
      case 'right': if (game.move_h(1)) sound.play('move'); break;
      case 'soft': if (game.soft_drop()) sound.play('soft'); break;
      case 'drop': game.hard_drop(); sound.play('hard'); break;
      case 'rot-cw': beginRotate(1); break;
      case 'rot-ccw': beginRotate(-1); break;
      case 'hold': if (game.do_hold()) sound.play('hold'); break;
    }
  };
  btn.addEventListener('touchstart', handler, { passive: false });
  btn.addEventListener('click', handler);
});

let sx = 0, sy = 0, st0 = 0, moved = false;
canvas.addEventListener('touchstart', (e) => {
  sound.unlock();
  const t = e.changedTouches[0];
  sx = t.clientX; sy = t.clientY; st0 = Date.now(); moved = false;
}, { passive: true });
canvas.addEventListener('touchend', (e) => {
  if (moved) return;
  const t = e.changedTouches[0];
  if (Math.hypot(t.clientX - sx, t.clientY - sy) < 14 && Date.now() - st0 < 260 && running && !paused) {
    beginRotate(1);
  }
}, { passive: true });
canvas.addEventListener('touchmove', (e) => {
  if (moved || !running || paused || !game) return;
  const t = e.changedTouches[0];
  const dx = t.clientX - sx, dy = t.clientY - sy, TH = 44;
  if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > TH) { game.move_h(dx < 0 ? -1 : 1); sound.play('move'); moved = true; }
  else if (Math.abs(dy) > TH) {
    if (dy > 0) { game.hard_drop(); sound.play('hard'); } else { beginRotate(1); }
    moved = true;
  }
}, { passive: true });

// ----- NEXT / HOLD 描画 -----
function drawBlock2D(c: HTMLCanvasElement, px: number, py: number, size: number, type: PieceType): void {
  const ctx = c.getContext('2d')!;
  const def = PIECES[type];
  const r = size * 0.16;
  ctx.save();
  ctx.shadowColor = def.glow; ctx.shadowBlur = size * 0.4;
  ctx.fillStyle = def.color;
  ctx.beginPath();
  // roundRect polyfill
  ctx.moveTo(px + r, py); ctx.arcTo(px + size, py, px + size, py + size, r);
  ctx.arcTo(px + size, py + size, px, py + size, r); ctx.arcTo(px, py + size, px, py, r);
  ctx.arcTo(px, py, px + size, py, r); ctx.closePath(); ctx.fill();
  ctx.restore();
}

function drawMini(): void {
  if (!game) return;
  // NEXT
  {
    const c = nextCanvas;
    const ctx = c.getContext('2d')!;
    ctx.clearRect(0, 0, c.width, c.height);
    const q = (game.getQueue() as string[]).slice(0, 3);
    const size = 20;
    q.forEach((p, i) => {
      const letters = String(p).replace(/[^IOTSZJL]/g, '');
      const type = letters as PieceType;
      if (!PIECES[type]) return;
      const cells = PIECES[type].cells[0];
      const minX = Math.min(...cells.map((q) => q[0])), maxX = Math.max(...cells.map((q) => q[0]));
      const minY = Math.min(...cells.map((q) => q[1])), maxY = Math.max(...cells.map((q) => q[1]));
      const offX = (4 - (maxX - minX + 1)) / 2, offY = (3 - (maxY - minY + 1)) / 2;
      const bx = (c.width - 4 * size) / 2, by = 8 + i * 62;
      for (const [cx, cy] of cells) drawBlock2D(c, bx + (cx - minX + offX) * size, by + (cy - minY + offY) * size, size, type);
    });
  }
  // HOLD
  {
    const c = holdCanvas;
    const ctx = c.getContext('2d')!;
    ctx.clearRect(0, 0, c.width, c.height);
    const h = game.getHold() as string | null;
    if (!h) { return; }
    const letters = String(h) as PieceType;
    if (!PIECES[letters]) return;
    const size = 22;
    const cells = PIECES[letters].cells[0];
    const minX = Math.min(...cells.map((q) => q[0])), maxX = Math.max(...cells.map((q) => q[0]));
    const offX = (4 - (maxX - minX + 1)) / 2;
    const bx = (c.width - 4 * size) / 2, by = 10;
    for (const [cx, cy] of cells) drawBlock2D(c, bx + (cx - minX + offX) * size, by + cy * size, size, letters);
  }
}

// ----- 浮遊テキスト -----
function float(text: string, color: string, size: number): void {
  const l = renderer.layout;
  floats.push({ text, color, x: l.boardX + l.boardW / 2, y: l.boardY + l.boardH * 0.3, t: 0, size });
}
function drawFloatTexts(dt: number): void {
  const ctx = renderer.ctx;
  for (let i = floats.length - 1; i >= 0; i--) {
    const f = floats[i];
    f.t += dt;
    const p = Math.min(1, f.t / 1100);
    const y = f.y - p * 40;
    ctx.save();
    ctx.globalAlpha = p < 0.1 ? p / 0.1 : 1 - (p - 0.1) / 0.9;
    ctx.fillStyle = f.color;
    ctx.font = `bold ${f.size}px 'Orbitron', sans-serif`;
    ctx.textAlign = 'center';
    ctx.shadowColor = f.color; ctx.shadowBlur = 14;
    ctx.fillText(f.text, f.x, y);
    ctx.restore();
    if (p >= 1) floats.splice(i, 1);
  }
}

// ----- overlay -----
function showOverlay(title: string, sub: string, body: string, action: string): void {
  ovTitle.textContent = title;
  ovTitle.classList.remove('neon-title'); void ovTitle.offsetWidth; ovTitle.classList.add('neon-title');
  ovSub.textContent = sub;
  ovBody.innerHTML = body;
  ovAction.textContent = action;
  overlay.classList.remove('hidden');
}
function hideOverlay(): void { overlay.classList.add('hidden'); }

ovAction.addEventListener('click', () => { sound.unlock(); startGame(); });
// ポインタ環境では pointerdown + click の両方が発火し二重トグルになるためデバウンス（回帰: 押しても無効/不自然）
let lastPausePress = 0;
const pressPause = (e: Event): void => {
  e.preventDefault(); e.stopPropagation();
  const now = Date.now();
  if (now - lastPausePress < 300) return;
  lastPausePress = now;
  sound.unlock();
  togglePause();
};
pauseBtn.addEventListener('pointerdown', pressPause);
pauseBtn.addEventListener('click', pressPause);
let lastMutePress = 0;
const pressMute = (e: Event): void => {
  e.preventDefault(); e.stopPropagation();
  const now = Date.now();
  if (now - lastMutePress < 300) return;
  lastMutePress = now;
  sound.unlock();
  sound.setMuted(!sound.isMuted);
  muteBtn.textContent = sound.isMuted ? '🔇' : '🔊';
};
muteBtn.addEventListener('pointerdown', pressMute);
muteBtn.addEventListener('click', pressMute);
// ミュート状態の復元
sound.setMuted(localStorage.getItem('ntv2:muted') === '1');
muteBtn.textContent = sound.isMuted ? '🔇' : '🔊';
muteBtn.addEventListener('pointerdown', () => localStorage.setItem('ntv2:muted', sound.isMuted ? '1' : '0'));

void main();
void COLS; void ROWS; void TOTAL_ROWS; void HIDDEN_ROWS; void cellToPx;
