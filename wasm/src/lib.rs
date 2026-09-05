//! NEON TETRIS v2 — 商用グレード Wasm コア
//! ガイドライン完全準拠: SRSキック / 7-bag / ホールド / ゴースト / ハード・ソフトドロップ /
//! ロックディレイ / Tスピン全種 (TSD/TST/Mini) / B2B / コンボ / パーフェクトクリア /
//! マラソン・スプリント(40L)・ウルトラ(2分) モード

use serde::{Deserialize, Serialize};
use wasm_bindgen::prelude::*;

pub const COLS: usize = 10;
pub const ROWS: usize = 20;
pub const HIDDEN_ROWS: usize = 2;
pub const TOTAL_ROWS: usize = ROWS + HIDDEN_ROWS;

#[wasm_bindgen]
#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub enum GameMode { Marathon, Sprint, Ultra }

#[wasm_bindgen]
#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub enum GameState { Title, Playing, Paused, GameOver }

#[wasm_bindgen]
#[derive(Clone, Copy, PartialEq, Eq, Debug, Serialize, Deserialize)]
pub enum PieceType { I, O, T, S, Z, J, L }

#[derive(Clone, Copy, Serialize, Deserialize)]
pub struct Cell { pub x: i32, pub y: i32 }

/// SRS 標準形状（回転状態 r=0..3 を明示列挙 → 論理/表示のズレが構造的に不可能）
pub fn piece_cells(t: PieceType, r: u8) -> [Cell; 4] {
    use PieceType::*;
    let c = |x, y| Cell { x, y };
    match (t, r % 4) {
        (I, 0) => [c(0,1), c(1,1), c(2,1), c(3,1)],
        (I, 1) => [c(2,0), c(2,1), c(2,2), c(2,3)],
        (I, 2) => [c(0,2), c(1,2), c(2,2), c(3,2)],
        (I, _) => [c(1,0), c(1,1), c(1,2), c(1,3)],
        (O, _) => [c(0,0), c(1,0), c(0,1), c(1,1)],
        (T, 0) => [c(0,1), c(1,1), c(2,1), c(1,0)],
        (T, 1) => [c(1,0), c(1,1), c(1,2), c(2,1)],
        (T, 2) => [c(0,1), c(1,1), c(2,1), c(1,2)],
        (T, _) => [c(1,0), c(1,1), c(1,2), c(0,1)],
        (S, 0) => [c(1,0), c(2,0), c(0,1), c(1,1)],
        (S, 1) => [c(1,0), c(1,1), c(2,1), c(2,2)],
        (S, 2) => [c(1,1), c(2,1), c(0,2), c(1,2)],
        (S, _) => [c(0,0), c(0,1), c(1,1), c(1,2)],
        (Z, 0) => [c(0,0), c(1,0), c(1,1), c(2,1)],
        (Z, 1) => [c(2,0), c(1,1), c(2,1), c(1,2)],
        (Z, 2) => [c(0,1), c(1,1), c(1,2), c(2,2)],
        (Z, _) => [c(1,0), c(0,1), c(1,1), c(0,2)],
        (J, 0) => [c(0,0), c(0,1), c(1,1), c(2,1)],
        (J, 1) => [c(1,0), c(2,0), c(1,1), c(1,2)],
        (J, 2) => [c(0,1), c(1,1), c(2,1), c(2,2)],
        (J, _) => [c(1,0), c(1,1), c(0,2), c(1,2)],
        (L, 0) => [c(2,0), c(0,1), c(1,1), c(2,1)],
        (L, 1) => [c(1,0), c(1,1), c(1,2), c(2,2)],
        (L, 2) => [c(0,1), c(1,1), c(2,1), c(0,2)],
        (L, _) => [c(0,0), c(1,0), c(1,1), c(1,2)],
    }
}

pub fn piece_color(t: PieceType) -> u32 {
    use PieceType::*;
    match t { I => 0x00e5ff, O => 0xffd60a, T => 0xc774ff, S => 0x00e07b, Z => 0xff4d6d, J => 0x4d8dff, L => 0xff9e42 }
}

pub fn box_size(t: PieceType) -> usize { match t { PieceType::I => 4, _ => 3 } }

#[derive(Clone, Serialize, Deserialize)]
pub struct ClearEvent {
    pub lines: u32,
    pub tspin: u8,       // 0 none / 1 mini / 2 full
    pub b2b: bool,
    pub combo: i32,
    pub perfect_clear: bool,
    pub points: i64,
    pub action: String,
}

