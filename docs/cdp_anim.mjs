
import CDP from 'chrome-remote-interface';
const client = await CDP({ port: 9222 });
const { Runtime, Page } = client;
try {
  await Page.enable();
  await Page.navigate({ url: 'http://localhost:5174/' });
  await Page.loadEventFired();
  await new Promise(r => setTimeout(r, 1800));
  await Runtime.evaluate({ expression: `document.getElementById('ov-action').click()` });
  await new Promise(r => setTimeout(r, 400));
  for (let n = 1; n <= 4; n++) {
    await Runtime.evaluate({ expression: `window.dispatchEvent(new KeyboardEvent('keydown', {key:'ArrowUp'}))` });
    await new Promise(r => setTimeout(r, 25));
    const mid = await Runtime.evaluate({ expression: `JSON.stringify(window.__debug)`, returnByValue: true });
    await new Promise(r => setTimeout(r, 600));
    const fin = await Runtime.evaluate({ expression: `JSON.stringify(window.__debug)`, returnByValue: true });
    console.log('x', n, 'mid:', mid.result.value, ' fin:', fin.result.value);
  }
} finally { await client.close(); }
