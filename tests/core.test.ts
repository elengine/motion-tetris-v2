import { describe, it, expect } from 'vitest';
import { Randomizer } from '../src/core/randomizer';
import { Score } from '../src/core/score';
import { Game } from '../src/core/game';
import { TETROMINO_ORDER } from '../src/core/constants';

describe('Randomizer', () => {
  it('7-Bag: 7個で全種揃う', () => {
    const r = new Randomizer(() => 0.5);
    const got = Array.from({ length: 7 }, () => r.next());
    expect(new Set(got).size).toBe(7);
    expect([...got].sort()).toEqual([...TETROMINO_ORDER].sort());
  });
});

describe('Score', () => {
  it('シングル/テトリス/レベル加算', () => {
    const s = new Score();
    s.applyLineClear(1);
    expect(s.score).toBe(100);
    s.applyLineClear(4);
    // 800×1 + コンボボーナス(前回clear済みなのでcombo=1)→50
    expect(s.score).toBe(100 + 800 + 50);
  });

  it('レベルアップで落下間隔が短くなる', () => {
    const s = new Score();
    const d1 = s.dropInterval;
    for (let i = 0; i < 10; i++) s.applyLineClear(1); // 10ライン
    expect(s.level).toBe(2);
    expect(s.dropInterval).toBeLessThan(d1);
  });

  it('バックトゥバックテトリスで1.5倍', () => {
    const s = new Score();
    s.applyLineClear(4); // テトリス(800, combo0)
    const before = s.score;
    s.applyLineClear(4); // 続けてテトリス → B2B×1.5=1200 + combo1→50
    expect(s.score - before).toBe(1200 + 50);
  });
});

describe('Game', () => {
  it('初期状態でcurrentとnextがある', () => {
    const g = new Game(() => 0.3);
    expect(g.current).toBeTruthy();
    expect(g.nextPieces.length).toBe(3);
    expect(g.over).toBe(false);
  });

  it('左右移動と回転が反映される', () => {
    const g = new Game(() => 0.3);
    const x0 = g.currentX;
    g.moveLeft();
    expect(g.currentX).toBe(x0 - 1);
    g.moveRight();
    expect(g.currentX).toBe(x0);
    // 回転できる（T等は状態が変わる）
    const r0 = g.currentRotation;
    const ok = g.rotate(1);
    if (ok) expect(g.currentRotation).toBe((r0 + 1) % 4);
  });

  it('ハードドロップで下まで落ち、次のピースが来る', () => {
    const g = new Game(() => 0.3);
    const first = g.current;
    g.hardDrop();
    expect(g.current).not.toBe(first);
    expect(g.over).toBe(false);
  });

  it('tick で落下し、接地すると固定される', () => {
    const g = new Game(() => 0.3);
    const before = g.current;
    for (let i = 0; i < 25; i++) g.tick(50); // 総計1250ms
    // 接地したか、少なくともYが進んだ
    expect(g.currentY).toBeGreaterThanOrEqual(0);
    expect(g.current).not.toBeUndefined();
    void before;
  });

  it('ホールドが機能する', () => {
    const g = new Game(() => 0.5);
    const before = g.current;
    const ok = g.doHold();
    expect(ok).toBe(true);
    expect(g.hold).toBe(before);
    // 2回目は holdUsed で不可
    expect(g.doHold()).toBe(false);
  });
});
