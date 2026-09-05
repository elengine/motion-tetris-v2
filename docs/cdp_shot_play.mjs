
import CDP from 'chrome-remote-interface';
import fs from 'node:fs';
const client = await CDP({ port: 9222 });
const { Runtime, Page } = client;
try {
  await Page.enable();
  await Page.navigate({ url: 'http://localhost:5174/' });
  await Page.loadEventFired();
  await new Promise(r => setTimeout(r, 1500));
  await Runtime.evaluate({ expression: `document.getElementById('ov-action')?.click()` });
  await new Promise(r => setTimeout(r, 400));
  await Runtime.evaluate({ expression: `window.__game.move_h(1)` });
  for (let i = 0; i < 4; i++) { await Runtime.evaluate({ expression: `window.__game.hard_drop()` }); await new Promise(r => setTimeout(r, 180)); }
  const hud = await Runtime.evaluate({ expression: `JSON.stringify({s: document.getElementById('hud-score').textContent, l: document.getElementById('hud-lines').textContent, t: document.getElementById('hud-time').textContent})`, returnByValue: true });
  console.log('hud:', hud.result.value);
  const shot = await Page.captureScreenshot({ format: 'png' });
  fs.writeFileSync('/opt/share/tetris-v2/docs/v2new_play.png', Buffer.from(shot.data, 'base64'));
  console.log('saved');
} finally { await client.close(); }
