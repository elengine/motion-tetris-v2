
import CDP from 'chrome-remote-interface';
const client = await CDP({ port: 9222 });
const { Runtime, Page, Input } = client;
try {
  await Page.enable();
  await Page.navigate({ url: 'https://elengine.github.io/motion-tetris-v2/' });
  await Page.loadEventFired();
  await new Promise(r => setTimeout(r, 3000));
  await Runtime.evaluate({ expression: `document.getElementById('ov-action').click()` });
  await new Promise(r => setTimeout(r, 500));
  const c = await Runtime.evaluate({ expression: `JSON.stringify((r => ({w:r.width,h:r.height}))(document.getElementById('game-canvas').getBoundingClientRect()))`, returnByValue: true });
  const rect = JSON.parse(c.result.value);
  const cx = 400, cy = 600;
  for (let n = 0; n < 3; n++) {
    for (const t of [{type:'touchStart', x:cx, y:cy}, {type:'touchMove', x:cx, y:cy-50}, {type:'touchEnd', x:cx, y:cy-50}]) {
      await Input.dispatchTouchEvent({ type: t.type, touchPoints: [{x:t.x, y:t.y, id:1}] });
      await new Promise(r => setTimeout(r, 40));
    }
    await new Promise(r => setTimeout(r, 250));
  }
  await new Promise(r => setTimeout(r, 300));
  const st = await Runtime.evaluate({ expression: `JSON.stringify({rot: window.__game.curRot, gridFilled: window.__game.getGrid().split('').filter(c=>c!=='.').length})`, returnByValue: true });
  console.log('prod after 3 up-swipes:', st.result.value);
} finally { await client.close(); }
