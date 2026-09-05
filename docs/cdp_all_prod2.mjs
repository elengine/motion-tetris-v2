
import CDP from 'chrome-remote-interface';
const client = await CDP({ port: 9222 });
const { Runtime, Page } = client;
try {
  await Page.enable();
  await Page.navigate({ url: 'https://elengine.github.io/motion-tetris-v2/?v=' + Date.now() });
  await Page.loadEventFired();
  await new Promise(r => setTimeout(r, 2000));
  await Runtime.evaluate({ expression: `(async () => { const rs = await navigator.serviceWorker.getRegistrations(); for (const r of rs) await r.unregister(); const cs = await caches.keys(); for (const k of cs) await caches.delete(k); })()`, awaitPromise: true });
  await Page.navigate({ url: 'https://elengine.github.io/motion-tetris-v2/?v=' + Date.now() });
  await Page.loadEventFired();
  await new Promise(r => setTimeout(r, 3000));
  await Runtime.evaluate({ expression: `document.getElementById('ov-action').click()` });
  await Runtime.evaluate({ expression: `window.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowUp'}))` });
  await new Promise(r => setTimeout(r, 50));
  const mid = await Runtime.evaluate({ expression: `JSON.stringify({anim: window.__debug.rotAnim, log: !!window.__sfxLog})`, returnByValue: true });
  console.log('mid:', mid.result.value);
} finally { await client.close(); }
