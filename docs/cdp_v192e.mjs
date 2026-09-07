import CDP from 'chrome-remote-interface';
const client = await CDP({ port: 9222 });
const { Runtime, Page } = client;
const ev = (expr) => Runtime.evaluate({ expression: `(function(){ ${expr} })()`, returnByValue: true });
try {
  await Page.enable();
  await Page.navigate({ url: 'http://localhost:5174/?fresh=' + Date.now() });
  await Page.loadEventFired();
  await new Promise(r => setTimeout(r, 2500));
  await ev(`document.querySelector('.mode-btn[data-mode="marathon"]').click();`);
  await new Promise(r => setTimeout(r, 500));
  await ev(`document.getElementById('pause-btn').dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}));`);
  await new Promise(r => setTimeout(r, 400));
  let d = await ev(`return JSON.stringify({ov: document.getElementById('ov-title').textContent});`);
  console.log('paused:', d.result.value);
  await ev(`document.getElementById('ov-action').click();`);
  await new Promise(r => setTimeout(r, 400));
  d = await ev(`return JSON.stringify({ state: window.__game.state, ovHidden: document.getElementById('overlay').classList.contains('hidden'), hudVis: getComputedStyle(document.getElementById('hud')).visibility });`);
  console.log('resume:', d.result.value, '(state=1, ov hidden=true, hud visible 期待)');
} catch (e) { console.log('ERRC', e.message); }
finally { await client.close(); }