#[wasm_bindgen]
pub struct Game {
    grid: Vec<Option<PieceType>>, // TOTAL_ROWS * COLS
    rng: u64,

    pub mode: GameMode,
    pub state: GameState,

    cur: Option<PieceType>, cur_rot: u8, cur_x: i32, cur_y: i32,
    last_lock_natural: bool,
    queue: Vec<PieceType>, bag: Vec<PieceType>,
    hold: Option<PieceType>, hold_locked: bool,
    score: i64, lines: u32, level: u32, combo: i32, b2b: bool,
    gravity_acc: i32, lock_acc: i32, lock_resets: u32,
    last_rot: bool, last_kick: u8, last_tspin: u8, stats: Stats,
    events: Vec<ClearEvent>,
    elapsed: i64, pub finished: bool,
}

#[derive(Default, Clone, Serialize, Deserialize)]
pub struct Stats {
    pub pieces: u64,
    pub singles: u32, pub doubles: u32, pub triples: u32, pub tetrises: u32,
    pub tspins: u32, pub tspin_minis: u32, pub b2b_count: u32, pub max_combo: i32,
}

fn kick_table(t: PieceType, from: u8, to: u8) -> &'static [(i32, i32); 5] {
    if t == PieceType::I {
        match (from, to) {
            (0,1)=>&[(0,0),(-2,0),(1,0),(-2,-1),(1,2)],
            (1,0)=>&[(0,0),(2,0),(-1,0),(2,1),(-1,-2)],
            (1,2)=>&[(0,0),(-1,0),(2,0),(-1,2),(2,-1)],
            (2,1)=>&[(0,0),(1,0),(-2,0),(1,-2),(-2,1)],
            (2,3)=>&[(0,0),(2,0),(-1,0),(2,1),(-1,-2)],
            (3,2)=>&[(0,0),(-2,0),(1,0),(-2,-1),(1,2)],
            (3,0)=>&[(0,0),(1,0),(-2,0),(1,-2),(-2,1)],
            _   =>&[(0,0),(-1,0),(2,0),(-1,2),(2,-1)], // 0>3
        }
    } else {
        match (from, to) {
            (0,1)=>&[(0,0),(-1,0),(-1,1),(0,-2),(-1,-2)],
            (1,0)=>&[(0,0),(1,0),(1,-1),(0,2),(1,2)],
            (1,2)=>&[(0,0),(1,0),(1,-1),(0,2),(1,2)],
            (2,1)=>&[(0,0),(-1,0),(-1,1),(0,-2),(-1,-2)],
            (2,3)=>&[(0,0),(1,0),(1,1),(0,-2),(1,-2)],
            (3,2)=>&[(0,0),(-1,0),(-1,-1),(0,2),(-1,2)],
            (3,0)=>&[(0,0),(-1,0),(-1,-1),(0,2),(-1,2)],
            _    =>&[(0,0),(1,0),(1,1),(0,-2),(1,-2)], // 0>3
        }
    }
}

#[wasm_bindgen]
impl Game {
    #[wasm_bindgen(constructor)]
    pub fn new(seed: u64) -> Game {
        let mut g = Game {
            grid: vec![None; TOTAL_ROWS * COLS],
            rng: seed | 1,
            mode: GameMode::Marathon, state: GameState::Title,
            cur: None, cur_rot: 0, cur_x: 3, cur_y: 0,
            last_lock_natural: false,
            queue: Vec::with_capacity(5), bag: Vec::with_capacity(7),
            hold: None, hold_locked: false,
            score: 0, lines: 0, level: 1, combo: -1, b2b: false,
            gravity_acc: 0, lock_acc: 0, lock_resets: 0,
            last_rot: false, last_kick: 0, last_tspin: 0, stats: Stats::default(),
            events: Vec::new(),
            elapsed: 0, finished: false,
        };
        g.refill();
        for _ in 0..4 { let p = g.draw(); g.queue.push(p); }
        g
    }

    fn rand(&mut self) -> u64 { let mut x = self.rng; x^=x<<13; x^=x>>7; x^=x<<17; self.rng=x; x }

    fn refill(&mut self) {
        let mut all = [I_, O_, T_, S_, Z_, J_, L_];
        let mut i = 7;
        while i > 1 { i-=1; let j=(self.rand()%(i as u64+1)) as usize; all.swap(i,j); }
        self.bag = all.to_vec();
    }
    fn draw(&mut self) -> PieceType {
        if self.bag.is_empty() { self.refill(); }
        self.bag.pop().unwrap()
    }

