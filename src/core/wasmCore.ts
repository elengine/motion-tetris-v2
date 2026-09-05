// Wasm コアの TS ラッパ
// @ts-ignore — 生成ファイルはビルド時に出力
import init, { Game, GameMode, GameState } from '@wasm/tetris_core.js';

let ready: Promise<void> | null = null;

/** wasm モジュールの初期化（1回だけ） */
export function loadCore(): Promise<void> {
  if (!ready) {
    ready = init().then(() => undefined);
  }
  return ready as Promise<void>;
}

export { init, Game, GameMode, GameState };
export type PieceLetter = 'I' | 'O' | 'T' | 'S' | 'Z' | 'J' | 'L' | '.';
