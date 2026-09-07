// ランキング/履歴/ログインUI — ネオンテーマ準拠のオーバーレイ描画（設計書 §3.2）
import { logout, currentProfile, updateDisplayName } from '../supabase/auth';
import { fetchRanking, fetchMyHistory, type ScoreRow, type Mode } from '../supabase/ranking';

const MODE_LABEL: Record<Mode, string> = { marathon: 'マラソン', sprint: 'スプリント', ultra: 'ウルトラ' };

export interface SubmitPayload { mode: Mode; score: number; lines: number; level: number; elapsedMs: number; isClear: boolean; }

let pending: SubmitPayload | null = null;
export function takePending(): SubmitPayload | null { const p = pending; pending = null; return p; }
export function setPending(p: SubmitPayload | null): void { pending = p; }

function esc(s: string): string { return s.replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch] as string)); }
function fmtDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
function fmtTime(ms: number): string {
  const sec = Math.floor(ms / 1000);
  return `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`;
}
function scoreFmt(n: number): string { return n.toLocaleString('en-US'); }

/** 完了画面のアサイン用HTML */
export function submitAreaHtml(): string {
  return `<button id="rank-submit-btn" class="cta-btn rank-btn">📈 スコアをランキングに登録</button><p class="rank-note">要ログイン（Google）</p>`;
}

// ---------- ランキング/履歴 全画面 ----------
let currentTab: Mode = 'marathon';

function listHtml(rows: ScoreRow[], myId: string | null, mode: Mode): string {
  if (!rows.length) return '<p class="howto-note">まだ記録がありません。最初のスコアを投稿しよう！</p>';
  return '<ol class="rank-list">' + rows.map((r, i) => {
    const main = mode === 'sprint' ? `TIME <b>${fmtTime(r.elapsed_ms)}</b>` : `SCORE <b>${scoreFmt(r.score)}</b>`;
    const mine = r.user_id && r.user_id === myId ? ' rank-me' : '';
    return `<li class="rank-item${mine}"><span class="rank-pos">${i + 1}</span><span class="rank-name">${esc(r.display_name ?? '')}</span><span class="rank-val">${main} / ${r.lines}L</span><span class="rank-date">${fmtDate(r.played_at)}</span></li>`;
  }).join('') + '</ol>';
}

export async function showRankingView(backTo: () => void): Promise<void> {
  const ovTitle = document.getElementById('ov-title')!;
  const ovBody = document.getElementById('ov-body')!;
  const backBtn = document.getElementById('back-to-title') as HTMLButtonElement;
  const ovAction = document.getElementById('ov-action') as HTMLButtonElement;
  (document.getElementById('title-toggles') as HTMLElement).style.display = 'none';
  ovAction.style.display = 'none';
  (document.querySelector('.v1-link') as HTMLElement)!.style.display = 'none';
  document.getElementById('howto-link')!.style.display = 'none';
  document.getElementById('mode-buttons')!.style.display = 'none';
  document.getElementById('login-row')!.style.display = 'none';
  document.getElementById('social-row')!.style.display = 'none';
  backBtn.style.display = '';
  ovTitle.textContent = '🏆 ランキング';
  const tabs = (['marathon', 'sprint', 'ultra'] as Mode[]).map((mm) =>
    `<button class="rank-tab${mm === currentTab ? ' on' : ''}" data-m="${mm}">${MODE_LABEL[mm]}</button>`).join('');
  ovBody.innerHTML = `<div class="rank-tabs">${tabs}</div><div id="rank-body" class="rank-body">読み込み中…</div>
    <button id="history-link" class="ghost-btn">📜 自分の履歴</button>`;
  void renderTab();
  document.getElementById('history-link')!.addEventListener('click', () => { void showHistoryView(backTo); });
  ovBody.querySelectorAll('.rank-tab').forEach((b) => b.addEventListener('click', () => {
    currentTab = (b as HTMLElement).dataset.m as Mode;
    ovBody.querySelectorAll('.rank-tab').forEach((x) => x.classList.toggle('on', x === b));
    void renderTab();
  }));
  async function renderTab(): Promise<void> {
    const rows = await fetchRanking(currentTab, 20);
    const me = currentProfile();
    document.getElementById('rank-body')!.innerHTML = listHtml(rows, me?.id ?? null, currentTab);
  }
}

export async function showHistoryView(backTo: () => void): Promise<void> {
  const ovTitle = document.getElementById('ov-title')!;
  const ovBody = document.getElementById('ov-body')!;
  const backBtn = document.getElementById('back-to-title') as HTMLButtonElement;
  (document.getElementById('title-toggles') as HTMLElement).style.display = 'none';
  document.getElementById('howto-link')!.style.display = 'none';
  (document.querySelector('.v1-link') as HTMLElement)!.style.display = 'none';
  document.getElementById('mode-buttons')!.style.display = 'none';
  document.getElementById('login-row')!.style.display = 'none';
  document.getElementById('social-row')!.style.display = 'none';
  backBtn.style.display = '';
  ovTitle.textContent = '📜 自分の履歴';
  const me = currentProfile();
  const nameForm = `<div class="name-edit"><input id="name-input" class="name-input" maxlength="20" placeholder="名前を入力（20文字まで）" value="${esc(me?.display_name ?? '')}"><button id="name-save" class="cta-btn name-btn">名前を変更</button></div>`;
  ovBody.innerHTML = `${nameForm}<div id="hist-body" class="rank-body">読み込み中…</div>
    <button id="to-ranking" class="ghost-btn">🏆 ランキングへ</button>
    ${me ? '<button id="logout-btn2" class="ghost-btn">ログアウト</button>' : ''}`;
  const rows = await fetchMyHistory(30);
  const hist = document.getElementById('hist-body');
  if (hist) hist.innerHTML = rows.length
    ? '<ul class="rank-list">' + rows.map((r) =>
        `<li class="rank-item"><span class="rank-pos">${MODE_LABEL[r.mode]}</span><span class="rank-val">${r.mode === 'sprint' ? fmtTime(r.elapsed_ms) : scoreFmt(r.score)} / ${r.lines}L</span><span class="rank-date">${fmtDate(r.played_at)}</span></li>`).join('') + '</ul>'
    : '<p class="howto-note">履歴はまだありません</p>';
  document.getElementById('name-save')!.addEventListener('click', async () => {
    const v = (document.getElementById('name-input') as HTMLInputElement).value;
    const ok = await updateDisplayName(v);
    (document.getElementById('name-save') as HTMLButtonElement)!.textContent = ok ? '変更しました ✓' : '失敗しました';
  });
  document.getElementById('to-ranking')!.addEventListener('click', () => { void showRankingView(backTo); });
  const lb = document.getElementById('logout-btn2');
  if (lb) lb.addEventListener('click', async () => { await logout(); backTo(); });
}