    #[wasm_bindgen(js_name = startGame)]
    pub fn start_game(&mut self, mode: GameMode, seed: u64) {
        self.mode = mode;
        self.grid = vec![None; TOTAL_ROWS * COLS];
        self.rng = seed | 1;
        self.bag.clear(); self.queue.clear();
        self.refill();
        for _ in 0..4 { let p = self.draw(); self.queue.push(p); }
        self.hold = None; self.hold_locked = false;
        self.score = 0; self.lines = 0; self.level = 1; self.combo = -1; self.b2b = false;
        self.gravity_acc = 0; self.lock_acc = 0; self.lock_resets = 0;
        self.elapsed = 0; self.finished = false;
        self.stats = Stats::default();
        self.state = GameState::Playing;
        self.spawn();
    }

    fn fits(&self, t: PieceType, rot: u8, x: i32, y: i32) -> bool {
        piece_cells(t, rot).iter().all(|c| {
            let bx = x + c.x; let by = y + c.y;
            bx >= 0 && bx < COLS as i32 && by < TOTAL_ROWS as i32
                && (by < 0 || self.grid[(by as usize) * COLS + bx as usize].is_none())
        })
    }

    fn spawn(&mut self) {
        let t = self.queue.remove(0);
        let p = self.draw(); self.queue.push(p);
        self.cur = Some(t);
        self.cur_rot = 0;
        self.cur_x = 3;
        self.cur_y = -(HIDDEN_ROWS as i32) + 1;
        self.hold_locked = false;
        self.last_rot = false; self.last_kick = 0;
        self.lock_acc = 0; self.lock_resets = 0; self.gravity_acc = 0;
        if !self.fits(t, self.cur_rot, self.cur_x, self.cur_y) {
            self.state = GameState::GameOver;
            self.events.push(ClearEvent {
                lines: 0, tspin: 0, b2b: false, combo: -1,
                perfect_clear: false, points: 0, action: "gameover".into(),
            });
        }
    }

    pub fn set_cell(&mut self, x: usize, y: usize, v: Option<PieceType>) {
        self.grid[y * COLS + x] = v;
    }
    pub fn get_cell(&self, x: usize, y: usize) -> Option<PieceType> { self.grid[y * COLS + x] }
    /// テスト/デバッグ用: 盤面1セルを文字で返す ('.' で空). wasm公開対象外
    pub fn cell_char(&self, x: usize, y: usize) -> char {
        match self.get_cell(x, y) {
            Some(PieceType::I) => 'I', Some(PieceType::O) => 'O', Some(PieceType::T) => 'T',
            Some(PieceType::S) => 'S', Some(PieceType::Z) => 'Z', Some(PieceType::J) => 'J',
            Some(PieceType::L) => 'L', None => '.',
        }
    }

    pub fn grounded(&self) -> bool {
        let t = self.cur.unwrap_or(PieceType::O);
        !self.fits(t, self.cur_rot, self.cur_x, self.cur_y + 1)
    }

    fn on_move(&mut self) {
        if self.grounded() && self.lock_resets < 15 { self.lock_acc = 0; self.lock_resets += 1; }
    }

    pub fn move_h(&mut self, dx: i32) -> bool {
        if self.state != GameState::Playing { return false; }
        let t = self.cur.unwrap();
        let nx = self.cur_x + dx;
        if self.fits(t, self.cur_rot, nx, self.cur_y) {
            self.cur_x = nx; self.last_rot = false; self.on_move(); true
        } else { false }
    }

    pub fn rotate(&mut self, dir: i32) -> bool {
        if self.state != GameState::Playing { return false; }
        let t = self.cur.unwrap();
        let from = self.cur_rot;
        let to = ((from as i32 + dir + 4) % 4) as u8;
        for (i, &(dx, dy)) in kick_table(t, from, to).iter().enumerate() {
            let nx = self.cur_x + dx;
            let ny = self.cur_y - dy; // SRS: +y は上方向キック → 盤面の下向き正では減算
            if self.fits(t, to, nx, ny) {
                self.cur_rot = to; self.cur_x = nx; self.cur_y = ny;
                self.last_rot = true; self.last_kick = i as u8;
                self.on_move();
                return true;
            }
        }
        false
    }

    pub fn soft_drop(&mut self) -> bool {
        if self.state != GameState::Playing { return false; }
        let t = self.cur.unwrap();
        if self.fits(t, self.cur_rot, self.cur_x, self.cur_y + 1) {
            self.cur_y += 1; self.score += 1; self.last_rot = false; true
        } else { false }
    }

