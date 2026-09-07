import CDP from 'chrome-remote-interface';
const client = await CDP({ port: 9222 });
const { Runtime, Page } = client;
try {
  await Page.enable();
  await Page.navigate({ url: 'http://localhost:5174/?fresh=' + Date.now() });
  await Page.loadEventFired();
  await new Promise(r => setTimeout(r, 2500));
  await Runtime.evaluate({ expression: `document.querySelector('.mode-btn[data-mode="marathon"]').click()` });
  await new Promise(r => setTimeout(r, 500));
  const d = await Runtime.evaluate({ expression: `(function(){ const g = window.__game; const keys = Object.getOwnPropertyNames(Object.getPrototypeOf(g)); return JSON.stringify({ hasPause: keys.includes('pause_toggle'), state: g.state }); })()`, returnByValue: true });
  console.log(d.result.value);
  // wasm pause_toggle 実行
  const d2 = await Runtime.evaluate({ expression: `(function(){ window.__game.pause_toggle(); return 'called'; })()`, returnByValue: true });
  await new Promise(r => setTimeout(r, 300));
  const d3 = await Runtime.evaluate({ expression: `(function(){ return JSON.stringify({ state: window.__game.state, hudVis: getComputedStyle(document.getElementById('hud')).visibility, ov: document.getElementById('ov-title').textContent, overlayHidden: document.getElementById('overlay').classList.contains('hidden') }); })()`, returnByValue: true });
  console.log('after wasm pause:', d2.result.value, d3.result.value);
} catch (e) { console.log('ERRC', e.message); }
finally { await client.close(); }
