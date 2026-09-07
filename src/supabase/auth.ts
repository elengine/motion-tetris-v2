// 認証管理 — 設計書 §2.3 / §8 (Google OAuth・自動セッション復元・profiles)
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from './client';

export interface Profile { id: string; display_name: string; }

let cachedProfile: Profile | null = null;

export function currentProfile(): Profile | null { return cachedProfile; }

export async function initAuth(onChange: (s: Session | null) => Promise<void>): Promise<void> {
  const sb = supabase();
  if (!sb) return;
  // 起動時の自動セッション復元 → プロフィール取得
  const { data } = await sb.auth.getSession();
  await onChange(data.session);
  // 以降のログイン/ログアウトを随時反映
  sb.auth.onAuthStateChange((_evt, session) => { void onChange(session); });
}

async function fetchProfile(userId: string): Promise<Profile | null> {
  const sb = supabase(); if (!sb) return null;
  const { data, error } = await sb.from('profiles').select('id, display_name').eq('id', userId).single();
  if (error || !data) return null;
  return { id: (data as { id: string }).id, display_name: (data as { display_name: string }).display_name };
}

/** セッションが変わったら profiles を取得（未ログインなら null） */
export async function sessionChanged(session: Session | null): Promise<void> {
  cachedProfile = null;
  if (!session?.user) return;
  await refreshProfile();
}

export async function refreshProfile(): Promise<Profile | null> {
  const sb = supabase();
  if (!sb) return null;
  const u: User | null = (await sb.auth.getUser()).data.user;
  if (!u) return null;
  let p = await fetchProfile(u.id);
  if (!p) {
    // トリガ未動作の保険: Google名で upsert
    const name = (u.user_metadata?.['name'] as string | undefined)?.slice(0, 20) ?? '名無し';
    const { error } = await sb.from('profiles').upsert({ id: u.id, display_name: name });
    if (error) return null;
    p = { id: u.id, display_name: name };
  }
  cachedProfile = p;
  return p;
}

export function loginWithGoogle(): void {
  const sb = supabase(); if (!sb) return;
  void sb.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: location.origin + location.pathname },
  });
}

export async function logout(): Promise<void> {
  const sb = supabase(); if (!sb) return;
  await sb.auth.signOut();
  cachedProfile = null;
}

/** 名前変更（20文字以内は DB CHECK でも担保） */
export async function updateDisplayName(name: string): Promise<boolean> {
  const sb = supabase(); if (!sb) return false;
  const trimmed = name.trim().slice(0, 20);
  if (!trimmed) return false;
  const u = (await sb.auth.getUser()).data.user;
  if (!u) return false;
  const { error } = await sb.from('profiles').update({ display_name: trimmed, updated_at: new Date().toISOString() }).eq('id', u.id);
  if (error) return false;
  cachedProfile = { id: u.id, display_name: trimmed };
  return true;
}
