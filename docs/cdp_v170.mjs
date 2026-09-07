import CDP from 'chrome-remote-interface';
import fs from 'node:fs';
const client = await CDP({ port: 9222 });
const { Runtime, Page } = client;
try {
  await Page.enable();
  await Page.navigate({ url: 'http://localhost:5174/?v=' + Date.now() });
  await Page.loadEventFired();
  await new Promise(r => setTimeout(r, 2200));
  const t = await Runtime.evaluate({ expression: `(function(){ return JSON.stringify({
    wasmMsg: document.getElementById('ov-sub').textContent,
    pcMsg: document.getElementById('ov-body').textContent.includes('PC'),
    howtoVisible: getComputedStyle(document.getElementById('howto-link')).display !== 'none',
    modeBtns: document.querySelectorAll('.mode-btn').length }); })()`, returnByValue: true });
  console.log('TITLE:', t.result.value);
  const b = await Page.captureScreenshot({ format: 'png' });
  fs.writeFileSync('/opt/share/tetris-v2/docs/ui_start_v170.png', Buffer.from(b.data, 'base64'));
  // 遊び方リンクclick
  await Runtime.evaluate({ expression: `document.getElementById('howto-link').click()` });
  await new Promise(r => setTimeout(r, 500));
  const hw = await Runtime.evaluate({ expression: `(function(){ return JSON.stringify({
    title: document.getElementById('ov-title').textContent,
    cards: document.querySelectorAll('.howto-card').length,
    keys: document.querySelectorAll('.key').length,
    backVisible: document.getElementById('back-to-title').style.display !== 'none' }); })()`, returnByValue: true });
  console.log('HOWTO:', hw.result.value);
  const b2 = await Page.captureScreenshot({ format: 'png' });
  fs.writeFileSync('/opt/share/tetris-v2/docs/ui_howto_v170.png', Buffer.from(b2.data, 'base64'));
  // 戻る → タイトルに戻ることを確認
  await Runtime.evaluate({ expression: `document.getElementById('back-to-title').click()` });
  await new Promise(r => setTimeout(r, 400));
  const bt = await Runtime.evaluate({ expression: `(function(){ return JSON.stringify({
    title: document.getElementById('ov-title').textContent,
    modeBtns: document.querySelectorAll('.mode-btn').length }); })()`, returnByValue: true });
  console.log('BACK:', bt.result.value);
} finally { await client.close(); }
