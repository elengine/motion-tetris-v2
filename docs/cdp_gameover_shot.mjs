import CDP from 'chrome-remote-interface';
import fs from 'node:fs';
const client = await CDP({ port: 9222 });
const { Runtime, Page } = client;
try {
  await Page.enable();
  await Page.navigate({ url: 'http://localhost:5174/?v=' + Date.now() });
  await Page.loadEventFired();
  await new Promise(r => setTimeout(r, 2200));
  await Runtime.evaluate({ expression: `(function(){ document.getElementById('mode-select').value='marathon'; document.getElementById('ov-action').click(); })()` });
  await new Promise(r => setTimeout(r, 500));
  // 盤面最上段まで埋めて gameover を発生
  await Runtime.evaluate({ expression: `(function(){
    for (var y=0;y<22;y++) for (var x=0;x<10;x++) { try { window.__game.set_cell(x,y,1); } catch(e){} }
    window.__game.hard_drop();
  })()` });
  await new Promise(r => setTimeout(r, 900));
  const d = await Runtime.evaluate({ expression: `(function(){ return JSON.stringify({title: document.getElementById('ov-title').textContent, sub: document.getElementById('ov-sub').textContent, body: document.getElementById('ov-body').textContent, hudVis: getComputedStyle(document.getElementById('hud')).visibility, danger: !!document.querySelector('.finish-frame.danger')}); })()`, returnByValue: true });
  console.log('gameover screen:', d.result.value);
  const b = await Page.captureScreenshot({ format: 'png' });
  fs.writeFileSync('/opt/share/tetris-v2/docs/ui_gameover.png', Buffer.from(b.data, 'base64'));
} finally { await client.close(); }
