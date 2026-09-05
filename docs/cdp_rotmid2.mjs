
import CDP from 'chrome-remote-interface';
import fs from 'node:fs';
const client = await CDP({ port: 9222 });
const { Runtime, Page } = client;
try {
  await Page.enable();
  await Page.navigate({ url: 'http://localhost:5174/' });
  await Page.loadEventFired();
  await new Promise(r => setTimeout(r, 1600));
  await Runtime.evaluate({ expression: `document.getElementById('ov-action').click()` });
  await new Promise(r => setTimeout(r, 400));
  // 2連打快速 → 2個目の mid で撮る
  await Runtime.evaluate({ expression: `window.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowUp'}))` });
  await new Promise(r => setTimeout(r, 50));
  await Runtime.evaluate({ expression: `window.dispatchEvent(new KeyboardEvent('keyup',{key:'ArrowUp'}))` });
  await new Promise(r => setTimeout(r, 120));
  await Runtime.evaluate({ expression: `window.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowUp'}))` });
  await new Promise(r => setTimeout(r, 20));
  const shot = await Page.captureScreenshot({ format: 'png' });
  fs.writeFileSync('/opt/share/tetris-v2/docs/rot_fixed_mid.png', Buffer.from(shot.data, 'base64'));
  const dbg = await Runtime.evaluate({ expression: `JSON.stringify(window.__debug)`, returnByValue: true });
  console.log('mid2 debug:', dbg.result.value);
  await new Promise(r => setTimeout(r, 200));
  const dbg2 = await Runtime.evaluate({ expression: `JSON.stringify(window.__debug)`, returnByValue: true });
  console.log('after:', dbg2.result.value);
} finally { await client.close(); }
