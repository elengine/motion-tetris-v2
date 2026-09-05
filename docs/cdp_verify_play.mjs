// CDP 検証2: ゲーム開始 → ハードドロップ → 盤面整合・ゴースト・固定ブロック残存を確認
import CDP from 'chrome-remote-interface';

const client = await CDP({ port: 9222 });
const { Runtime, Page } = client;
try {
  await Page.enable();
  await Page.navigate({ url: 'http://localhost:5174/' });
  await Page.loadEventFired();
  await new Promise(r => setTimeout(r, 2000));

  // ゲーム開始（ov-action ボタンをクリック）
  await Runtime.evaluate({ expression: `document.getElementById('ov-action').click()` });
  await new Promise(r => setTimeout(r, 800));

  const r1 = await Runtime.evaluate({ expression: `(() => {
    const g = window.__game;
    if (!g) return { err: 'no __game exposed' };
    return { state: g.state, piece: g.current_type, ghost: g.ghost_y, cur: g.current_y, gridNonEmpty: g.grid_flat.filter(c => c !== 0).length };
  })()`, returnByValue: true });
  console.log('state1:', JSON.stringify(r1.result.value));

  // ハードドロップを5回 → 固定ブロックが残るか（消滅バグの回帰）
  for (let i = 0; i < 5; i++) {
    await Runtime.evaluate({ expression: `document.querySelector('[data-action="drop"]')?.click()` });
    await new Promise(r => setTimeout(r, 250));
  }
  const r2 = await Runtime.evaluate({ expression: `(() => {
    const g = window.__game;
    return { state: g.state, gridNonEmpty: g.grid_flat.filter(c => c !== 0).length, lines: g.lines, score: g.score };
  })()`, returnByValue: true });
  console.log('after 5 hard drops:', JSON.stringify(r2.result.value));

  const bw = await Runtime.evaluate({ expression: `(() => {
    const cv = document.getElementById('game-canvas');
    cv.width = cv.clientWidth * 2; cv.height = cv.clientHeight * 2;
    return cv.toDataURL('image/png').length;
  })()`, returnByValue: true });
  console.log('canvas dataURL len:', bw.result.value);
} finally {
  await client.close();
}
