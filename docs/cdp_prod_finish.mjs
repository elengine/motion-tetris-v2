import CDP from 'chrome-remote-interface';
const client = await CDP({ port: 9222 });
const { Runtime, Page, Emulation } = client;
try {
  await Page.enable();
  await Page.navigate({ url: 'https://elengine.github.io/motion-tetris-v2/?v=' + Date.now() });
  await Page.loadEventFired();
  await new Promise(r => setTimeout(r, 3000));
  await Runtime.evaluate({ expression: `(async () => { const rs = await navigator.serviceWorker.getRegistrations(); for (const r of rs) await r.unregister(); const cs = await caches.keys(); for (const k of cs) await caches.delete(k); })()`, awaitPromise: true });
  await Page.navigate({ url: 'https://elengine.github.io/motion-tetris-v2/?v=' + Date.now() });
  await Page.loadEventFired();
  await new Promise(r => setTimeout(r, 3200));
  // バージョン表示確認
  const v = await Runtime.evaluate({ expression: `document.getElementById('ov-version')?.textContent`, returnByValue: true });
  console.log('version:', v.result.value);
  // ULTRA finish
  await Runtime.evaluate({ expression: `(function(){ document.getElementById('mode-select').value='ultra'; document.getElementById('ov-action').click(); })()` });
  await new Promise(r => setTimeout(r, 500));
  await Runtime.evaluate({ expression: `window.__game.tick(125000)` });
  await new Promise(r => setTimeout(r, 600));
  const d = await Runtime.evaluate({ expression: `(function(){ return JSON.stringify({title: document.getElementById('ov-title').textContent, act: document.getElementById('ov-action').textContent, sfx: window.__sfxLog.slice(-4)}); })()`, returnByValue: true });
  console.log('PROD ULTRA finish:', d.result.value);
  // 再開
  await Runtime.evaluate({ expression: `document.getElementById('ov-action').click()` });
  await new Promise(r => setTimeout(r, 400));
  const s = await Runtime.evaluate({ expression: `String(window.__game.state)`, returnByValue: true });
  console.log('restart state:', s.result.value);
} finally { await client.close(); }
