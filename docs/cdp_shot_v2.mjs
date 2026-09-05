
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
  await new Promise(r => setTimeout(r, 500));
  for (let i = 0; i < 3; i++) { await Runtime.evaluate({ expression: `window.__game.hard_drop()` }); await new Promise(r => setTimeout(r, 150)); }
  const shot = await Page.captureScreenshot({ format: 'png' });
  fs.writeFileSync('/opt/share/tetris-v2/docs/v2new_shot.png', Buffer.from(shot.data, 'base64'));
  console.log('saved', fs.statSync('/opt/share/tetris-v2/docs/v2new_shot.png').size);
} finally { await client.close(); }
