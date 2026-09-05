# NEON TETRIS v2 🌆

**モーションテトリス v1** の演出を強化した、2026年刷新版テトリス。
**PixiJS v8 (WebGL/WebGPU)** を採用し、ネオン×ガラスモーフィズムのモダンなビジュアルと、
豊かなアニメーション演出を実現しています。

▶ **[ NEON TETRIS v2 を遊ぶ ]** (デプロイ後に `https://elengine.github.io/motion-tetris-v2/` で公開)
🎮 **[ 旧バージョン v1 はこちら ](https://elengine.github.io/motion-tetris/)**

## 特徴
- **PixiJS v8 レンダリング** — 発光・グロー演出がワンランク上質
- **ネオン×ガラスモーフィズム** — backdropBlurカード・ネオン発光タイトル・グラデーションCTA
- **豊かな演出** — ライン消去スプライトAnimation・TETRIS画面シェイク・コンボポップ・ネオン背景グロー
- **PC / スマホ両対応** — キーボード(DAS/ARR付き)、タッチ（ボタン/スワイプ/タップ=回転の複合操作）
- **Fold 8 折りたたみ対応** — visualViewport 追従、展開4:3横長の2カラム/カバー縦長の最適配置
- **Howler.js** による CC0音源 BGM/効果音（差し替え可能な設計）
- **PWA対応** — ホーム画面追加・オフライン起動

## 操作
| PC | スマホ |
|----|--------|
| `←→` 移動 / `↓` ソフトドロップ | 下部ボタン or スワイプ |
| `↑` `Z` `X` 回転 | タップ = 回転 |
| `Space` ハードドロップ | 下スワイプ = ハードドロップ |
| `C` ホールド / `P` `Esc` ポーズ | `H` ボタン = ホールド |

## 開発
```bash
npm install
npm run dev    # 開発
npm run test   # 単体テスト(ロジックは v1 から移植+拡張)
npm run build  # 本番ビルド
```

## 技術スタック
TypeScript / PixiJS v8 / GSAP / Howler.js / Vite / vite-plugin-pwa / GitHub Pages (Actions自動デプロイ)

---
v1: https://github.com/elengine/motion-tetris
