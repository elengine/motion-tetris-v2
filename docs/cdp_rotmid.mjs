
import CDP from 'chrome-remote-interface';
import fs from 'node:fs';
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
  // 最初のスワイプの「補間最中」で撮る（40ms後）
  for (const t of [{type:'touchStart', x:cx, y:cy}, {type:'touchMove', x:cx, y:cy-50}, {type:'touchEnd', x:cx, y:cy-50}]) {
    await Input.dispatchTouchEvent({ type: t.type, touchPoints: [{x:t.x, y:t.y, id:1}] });
    await new Promise(r => setTimeout(r, 40));
  }
  await new Promise(r => setTimeout(r, 35));
  const shot = await Page.captureScreenshot({ format: 'png' });
  fs.writeFileSync('/opt/share/tetris-v2/docs/rot_midframe.png', Buffer.from(shot.data, 'base64'));
  console.log('saved');
} finally { await client.close(); }
