
import CDP from 'chrome-remote-interface';
const client = await CDP({ port: 9222 });
const { Runtime, Page } = client;
try {
  await Page.enable();
  await Page.navigate({ url: 'http://localhost:5174/' });
  await Page.loadEventFired();
  await new Promise(r => setTimeout(r, 2000));
  await Runtime.evaluate({ expression: `document.getElementById('ov-action')?.click()` });
  await new Promise(r => setTimeout(r, 500));
  const snap = `(() => { const g = window.__game; return {
    state: String(g.state), ty: g.cur_type, curY: g.curY, ghost: g.ghostY,
    filled: (() => { let n = 0; for (let y = 0; y < 20; y++) for (let x = 0; x < 10; x++) if (g.get_cell(x, y) !== 0) n++; return n; })(),
    lines: g.lines, score: Number(g.score) }; })()`;
  console.log('t0:', JSON.stringify((await Runtime.evaluate({ expression: snap, returnByValue: true })).result.value));
  for (let i = 0; i < 8; i++) {
    await Runtime.evaluate({ expression: `window.__game.hard_drop()` });
    await new Promise(r => setTimeout(r, 120));
  }
  console.log('t8:', JSON.stringify((await Runtime.evaluate({ expression: snap, returnByValue: true })).result.value));
} finally { await client.close(); }
