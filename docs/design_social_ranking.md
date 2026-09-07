# NEON TETRIS v2 — ソーシャルランキング & 認証機能 開発設計書

**ステータス**: 草案 v0.1（2026-09-07）— kokuten さんのレビュー待ち
**目標バージョン**: v1.9.5 → **v2.0.0**（メジャー.upgrade）
**実装フェーズ**: 設計承認 → フェーズ1(DB) → フェーズ2(認証) → フェーズ3(ランキングUI) → フェーズ4(完成画面連携) → デプロイ

---

## 1. 概要

| 項目 | 内容 |
|---|---|
| 目的 | 全プレイヤー間でスコアを競えるソーシャルランキング + OAuth ソーシャルログインの導入 |
| バックエンド | **Supabase**（PostgreSQL + Auth + Row Level Security） |
| フロント | 既存 Vite+PWA（GitHub Pages）に @supabase/supabase-js を追加 |
| ホスティング | 現状維持: GitHub Pages（`elengine.github.io/motion-tetris-v2/`） |

### 制約と方針
- GitHub Pages は静的ホスティング → **サーバーコードを持たない**。Supabase に直接接続し、セキュリティは RLS（行レベルセキュリティ）と anon key の公開前提設計で担保する。
- **匿名プレイは継続可能**。ログインなしでもゲームは遊べ、ランキング投稿時のみ認証を促す。
- 既存の localStorage（`ntv2:best` 等）は保持し、ログインユーザーにはクラウド記録も併用。

---

## 2. Supabase プロジェクト構成

### 2.1 テーブル設計

```sql
-- profiles: 認証ユーザーの公開情報
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '名無し' check (char_length(display_name) <= 20),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- scores: ゲーム終了時に1レコード
create table public.scores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  mode text not null check (mode in ('marathon','sprint','ultra')),
  score bigint not null default 0,
  lines int not null default 0,
  level int not null default 1,
  -- sprint は「40ライン到達タイム(ms)」が順位 → 小さいほど良い
  elapsed_ms bigint not null default 0,
  is_clear boolean not null default false,   -- sprint完走/ultra timeup は true / gameover は false
  played_at timestamptz not null default now() -- 実施日時
);

-- 自分の履歴・ランキング用インデックス
create index scores_user_idx on public.scores (user_id, played_at desc);
create index scores_rank_idx on public.scores (mode, score desc, played_at asc);
```

### 2.2 Row Level Security

```sql
alter table public.profiles enable row level security;
alter table public.scores   enable row level security;

-- profiles: 自分は読み書き可、他人は読むだけ（ランキングの表示名用）
create policy "profiles_select_all"  on public.profiles for select using (true);
create policy "profiles_update_own"  on public.profiles for update using (auth.uid() = id);

-- scores: 全員が読める（ランキング）。書き込みは自分の記録のみ。
create policy "scores_select_all"  on public.scores for select using (true);
create policy "scores_insert_own"  on public.scores for insert with check (auth.uid() = user_id);
-- ※ 改竄対策: update/delete は許可しない（一度投稿した記録は変わらない設計）
```

### 2.3 認証

| プロバイダ | 優先度 | 備考 |
|---|---|---|
| **Google** | 1（必須） | 最も普及。Supabase 標準対応 |
| **LINE** | 2（実装判定） | 日本ユーザーに最適。Supabase が LINE Auth を順次対応 — 失敗時は Round 2 で追加 |

- **フロー**: OAuth リダイレクト方式（`signInWithOAuth({ provider: 'google' })`）
  リダイレクト先 = `https://elengine.github.io/motion-tetris-v2/`（GitHub Pages に戻る）
- **連携情報**: 名前（profiles.display_name の初期値）+ メールアドレス（ユーザー設定用、ゲーム画面には出さない）
- **セッション**: supabase-js の自動セッション管理（localStorage 永続化）。PWA でも維持。
- **未ログイン名の入力**: 匿名のままランキングに「自分の履歴」を見たい場合 → 名前入力を促し、
  匿名認証(`signInAnonymously`)で profiles を作る方式も検証（Supabase 匿名認証対応中）。
  Round 1 では「履歴表示はログイン後」とシンプルにする。

---

## 3. フロントエンド設計

### 3.1 画面フロー

```
スタート画面
  ├─ [ログインアイコン] 未ログインなら「ログイン」→ OAuth → プロフィール作成（初回は名前入力ダイアログ）
  ├─ [ランキング] → ランキング画面（未ログインでも閲覧可）
  └─ モードボタン → ゲーム

ゲーム終了（完了/GAME OVER画面）
  ├─ ログイン済み → スコア自動送信 → 表示「ランキング登録済み ○○位」
  └─ 未ログイン   → 「スコアをランキングに登録」ボタン → ログイン → 送信
       ※ 未ログインのまま「もう一度遊ぶ」も可能（強制しない）
```

