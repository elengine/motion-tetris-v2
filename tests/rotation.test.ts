// Tブロックの4回転がすべて異なる形であることを検証（バグ再発防止）
import { it, expect } from 'vitest';
import { TETROMINOES } from '../src/core/constants';

it('Tブロックの4回転はすべて異なる（180度しか変わらないバグの再発防止）', () => {
  const norm = (cells: [number, number][]) =>
    [...cells].sort((a, b) => a[0] - b[0] || a[1] - b[1]).map((c) => c.join(',')).join('|');
  const shapes = TETROMINOES.T.cells.map(norm);
  const unique = new Set(shapes);
  expect(unique.size).toBe(4);
});
