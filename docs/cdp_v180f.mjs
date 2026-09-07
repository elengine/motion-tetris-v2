import CDP from 'chrome-remote-interface';
import fs from 'node:fs';
const client = await CDP({ port: 9222 });
const { Runtime, Page } = client;
try {
  await Page.enable();
  await Page.navigate({ url: 'http://localhost:5174/?fresh=' + Date.now() });
  await Page.loadEventFired();
  await new Promise(r => setTimeout(r, 2500));
  const d = await Runtime.evaluate({ expression: `(function(){ const h=document.getElementById('howto-link').getBoundingClientRect(); const m=document.querySelector('.mode-btn').getBoundingClientRect(); return JSON.stringify({text: document.getElementById('howto-link').textContent, above: h.bottom <= m.top, fs: getComputedStyle(document.getElementById('howto-link')).fontSize, notOnFinish: 'check-later'}); })()`, returnByValue: true });
  console.log('TITLE:', d.result.value);
  const b = await Page.captureScreenshot({ format: 'png' });
  fs.writeFileSync('/opt/share/tetris-v2/docs/ui_start_v180.png', Buffer.from(b.data, 'base64'));
  // マラソン開始→TIME UP→完了画面に「あそびかた」出ないこと
  await Runtime.evaluate({ expression: `(function(){ document.querySelector('.mode-btn[data-mode="ultra"]').click(); })()` });
  await new Promise(r => setTimeout(r, 500));
  await Runtime.evaluate({ expression: `window.__game.tick(125000)` });
  await new Promise(r => setTimeout(r, 800));
  const d2 = await Runtime.evaluate({ expression: `(function(){ return JSON.stringify({ title: document.getElementById('ov-title').textContent, howtoHidden: getComputedStyle(document.getElementById('howto-link')).display === 'none' }); })()`, returnByValue: true });
  console.log('FINISH:', d2.result.value);
} finally { await client.close(); }
