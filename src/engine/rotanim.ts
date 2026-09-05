/**
 * 回転アニメの偏差数学 — 純関数。
 *
 * 回帰バグ（2026-09-05, Fold 8 / PC 両方で報告）:
 *   1) 上スワイプごとに180°回転して見える
 *   2) 上スワイプごとに落下方向が90°変わって見える
 *
 * 原因: 表示角度を絶対角度（rotTarget += dir*π/2）で累積していたため、
 *   連打時に 120°/210° などの中間角度が描画され論理回転(90°)と
 *   見た目が乖離。さらに [-π/2,π/2] への折り返し正規化が角度によって
 *   反対方向へ反転し「落下方向が回る」ように見えた。
 *
 * 修正方針（本モジュールが単一の真実）:
 *   - 表示角度は「偏差」のみ: |offset| ≤ π/2 を厳守
 *   - 論理回転状態 curRot（0..3）とは独立し、一切累積しない
 *   - offset はアニメ進行 k∈[0,1] に対し dir*(1-k)*π/2 で 0 へ単調減衰
 */

/**
 * アニメ開始時の初期偏差（dir: +1=時計, -1=反時計）
 * 回帰修正 2026-09-05: Canvas座標（y下向き）では負の角度=時計回り。
 * 論理が時計回りに進む (curRot +1) とき、見た目も時計回りに回り込ませるには
 * 偏差は「旧位置から見て -90°」で開始し 0 へ減衰させる。
 */
export function initialOffset(dir: 1 | -1): number {
  return -dir * (Math.PI / 2);
}

/** アニメ経過 k (0..1) に対する表示偏差。k>=1 で 0（アニメ完了=論理位置と一致） */
export function offsetAt(dir: 1 | -1, k: number): number {
  const kk = Math.max(0, Math.min(1, k));
  return -dir * (1 - kk) * (Math.PI / 2);
}

/** 連打時: 新しい回転が入ったら偏差は「新規90°分」で上書き（累積しない） */
export function onNewRotation(_prevOffset: number, dir: 1 | -1): number {
  return initialOffset(dir); // 前の偏差は破棄（視覚的連続性より正しさ優先）
}

/** 不変条件: 偏差は常に ±90° 以内 */
export function isBounded(offset: number): boolean {
  return Math.abs(offset) <= Math.PI / 2 + 1e-9;
}
