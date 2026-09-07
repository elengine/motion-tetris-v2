-- ============================================================
-- NEON TETRIS v2 — ソーシャルランキング DB 初期化 SQL (設計書 §2)
-- Supabase Dashboard → SQL Editor に貼り付けて Run を1回実行
-- ============================================================

-- 1) profiles: 認証ユーザーの公開情報（表示名）
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '名無し' check (char_length(display_name) <= 20),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2) scores: ゲーム終了時に1レコード
create table if not exists public.scores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  mode text not null check (mode in ('marathon','sprint','ultra')),
  score bigint not null default 0,
  lines int not null default 0,
  level int not null default 1,
  elapsed_ms bigint not null default 0,          -- sprint: 40L到達タイム(ms)
  is_clear boolean not null default false,       -- sprint完走/ultra timeup = true, gameover = false
  played_at timestamptz not null default now()   -- 実施日時
);

-- 3) インデックス（履歴とランキング用）
create index if not exists scores_user_idx on public.scores (user_id, played_at desc);
create index if not exists scores_rank_idx on public.scores (mode, score desc, played_at asc);
create index if not exists scores_rank_time_idx on public.scores (mode, elapsed_ms asc) where mode = 'sprint';

-- 4) Row Level Security
alter table public.profiles enable row level security;
alter table public.scores   enable row level security;

drop policy if exists "profiles_select_all" on public.profiles;
create policy "profiles_select_all" on public.profiles
  for select using (true);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

drop policy if exists "scores_select_all" on public.scores;
create policy "scores_select_all" on public.scores
  for select using (true);

drop policy if exists "scores_insert_own" on public.scores;
create policy "scores_insert_own" on public.scores
  for insert with check (auth.uid() = user_id);
-- update/delete は意図的に許可しない（一度投稿した記録は不変）

-- 5) 新規ユーザー作成時に profiles を自動作成（Google名を初期表示名に）
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', '名無し'))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 6) Data API への公開（新プロジェクトで "Automatically expose new tables" を
--    オフにした場合に備えた明示 GRANT。オンの場合も冪等なのでそのまま実行可）
grant usage on schema public to anon, authenticated;
grant select on public.profiles to anon, authenticated;
grant select, insert on public.scores to authenticated;
grant update on public.profiles to authenticated;
