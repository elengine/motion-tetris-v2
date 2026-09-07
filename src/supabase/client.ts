// Supabase クライアント — 設計書 §3.3 / §5
// URL と publishable(anon) key は Vite 環境変数で注入（.env / GitHub Actions Secrets）
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null = null;

function getEnv(name: string): string {
  try { return (import.meta as unknown as { env: Record<string, string> }).env[name] ?? ''; } catch { return ''; }
}

export function makeLocalConfig(): { url: string; key: string } {
  return {
    url: getEnv('VITE_SUPABASE_URL'),
    key: getEnv('VITE_SUPABASE_ANON_KEY'),
  };
}

export function supabase(): SupabaseClient | null {
  if (client) return client;
  const { url, key } = makeLocalConfig();
  if (!url || !key) return null; // 未設定（CIsecret 未注入など）はランキング機能を静かに無効化
  client = createClient(url, key, {
    auth: {
      persistSession: true,        // タブを開き直しても自動認証（設計書 §8）
      autoRefreshToken: true,
      detectSessionInUrl: true,    // OAuth リダイレクトの完成処理
    },
  });
  return client;
}
