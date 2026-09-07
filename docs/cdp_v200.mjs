import CDP from 'chrome-remote-interface';
import fs from 'node:fs';
const client = await CDP({ port: 9222 });
const { Runtime, Page, Emulation } = client;
const ev = (expr) => Runtime.evaluate({ expression: `(function(){ ${expr} })()`, returnByValue: true });
try {
  await Page.enable();
  await Emulation.setDeviceMetricsOverride({ width: 344, height: 882, deviceScaleFactor: 1, mobile: true });
  await Page.navigate({ url: 'http://localhost:5174/?fresh=' + Date.now() });
  await Page.loadEventFired();
  await new Promise(r => setTimeout(r, 2800));
  const d = await ev(`(function(){ return JSON.stringify({
    loginBtn: !!document.getElementById('login-btn-title'),
    rankBtn: !!document.getElementById('rank-link'), ver: document.getElementById('ov-version').textContent }); })()`);
  console.log('title:', d.result.value);
  const b = await Page.captureScreenshot({ format: 'png' });
  fs.writeFileSync('/opt/share/tetris-v2/docs/ui_start_v200.png', Buffer.from(b.data, 'base64'));
  // ランキング画面
  await ev(`document.getElementById('rank-link').click();`);
  await new Promise(r => setTimeout(r, 900));
  const r = await ev(`(function(){ return JSON.stringify({ title: document.getElementById('ov-title').textContent, tabs: document.querySelectorAll('.rank-tab').length, body: document.getElementById('rank-body').textContent.slice(0,60) }); })()`);
  console.log('ranking:', r.result.value);
  const b2 = await Page.captureScreenshot({ format: 'png' });
  fs.writeFileSync('/opt/share/tetris-v2/docs/ui_ranking_v200.png', Buffer.from(b2.data, 'base64'));
  // 履歴へ
  await ev(`document.getElementById('history-link').click();`);
  await new Promise(r2 => setTimeout(r2, 900));
  const s = await ev(`(function(){ return JSON.stringify({ title: document.getElementById('ov-title').textContent, nameInput: !!document.getElementById('name-input') }); })()`);
  console.log('history:', s.result.value);
} catch (e) { console.log('ERRC', e.message); }
finally { await client.close(); }
