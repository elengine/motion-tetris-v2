import { TETROMINO_ORDER, TetrominoType } from './constants';

/** 7-Bag ランダマイザ。7種類をシャッフルして順に配る（偏りが少ない） */
export class Randomizer {
  private bag: TetrominoType[] = [];

  constructor(private rng: () => number = Math.random) {}

  private refill(): void {
    this.bag = [...TETROMINO_ORDER];
    // Fisher-Yates シャッフル
    for (let i = this.bag.length - 1; i > 0; i--) {
      const j = Math.floor(this.rng() * (i + 1));
      [this.bag[i], this.bag[j]] = [this.bag[j], this.bag[i]];
    }
  }

  next(): TetrominoType {
    if (this.bag.length === 0) this.refill();
    return this.bag.pop()!;
  }

  /** 次の数件を覗く（次のピース表示用） */
  peek(count: number): TetrominoType[] {
    while (this.bag.length < count) this.refill();
    return this.bag.slice(this.bag.length - count).reverse();
  }
}
