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

declare const __APP_VERSION__: string | undefined;

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
const nextCanvas = document.getElementById('next-canvas') as HTMLCanvasElement;
const holdCanvas = document.getElementById('hold-canvas') as HTMLCanvasElement;
const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
const backBtn = document.getElementById('back-to-title') as HTMLButtonElement;

// ----- 状態 -----
const sound = new SoundEngine();
(window as any).__sfxLog = []; // sfx ログは SoundEngine.play 内で push される（テスト/検証用）
let renderer: Renderer;
let game: Game | null = null;
let running = false;
let paused = false;
let bestScore = Number(localStorage.getItem('ntv2:best') || 0);
let lastMode = GameMode.Marathon;

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
  // 開始前は HUD/パネルを隠す（タイトル画面のノイズ除去）
  document.getElementById('hud')!.style.visibility = 'hidden';
  document.getElementById('panels')!.style.visibility = 'hidden';

  let last = performance.now();
  const loop = (now: number) => {
    const dt = Math.min(100, now - last); last = now;
    tick(dt);
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);

  // バージョン表示（セマンティックバージョン、デプロイ毎に更新）
  const ver = document.getElementById('ov-version')!;
  ver.textContent = `v${__APP_VERSION__ ?? '1.9.4'}`;
  showTitle();
}

