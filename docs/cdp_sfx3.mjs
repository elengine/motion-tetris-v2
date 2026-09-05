
import CDP from 'chrome-remote-interface';
const client = await CDP({ port: 9222 });
const { Runtime, Page } = client;
try {
  await Page.enable();
  await Page.navigate({ url: 'http://localhost:5174/' });
  await Page.loadEventFired();
  await new Promise(r => setTimeout(r, 1500));
  await Runtime.evaluate({ expression: `document.getElementById('ov-action').click()` });
  await new Promise(r => setTimeout(r, 150));
  await Runtime.evaluate({ expression: `window.__game.hard_drop()` });
  await new Promise(r => setTimeout(r, 400));
  const d = await Runtime.evaluate({ expression: `JSON.stringify(window.__sfxLog)`, returnByValue: true });
  console.log('after hard drop sfx:', d.result.value);
} finally { await client.close(); }