    pub fn hard_drop(&mut self) {
        if self.state != GameState::Playing { return; }
        let t = self.cur.unwrap();
        let mut d = 0;
        while self.fits(t, self.cur_rot, self.cur_x, self.cur_y + 1) { self.cur_y += 1; d += 1; }
        self.score += d as i64 * 2;
        self.lock();
    }

    fn bfs_at(&self, cy: i32, cx: i32) -> bool {
        // Tスピン用4隅塞ぎヘルパ（外/壁は塞がり扱い）
        if cx < 0 || cx >= COLS as i32 { return true; }
        if cy >= TOTAL_ROWS as i32 { return true; }
        if cy < 0 { return false; }
        self.get_cell(cx as usize, cy as usize).is_some()
    }

    fn detect_tspin(&self) -> u8 {
        if self.cur != Some(PieceType::T) || !self.last_rot { return 0; }
        // Tボックス: x cx..cx+2, y cy..cy+1（3x3 準拠）
        let (cx, cy) = (self.cur_x, self.cur_y);
        let corners = [
            self.bfs_at(cy, cx),         // 左上 0
            self.bfs_at(cy, cx + 2),     // 右上 1
            self.bfs_at(cy + 1, cx),     // 左下 2
            self.bfs_at(cy + 1, cx + 2), // 右下 3
        ];
        let filled = corners.iter().filter(|&&o| o).count();
        if filled < 3 { return 0; }
        // 形状テーブル準拠: rot0=尖り下, rot1=尖り右, rot2=尖り上, rot3=尖り左
        // front = 尖り側2隅 index
        let front: &[usize] = match self.cur_rot {
            0 => &[2, 3],
            1 => &[1, 3],
            2 => &[0, 1],
            _ => &[0, 2],
        };
        let front_filled = front.iter().filter(|&&i| corners[i]).count();
        if front_filled == 2 { return 2; }               // full
        if self.last_kick == 4 { return 2; }              // 5番キック使用は full
        1                                                  // mini
    }

    fn lock(&mut self) {
        let tspin = self.detect_tspin();
        self.last_tspin = tspin;
        let t = self.cur.unwrap();
        for c in piece_cells(t, self.cur_rot) {
            let bx = self.cur_x + c.x; let by = self.cur_y + c.y;
            if by >= 0 && bx >= 0 { self.set_cell(bx as usize, by as usize, Some(t)); }
        }
        self.stats.pieces += 1;
        // フル行検出
        let mut full2: Vec<usize> = Vec::new();
        for y in 0..TOTAL_ROWS {
            let mut f = true;
            for x in 0..COLS { if self.get_cell(x, y).is_none() { f = false; break; } }
            if f { full2.push(y); }
        }
        let cleared = full2.len() as u32; // full rows
        // 完全クリア判定（消去後）
        let mut perfect = false;
        if cleared > 0 {
            // 消去実行（下詰め）
            let mut write = TOTAL_ROWS;
            for y in (0..TOTAL_ROWS).rev() {
                if full2.contains(&y) { continue; }
                write -= 1;
                for x in 0..COLS { self.set_cell(x, write, self.get_cell(x, y)); }
            }
            for y in 0..write { for x in 0..COLS { self.set_cell(x, y, None); } }
            let mut any = false;
            for y in 0..TOTAL_ROWS { for x in 0..COLS { if self.get_cell(x, y).is_some() { any = true; } } }
            perfect = !any;
        }
        // スコア
        let mut ev = ClearEvent {
            lines: cleared, tspin, b2b: false, combo: 0,
            perfect_clear: perfect, points: 0, action: String::new(),
        };
        let mut pts: i64 = 0;
        if cleared > 0 || tspin > 0 {
            let base: i64 = match (tspin, cleared) {
                (2, 0) => 400, (1, 0) => 100,
                (2, 1) => 800, (2, 2) => 1200, (2, 3) => 1600,
                (1, 1) => 200, (1, 2) => 400,
                (0, 1) => 100, (0, 2) => 300, (0, 3) => 500, (0, 4) => 800,
                _ => 0,
            };
            pts = base * self.level as i64;
            // B2B: テトリス/Tスピン(mini含む)の連鎖
            let is_hard = cleared == 4 || (tspin > 0 && cleared > 0);
            ev.b2b = is_hard && self.b2b;
            if ev.b2b { pts = pts * 3 / 2; }
            if cleared > 0 { self.combo += 1; pts += 50 * self.combo as i64 * self.level as i64; }
            if ev.perfect_clear { pts += [0i64, 800, 1200, 1800, 2000][(cleared as usize).min(4)] * self.level as i64; }
            // 統計
            match cleared { 1 => self.stats.singles += 1, 2 => self.stats.doubles += 1, 3 => self.stats.triples += 1, 4 => self.stats.tetrises += 1, _ => {} }
            if tspin == 2 { self.stats.tspins += 1; } else if tspin == 1 { self.stats.tspin_minis += 1; }
            if ev.b2b { self.stats.b2b_count += 1; }
            if self.combo > self.stats.max_combo { self.stats.max_combo = self.combo; }
            self.b2b = if is_hard { true } else if cleared > 0 { false } else { self.b2b };
        } else {
            self.combo = -1;
        }
        ev.points = pts;
        self.score += pts;
        self.lines += cleared;
        // レベル（マラソン: 10ライン毎 / スプリント・ウルトラも同様に加速）
        let nl = 1 + self.lines / 10;
        self.level = nl;
        ev.action = match (tspin, cleared) {
            (2, 0) => "tspin".into(), (1, 0) => "tspin_mini".into(),
            (2, 1) => "tspin_single".into(), (2, 2) => "tspin_double".into(), (2, 3) => "tspin_triple".into(),
            (1, 1) => "tspin_mini_single".into(), (1, 2) => "tspin_mini_double".into(),
            (0, 1) => "single".into(), (0, 2) => "double".into(), (0, 3) => "triple".into(), (0, 4) => "tetris".into(),
            _ => String::new(),
        };
        if ev.action.is_empty() && self.last_lock_natural && cleared == 0 && tspin == 0 {
            ev.action = "lock".into(); // 自然落下確定（回帰: 確定音 — hard drop とは別扱い）
        }
        self.last_lock_natural = false;
        self.events.push(ev);
        self.spawn();
    }

