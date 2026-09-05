import { describe, it, expect } from 'vitest';
import { Board } from '../src/core/board';
import { TETROMINOES } from '../src/core/constants';

describe('Board', () => {
  it('ピースを固定できる', () => {
    const b = new Board();
    b.lock('T', 0, 3, 0);
    expect(b.grid[0][3]).toBe('T');
    expect(b.grid[0][4]).toBe('T');
    expect(b.grid[0][5]).toBe('T');
    expect(b.grid[1][4]).toBe('T');
  });

  it('fits は衝突を正しく判定する', () => {
    const b = new Board();
    b.lock('O', 0, 3, 0); // (3,0)(4,0)(3,1)(4,1)
    expect(b.fits('I', 0, 2, 0)).toBe(false); // 既存ピースに衝突
    expect(b.fits('I', 0, 6, 0)).toBe(true);
    expect(b.fits('I', 0, 8, 0)).toBe(false); // 右端はみ出し(4x1)
  });

  it('fullRows と clearRows', () => {
    const b = new Board();
    // 行 y=0 を埋める（O を並べる）
    for (let x = 0; x < 10; x += 2) b.lock('O', 0, x, 0);
    expect(b.fullRows().includes(0)).toBe(true);
    b.clearRows([0]);
    // 行0は空になった
    for (let x = 0; x < 10; x++) expect(b.grid[0][x]).toBeNull();
  });

  it('clearRows は上の行を落とす（複数行同時消去）', () => {
    const b = new Board();
    // 行4,5 を O(2x2) で埋める → 行6も完全に埋まる。T をその上(grid行7)に置く
    for (let x = 0; x < 10; x += 2) b.lock('O', 0, x, 4);
    for (let x = 0; x < 10; x += 2) b.lock('O', 0, x, 5);
    b.lock('T', 0, 4, 6); // grid行6: (4..6,6) + (5,7)
    expect(b.fullRows().sort()).toEqual([4, 5, 6]);
    b.clearRows([4, 5, 6]);
    // 消去された行は空になる。Tの行7(下段)は消去行の下なので残存し、その下は底面へ詰められる
    for (let y = 0; y <= 6; y++) {
      for (let x = 0; x < 10; x++) expect(b.grid[y][x]).toBeNull();
    }
    // T は grid行7 に残る（下段の(5,7)）
    expect(b.grid[7][5]).toBe('T');
  });

  it('isGameOver は上部が塞がると true', () => {
    const b = new Board();
    expect(b.isGameOver()).toBe(false);
    b.lock('O', 0, 4, 0);
    expect(b.isGameOver()).toBe(true);
  });

  it('全ての回転状態で4ブロック', () => {
    for (const type of ['I', 'O', 'T', 'S', 'Z', 'J', 'L'] as const) {
      for (let r = 0; r < 4; r++) {
        expect(TETROMINOES[type].cells[r].length).toBe(4);
      }
    }
  });
});
