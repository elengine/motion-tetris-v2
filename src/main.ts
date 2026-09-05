import './styles.css';
import { Application, Text, TextStyle } from 'pixi.js';
import { Game } from './core/game';
import { LocalStorageScoreStore } from './core/storage';
import { AudioManager } from './audio/audioManager';
import { TetrisStage } from './engine/stage';
import { TETROMINOES, TetrominoType } from './core/constants';

// ----- DOM -----
const appEl = document.getElementById('app')!;
const hudScore = document.getElementById('hud-score')!;
const hudLevel = document.getElementById('hud-level')!;
const hudLines = document.getElementById('hud-lines')!;
const hudBest = document.getElementById('hud-best')!;
const overlay = document.getElementById('overlay')!;
const ovTitle = document.getElementById('ov-title')!;
const ovSub = document.getElementById('ov-sub')!;
const ovBody = document.getElementById('ov-body')!;
const ovAction = document.getElementById('ov-action') as HTMLButtonElement;
const pauseBtn = document.getElementById('pause-btn') as HTMLButtonElement;
const muteBtn = document.getElementById('mute-btn') as HTMLButtonElement;
const touchpad = document.getElementById('touchpad')!;
const nextCanvas = document.getElementById('next-canvas') as HTMLCanvasElement;
const holdCanvas = document.getElementById('hold-canvas') as HTMLCanvasElement;

// ----- 状態 -----
const game = new Game();
const audio = new AudioManager();
const store = new LocalStorageScoreStore();
let stage: TetrisStage;
let running = false;
let bestScore = 0;
let paused = false;

// ----- PixiJS 起動 -----
async function init(): Promise<void> {
  const app = new Application();
  await app.init({
    background: 0x0a0e27,
    resizeTo: appEl,
    antialias: true,
    preference: 'webgl',
    resolution: Math.min(window.devicePixelRatio || 1, 2),
    autoDensity: true,
  });
  appEl.appendChild(app.canvas);

  stage = new TetrisStage(app, game);
  stage.attachEvents(onGameEvent);
  layout();

  window.addEventListener('resize', layout);
  window.addEventListener('orientationchange', () => setTimeout(layout, 200));
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', layout);
    window.visualViewport.addEventListener('scroll', layout);
  }

  app.ticker.add(() => {
    const dtMs = app.ticker.deltaMS;
    if (running && !paused && !game.over) {
      game.tick(dtMs);
      stage.refreshPiece();
    }
    stage.tick(dtMs);
    tickFloatTexts();
    updateHUD();
  });
}

// ----- レイアウト（visualViewport 基準: Fold8/URLバー対応） -----
function layout(): void {
  if (!stage) return;
  const vv = window.visualViewport;
  const vw = vv ? vv.width : window.innerWidth;
  const vh = vv ? vv.height : window.innerHeight;
  const offsetTop = vv ? vv.offsetTop : 0;

  stage.resize();

  // HUD / パネル / タッチパッドの位置決め（DOMは visualViewport 基準で fixed 配置）
  const hud = document.getElementById('hud')!;
  const panels = document.getElementById('panels')!;
  hud.style.top = `${offsetTop + 12}px`;
  hud.style.left = '12px';
  panels.style.top = `${offsetTop + 12}px`;
  panels.style.right = '64px';

  const isLandscape = vw / vh >= 1.2;
  if (isLandscape) {
    touchpad.style.cssText += `bottom:10px; right:10px; left:auto; width:300px; grid-template-columns:repeat(4,1fr); top:auto;`;
    // パネルは盤面の右上に
    panels.style.right = '10px';
  } else {
    touchpad.style.cssText += `bottom:calc(10px + env(safe-area-inset-bottom)); left:0; right:0; width:auto; grid-template-columns:repeat(7,1fr); top:auto;`;
  }
  drawMiniCanvases();
}

