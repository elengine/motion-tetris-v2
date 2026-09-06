
import CDP from 'chrome-remote-interface';
const client = await CDP({ port: 9222 });
const { Runtime, Page, Input } = client;
const tap = async (r) => {
  await Input.dispatchTouchEvent({ type:'touchStart', touchPoints:[{x:r.x+r.w/2, y:r.y+r.h/2, id:1}] });
  await new Promise(r2 => setTimeout(r2, 70));
  await Input.dispatchTouchEvent({ type:'touchEnd', touchPoints:[] });
  await new Promise(r2 => setTimeout(r2, 400));
};
try {
  await Page.enable();
  await Page.navigate({ url: 'https://elengine.github.io/motion-tetris-v2/?v=' + Date.now() });
  await Page.loadEventFired();
  await new Promise(r => setTimeout(r, 2500));
  await Runtime.evaluate({ expression: `(async () => { const rs = await navigator.serviceWorker.getRegistrations(); for (const r of rs) await r.unregister(); const cs = await caches.keys(); for (const k of cs) await caches.delete(k); })()`, awaitPromise: true });
  await Page.navigate({ url: 'https://elengine.github.io/motion-tetris-v2/?v=' + Date.now() });
  await Page.loadEventFired();
  await new Promise(r => setTimeout(r, 3000));
  await Runtime.evaluate({ expression: `(function(){ var b=document.getElementById('ov-action'); if(b)b.click(); })()`, returnByValue: true });
  await new Promise(r => setTimeout(r, 300));
  const rects = await Runtime.evaluate({ expression: `(function(){ var out={}; ['pause-btn','mute-btn'].forEach(function(id){ var r=document.getElementById(id).getBoundingClientRect(); out[id]={x:r.x,y:r.y,w:r.width,h:r.height}; }); return JSON.stringify(out); })()`, returnByValue: true });
  const R = JSON.parse(rects.result.value);
  await tap(R['pause-btn']);
  const s1 = await Runtime.evaluate({ expression: `String(window.__game.state)`, returnByValue: true });
  await tap(R['pause-btn']);
  const s2 = await Runtime.evaluate({ expression: `String(window.__game.state)`, returnByValue: true });
  await tap(R['mute-btn']);
  const mt = await Runtime.evaluate({ expression: `document.getElementById('mute-btn').textContent`, returnByValue: true });
  console.log('PROD pause:', s1.result.value, '-> resume:', s2.result.value, ' mute:', mt.result.value);
} finally { await client.close(); }
