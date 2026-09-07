import CDP from 'chrome-remote-interface';
import fs from 'node:fs';
const client = await CDP({ port: 9222 });
const { Runtime, Page } = client;
const ev = (expr) => Runtime.evaluate({ expression: `(function(){ ${expr} })()`, returnByValue: true });
try {
  await Page.enable();
  await Page.navigate({ url: 'http://localhost:5174/?fresh=' + Date.now() });
  await Page.loadEventFired();
  await new Promise(r => setTimeout(r, 2500));
  let d = await ev(`return JSON.stringify({ titleSound: getComputedStyle(document.getElementById('title-toggles')).display !== 'none' });`);
  console.log('TITLE:', d.result.value);
  // 遊び方
  await ev(`document.getElementById('howto-link').click();`);
  await new Promise(r => setTimeout(r, 400));
  d = await ev(`return JSON.stringify({ toggles: getComputedStyle(document.getElementById('title-toggles')).display });`);
  console.log('HOWTO:', d.result.value, '(none 期待)');
  await ev(`document.getElementById('back-to-title').click();`);
  await new Promise(r => setTimeout(r, 300));
  // PAUSED
  await ev(`document.querySelector('.mode-btn[data-mode="marathon"]').click();`);
  await new Promise(r => setTimeout(r, 500));
  await ev(`document.getElementById('pause-btn').dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}));`);
  await new Promise(r => setTimeout(r, 400));
  d = await ev(`return JSON.stringify({ toggles: getComputedStyle(document.getElementById('title-toggles')).display, ov: document.getElementById('ov-title').textContent });`);
  console.log('PAUSED:', d.result.value, '(none 期待)');
  // GAMEOVER
  await ev(`document.getElementById('ov-action').click();`);
  await new Promise(r => setTimeout(r, 400));
  // 強制 gameOver: hard_drop 连打で 天井まで
  for (let i=0;i<26;i++) { await ev(`window.__game.hard_drop();`); await new Promise(r => setTimeout(r, 60)); }
  d = await ev(`return JSON.stringify({ ov: document.getElementById('ov-title').textContent, toggles: getComputedStyle(document.getElementById('title-toggles')).display });`);
  console.log('GAMEOVER:', d.result.value, '(none 期待)');
} catch (e) { console.log('ERRC', e.message); }
finally { await client.close(); }
