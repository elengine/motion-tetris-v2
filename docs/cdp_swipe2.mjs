
import CDP from 'chrome-remote-interface';
const client = await CDP({ port: 9222 });
const { Runtime, Page, Input } = client;
try {
  await Page.enable();
  await Page.navigate({ url: 'http://localhost:5174/' });
  await Page.loadEventFired();
  await new Promise(r => setTimeout(r, 1800));
  await Runtime.evaluate({ expression: `document.getElementById('ov-action').click()` });
  await new Promise(r => setTimeout(r, 400));
  const c = await Runtime.evaluate({ expression: `JSON.stringify((r => ({x:r.x,y:r.y,w:r.width,h:r.height}))(document.getElementById('game-canvas').getBoundingClientRect()))`, returnByValue: true });
  const rect = JSON.parse(c.result.value);
  const cx = rect.x + rect.w/2, cy = rect.y + rect.h/2;
  for (let n = 0; n < 3; n++) {
    for (const t of [{type:'touchStart', x:cx, y:cy}, {type:'touchMove', x:cx, y:cy-50}, {type:'touchEnd', x:cx, y:cy-50}]) {
      await Input.dispatchTouchEvent({ type: t.type, touchPoints: [{x:t.x, y:t.y, id:1}] });
      await new Promise(r => setTimeout(r, 40));
    }
    await new Promise(r => setTimeout(r, 250));
  }
  await new Promise(r => setTimeout(r, 400));
  const st = await Runtime.evaluate({ expression: `JSON.stringify({rot: window.__game.curRot})`, returnByValue: true });
  console.log('rot after 3 swipes:', st.result.value);
  // 描画上の落下方向が「下」であることをピクセルで担保: 盤面の最も下の着色セルがスワイプ前に比べ増えていることなし
  // (純粋回転のため filled 変化なし)
  const filled = await Runtime.evaluate({ expression: `window.__game.getGrid().split('').filter(c=>c!=='.').length`, returnByValue: true });
  console.log('filled (expect 0):', filled.result.value);
} finally { await client.close(); }
