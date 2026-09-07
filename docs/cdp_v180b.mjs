import CDP from 'chrome-remote-interface';
import fs from 'node:fs';
const client = await CDP({ port: 9222 });
const { Runtime, Page } = client;
try {
  await Page.enable();
  await Page.navigate({ url: 'http://localhost:5174/?v=' + Date.now() });
  await Page.loadEventFired();
  await new Promise(r => setTimeout(r, 2200));
  await Runtime.evaluate({ expression: `document.getElementById('howto-link').click()` });
  await new Promise(r => setTimeout(r, 500));
  const sc = await Runtime.evaluate({ expression: `(function(){ const c=document.querySelector('.overlay-card'); return JSON.stringify({ sh: c.scrollHeight, ch: c.clientHeight, can: c.scrollHeight > c.clientHeight }); })()`, returnByValue: true });
  console.log('SCROLL:', sc.result.value);
  const sc2 = await Runtime.evaluate({ expression: `(function(){ const c=document.querySelector('.overlay-card'); c.scrollTop=9999; return JSON.stringify({ st: c.scrollTop, bottomVisible: c.scrollTop + c.clientHeight >= c.scrollHeight - 4 }); })()`, returnByValue: true });
  console.log('BOTTOM:', sc2.result.value);
  const b2 = await Page.captureScreenshot({ format: 'png' });
  fs.writeFileSync('/opt/share/tetris-v2/docs/ui_howto_v180.png', Buffer.from(b2.data, 'base64'));
} finally { await client.close(); }
