# テトリス v2 開発計画書 — 洗練UI/UX・ゲームエンジン版
> 「モーションテトリス」（v1・GitHub Pages公開中）の**別バージョン再設計**

**作成日:** 2026-09-04 / JST
**親プロジェクト:** `/opt/share/tetris/`（v1）、本 v2 は独立リポジトリ `motion-tetris-v2` として開発

---

## 1. 目的と要件

v1（Vanilla TS + Canvas 2D）で実現した「遊べるテトリス」の知見を引き継ぎつつ、**ゲームエンジンの採用・2026年時点の洗練UI/UX・より豊かなアニメーション演出**を兼ね備えた第2版を構築する。

| # | 要件 | 受け入れ基準 |
|---|------|--------------|
| R1 | スマホ / PC 両対応 | 任意の解像度・アスペクト比で崩れない。PC キーボード + スマホ タッチ/Swipe 対応 |
| R2 | Fold 8 折りたたみ対応 | 展開時 4:3 横長・カバー時 縦長、両方で最適レイアウト。URLバー等による視認領域の変動にも追従 |
| R3 | ゲームエンジンの活用 | 2026年に成熟した Web ゲームエンジン/レンダラを採用し、アニメーション・演出工数を大幅に削減しつつ品質向上 |
| R4 | 2026年時点の洗練 UI/UX | ガラスモーフィズム×グロー、ダークグロー、モーションデザイン、マイクロインタラクション、スムーズな画面遷移 |
| R5 | 豊かなアニメーション | ライン消去・落下・回転・コンボ演出・パーティクル・シェーダー（グロー/ブラー等）が豊富 |
| R6 | BGM・効果音 | エンジン標準のオーディオを使いつつ、ロイヤリティフリーのBGM/SFX |
| R7 | 外出先で遊べる | PWA + HTTPS 公開。軽量・高速ロード |
| R8 | v1との連携やすみ分け | 一緒に公開しても混乱しないよう見た目・URL・タイトルを明確に区別 |

---

## 2. ゲームエンジン選定（2026年時点）

| 候補 | 特徴 | メリット | デメリット | 採用判断 |
|------|------|----------|-----------|----------|
| **Phaser 4**（2026/04安定版 "Caladan"） | 国内最大級コミュニティ、シーン管理/Physics/Audio/Tween/Timeline 一式 | 演出・シーン管理が作りやすい。シーン遷移（タイトル/プレイ/結果）も標準で提供 | バイナリ込み ~500KB。学習コスト低いがベースAPIがやや古く見えがち | **強力候補** |
| **PixiJS v8**（WebGPU-first） | 最速2Dレンダラ。なんでもCanvas描画 | 超軽量(~200KB)、シェーダ/フィルタ表現自由 | ゲームエンジンではなく**レンダリング専用**。Scene/Audio/入力は自前開発 | **採用（本プロジェクトのゲーム核に最も適合）** |
| Excalibur.js | TypeScript 2D フレームワーク | 型良好 | コミュニティ中堅、機能範囲は Phaser 未満 | 補助候補 |
| Kaplay(Kaboom後継) | お遊び向け、シンプル | 取っ付き◎ | 演出/拡張の自由度は低い | 否 |
| Three.js / Babylon.js | 3D | ― | 本案件は2Dのため不要 | 否 |

### 決定: **PixiJS v8 をレンダリングコアに採用**
- **理由**
  1. v1 の最大の課題である「**演出をCanvas 2Dで手書き → 工数・品質が限界**」を一気に解決。WebGPU/GL の filter（Blur/Glow/Displacement）・パーティクル・合成モードがネイティブ品質で使える。
  2. テトリスの**ゲームロジック自体は v1 で実証済み**。レンダリングを差し替えるだけで見た目・演出が大幅アップグレードできる。
  3. ビルドサイズが ~200KB と軽く、外出先モバイル通信にも優しい。
  4. Phaser 4 は強力だが、テトリスのような「盤面描画ベース」ではシーン/Physics等の一部は不要。軽量PixiJSの方が目的に合致。

- **補助ライブラリ**
  - `@pixi/filter-glow`, `@pixi/particle-emitter`(旧 pixi-particles)、TweenJS または GSAP →アニメーション
  - `Web Audio API` + `Howler.js`（BGM/SFXの音源管理、モバイルオートプレイ制約を安全に処理）

---

## 3. 2026年時点の UI/UX デザイン指針

