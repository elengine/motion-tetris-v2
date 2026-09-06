import CDP from 'chrome-remote-interface';
import fs from 'node:fs';
const client = await CDP({ port: 9222 });
const { Runtime, Page } = client;
try {
  await Page.enable();
  await Page.navigate({ url: 'http://localhost:5174/?v=' + Date.now() });
  await Page.loadEventFired();
  await new Promise(r => setTimeout(r, 2200));
  await Runtime.evaluate({ expression: `(function(){ document.getElementById('mode-select').value='ultra'; document.getElementById('ov-action').click(); })()` });
  await new Promise(r => setTimeout(r, 500));
  await Runtime.evaluate({ expression: `window.__game.tick(125000)` });
  await new Promise(r => setTimeout(r, 700));
  const b = await Page.captureScreenshot({ format: 'png' });
  fs.writeFileSync('/opt/share/tetris-v2/docs/ui_finish.png', Buffer.from(b.data, 'base64'));
  const d = await Runtime.evaluate({ expression: `(function(){ return JSON.stringify({sub: document.getElementById('ov-sub').textContent, body: document.getElementById('ov-body').textContent}); })()`, returnByValue: true });
  console.log('finish screen:', d.result.value);
} finally { await client.close(); }
