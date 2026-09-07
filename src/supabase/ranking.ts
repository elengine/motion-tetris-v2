// ランキング/履歴データアクセス — 設計書 §2 / §3.4
import { supabase } from './client';
import { currentProfile } from './auth';

export type Mode = 'marathon' | 'sprint' | 'ultra';

export interface ScoreRow {
  mode: Mode;
  score: number;
  lines: number;
  level: number;
  elapsed_ms: number;
  is_clear: boolean;
  played_at: string;
  display_name?: string;   // joinして取得した表示名
  user_id?: string;
}

/** スコアを投稿（要ログイン） */
export async function submitScore(row: ScoreRow): Promise<{ ok: boolean; rank?: number | null }> {
  const sb = supabase();
  const me = currentProfile();
  if (!sb || !me) return { ok: false };
  const { error } = await sb.from('scores').insert({
    user_id: me.id, mode: row.mode, score: row.score, lines: row.lines,
    level: row.level, elapsed_ms: row.elapsed_ms, is_clear: row.is_clear,
  });
  if (error) return { ok: false };
  const rank = await myRank(row.mode, row.score, row.mode === 'sprint' ? 'asc' : 'desc');
  return { ok: true, rank };
}

/** 自作ランキング取得クエリ（N+1回避のため select + join で表示名取得） */
export async function fetchRanking(mode: Mode, limit = 20): Promise<ScoreRow[]> {
  const sb = supabase(); if (!sb) return [];
  const q = sb.from('scores')
    .select('mode, score, lines, level, elapsed_ms, is_clear, played_at, user_id, profiles(display_name)')
    .eq('mode', mode)
    .limit(limit);
  // sprint: タイム昇順（短いほど上）— 設計 §7-2
  if (mode === 'sprint') q.order('elapsed_ms', { ascending: true }).order('score', { ascending: false });
  else q.order('score', { ascending: false }).order('played_at', { ascending: true });
  const { data, error } = await q;
  if (error || !data) return [];
  return (data as Array<Record<string, unknown>>).map((r) => ({
    mode, score: Number(r.score), lines: Number(r.lines), level: Number(r.level),
    elapsed_ms: Number(r.elapsed_ms), is_clear: Boolean(r.is_clear),
    played_at: String(r.played_at), user_id: String(r.user_id),
    display_name: (r.profiles as { display_name?: string } | null)?.display_name ?? '名無し',
  }));
}

/** 自分の履歴（直近 limit 件） */
export async function fetchMyHistory(limit = 30): Promise<ScoreRow[]> {
  const sb = supabase();
  const me = currentProfile();
  if (!sb || !me) return [];
  const { data, error } = await sb.from('scores')
    .select('mode, score, lines, level, elapsed_ms, is_clear, played_at')
    .eq('user_id', me.id)
    .order('played_at', { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return (data as Array<Record<string, unknown>>).map((r) => ({
    mode: r.mode as Mode, score: Number(r.score), lines: Number(r.lines), level: Number(r.level),
    elapsed_ms: Number(r.elapsed_ms), is_clear: Boolean(r.is_clear), played_at: String(r.played_at),
    display_name: me.display_name, user_id: me.id,
  }));
}

/** ログイン中ユーザーの クラウドBEST（モード共通、マラソン系の最大スコア基準） */
export async function fetchMyBest(): Promise<number> {
  const sb = supabase();
  const me = currentProfile();
  if (!sb || !me) return 0;
  const { data } = await sb.from('scores').select('score').eq('user_id', me.id).order('score', { ascending: false }).limit(1);
  return data && data.length ? Number((data[0] as { score: number }).score) : 0;
}

async function myRank(mode: Mode, score: number, dir: 'asc' | 'desc'): Promise<number | null> {
  const sb = supabase(); if (!sb) return null;
  // 自分より上の件数 +1
  if (mode === 'sprint') return null; // Round1 では マラソン/ウルトラのみ自順位表示
  let query = sb.from('scores').select('id', { count: 'exact', head: true }).eq('mode', mode);
  query = dir === 'desc' ? query.gt('score', score) : query.lt('score', score);
  const { count } = await query;
  return (count ?? 0) + 1;
}