### 3.2 ランキング / 履歴画面（オーバーレイで実装、デザインは既存ネオンテーマ準拠）

| 画面 | 内容 |
|---|---|
| **ランキング** | ゲームモードタブ（マラソン/スプリント/ウルトラ）で切替。上位20件。
各項目: 順位・名前・スコア(or スプリントはタイム)・ライン・日時。
自分の行はハイライト。 уточнение: スプリント=タイム昇順、マラソン/ウルトラ=スコア降順 |
| **自分の履歴** | 直近30件（モード富滤波可能）。実施日時・結果・スコア表示 |
| **名前変更** | プロフィール設定より display_name 変更（20文字以内、不適切語の最低限フィルタ） |

### 3.3 モジュール構成

```
src/
  supabase/client.ts      -- createClient（URL/anonKey は環境変数 vite 経由）
  supabase/auth.ts        -- login/logout/session 管理、profiles upsert
  supabase/ranking.ts     -- スコア送信・ランキング取得・履歴取得
  ui/rankingView.ts       -- ランキング/履歴オーバーレイ描画
main.ts                   -- ゲーム終了フックから score 送信
```

### 3.4 スコア送信シーケンス

```
gameFinish()/gameOver() 完了演出後
  └─ ranking.submit({ mode, score, lines, level, elapsedMs, isClear })
       ├─ session あり → insert() → 「登録済み 〇〇位」表示
       └─ session なし → 完了画面に「📈 スコアをランキングに登録」ボタン出す
            └─ ボタン → OAuth ログイン → 戻り後、保存待ちスコアを自動送信
```

- **改竄・多重送信**: ゲーム終了時の1回のみ送信（`submitted` フラグ）。サーバー側の値検証は
  静的サイトでは完璧にはできないため、異常値（レート制限: 1人1分あたり最大10件等）の簡易ガードを DB 制約/Policy で実施。

---

## 4. セキュリティ設計

| 脅威 | 対策 |
|---|---|
| 他人のスコア改竄 | RLS: insert は `user_id = auth.uid()` のみ、update/delete 禁止 |
| anon key 悪用 | 公開前提（RLS で制御）。レート制限を DB RPC に追加可能 |
| スコア偽装（手改造） | クライアントからの素値送信は原理的に防げない。サーバー検証やPlay Integrity等は将来課題 |
| 不適切な名前 | 文字数制限 + 禁止語正規表現のクライアント/DB 双方での最低限バリデーション |
| 秘密情報 | anon key のみフロントに置く。service_role key は一切クライアントに置かない |

---

## 5. 環境変数・インフラ

```
VITE_SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key>
```

- `.env` も開発はローカル管理。GitHub Actions では Repository Secrets から注入。
- GitHub Pages デプロイの CI（現 rosa) に secrets を追加。
- Supabase 側のマイグレーションは SQL エディタ or CLI。手順書はこの設計書 §2 をそのまま使用。

---

## 6. 実装フェーズ（着手後の作業順）

| フェーズ | 内容 | 見積 |
|---|---|---|
| **P1** | Supabase プロジェクト作成（あなたに URL / anon key を発行していただく）→ テーブル/RLS 構築 | 一緒に 10分 |
| **P2** | supabase-js 導入・認証フロー（Google）・profiles 初期化 & 名前設定 | 1回のセッション |
| **P3** | スコア送信・ランキング/履歴 UI・名前変更 | 1回のセッション |
| **P4** | 完了画面連携（登録状況表示）・バージョン **v2.0.0**・デプロイ・実機確認 | 1回のセッション |

※ 見積は LLM 実装速度基準。実質 P1 の Supabase プロジェクト作成（無料枠）だけあなた側作業があります。
**Supabase は無料枠（Free plan）で開始可能**（500MB DB、50k 月間アクティブユーザーまで）。

---

## 7. 決めていただきたいこと（ブラッシュアップの論点）

1. **名前の初期値**: OAuth の表示名（Google アカウント名）をそのまま使う？ 別名を必ず入力させる？
2. **スプリントの順位基準**: タイム（短い方が上）で OK？
3. **匿名での履歴**: Round 1 は「履歴もログイン必須」でよいか（匿名履歴は Round 2 で検討）
4. **ランキング表示件数**: 上位20件でよいか？ 全件無限スクロール？
5. **LGTM基準**: Google のみ Round 1 実装 / LINE は Round 2 でよいか？
6. **既存のローカル BEST との関係**: HUD の BEST は引き続き localStorage（全モード共通）？ それともログイン時は自分のクラウド情報に置き換える？
