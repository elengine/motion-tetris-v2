
import CDP from 'chrome-remote-interface';
const client = await CDP({ port: 9222 });
const { Runtime, Page } = client;
try {
  await Page.enable();
  await Page.navigate({ url: 'http://localhost:5174/?v=' + Date.now() });
  await Page.loadEventFired();
  await new Promise(r => setTimeout(r, 2000));
  await Runtime.evaluate({ expression: `document.getElementById('ov-action').click()` });
  const has = await Runtime.evaluate({ expression: `Array.isArray(window.__sfxLog)`, returnByValue: true });
  console.log('hasLog:', has.result.value);
  await Runtime.evaluate({ expression: `window.__game.hard_drop()` });
  await new Promise(r => setTimeout(r, 350));
  const d = await Runtime.evaluate({ expression: `JSON.stringify(window.__sfxLog)`, returnByValue: true });
  console.log('sfx:', d.result.value);
} finally { await client.close(); }
