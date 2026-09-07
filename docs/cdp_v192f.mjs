import CDP from 'chrome-remote-interface';
const client = await CDP({ port: 9222 });
const { Runtime, Page } = client;
const ev = (expr) => Runtime.evaluate({ expression: `(function(){ ${expr} })()`, returnByValue: true });
try {
  await Page.enable();
  await Page.navigate({ url: 'http://localhost:5174/?fresh=' + Date.now() });
  await Page.loadEventFired();
  await new Promise(r => setTimeout(r, 2500));
  await ev(`document.querySelector('.mode-btn[data-mode="ultra"]').click();`);
  await new Promise(r => setTimeout(r, 500));
  await ev(`window.__game.tick(125000);`);
  await new Promise(r => setTimeout(r, 800));
  let d = await ev(`return JSON.stringify({ state: window.__game.state, hudVis: getComputedStyle(document.getElementById('hud')).visibility, ov: document.getElementById('ov-title').textContent });`);
  console.log('FINISH:', d.result.value, '(hud hidden 期待)');
  const b = await Page.captureScreenshot({format:'png'});
  require('node:fs').writeFileSync('/opt/share/tetris-v2/docs/ui_finish_v192.png', Buffer.from(b.data,'base64'));
} catch (e) { console.log('ERRC', e.message); }
finally { await client.close(); }
