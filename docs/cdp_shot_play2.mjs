
import CDP from 'chrome-remote-interface';
import fs from 'node:fs';
const pages = await (await fetch('http://localhost:9222/json')).json();
const tgt = pages.find(p => p.url.includes('localhost:5174') && p.type === 'page');
const client = await CDP({ port: 9222, target: tgt });
const { Runtime, Page } = client;
try {
  await Page.enable();
  await Runtime.evaluate({ expression: `window.__game && !window.__game.state && window.__game.hard_drop(); window.__game&&window.__game.hard_drop()` });
  await new Promise(r => setTimeout(r, 300));
  const shot = await Page.captureScreenshot({ format: 'png' });
  fs.writeFileSync('/opt/share/tetris-v2/docs/v2new_play2.png', Buffer.from(shot.data, 'base64'));
  console.log('saved2');
} finally { await client.close(); }