// ----- NEXT / HOLD のミニ描画（2D canvas） -----
function drawBlock2D(
  ctx2d: CanvasRenderingContext2D,
  px: number,
  py: number,
  size: number,
  type: TetrominoType,
): void {
  const def = TETROMINOES[type];
  const r = size * 0.18;
  ctx2d.save();
  ctx2d.shadowColor = def.glow;
  ctx2d.shadowBlur = size * 0.4;
  ctx2d.fillStyle = def.color;
  ctx2d.beginPath();
  ctx2d.roundRect(px + 1, py + 1, size - 2, size - 2, r);
  ctx2d.fill();
  ctx2d.shadowBlur = 0;
  ctx2d.fillStyle = 'rgba(255,255,255,0.3)';
  ctx2d.beginPath();
  ctx2d.roundRect(px + 2, py + 2, size - 4, size * 0.4, r * 0.6);
  ctx2d.fill();
  ctx2d.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx2d.lineWidth = Math.max(1, size * 0.05);
  ctx2d.stroke();
  ctx2d.restore();
}

function drawMiniCanvases(): void {
  // NEXT 3個
  {
    const c = nextCanvas;
    const ctx2d = c.getContext('2d')!;
    ctx2d.clearRect(0, 0, c.width, c.height);
    const size = 22;
    game.nextPieces.forEach((p, i) => {
      const cells = TETROMINOES[p].cells[0];
      const minX = Math.min(...cells.map((q) => q[0]));
      const maxX = Math.max(...cells.map((q) => q[0]));
      const offX = (4 - (maxX - minX + 1)) / 2;
      const baseX = (c.width - 4 * size) / 2;
      const baseY = 10 + i * 74;
      for (const [cx, cy] of cells) {
        drawBlock2D(ctx2d, baseX + (cx - minX + offX) * size, baseY + cy * size, size, p);
      }
    });
  }
  // HOLD
  {
    const c = holdCanvas;
    const ctx2d = c.getContext('2d')!;
    ctx2d.clearRect(0, 0, c.width, c.height);
    if (!game.hold) return;
    const size = 26;
    const cells = TETROMINOES[game.hold].cells[0];
    const minX = Math.min(...cells.map((q) => q[0]));
    const maxX = Math.max(...cells.map((q) => q[0]));
    const offX = (4 - (maxX - minX + 1)) / 2;
    const baseX = (c.width - 4 * size) / 2;
    const baseY = 8;
    for (const [cx, cy] of cells) {
      drawBlock2D(ctx2d, baseX + (cx - minX + offX) * size, baseY + cy * size, size, game.hold);
    }
  }
}

// ----- HUD更新 -----
function updateHUD(): void {
  hudScore.textContent = String(game.score.score);
  hudLevel.textContent = String(game.score.level);
  hudLines.textContent = String(game.score.lines);
  hudBest.textContent = bestScore > 0 ? String(bestScore) : '-';
  if (Math.random() < 0.02) drawMiniCanvases(); // 軽量化のため間引き更新
}

// ----- ゲームイベント → 音・演出 -----
function onGameEvent(ev: string, data?: unknown): void {
  switch (ev) {
    case 'land': {
      const n = (data as number) ?? 0;
      audio.play('lock');
      if (n > 0) audio.play(`line${Math.min(n, 4)}` as 'line1' | 'line2' | 'line3' | 'line4');
      break;
    }
    case 'lineClear': {
      const d = data as { rows: number; gained: number; tspin: 'none' | 'mini' | 'full' };
      if (d.tspin !== 'none') {
        // Tスピン演出
        audio.play('tspin');
        stage.shake(d.rows >= 2 ? 1.3 : 0.8);
        const tspinLabel = d.tspin === 'full'
          ? ['', 'T-SPIN SINGLE!', 'T-SPIN DOUBLE!!', 'T-SPIN TRIPLE!!!'][Math.min(d.rows, 3)]
          : ['', 'T-SPIN MINI', 'T-SPIN MINI DOUBLE'][Math.min(d.rows, 2)];
        floatText(tspinLabel, '#ff5ec8', 36);
      } else if (d.rows >= 4) {
        stage.shake(1.4);
        floatText('TETRIS!', '#c86bff', 40);
      } else if (d.rows >= 2) {
        stage.shake(0.7);
        floatText(`+${d.gained}`, '#00f0ff', 26);
      } else {
        floatText(`+${d.gained}`, '#9fd0ff', 20);
      }
      if (game.score.levelChanged) {
        audio.play('levelup');
        floatText('LEVEL UP!', '#ffe600', 32);
      }
      drawMiniCanvases();
      break;
    }
    case 'tspinNoLines': {
      const d = data as { tspin: 'mini' | 'full'; gained: number };
      audio.play('tspin');
      floatText(d.tspin === 'full' ? 'T-SPIN!' : 'T-SPIN MINI', '#ff5ec8', 30);
      drawMiniCanvases();
      break;
    }
    case 'hardDrop':
      audio.play('hard');
      break;
    case 'gameOver':
      endGame();
      break;
  }
}

