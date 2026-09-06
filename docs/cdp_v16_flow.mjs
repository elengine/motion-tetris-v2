import CDP from 'chrome-remote-interface';
import fs from 'node:fs';
const client = await CDP({ port: 9222 });
const { Runtime, Page } = client;
try {
  await Page.enable();
  await Page.navigate({ url: 'http://localhost:5174/?v=' + Date.now() });
  await Page.loadEventFired();
  await new Promise(r => setTimeout(r, 2200));
  const start = await Runtime.evaluate({ expression: `(function(){ return JSON.stringify({
    modeBtns: document.querySelectorAll('.mode-btn').length,
    select: !!document.getElementById('mode-select'),
    backVisible: document.getElementById('back-to-title').style.display !== 'none',
    title: document.getElementById('ov-title').textContent }); })()`, returnByValue: true });
  console.log('START:', start.result.value);
  // マラソン開始
  await Runtime.evaluate({ expression: `(function(){ document.querySelector('.mode-btn[data-mode="marathon"]').click(); })()` });
  await new Promise(r => setTimeout(r, 600));
  const s00 = await Runtime.evaluate({ expression: `String(window.__game.state)`, returnByValue: true });
  // ウルトラ終了フロー → 完了画面で戻る確認
  await Runtime.evaluate({ expression: `window.__game.tick(125000)` });
  await new Promise(r => setTimeout(r, 800));
  const fin = await Runtime.evaluate({ expression: `(function(){ return JSON.stringify({
    title: document.getElementById('ov-title').textContent,
    backVisible: document.getElementById('back-to-title').style.display !== 'none',
    modeBtnsHidden: getComputedStyle(document.getElementById('mode-buttons')).display === 'none' }); })()`, returnByValue: true });
  console.log('AFTER FIN:', fin.result.value, 'state start:', s00.result.value);
  // 戻る
  await Runtime.evaluate({ expression: `document.getElementById('back-to-title').click()` });
  await new Promise(r => setTimeout(r, 400));
  const back = await Runtime.evaluate({ expression: `(function(){ return JSON.stringify({
    title: document.getElementById('ov-title').textContent,
    modeBtns: document.querySelectorAll('.mode-btn').length,
    backHidden: document.getElementById('back-to-title').style.display === 'none' }); })()`, returnByValue: true });
  console.log('BACK TO TITLE:', back.result.value);
  const b = await Page.captureScreenshot({ format: 'png' });
  fs.writeFileSync('/opt/share/tetris-v2/docs/ui_start_v16.png', Buffer.from(b.data, 'base64'));
} finally { await client.close(); }
