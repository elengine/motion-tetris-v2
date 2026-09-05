// ストレージ抽象化。
// 将来、無料DBサービス(REST/Supabase 等)へ移行する際は RemoteScoreStore を実装して
// 差し替えるだけで済むよう、ゲームロジック側は本インターフェースのみに依存させる。

export interface ScoreEntry {
  id: string; // エントリ固有ID
  name: string; // プレイヤー名
  score: number;
  level: number;
  lines: number;
  date: string; // ISO8601
  userId: string; // 将来のマルチユーザー化を見越し。未使用時 "local"
}

export interface ScoreStore {
  save(entry: Omit<ScoreEntry, 'id' | 'date'>): Promise<ScoreEntry>;
  list(limit?: number): Promise<ScoreEntry[]>;
  getBest(): Promise<ScoreEntry | null>;
  clear(): Promise<void>;
}

const KEY = 'motion-tetris:scores';

const newId = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

/** localStorage ベースの実装（Phase 1） */
export class LocalStorageScoreStore implements ScoreStore {
  constructor(private storage: Storage = globalThis.localStorage) {}

  private read(): ScoreEntry[] {
    const raw = this.storage.getItem(KEY);
    if (!raw) return [];
    try {
      const arr = JSON.parse(raw);
      return Array.isArray(arr) ? (arr as ScoreEntry[]) : [];
    } catch {
      return [];
    }
  }

  private write(entries: ScoreEntry[]): void {
    this.storage.setItem(KEY, JSON.stringify(entries));
  }

  async save(entry: Omit<ScoreEntry, 'id' | 'date'>): Promise<ScoreEntry> {
    const full: ScoreEntry = {
      ...entry,
      id: newId(),
      date: new Date().toISOString(),
    };
    const all = this.read();
    all.push(full);
    // スコア順にソート
    all.sort((a, b) => b.score - a.score);
    this.write(all.slice(0, 50)); // 上限50件
    return full;
  }

  async list(limit = 10): Promise<ScoreEntry[]> {
    return this.read().slice(0, limit);
  }

  async getBest(): Promise<ScoreEntry | null> {
    const all = this.read();
    return all.length > 0 ? all[0] : null;
  }

  async clear(): Promise<void> {
    this.storage.removeItem(KEY);
  }
}
