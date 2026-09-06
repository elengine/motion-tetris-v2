import CDP from 'chrome-remote-interface';
import fs from 'node:fs';
const client = await CDP({ port: 9222 });
const { Runtime, Page } = client;
try {
  await Page.enable();
  await Page.navigate({ url: 'https://elengine.github.io/motion-tetris-v2/?v=' + Date.now() });
  await Page.loadEventFired();
  await new Promise(r => setTimeout(r, 3000));
  await Runtime.evaluate({ expression: `(async () => { const rs = await navigator.serviceWorker.getRegistrations(); for (const r of rs) await r.unregister(); const cs = await caches.keys(); for (const k of cs) await caches.delete(k); })()`, awaitPromise: true });
  await Page.navigate({ url: 'https://elengine.github.io/motion-tetris-v2/?v=' + Date.now() });
  await Page.loadEventFired();
  await new Promise(r => setTimeout(r, 3200));
  await Runtime.evaluate({ expression: `(function(){ document.getElementById('mode-select').value='ultra'; document.getElementById('ov-action').click(); })()` });
  await new Promise(r => setTimeout(r, 500));
  await Runtime.evaluate({ expression: `window.__game.tick(125000)` });
  await new Promise(r => setTimeout(r, 700));
  const d = await Runtime.evaluate({ expression: `(function(){ return JSON.stringify({sub: document.getElementById('ov-sub').textContent, body: document.getElementById('ov-body').textContent, hudVisible: getComputedStyle(document.getElementById('hud')).visibility, frames: document.querySelectorAll('.finish-frame').length}); })()`, returnByValue: true });
  console.log('PROD fresh finish:', d.result.value);
} finally { await client.close(); }