    #[wasm_bindgen(js_name = tick)]
    pub fn tick(&mut self, dt: i32) {
        if self.state != GameState::Playing { return; }
        self.elapsed += dt as i64;
        // モード終了判定
        match self.mode {
            GameMode::Sprint => if self.lines >= 40 { self.finished = true; self.state = GameState::GameOver; },
            GameMode::Ultra => if self.elapsed >= 120_000 { self.finished = true; self.state = GameState::GameOver; },
            _ => {}
        }
        if self.state != GameState::Playing { return; }
        // ロックディレイ
        if self.grounded() {
            self.lock_acc += dt;
            if self.lock_acc >= 500 { self.last_lock_natural = true; self.lock(); }
            return;
        }
        self.lock_acc = 0;
        // 重力
        self.gravity_acc += dt;
        let interval = self.gravity_interval();
        while self.gravity_acc >= interval {
            self.gravity_acc -= interval;
            let t = self.cur.unwrap();
            if self.fits(t, self.cur_rot, self.cur_x, self.cur_y + 1) {
                self.cur_y += 1;
            } else { break; }
        }
    }

    fn gravity_interval(&self) -> i32 {
        // レベル 1-20: 1000ms → 60ms
        ((1000.0) * 0.8_f32.powi(self.level as i32 - 1)).max(60.0) as i32
    }

    pub fn do_hold(&mut self) -> bool {
        if self.state != GameState::Playing || self.hold_locked { return false; }
        let t = self.cur.unwrap();
        match self.hold {
            None => { self.hold = Some(t); self.spawn(); }
            Some(h) => {
                self.cur = Some(h); self.cur_rot = 0; self.cur_x = 3; self.cur_y = -(HIDDEN_ROWS as i32);
                self.hold = Some(t);
                self.last_rot = false; self.lock_acc = 0; self.lock_resets = 0;
                if !self.fits(h, 0, self.cur_x, self.cur_y) { self.state = GameState::GameOver; }
            }
        }
        self.hold_locked = true;
        true
    }

    pub fn pause_toggle(&mut self) {
        match self.state { GameState::Playing => self.state = GameState::Paused, GameState::Paused => self.state = GameState::Playing, _ => {} }
    }

