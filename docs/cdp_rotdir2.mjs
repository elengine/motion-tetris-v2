
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
  await new Promise(r => setTimeout(r, 300));
  const t = await Runtime.evaluate({ expression: `window.__game.cur_type()`, returnByValue: true });
  // ArrowUp → 40ms 後にスクショ
  await Runtime.evaluate({ expression: `window.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowUp'}))` });
  await new Promise(r => setTimeout(r, 45));
  const shot = await Page.captureScreenshot({ format: 'png' });
  fs.writeFileSync('/opt/share/tetris-v2/docs/rot_dir_mid2.png', Buffer.from(shot.data, 'base64'));
  await new Promise(r => setTimeout(r, 300));
  const d = await Runtime.evaluate({ expression: `JSON.stringify(window.__debug)`, returnByValue: true });
  console.log('type:', t.result.value, 'complete:', d.result.value);
} finally { await client.close(); }
