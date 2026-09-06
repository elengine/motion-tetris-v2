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
  await Runtime.evaluate({ expression: `(function(){
    for (var y=2;y<22;y++) for (var x=0;x<10;x++) { if (x !== y%10) window.__game.set_cell(x,y,1); }
    try { window.__game.hard_drop(); } catch(e) {}
  })()` });
  await new Promise(r => setTimeout(r, 1300));
  const b = await Page.captureScreenshot({ format: 'png' });
  fs.writeFileSync('/opt/share/tetris-v2/docs/ui_gameover.png', Buffer.from(b.data, 'base64'));
  console.log('shot saved');
} finally { await client.close(); }