function layout(): void {
  if (!renderer) return;
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
  // 実測ベースのレイアウト（回帰: 固定reserveだと実機で盤面がボタンに被る/横画面で盤面が小さい）
  // 1) 先に DOM 位置を確定 → 2) touchpad/HUD/panels の実高を実測 → 3) 盤面を残り領域にフィット
  const hudH = hud.offsetHeight + 20; // HUD 高+下マージン
  requestAnimationFrame(() => {
    // touchpad はこの時点で DOM 完了している
    const pr = pad.getBoundingClientRect();
    const nr = panels.getBoundingClientRect();
    const bottomReserve = Math.ceil(pr.height + (vh - pr.bottom)) + 8; // pad 高 + 下部残り(safe-area)
    const topReserve = Math.ceil(offTop + hudH);
    const sideReserve = isLandscape ? 0 : Math.ceil(nr.width + 24);
    renderer.setReserves({ bottom: bottomReserve, top: topReserve, side: sideReserve });
    renderer.resize();
  });
  // DOM 変更（display/位置）はここまでに確定させる
  if (isLandscape) {
    panels.style.display = 'grid';
    panels.style.top = `${offTop + 10}px`;
    panels.style.right = '10px';
    pad.style.display = 'grid';
    pad.style.bottom = '10px';
    pad.style.left = 'auto';
    pad.style.right = '10px';
    pad.style.width = '300px';
    pad.style.gridTemplateColumns = 'repeat(4, 1fr)';
  } else {
    panels.style.display = 'grid';
    panels.style.top = `${offTop + 10}px`;
    panels.style.right = '10px';
    panels.style.maxWidth = '140px';
    pad.style.bottom = '0';
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
  if (running && game.state === GameState.GameOver) {
    processEvents(); // タイムアウト/クリア直後に GameOver になったフレームでも finish/gameover イベントを受け取る
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
    if (ev.action === 'finish') { gameFinish(); continue; } // モード完走（スプリント40L/ウルトラ2分）
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

/** モード完走（スプリント40Lクリア / ウルトラ2分終了）— 祝い演出 */
function gameFinish(): void {
  running = false;
  sound.stopBGM();
  sound.play('finish');
  // 完了画面中は HUD を隠す（回帰: 中央とHUDにスコアが2重に見えた）
  document.getElementById('hud')!.style.visibility = 'hidden';
  const sc = Number(game!.score);
  if (sc > bestScore) { bestScore = sc; localStorage.setItem('ntv2:best', String(sc)); }
  const el = Number(game!.elapsedMs);
  const sec = Math.floor(el / 1000);
  const t = `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`;
  const isSprint = game!.mode === GameMode.Sprint;
  // スコアは3桁区切りで1箇所のみ表示（回帰: 中央にスコア/ラインが2重表示されていた）
  const scFmt = sc.toLocaleString('en-US');
  const resultOne = isSprint
    ? `TIME <b>${t}</b> / LINES <b>40</b>`
    : `SCORE <b>${scFmt}</b> / LINES <b>${game!.lines}</b>`;
  showOverlay(
    isSprint ? '🏁 40 LINES CLEAR!' : '⏱ TIME UP!',
    isSprint ? '40ライン達成！お見事！' : '2分間のスコアアタック終了!',
    `<div class="finish-frame">${resultOne}</div>`,
    'もう一度遊ぶ');
  // スコア表示は ov-body 内 1箇所のみ（ov-sub に数値は入れない）
}

function gameOver(): void {
  running = false;
  sound.stopBGM();
  sound.play('gameover');
  // 完了画面と同デザインに統一（回帰: 画面デザインの不統一）— 赤系配色
  document.getElementById('hud')!.style.visibility = 'hidden';
  const sc = Number(game!.score);
  if (sc > bestScore) { bestScore = sc; localStorage.setItem('ntv2:best', String(sc)); }
  const scFmt = sc.toLocaleString('en-US');
  const result = `SCORE <b>${scFmt}</b> / LINES <b>${game!.lines}</b>`;
  showOverlay('💥 GAME OVER',
    'ブロックが天井まで積み上がった…',
    `<div class="finish-frame danger">${result}</div>`,
    'もう一度遊ぶ');
}

// ----- 操作 -----
function startGame(mode: GameMode): void {
  if (!game) return;
  lastMode = mode;
  document.getElementById('title-toggles')!.style.display = 'none'; // 回帰: プレイ中も見えないサウンドボタンが pointer-events:auto でタップを拾い、盤面中央タップでサウンドトグルが発動していた
  document.getElementById('hud')!.style.visibility = 'visible';
  document.getElementById('panels')!.style.visibility = 'visible';
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
  pauseBtn.classList.toggle('alt', paused); // ▶(再開) ⏸(停止) SVG切替
  if (paused) { sound.stopBGM(); document.getElementById('hud')!.style.visibility = 'hidden'; showOverlay('PAUSED', '一時停止中', '', 'つづける'); } // 回帰: 一時停止画面にHUDのサウンドボタン等が見える
  else { document.getElementById('hud')!.style.visibility = 'visible'; sound.startBGM(game.level); hideOverlay(); }
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
let sy0 = 0, movedHorizOnly = false; // touched 元々の追跡は soft_drop 常時化で不要に
canvas.addEventListener('touchstart', (e) => {
  if (game === null || running === false || paused) return; // 開始前/ポーズ中: 盤面タップ無効（回帰: スタート画面でサウンドトグルが誤反応）
  sound.unlock();
  const t = e.changedTouches[0];
  sx = t.clientX; sy = t.clientY; sy0 = t.clientY; st0 = Date.now(); moved = false; movedHorizOnly = false;
}, { passive: true });
canvas.addEventListener('touchend', (e) => {
  const t = e.changedTouches[0];
  const playState = running && !paused && game && game.state === GameState.Playing;
  if (!playState) return; // 開始前/ポーズ中は盤面操作無効（回帰: スタート画面/ポーズ中に誤操作）
  // 素早い下フリック → ハードドロップ（回帰: 少し下スワイプでもハードドロップしていた → 時間160ms以内のフリックのみ許可）
  if (playState && game && t.clientY - sy0 > 44 && Date.now() - st0 < 160 && !movedHorizOnly) {
    e.preventDefault();
    game.hard_drop(); sound.play('hard');
    return;
  }
  // タップ（ほぼ動かず短押し）→ 右回転
  if (!moved && Math.hypot(t.clientX - sx, t.clientY - sy0) < 14 && Date.now() - st0 < 260 && playState) {
    beginRotate(1);
  }
}, { passive: false });
canvas.addEventListener('touchmove', (e) => {
  if (!running || paused || !game || game.state !== GameState.Playing) return; // 回帰: 終了後/開始前にスワイプで誤操作
  e.preventDefault();
  e.preventDefault(); // 下スワイプでのページスクロール抑止
  const t = e.changedTouches[0];
  const dx = t.clientX - sx, dy = t.clientY - sy, TH = 44;
  if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > TH) {
    if (!moved) { game.move_h(dx < 0 ? -1 : 1); sound.play('move'); moved = true; movedHorizOnly = true; }
  } else if (dy > TH) {
    // 下方向ドラッグ: 追従ソフトドロップ（回帰: 少しスワイプでハードドロップ → ゆっくり引く間はソフトドロップ）
    game.soft_drop();
    sx = t.clientX; sy = t.clientY;
  } else if (dy < -TH && !moved) {
    beginRotate(1); moved = true; // 上スワイプ=回転
  }
}, { passive: false });

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
// 遊び方描述ビュー (回帰: スタート画面からWasm/PC/スマホ説明を撤去し「遊び方」リンクへ分離)
const HOWTO_HTML = `
  <div class="howto">
    <section class="howto-card">
      <h3><span class="howto-ico">🖥</span> PC での操作</h3>
      <ul>
        <li>移動　　　　　　 <span class="key">←</span><span class="key">→</span></li>
        <li>左回転　　　　　 <span class="key">Z</span> / <span class="key">Ctrl</span></li>
        <li>右回転　　　　　 <span class="key">↑</span> / <span class="key">X</span></li>
        <li>ソフトドロップ　 <span class="key">↓</span></li>
        <li>ハードドロップ　 <span class="key">Space</span></li>
        <li>ホールド　　　　 <span class="key">C</span> / <span class="key">Shift</span></li>
        <li>一時停止　　　　 <span class="key">P</span> / <span class="key">Esc</span></li>
      </ul>
    </section>
    <section class="howto-card">
      <h3><span class="howto-ico">📱</span> スマホでの操作</h3>
      <ul>
        <li>左移動　　　　　 画面を左にスワイプ / <span class="howto-realbtn sm">◀</span></li>
        <li>右移動　　　　　 画面を右にスワイプ / <span class="howto-realbtn sm">▶</span></li>
        <li>左回転　　　　　 <span class="howto-realbtn sm">⟲</span></li>
        <li>右回転　　　　　 画面タップ / 上スワイプ / <span class="howto-realbtn sm">⟳</span></li>
        <li>ソフトドロップ　 画面をゆっくり下にドラッグ / <span class="howto-realbtn sm">↓</span></li>
        <li>ハードドロップ　 画面を素早く下にフリック / <span class="howto-realbtn sm">⤓</span></li>
        <li>ホールド　　　　 <span class="howto-realbtn sm">H</span></li>
      </ul>
      <div class="howto-btn-row">
        <span class="howto-realbtn" title="左移動">◀</span>
        <span class="howto-realbtn" title="右移動">▶</span>
        <span class="howto-realbtn" title="回転（左）">⟲</span>
        <span class="howto-realbtn" title="回転（右）">⟳</span>
        <span class="howto-realbtn" title="ソフトドロップ">↓</span>
        <span class="howto-realbtn" title="ハードドロップ">⤓</span>
        <span class="howto-realbtn" title="ホールド">H</span>
      </div>
      <p class="howto-note">※ 実際のゲーム画面の下部に表示されるボタンです。</p>
    </section>
    <section class="howto-card">
      <h3><span class="howto-ico">⚙</span> 共通ボタン（画面上部）</h3>
      <ul>
        <li>一時停止 / 再開： <span class="key">‖</span>⇔<span class="key">▶</span>（ポーズ中は▶に変わる）</li>
        <li>サウンド ON / OFF： <span class="key">🔊</span>⇔<span class="key">🔇</span>（OFF中は斜線アイコン）</li>
      </ul>
      <div class="howto-btn-row">
        <span class="howto-realbtn" title="一時停止/再開">
          <svg viewBox="0 0 24 24" class="ic ic-main"><rect x="6" y="5" width="4" height="14" rx="1.2" fill="currentColor"/><rect x="14" y="5" width="4" height="14" rx="1.2" fill="currentColor"/></svg>
          <svg viewBox="0 0 24 24" class="ic ic-alt"><path d="M8 5l11 7-11 7z" fill="currentColor"/></svg>
        </span>
        <span class="howto-realbtn" title="サウンドON/OFF">
          <svg viewBox="0 0 24 24" class="ic ic-main"><path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor"/><path d="M17.5 8.5a5 5 0 010 7" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round"/></svg>
          <svg viewBox="0 0 24 24" class="ic ic-alt"><path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor"/><path d="M16 9l5 6M21 9l-5 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
        </span>
      </div>
      <p class="howto-note">※ PC・スマホ共通。ゲーム画面の上部にある2つのボタンです。</p>
    </section>
    <section class="howto-card">
      <h3><span class="howto-ico">🎮</span> モードとルール</h3>
      <ul>
        <li><b>マラソン</b>　10ラインごとにレベルアップ。どこまで高得点を狙えるか</li>
        <li><b>スプリント（40ライン）</b>　40ライン消すまでのタイムを競う</li>
        <li><b>ウルトラ（2分）</b>　2分でどれだけスコアを稼げるか</li>
      </ul>
    </section>
  </div>`;

function showTitle(): void {
  document.getElementById('title-toggles')!.style.display = ''; // サウンドボタンはスタート画面（あそびかた上）のみ
  document.getElementById('mode-buttons')!.style.display = '';
  backBtn.style.display = 'none';
  ovAction.style.display = 'none'; // タイトル画面では「はじめる」撤去（モードボタンが直接開始）（回帰: ボタン重複）
  (document.querySelector('.v1-link') as HTMLElement)!.style.display = ''; // v1リンクはタイトルのみ
  document.getElementById('howto-link')!.style.display = ''; // 遊び方リンク
  showOverlay('NEON TETRIS', '', '', 'はじめる');
}

// 遊び方画面: PC/スマホ/モード説明 + スタート画面へ戻る
function showHowto(): void {
  document.getElementById('title-toggles')!.style.display = 'none'; // あそびかた画面ではサウンドボタン撤去
  document.getElementById('hud')!.style.visibility = 'hidden'; // 回帰: あそびかた画面にサウンドボタン等を表示しない
  document.getElementById('mode-buttons')!.style.display = 'none';
  ovAction.style.display = 'none';
  (document.querySelector('.v1-link') as HTMLElement)!.style.display = 'none';
  document.getElementById('howto-link')!.style.display = 'none';
  backBtn.style.display = '';
  showOverlay('遊び方', '', HOWTO_HTML, '');
}
function showOverlay(title: string, sub: string, body: string, action: string): void {
  ovTitle.textContent = title;
  ovTitle.classList.remove('neon-title'); void ovTitle.offsetWidth; ovTitle.classList.add('neon-title');
  ovSub.textContent = sub;
  ovBody.innerHTML = body;
  ovAction.textContent = action;
  if (title !== 'NEON TETRIS' && title !== '遊び方') {
    document.getElementById('mode-buttons')!.style.display = 'none'; // 完了/オーバー画面はModeボタン非表示
    backBtn.style.display = '';
    ovAction.style.display = ''; // 完了画面では「もう一度遊ぶ」ボタン有効
    (document.querySelector('.v1-link') as HTMLElement)!.style.display = 'none'; // 完了画面ではv1リンク撤去（回帰: 画面整理）
    document.getElementById('howto-link')!.style.display = 'none'; // 完了画面では「あそびかた」リンク非表示（スタート画面のみ設置）
    document.getElementById('title-toggles')!.style.display = 'none'; // 完了/オーバー画面ではサウンドボタン撤去（スタート画面のみ設置）
  }
  overlay.classList.remove('hidden');
}
function hideOverlay(): void { overlay.classList.add('hidden'); }

ovAction.addEventListener('click', () => {
  sound.unlock();
  if (paused) { togglePause(); return; } // PAUSED画面の「つづける」= 再開（回帰: 押すと新規ゲームが始まっていた）
  startGame(lastMode);
});
document.querySelectorAll('.mode-btn').forEach((b) => {
  b.addEventListener('click', () => {
    const mv = (b as HTMLElement).dataset.mode;
    const md = mv === 'sprint' ? GameMode.Sprint : mv === 'ultra' ? GameMode.Ultra : GameMode.Marathon;
    sound.unlock();
    startGame(md);
  });
});
// 遊び方リンク → 遊び方画面
document.getElementById('howto-link')!.addEventListener('click', (e) => {
  e.preventDefault();
  sound.unlock();
  showHowto();
});
// スタート画面へ戻る: タイトルオーバーレイに戻す
backBtn.addEventListener('click', () => {
  running = false; paused = false;
  sound.stopBGM();
  pauseBtn.classList.remove('alt'); // ポーズアイコンを通常に戻す（回帰: 再開後のSVG状態不整合）
  document.getElementById('hud')!.style.visibility = 'hidden'; // 回帰: ポーズ→スタート画面に戻るとHUDが残る
  showTitle();
});
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
  localStorage.setItem('ntv2:muted', sound.isMuted ? '1' : '0'); // 設定保存: 次回起動も継続
  muteBtn.classList.toggle('muted', sound.isMuted); muteBtn.classList.toggle('alt', sound.isMuted);
  syncTitleSoundBtn();
};
muteBtn.addEventListener('pointerdown', pressMute);
muteBtn.addEventListener('click', pressMute);
// ミュート状態の復元（起動時に前回の設定を継続）
sound.setMuted(localStorage.getItem('ntv2:muted') === '1');

// ----- スタート画面サウンドON/OFFボタン（HUDボタンと同一状態を共有） -----
const titleSoundBtn = document.getElementById('title-sound-btn') as HTMLButtonElement;
function syncTitleSoundBtn(): void {
  titleSoundBtn.classList.toggle('muted', sound.isMuted);
  titleSoundBtn.classList.toggle('alt', sound.isMuted);
  titleSoundBtn.setAttribute('aria-pressed', sound.isMuted ? 'true' : 'false');
}
titleSoundBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); pressMute(e); });
titleSoundBtn.addEventListener('click', (e) => pressMute(e));
syncTitleSoundBtn();

void main();
void COLS; void ROWS; void TOTAL_ROWS; void HIDDEN_ROWS; void cellToPx;
