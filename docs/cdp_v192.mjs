import CDP from 'chrome-remote-interface';
import fs from 'node:fs';
const client = await CDP({ port: 9222 });
const { Runtime, Page } = client;
try {
  await Page.enable();
  await Page.navigate({ url: 'http://localhost:5174/?fresh=' + Date.now() });
  await Page.loadEventFired();
  await new Promise(r => setTimeout(r, 2500));
  // スタート: title-sound-btn 有、hud非表示
  const t = await Runtime.evaluate({ expression: `(function(){ return JSON.stringify({ titleSound: getComputedStyle(document.getElementById('title-sound-btn')).display !== 'none', hudVis: getComputedStyle(document.getElementById('hud')).visibility }); })()`, returnByValue: true });
  console.log('TITLE:', t.result.value);
  // 遊び方画面: hud(含mute/pause)非表示
  await Runtime.evaluate({ expression: `document.getElementById('howto-link').click()` });
  await new Promise(r => setTimeout(r, 400));
  const h = await Runtime.evaluate({ expression: `(function(){ return JSON.stringify({ hudVis: getComputedStyle(document.getElementById('hud')).visibility }); })()`, returnByValue: true });
  console.log('HOWTO:', h.result.value);
  await Runtime.evaluate({ expression: `document.getElementById('back-to-title').click()` });
  await new Promise(r => setTimeout(r, 300));
  // プレイ開始 → hud visible → pause → hud hidden?
  await Runtime.evaluate({ expression: `document.querySelector('.mode-btn[data-mode="marathon"]').click()` });
  await new Promise(r => setTimeout(r, 500));
  const p1 = await Runtime.evaluate({ expression: `(function(){ return JSON.stringify({ hudVis: getComputedStyle(document.getElementById('hud')).visibility }); })()`, returnByValue: true });
  console.log('PLAYING:', p1.result.value);
  await Runtime.evaluate({ expression: `window.__game.pause_toggle()` });
  await new Promise(r => setTimeout(r, 400));
  const p2 = await Runtime.evaluate({ expression: `(function(){ return JSON.stringify({ hudVis: getComputedStyle(document.getElementById('hud')).visibility, ovTitle: document.getElementById('ov-title').textContent }); })()`, returnByValue: true });
  console.log('PAUSED:', p2.result.value);
  const b = await Page.captureScreenshot({ format: 'png' });
  fs.writeFileSync('/opt/share/tetris-v2/docs/ui_paused_v192.png', Buffer.from(b.data, 'base64'));
  // 完了画面
  await Runtime.evaluate({ expression: `window.__game.tick(125000)` });
  await new Promise(r => setTimeout(r, 800));
  const f = await Runtime.evaluate({ expression: `(function(){ return JSON.stringify({ hudVis: getComputedStyle(document.getElementById('hud')).visibility, ovTitle: document.getElementById('ov-title').textContent }); })()`, returnByValue: true });
  console.log('FINISH:', f.result.value);
} catch (e) { console.log('ERRC', e.message); }
finally { await client.close(); }
