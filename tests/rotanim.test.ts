/**
 * 回帰テスト — ユーザー報告バグ（2026-09-05, message 1545820570367561728 / 1545825340285259956）:
 *   ・回転: 上スワイプするごとに180度回転する
 *   ・落下方向: 上スワイプするごとに落下方向が90度変わってしまう（常に下であるべき）
 *
 * いずれも表示側バグ（論理 rot は CDP 実測で正しい rot=1,2,3,0 を確認済み）。
 * 根本原因: 表示角度を絶対角度で累積 + 折り返し正規化が向きを反転。
 * 本テストは表示偏差数学（src/engine/rotanim.ts）の不変条件を恒久的に担保する。
 */
import { describe, it, expect } from 'vitest';
import { initialOffset, offsetAt, onNewRotation, isBounded } from '../src/engine/rotanim';

const HALF = Math.PI / 2;

describe('回転アニメ偏差（上スワイプ180°/落下方向バグの回帰）', () => {
  it('偏差は常に |offset| ≤ 90°（180°に到達しない）', () => {
    // 連打をシミュレート: 各回転で k が中途半端な位置でも次の回転へ移行
    for (const dir of [1, -1] as const) {
      for (let k = 0; k <= 1.0; k += 0.01) {
        expect(isBounded(offsetAt(dir, k))).toBe(true);
      }
    }
  });

  it('最大偏差はちょうど90°であり、決して180°にならない', () => {
    expect(offsetAt(1, 0)).toBeCloseTo(-HALF);
    expect(offsetAt(-1, 0)).toBeCloseTo(HALF);
    // 絶対値が 90° を超える状態は存在しない
    for (let k = 0; k <= 1; k += 0.001) {
      expect(Math.abs(offsetAt(1, k))).toBeLessThanOrEqual(HALF + 1e-9);
      expect(Math.abs(offsetAt(-1, k))).toBeLessThanOrEqual(HALF + 1e-9);
    }
  });

  it('連打時も偏差は累積しない（絶対角度が増え続けない）', () => {
    // 旧実装: rotTarget += dir*π/2 → 4連打で 2π（=360°>90°）に達し視覚180°が起きていた
    // 新実装: onNewRotation は常に新規偏差を返す（前の偏差を引き継がない）
    let off = 0;
    for (let n = 0; n < 100; n++) {
      off = onNewRotation(off, 1);
      expect(Math.abs(off)).toBeLessThanOrEqual(HALF + 1e-9);
      expect(off).toBeCloseTo(-HALF);
    }
  });

  it('アニメ完了時（k=1）は偏差0 = 論理回転位置と一致（落下方向は常に下）', () => {
    expect(offsetAt(1, 1)).toBeCloseTo(0, 12);
    expect(offsetAt(-1, 1)).toBeCloseTo(0, 12);
  });

  it('偏差の向きは回転方向と一致（落下方向が反転しない）', () => {
    // 回帰 1545831423506645023: 視覚回転方向は論理回転方向と一致させる。
    // Canvas座標（y下向き）では 時計(dir=+1) = 負の偏差、反時計 = 正の偏差。
    expect(offsetAt(1, 0.5)).toBeLessThan(0);
    expect(offsetAt(1, 0.25)).toBeLessThan(0);
    expect(offsetAt(-1, 0.5)).toBeGreaterThan(0);
    expect(offsetAt(-1, 0.25)).toBeGreaterThan(0);
  });

  it('偏差は k に対して単調に0へ収束（途中で向きが変わらない）', () => {
    // dir=+1（時計）: 偏差は -90° → 0 へ単調増加（絶対値は単調減衰）
    let prev = offsetAt(1, 0);
    for (let k = 0.01; k <= 1; k += 0.01) {
      const cur = offsetAt(1, k);
      expect(Math.abs(cur)).toBeLessThanOrEqual(Math.abs(prev) + 1e-12);
      prev = cur;
    }
  });
});
