import CDP from 'chrome-remote-interface';
import fs from 'node:fs';
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
  let d = await ev(`return JSON.stringify({ state: window.__game.state, hudVis: getComputedStyle(document.getElementById('hud')).visibility, ov: document.getElementById('ov-title').textContent });`);
  console.log('PAUSED btn-path:', d.result.value);
  const b = await Page.captureScreenshot({ format: 'png' });
  fs.writeFileSync('/opt/share/tetris-v2/docs/ui_paused_v192.png', Buffer.from(b.data, 'base64'));
  // 完了画面: resume して tick
  await ev(`document.getElementById('ov-action').dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}));`);
  await new Promise(r => setTimeout(r, 400));
  await ev(`window.__game.tick(125000);`);
  await new Promise(r => setTimeout(r, 800));
  d = await ev(`return JSON.stringify({ state: window.__game.state, hudVis: getComputedStyle(document.getElementById('hud')).visibility, ov: document.getElementById('ov-title').textContent });`);
  console.log('FINISH:', d.result.value);
} catch (e) { console.log('ERRC', e.message); }
finally { await client.close(); }