// 浮遊テキスト演出（PixiJS Text、ボード中央でフェード＋上昇）
function floatText(text: string, color: string, size: number): void {
  const { boardX, boardY, boardW, boardH } = stage.layout;
  const label = new Text({
    text,
    style: new TextStyle({
      fontFamily: 'Orbitron, sans-serif',
      fontSize: size,
      fill: color,
      fontWeight: 'bold',
      dropShadow: { color: color, blur: 12, distance: 0, alpha: 0.9 },
    }),
  });
  label.anchor.set(0.5);
  label.position.set(boardX + boardW / 2, boardY + boardH * 0.3);
  stage.fxLayer.addChild(label);
  floatAnims.push({ node: label, t: 0 });
}

// ----- 制御 -----
function startGame(): void {
  game.reset();
  stage.refreshBoard(game.board);
  stage.refreshPiece();
  running = true;
  paused = false;
  audio.unlock();
  audio.startBGM(1 + (game.score.level - 1) * 0.06);
  hideOverlay();
  drawMiniCanvases();
}

function endGame(): void {
  running = false;
  audio.stopBGM();
  audio.play('gameover');
  const entry = {
    name: 'YOU',
    score: game.score.score,
    level: game.score.level,
    lines: game.score.lines,
    userId: 'local',
  };
  void store.save(entry).then(() => store.getBest().then((b) => { if (b) bestScore = b.score; }));
  if (game.score.score > bestScore) bestScore = game.score.score;
  showOverlay(
    'GAME OVER',
    `SCORE ${game.score.score} / LEVEL ${game.score.level} / LINES ${game.score.lines}`,
    '',
    'もう一度遊ぶ',
  );
}

function togglePause(): void {
  if (!running) return;
  paused = !paused;
  pauseBtn.textContent = paused ? '▶' : '⏸';
  if (paused) {
    audio.stopBGM();
    showOverlay('PAUSED', '一時停止中', '', 'つづける');
  } else {
    audio.startBGM(1 + (game.score.level - 1) * 0.06);
    hideOverlay();
  }
}

function showOverlay(title: string, sub: string, body: string, action: string): void {
  ovTitle.textContent = title;
  ovTitle.classList.remove('neon-title');
  void ovTitle.offsetWidth;
  ovTitle.classList.add('neon-title');
  ovSub.textContent = sub;
  ovBody.innerHTML = body;
  ovAction.textContent = action;
  overlay.classList.remove('hidden');
}
function hideOverlay(): void {
  overlay.classList.add('hidden');
}

ovAction.addEventListener('click', startGame);
pauseBtn.addEventListener('click', togglePause);
muteBtn.addEventListener('click', () => {
  audio.unlock();
  audio.setMuted(!audio.isMuted);
  muteBtn.textContent = audio.isMuted ? '🔇' : '🔊';
});

// ----- キーボード(PC) DAS/ARR 付き -----
const keyState: Record<string, { timer: number; repeat: number }> = {};
const DAS = 140; // 初期遅延ms
const ARR = 40;  // 連続移動間隔ms

window.addEventListener('keydown', (e) => {
  if (e.repeat) return;
  audio.unlock();
  handleKey(e.key, true);
  if (['ArrowLeft', 'ArrowRight'].includes(e.key)) {
    keyState[e.key] = { timer: 0, repeat: 0 };
  }
});
window.addEventListener('keyup', (e) => {
  delete keyState[e.key];
});
setInterval(() => {
  for (const k of Object.keys(keyState)) {
    const st = keyState[k];
    st.timer += 16;
    if (st.timer >= DAS) {
      st.repeat += 16;
      while (st.repeat >= ARR) {
        st.repeat -= ARR;
        handleKey(k, false);
      }
    }
  }
}, 16);

