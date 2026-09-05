
import CDP from 'chrome-remote-interface';
const client = await CDP({ port: 9222 });
const { Runtime, Page } = client;
try {
  await Page.enable();
  await Page.navigate({ url: 'http://localhost:5174/?v=' + Date.now() });
  await Page.loadEventFired();
  await new Promise(r => setTimeout(r, 2000));
  await Runtime.evaluate({ expression: `document.getElementById('ov-action').click()` });
  await new Promise(r => setTimeout(r, 150));
  for (let i = 0; i < 25; i++) {
    await Runtime.evaluate({ expression: `window.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowDown'}))` });
    await new Promise(r => setTimeout(r, 70));
    await Runtime.evaluate({ expression: `window.dispatchEvent(new KeyboardEvent('keyup',{key:'ArrowDown'}))` });
  }
  await new Promise(r => setTimeout(r, 1200));
  const d = await Runtime.evaluate({ expression: `JSON.stringify(window.__sfxLog)`, returnByValue: true });
  console.log('sfx:', d.result.value);
} finally { await client.close(); }