    // --- フロント用ゲッター ---
    #[wasm_bindgen(getter, js_name = score)] pub fn score_s(&self) -> i64 { self.score }
    #[wasm_bindgen(getter, js_name = lines)] pub fn lines_s(&self) -> u32 { self.lines }
    #[wasm_bindgen(getter, js_name = level)] pub fn level_s(&self) -> u32 { self.level }
    #[wasm_bindgen(getter, js_name = elapsedMs)] pub fn elapsed_s(&self) -> i64 { self.elapsed }
    /// 未読イベントをすべて取り出す（フロント演出用）
    #[wasm_bindgen(js_name = popEvents)]
    pub fn pop_events(&mut self) -> JsValue {
        let evs = std::mem::take(&mut self.events);
        serde_wasm_bindgen::to_value(&evs).unwrap_or(JsValue::NULL)
    }
    #[wasm_bindgen(js_name = lastActions)]
    pub fn last_actions(&self) -> Vec<String> {
        self.events.iter().map(|e| e.action.clone()).collect()
    }

    #[wasm_bindgen(js_name = drainActions)]
    pub fn drain_actions(&mut self) -> Vec<String> {
        let acts: Vec<String> = self.events.iter().map(|e| e.action.clone()).collect();
        self.events.clear();
        acts
    }

    #[wasm_bindgen(getter, js_name = combo)] pub fn combo_s(&self) -> i32 { self.combo }
    #[wasm_bindgen(js_name = currentPiece)] pub fn current_piece(&self) -> Option<PieceType> { self.cur }
    /// テスト用: 現在ピースtype_pub
    pub fn cur_type(&self) -> Option<PieceType> { self.cur }
    #[wasm_bindgen(getter, js_name = curX)] pub fn cur_x_s(&self) -> i32 { self.cur_x }
    #[wasm_bindgen(getter, js_name = curY)] pub fn cur_y_s(&self) -> i32 { self.cur_y }
    #[wasm_bindgen(getter, js_name = curRot)] pub fn cur_rot_s(&self) -> u8 { self.cur_rot }
    #[wasm_bindgen(getter, js_name = ghostY)] pub fn ghost_y_s(&self) -> i32 { self.ghost_y_internal() }

    #[wasm_bindgen(js_name = getCurrent)]
    pub fn get_current(&self) -> JsValue {
        match self.cur {
            None => JsValue::NULL,
            Some(t) => serde_wasm_bindgen::to_value(&serde_json_inline::Cells {
                piece: format!("{:?}", t),
                rot: self.cur_rot,
                x: self.cur_x,
                y: self.cur_y,
            }).unwrap(),
        }
    }

    #[wasm_bindgen(js_name = getQueue)]
    pub fn get_queue(&self) -> JsValue { serde_wasm_bindgen::to_value(&self.queue).unwrap() }

    #[wasm_bindgen(js_name = getHold)]
    pub fn get_hold(&self) -> JsValue { serde_wasm_bindgen::to_value(&self.hold).unwrap() }

    /// 盤面を文字列で返す（"I..T..." × 22行）
    #[wasm_bindgen(js_name = getGrid)]
    pub fn get_grid(&self) -> String {
        let mut s = String::with_capacity(TOTAL_ROWS * COLS);
        for y in 0..TOTAL_ROWS { for x in 0..COLS {
            s.push(match self.get_cell(x, y) {
                Some(PieceType::I) => 'I', Some(PieceType::O) => 'O', Some(PieceType::T) => 'T',
                Some(PieceType::S) => 'S', Some(PieceType::Z) => 'Z', Some(PieceType::J) => 'J',
                Some(PieceType::L) => 'L', None => '.',
            });
        } }
        s
    }

    #[wasm_bindgen(js_name = currentCells)]
    pub fn current_cells_v(&self) -> JsValue {
        use serde::{Serialize};
        #[derive(Serialize)] struct C { x: i32, y: i32 }
        match self.cur {
            None => JsValue::NULL,
            Some(t) => serde_wasm_bindgen::to_value(
                &piece_cells(t, self.cur_rot).iter()
                    .map(|c| C { x: c.x + self.cur_x, y: c.y + self.cur_y })
                    .collect::<Vec<_>>()).unwrap(),
        }
    }

    pub fn ghost_y_internal(&self) -> i32 {
        match self.cur {
            None => self.cur_y,
            Some(t) => {
                let mut y = self.cur_y;
                while self.fits(t, self.cur_rot, self.cur_x, y + 1) { y += 1; }
                y
            }
        }
    }
}

// 小さなヘルパ（serde_json 依存を避ける）
mod serde_json_inline { pub use super::*; #[derive(serde::Serialize)] pub struct Cells { pub piece: String, pub rot: u8, pub x: i32, pub y: i32 } }
use PieceType::{I as I_, O as O_, T as T_, S as S_, Z as Z_, J as J_, L as L_};