function handleKey(key: string, first: boolean): void {
  if (!running || paused) return;
  switch (key) {
    case 'ArrowLeft':
      if (game.moveLeft()) audio.play('move');
      break;
    case 'ArrowRight':
      if (game.moveRight()) audio.play('move');
      break;
    case 'ArrowDown':
      if (game.softDrop()) audio.play('soft');
      break;
    case 'ArrowUp':
      if (first && game.rotate(1)) audio.play('rotate');
      break;
    case 'x': case 'X':
      if (first && game.rotate(-1)) audio.play('rotate');
      break;
    case 'z': case 'Z':
      if (first && game.rotate(1)) audio.play('rotate');
      break;
    case ' ':
      if (first) { game.hardDrop(); stage.refreshBoard(game.board); }
      break;
    case 'c': case 'C':
      if (first && game.doHold()) { audio.play('hold'); drawMiniCanvases(); }
      break;
    case 'p': case 'P': case 'Escape':
      if (first) togglePause();
      break;
  }
}

// ----- タッチ操作 -----
document.querySelectorAll('.tc').forEach((btn) => {
  const act = (btn as HTMLElement).dataset.action;
  btn.addEventListener('touchstart', (e) => {
    e.preventDefault();
    audio.unlock();
    if (!running || paused) return;
    switch (act) {
      case 'left': if (game.moveLeft()) audio.play('move'); break;
      case 'right': if (game.moveRight()) audio.play('move'); break;
      case 'soft': if (game.softDrop()) audio.play('soft'); break;
      case 'drop': game.hardDrop(); stage.refreshBoard(game.board); break;
      case 'rotate-cw': if (game.rotate(1)) audio.play('rotate'); break;
      case 'rotate-ccw': if (game.rotate(-1)) audio.play('rotate'); break;
      case 'hold': if (game.doHold()) { audio.play('hold'); drawMiniCanvases(); } break;
    }
  });
});

// スワイプ操作（盤面上）
let swipeSX = 0, swipeSY = 0, swipeT = 0, swiped = false;
appEl.addEventListener('touchstart', (e) => {
  audio.unlock();
  const t = e.changedTouches[0];
  swipeSX = t.clientX; swipeSY = t.clientY; swipeT = Date.now(); swiped = false;
}, { passive: true });
appEl.addEventListener('touchend', (e) => {
  if (swiped) return;
  const t = e.changedTouches[0];
  const dx = t.clientX - swipeSX, dy = t.clientY - swipeSY;
  const dist = Math.hypot(dx, dy);
  const dt2 = Date.now() - swipeT;
  if (dt2 < 260 && dist < 14 && running && !paused) {
    if (game.rotate(1)) audio.play('rotate'); // タップ=回転
  }
}, { passive: true });
appEl.addEventListener('touchmove', (e) => {
  if (swiped || !running || paused) return;
  const t = e.changedTouches[0];
  const dx = t.clientX - swipeSX, dy = t.clientY - swipeSY;
  const TH = 42;
  if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > TH) {
    if (dx < 0) { if (game.moveLeft()) audio.play('move'); }
    else { if (game.moveRight()) audio.play('move'); }
    swiped = true;
  } else if (Math.abs(dy) > TH) {
    if (dy > 0) { game.hardDrop(); stage.refreshBoard(game.board); }
    else { if (game.rotate(1)) audio.play('rotate'); }
    swiped = true;
  }
}, { passive: true });

// ----- 初期化 -----
void init().then(() => {
  void store.getBest().then((b) => { if (b) bestScore = b.score; });
  showOverlay(
    'NEON TETRIS',
    '2026 強化版・ネオン×ガラスモーフィズム',
    '<b>PC</b>: ←→ 移動 / ↑・Z・X 回転 / ↓ ソフト / Space ハード<br><b>スマホ</b>: 下部ボタン or スワイプ（タップ=回転）<br><b>Fold 8</b>: 展開4:3横長に最適化・URLバーに追従',
    'はじめる',
  );
});

// 浮遊テキストのアニメ進行（stage.tick の後毎フレーム）
const floatAnims: { node: Text; t: number }[] = [];
function tickFloatTexts(): void {
  for (let i = floatAnims.length - 1; i >= 0; i--) {
    const a = floatAnims[i];
    a.t += stage.app.ticker.deltaMS / 1000;
    const p = Math.min(1, a.t / 1.1);
    a.node.y -= stage.app.ticker.deltaMS * 0.035; // ゆっくり上昇
    a.node.alpha = p < 0.15 ? p / 0.15 : 1 - (p - 0.15) / 0.85;
    if (p >= 1) {
      a.node.destroy();
      floatAnims.splice(i, 1);
    }
  }
}
