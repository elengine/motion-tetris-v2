
import CDP from 'chrome-remote-interface';
const client = await CDP({ port: 9222 });
const { Runtime, Page } = client;
try {
  await Page.enable();
  await Page.navigate({ url: 'http://localhost:5174/' });
  await Page.loadEventFired();
  await new Promise(r => setTimeout(r, 1500));
  const q = await Runtime.evaluate({ expression: `(() => {
    const ids = ['hud-score','hud-lines','hud-time'];
    const out = {};
    for (const id of ids) { const el = document.getElementById(id); out[id] = el ? el.textContent : 'MISSING'; }
    out.hasOverlayAction = !!document.getElementById('ov-action');
    out.hasGame = !!window.__game;
    return JSON.stringify(out);
  })()`, returnByValue: true });
  console.log(q.result.value);
  await Runtime.evaluate({ expression: `document.getElementById('ov-action')?.click()` });
  await new Promise(r => setTimeout(r, 400));
  for (let i = 0; i < 4; i++) { await Runtime.evaluate({ expression: `window.__game && window.__game.hard_drop()` }); await new Promise(r => setTimeout(r, 150)); }
  const r2 = await Runtime.evaluate({ expression: `JSON.stringify({score: String(document.getElementById('hud-score')?.textContent), gridFilled: (()=>{const g=window.__game; const gr=g&&g.getGrid(); return gr? gr.split('').filter(c=>c!=='.').length : -1})()})`, returnByValue: true });
  console.log('after:', r2.result.value);
} finally { await client.close(); }
