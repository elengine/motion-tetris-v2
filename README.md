# NEON TETRIS v2 🌆

商用レベルの本格テトリス — **Rust → WebAssembly コア** × Canvas 2D 描画 × Web Audio 生成音。

▶ **[ NEON TETRIS v2 を遊ぶ ]** https://elengine.github.io/motion-tetris-v2/
🎮 **[ 旧バージョン v1 はこちら ]** https://elengine.github.io/motion-tetris/

## 特徴

### ゲームロジック（Rust/Wasm コア — `wasm/`）
- **Tetris Guideline 完全準拠**
  - SRS（Super Rotation System）回転＋ウォールキック全対応
  - 7-bag ランダマイザ / ホールド / ゴースト / ハード&ソフトドロップ
  - ロックディレイ 500ms（移動・回転でリセット、上限15回）
  - **T-Spin 全判定**：TSD / TST / Mini / Mini Single（3-corner + SRS キック判定）
  - Back-to-Back / コンボ / パーフェクトクリア

### ゲームモード
| モード | 内容 |
|--------|------|
| マラソン | どこまでスコアを伸ばせるか |
| スプリント | 40ライン消去のタイムアタック |
| ウルトラ | 2分間のスコアアタック |

### 描画（Canvas 2D — `src/engine/renderer.ts`）
- 座標変換を単一の純関数 `cellToPx()` に集約 → **マスズレ・ゴーストズレが構造的に発生しない設計**
- ネオン×ガラスモーフィズム、発光ブロック、回転90°スムース補間アニメ（偏差ベースで累積しない）

### 音（Web Audio 完全生成 — `src/audio/soundEngine.ts`）
- 音源ファイル不要 — 効果音・ネオンテクノBGMをすべて合成で生成（レベルでテンポUP）

### UI/UX
- PC: DAS/ARR 付きキーボード（←→移動 / ↑X回転 / Z反時計 / ↓ソフト / Space ハード / C ホールド）
- スマホ: タッチボタン + スワイプ（左右=移動 / 上=回転 / 下=ハードドロップ / タップ=回転）
- Galaxy Fold 8 折りたたみ対応（visualViewport 追従 / 展開4:3横長は2カラム）

## 開発

```bash
npm install
npm run dev        # 開発サーバー
npm run build      # 本番ビルド（wasm/pkg 同梱のため事前ビルド済み）
cd wasm && cargo test --test regression   # 回帰テスト 14 件
wasm-pack build --target web --release    # wasm 再ビルド時
```

## テスト

ユーザー指摘バグはすべて回帰テストで担保（`wasm/tests/regression.rs`）：
- `t02` ハードドロップは最下部で停止
- `t04` ゴーストY = 実際の着地位置
- `t12` 盤面溢れでゲームオーバー
- ほか音・グリッド整合など計14本

## ビルド構成
- Vite + TypeScript + vite-plugin-wasm / PWA
- `wasm/pkg/`（wasm-pack 生成物）をリポジトリ同梱 → CI は wasm ビルド不要
