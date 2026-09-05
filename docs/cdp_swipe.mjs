
import CDP from 'chrome-remote-interface';
const client = await CDP({ port: 9222 });
const { Runtime, Page, Input } = client;
try {
  await Page.enable();
  await Page.navigate({ url: 'https://elengine.github.io/motion-tetris-v2/' });
  await Page.loadEventFired();
  await new Promise(r => setTimeout(r, 2500));
  await Runtime.evaluate({ expression: `document.getElementById('ov-action').click()` });
  await new Promise(r => setTimeout(r, 500));
  // canvas の画面座標を取得
  const c = await Runtime.evaluate({ expression: `JSON.stringify((r => ({x:r.x,y:r.y,w:r.width,h:r.height}))(document.getElementById('game-canvas').getBoundingClientRect()))`, returnByValue: true });
  const rect = JSON.parse(c.result.value);
  const cx = rect.x + rect.w/2, cy = rect.y + rect.h/2;
  // touchstart → touchmove(上へ50px) → touchend を1回
  for (const t of [{type:'touchStart', x:cx, y:cy}, {type:'touchMove', x:cx, y:cy-50}, {type:'touchEnd', x:cx, y:cy-50}]) {
    await Input.dispatchTouchEvent({ type: t.type, touchPoints: [{x:t.x, y:t.y, id:1}] });
    await new Promise(r => setTimeout(r, 60));
  }
  await new Promise(r => setTimeout(r, 300));
  const st = await Runtime.evaluate({ expression: `JSON.stringify({rot: window.__game.curRot, y: window.__game.curY, x: window.__game.curX})`, returnByValue: true });
  console.log('after 1 up-swipe:', st.result.value);
  // 2回目
  for (const t of [{type:'touchStart', x:cx, y:cy}, {type:'touchMove', x:cx, y:cy-50}, {type:'touchEnd', x:cx, y:cy-50}]) {
    await Input.dispatchTouchEvent({ type: t.type, touchPoints: [{x:t.x, y:t.y, id:1}] });
    await new Promise(r => setTimeout(r, 60));
  }
  await new Promise(r => setTimeout(r, 300));
  const st2 = await Runtime.evaluate({ expression: `JSON.stringify({rot: window.__game.curRot, y: window.__game.curY, x: window.__game.curX})`, returnByValue: true });
  console.log('after 2 up-swipes:', st2.result.value);
} finally { await client.close(); }
