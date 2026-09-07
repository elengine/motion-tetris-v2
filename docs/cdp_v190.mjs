import CDP from 'chrome-remote-interface';
import fs from 'node:fs';
const client = await CDP({ port: 9222 });
const { Runtime, Page } = client;
try {
  await Page.enable();
  await Page.navigate({ url: 'http://localhost:5174/?fresh=' + Date.now() });
  await Page.loadEventFired();
  await new Promise(r => setTimeout(r, 2500));
  // スタート画面のサウンドトグル
  const d = await Runtime.evaluate({ expression: `(function(){ const b=document.getElementById('title-sound-btn'); b.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true})); return b ? 'exists' : 'null'; })()`, returnByValue: true });
  console.log('btn:', d.result.value);
  await new Promise(r => setTimeout(r, 200));
  const st = await Runtime.evaluate({ expression: `(function(){ const b=document.getElementById('title-sound-btn'); const mutedLS=localStorage.getItem('ntv2:muted'); return JSON.stringify({ mutedClass: b.classList.contains('muted'), ls: mutedLS, aria: b.getAttribute('aria-pressed') }); })()`, returnByValue: true });
  console.log('after toggle:', st.result.value);
  const b = await Page.captureScreenshot({ format: 'png' });
  fs.writeFileSync('/opt/share/tetris-v2/docs/ui_start_v190.png', Buffer.from(b.data, 'base64'));
  // トグル戻す
  await Runtime.evaluate({ expression: `document.getElementById('title-sound-btn').dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}))` });
  // あそびかた画面
  await Runtime.evaluate({ expression: `document.getElementById('howto-link').click()` });
  await new Promise(r => setTimeout(r, 500));
  const hw = await Runtime.evaluate({ expression: `(function(){ return JSON.stringify({ realbtns: document.querySelectorAll('.howto-realbtn').length, notes: document.querySelectorAll('.howto-note').length, cards: document.querySelectorAll('.howto-card').length }); })()`, returnByValue: true });
  console.log('HOWTO:', hw.result.value);
  const b2 = await Page.captureScreenshot({ format: 'png' });
  fs.writeFileSync('/opt/share/tetris-v2/docs/ui_howto_v190.png', Buffer.from(b2.data, 'base64'));
} catch (e) { console.log('ERRC', e.message); }
finally { await client.close(); }
