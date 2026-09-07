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
  const s1 = await Runtime.evaluate({ expression: `(function(){ window.__game.pause_toggle(); return window.__game.state(); })()`, returnByValue: true });
  await new Promise(r => setTimeout(r, 400));
  const d = await Runtime.evaluate({ expression: `(function(){ return JSON.stringify({ state: window.__game.state(), hudVis: getComputedStyle(document.getElementById('hud')).visibility, ov: document.getElementById('ov-title').textContent }); })()`, returnByValue: true });
  console.log('after pause_toggle:', s1.result.value, d.result.value);
} catch (e) { console.log('ERRC', e.message); }
finally { await client.close(); }