### 3.1 ビジュアルテーマ: 「ネオン・グロー・フューチャリズム」
- **配色:** ダークネイビー (#0a0e27)を基調に、テトロミノは**ネオン気味の発光色**。背景は暗い宇宙風 + ぼんやり漂うオーロラ
- **ガラスモーフィズム:** HUDカード・操作パネルは半透明 + **backdropBlur**（PixiJS Filter）
- **グロー：** テトロミノ・消去エフェクトに発光 (`@pixi/filter-glow`布林)
- **タイポグラフィ:** Inter または Noto Sans JP 太字、画面タイトルは大きなグラデーションテキスト
- **モーション:** マイクロインタラクション（押下時の scale 0.96、遷移時 crossfade、UIが触れたときの微妙なパララックス）

### 3.2 アニメーション演出（PixiJSフィルタ活用がv1との大きな違い）

| 演出 | 実装 |
|------|------|
| ピース落下 | リアルタイム補間（フィルタなし、TSでSprite Y補間） |
| ライン消去 | 行全体をスプライト化して **グロー→ブラー→フェード**、パーティクル噴射 |
| TETRIS演出 | 画面全体の **色相フィルタ波動**（Displacement + ColorMatrix）、画面シェイク |
| コンボポップ | 数字がド派手に scale/色相変化しつつ消える |
| ピース固定 | ニ Parque微振動 + glow パルス |
| ポーズ/スタート | シーンをクロスフェード + ガラスぼかし transition |
| 背景アニメ | 常時ゆるやかに流れるオーロラ（Noise Filter + Gradient） |

### 3.3 UI フレームワーク
- **HTML+CSS をオーバーレイで使用**（タイトル・メニュー・スコアカードは DOM + CSS、ゲーム本体は PixiJS）
- Tailwind CSS 4（2026主流）で**モバイル・デスクトップの両方を均一に**実装
- CSS `dvh/dvw` + `env(safe-area-inset-*)` で Fold8・URLバー変動対応
- 縦長/横長判定 は **matchMedia(orientation) + visualViewport リスナー**

### 3.4 操作 UX
- **PC:** キーボード（v1と同一のキーマップ、DAS/ARR 付き）※上級者向けに入力の繰り返し感応性を調整
- **スマホ:**
  - **モード切替:** 「ボタン」or「スワイプ」(設定で選択・保存)
  - スワイプ： 上下左右スワイプで各操作。**タップ=回転**（上スワイプとの区別は距離と速度で判定）
  - ボタン： 視認領域の下部に貼り付け。Fold 8 展開時は**画面右側に配置**（左は盤面・右はパネル/操作の 2カラム）
- **ハプティクス（今後の拡張）:** `navigator.vibrate` による軽微なバイブ（モバイル）
- **音のUX:** 初回タッチで AudioContext アンロック、ミュート状態の localStorage 保存

---

## 4. 技術スタック

| layer | 技術 |
|-------|------|
| レンダリング | **PixiJS v8** (WebGPU優先・WebGL fallback) |
| ゲームロジック | v1 の `src/core/` を再利用（board / randomizer / score / game / storage） |
| アニメーション | GSAP または TweenJS（UI 遷移・演出） |
| UI / スタイル | **Tailwind CSS 4** + HTML オーバーレイ |
| オーディオ | Howler.js + 自前生成 or ロイヤリティフリー音源 |
| テスト | Vitest (v1テストを再利用+追加) |
| ビルド | Vite 7 (2026 released) |
| PWA | vite-plugin-pwa |
| 公開 | GitHub Pages (v1と同様の Actions workflow) |
| 言語 | TypeScript strict |

---

## 5. プロジェクト構成（予定）

```
motion-tetris-v2/
├── index.html
├── package.json / tsconfig.json / vite.config.ts
├── .github/workflows/deploy.yml         # v1と同じ GH Pages 自動デプロイ
├── public/
│   ├── manifest.webmanifest / icons/
│   └── sounds/bgm/*.mp3, sfx/*.mp3     # ロイヤリティフリー音源
├── src/
│   ├── core/            # v1から移植（board/randomizer/score/game/storage）
│   ├── engine/
│   │   ├── pixiApp.ts   # Pixi application 初期化・resize対応
│   │   ├── stage.ts     # 盤面レイヤー、HUDレイヤー、エフェクトレイヤー
│   │   ├── borderLayer.ts
│   │   ├── pieceLayer.ts
│   │   ├── effectLayer.ts
│   │   └── filterFx.ts  # グロー/ブラー/Displacement アニメーション管理
│   ├── ui/
│   │   ├── hud.ts       # スコア/レベル/ライン/最高/NEXT/HOLD
│   │   ├── menus.ts     # タイトル/ポーズ/ゲームオーバー (DOM + Tailwind)
│   │   ├── touchControls.ts
│   │   └── settings.ts
│   ├── audio/
│   │   ├── audioManager.ts  # Howler ベース、AudioContext unlock 管理
│   │   ├── bgm.ts / sfx.ts
│   └── main.ts
└── tests/
    ├── board.test.ts     # v1から流用
    ├── rotate.test.ts    # v1から流用
    └── ui.test.ts        # 新規: タッチ入力の判定ロジック等
```

---

## 6. 開発ステップ（bite-size タスク）

### Task 1: プロジェクト初期化
- Vite 7 + Tailwind 4 で新規 `motion-tetris-v2` を作成、PixiJS v8 / Howler / GSAP / vite-plugin-pwa導入
- v1 `src/core/` を移殖して単体テストがそのまま通ることを確認

### Task 2: PixiJS ステージ & レイアウトエンジン
- Pixiアプリケーション起動、ResizeObserver + visualViewport 対応
- Fold8/カバー・URLバー変動追従まで実装（v1の学習を反映済み）
- Vue的DOMオーバーレイと canvas の重なり管理

### Task 3: 盤面描画（ピース/ゴースト/固定ブロック）
- v1のロジックを PixiJS Sprite 化して描く。各ピースは**3D風ネオン・タイリング**
- 消去行のアニメーション（テクスチャ差し替え）への準備

### Task 4: 操作系
- PCキーボード (DAS/ARR) + スマホ（ボタン/スワイプ両モード）実装
- settings で操作モード・音量・難易度を置けるメニューの骨格

### Task 5: BGM・SFX
- Howler.js によるロイヤリティフリー音源再生。初回タッチでアンロック
- BGM: 2〜3曲（イージー/ノーマル/ハイレベルに変化）、SFX: 7種以上

### Task 6: エフェクト = v2の主役
- ライン消去フラッシュ + パーティクル + グロー
- TETRIS演出（フル画面シェイク + 色相変化）
- スコアポップ、COMBO/レベルアップカットイン
- ゲームオーバー演出（画面が暗転しブロックが発光、統計をスタイリッシュに表示）

### Task 7: 洗練 UI/UX 実装
- タイトル・メニュー・ポーズ・HUDを Tailwind 4で表現
- ネオン発光タイトル、glassmorphism カード、スムーズ遷移
- ダークモードは必須（両テトリスは基本ダーク）

### Task 8: PWA + デプロイ
- manifest / service worker（v1と共通のノウハウ）
- GH Pages Actions で自動公開、QRコード発行

### Task 9: 総合 QA・Fold 8 実機検証
- PC / Fold8（展開・折りたたみ）/ モバイル Chrome Safari での検証
- パフォーマンス： 60fps 以上をForgeで確認、モバイル通信でのロード時間2秒以内
- ユーザー（Fold 8 実機保有）からの実測フィードバック反映

---

## 7. 検証 / テスト方針
- **単体テスト（Vitest）:** コアロジック（v1から移植 + 追加）
- **UI テスト:** タッチスワイプ recognizer の動作仕様を Vitest でユニットテスト
- **実環境:** ヘッドレス Chrome + CDP 自動テスト（v1 で確立済み）
- **Fold 8 実機:** ユーザーによる確認（URLと QR を共有）
- **パフォーマンス:** ビルドサイズ < 500KB(gzip)、モバイル4Gで DOM load 2秒以内

---

## 8. リスク / トレードオフ / 未決事項

| 項目 | 内容 | 対応 |
|------|------|------|
| PixiJS学習コスト | フィルター等に慣れが必要 | 小さく始めて段々リッチに |
| 音源ライセンス | 自前生成の限界 | MIT/CC0 音源使用 or 自己生成を明記 |
| v1との併存 | 2つのテトリスが公開される | URL・タイトル・見た目（ネオン色味）を明確区別。UIに「version 2」を表記 |
| モバイルパフォーマンス | WebGPU非対応端末（Fold 8 は対応） | WebGL2 fallback をデフォルトに |
| BGM差し替え | ロイヤリティフリーの質感 | Chan磨け/自作曲、Coming Soonとして Phase2 で追加 |

**未決事項（実行前に確認したい点）:**
1. リポジトリは新規 `motion-tetris-v2`（elengine アカウント）でよいか？
2. テーマ（ネオン×ガラス）の方向性で良いか？別候補: レトロ8bit風 / 極簡ミニマル
3. 音源は**(CC0)フリー音源利用** or **v1同様の自前生成音** のどちらか？
4. v1 のリンクは v2 内に併設するか（両方遊べるようにするか）？

---

## 9. v1 からの主な改善点（まとめ）
| 項目 | v1 | v2 |
|------|----|----|
| レンダリング | Canvas 2D 手書き | **PixiJS v8 (WebGPU)** |
| 演出の質 | 基本〜中級（フラッシュ/パーティクル/シェイク） | **グロー/ブラー/色相/カットインなど最高級** |
| UI | 手書き CSS | **Tailwind 4 + glassmorphism** |
| 音声 | Web Audio 自前生成 | **Howler + フリー/自作曲（ seçenek）** |
| 操作感 | 基本 | **DAS/ARR による上級キーボード操作** |
| 見た目の統一感 | 開発的 | **2026 標準フラット+ネオン** |

---

## 10. 実行時の推奨手順
1. 本計画を subagent-driven-development でタスク単位に実行
2. 各タスクごとに、コアロジック検証 → レンダリング膜・演出実装 → UI実装 → ブラウザ自動テスト
3. Task 8 で GH Pages 公開 → QR コード を Discord へ添付してユーザー確認
4. リリース後、v1 と v2 それぞれを Discord 上で共有
