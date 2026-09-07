import CDP from 'chrome-remote-interface';
import fs from 'node:fs';
const client = await CDP({ port: 9222 });
const { Runtime, Page, Input } = client;
try {
  await Page.enable();
  await Page.navigate({ url: 'http://localhost:5174/?v=' + Date.now() });
  await Page.loadEventFired();
  await new Promise(r => setTimeout(r, 2200));
  // スタート画面: あそびかた位置(マラソンボタン上)とサイズ
  const d = await Runtime.evaluate({ expression: `(function(){
    const h = document.getElementById('howto-link').getBoundingClientRect();
    const mB = document.querySelectorAll('.mode-btn')[0].getBoundingClientRect();
    return JSON.stringify({ howtoTop: Math.round(h.top), marathonTop: Math.round(mB.top), above: h.bottom <= mB.top, fs: getComputedStyle(document.getElementById('howto-link')).fontSize, text: document.getElementById('howto-link').textContent });
  })()`, returnByValue: true });
  console.log('TITLE LINK:', d.result.value);
  const b = await Page.captureScreenshot({ format: 'png' });
  fs.writeFileSync('/opt/share/tetris-v2/docs/ui_start_v180.png', Buffer.from(b.data, 'base64'));
  // 遊び方画面 スクロール確認
  await Runtime.evaluate({ expression: `document.getElementById('howto-link').click()` });
  await new Promise(r => setTimeout(r, 500));
  const sc = await Runtime.evaluate({ expression: `(function(){
    const card = document.querySelector('.overlay-card');
    return JSON.stringify({ scrollH: card.scrollHeight, clientH: card.clientHeight, scrollable: card.scrollHeight > card.clientHeight, items: document.querySelectorAll('.howto-card li').length });
  })()`, returnByValue: true });
  console.log('HOWTO SCROLL:', sc.result.value);
  const b2 = await Page.captureScreenshot({ format: 'png' });
  fs.writeFileSync('/opt/share/tetris-v2/docs/ui_howto_v180.png', Buffer.from(b2.data, 'base64'));
  // スクロール実行
  const sc2 = await Runtime.evaluate({ expression: `(function(){ const c=document.querySelector('.overlay-card'); c.scrollTop = 9999; return c.scrollTop; })()`, returnByValue: true });
  console.log('scrolled to:', sc2.result.value);
  const b3 = await Page.captureScreenshot({ format: 'png' });
  fs.writeFileSync('/opt/share/tetris-v2/docs/ui_howto_v180_bottom.png', Buffer.from(b3.data, 'base64'));
  // 元画面に戻す→ スワイプテスト
  await Runtime.evaluate({ expression: `document.getElementById('back-to-title').click()` });
  await new Promise(r => setTimeout(r, 400));
  await Runtime.evaluate({ expression: `(function(){ document.querySelector('.mode-btn[data-mode="marathon"]').click(); })()` });
  await new Promise(r => setTimeout(r, 600));
  // ゆっくり下ドラッグ (debounce: touchstart→move 数回→end を 500ms)
  const d0 = await Runtime.evaluate({ expression: `JSON.stringify({y: window.__game.get_falling_y ? window.__game.get_falling_y() : null})`, returnByValue: true });
  await Input.dispatchTouchEvent({ type: 'touchStart', touchPoints: [{ x: 170, y: 400 }] });
  await Input.dispatchTouchEvent({ type: 'touchMove', touchPoints: [{ x: 170, y: 480 }] });
  await Input.dispatchTouchEvent({ type: 'touchMove', touchPoints: [{ x: 170, y: 560 }] });
  await new Promise(r => setTimeout(r, 300));
  await Input.dispatchTouchEvent({ type: 'touchEnd', touchPoints: [] });
  await new Promise(r => setTimeout(r, 300));
  const d1 = await Runtime.evaluate({ expression: `JSON.stringify({ finished: window.__game.finished ? window.__game.finished() : 'n/a' })`, returnByValue: true });
  console.log('slow drag ->', d1.result.value, '(finished=false 期待: ハードドロップ即死しない)');
} catch (e) { console.log('ERRC', e.message); }
finally { await client.close(); }
