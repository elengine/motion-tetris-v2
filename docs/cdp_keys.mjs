
import CDP from 'chrome-remote-interface';
const client = await CDP({ port: 9222 });
const { Runtime, Page } = client;
try {
  await Page.enable();
  await Page.navigate({ url: 'http://localhost:5174/' });
  await Page.loadEventFired();
  await new Promise(r => setTimeout(r, 2500));
  const r = await Runtime.evaluate({ expression: `Object.keys(window).filter(k => /game|Game/.test(k)).join(',')`, returnByValue: true });
  console.log('keys:', r.result.value);
  await Runtime.evaluate({ expression: `document.getElementById('ov-action')?.click()` });
  await new Promise(r => setTimeout(r, 600));
  const r2 = await Runtime.evaluate({ expression: `(() => { const g = window.__game; return g ? { ok: true, state: String(g.state), ty: String(g.current_type) } : { ok: false }; })()`, returnByValue: true });
  console.log('game:', JSON.stringify(r2.result.value));
} finally { await client.close(); }
