export interface ScoreLineResults {
  clearedLines: number;
  isBackToBack: boolean;
  isCombo: boolean;
}

/**
 * スコア・レベル・コンボ計算。
 * 得点は消去ライン数+テトリス/バックトゥバック/コンボで加算される。
 */
export class Score {
  score = 0;
  level = 1;
  lines = 0;
  combo = -1; // 連続消去カウント。消去成功で+1、失敗でリセット
  private lastWasTetris = false;
  /** 直近の消去がTスピンか（将来B2B拡張用に参照可） */
  lastWasTSpin = false;
  /** applyLineClear でレベルが上がったか（消費後に読み取る） */
  private _levelChanged = false;
  get levelChanged(): boolean {
    return this._levelChanged;
  }

  /** レベルに応じた落下間隔（ms）。速くなる */
  get dropInterval(): number {
    return Math.max(60, 800 * Math.pow(0.82, this.level - 1));
  }

  /** レベルに応じたBGMテンポ倍率 */
  get tempoMultiplier(): number {
    return 1 + (this.level - 1) * 0.09;
  }

  /** ハードドロップの加算 */
  addHardDrop(dist: number): void {
    this.score += dist * 2;
  }

  /** ライン消去時のスコア加算・レベル進行。tspin: Tスピン状態 */
  applyLineClear(n: number, tspin: 'none' | 'mini' | 'full' = 'none'): void {
    // Tスpin
    if (tspin !== 'none') {
      this.lastWasTSpin = true;
      //   mini single: 100, mini double: 200 / full single: 800, double: 1200, triple: 1600
      const tspinBase = tspin === 'full' ? [0, 800, 1200, 1600, 0][Math.min(n, 3)] : [0, 100, 200][Math.min(n, 2)];
      let gained = tspinBase * this.level;
      // B2B (Tスピン → Tスピン、またはTetris → T-spin)
      if (this.lastWasTetris && tspin === 'full') gained = Math.floor(gained * 1.5);
      gained += this.comboBonusOnLineClear(n);
      this.score += gained;
      this.lines += n;
      this.updateLevel();
      return;
    }

    const base = [0, 100, 300, 500, 800][Math.min(n, 4)];
    let gained = base * this.level;

    const isTetris = n === 4;
    const isB2B = this.lastWasTetris && isTetris;
    if (isB2B) gained = Math.floor(gained * 1.5);

    if (n > 0) this.combo++;
    const comboBonus = this.combo > 0 ? 50 * this.combo * this.level : 0;
    gained += comboBonus;

    this.score += gained;
    this.lines += n;
    this.lastWasTSpin = false;
    this.updateLevel();

    if (isTetris) this.lastWasTetris = true;
    else if (n > 0) this.lastWasTetris = false;
    if (n === 0) {
      this.combo = -1;
      this.lastWasTetris = false;
    }
  }

  /** コンボボーナス。消去時のみ呼ばれる前提 */
  private comboBonusOnLineClear(n: number): number {
    if (n === 0) return 0;
    this.combo++;
    return this.combo > 0 ? 50 * this.combo * this.level : 0;
  }

  /** 10ライン毎にレベルアップ */
  private updateLevel(): void {
    const nextLevel = 1 + Math.floor(this.lines / 10);
    this._levelChanged = nextLevel > this.level;
    this.level = nextLevel;
  }

  /** 前回消去から連続しているか（コンボ状態） */
  resetComboOnLand(nonLine: boolean): void {
    if (nonLine) this.combo = -1;
  }
}
