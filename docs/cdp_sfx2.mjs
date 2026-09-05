
import CDP from 'chrome-remote-interface';
const client = await CDP({ port: 9222 });
const { Runtime, Page } = client;
try {
  await Page.enable();
  await Page.navigate({ url: 'http://localhost:5174/' });
  await Page.loadEventFired();
  await new Promise(r => setTimeout(r, 1500));
  await Runtime.evaluate({ expression: `document.getElementById('ov-action').click()` });
  await new Promise(r => setTimeout(r, 100));
  for (let i = 0; i < 18; i++) { await Runtime.evaluate({ expression: `window.__game.soft_drop()` }); await new Promise(r => setTimeout(r, 80)); }
  await new Promise(r => setTimeout(r, 900));
  const d = await Runtime.evaluate({ expression: `JSON.stringify(window.__sfxLog)`, returnByValue: true });
  console.log('sfx:', d.result.value);
} finally { await client.close(); }
