
import CDP from 'chrome-remote-interface';
const client = await CDP({ port: 9222 });
const { Runtime, Page } = client;
try {
  await Page.enable();
  await Page.navigate({ url: 'http://localhost:5174/' });
  await Page.loadEventFired();
  await new Promise(r => setTimeout(r, 1600));
  await Runtime.evaluate({ expression: `document.getElementById('ov-action').click()` });
  await new Promise(r => setTimeout(r, 3500)); // 自然落下+lock待ち
  const log = await Runtime.evaluate({ expression: `JSON.stringify(window.__sfxLog)`, returnByValue: true });
  console.log('sfx log:', log.result.value);
} finally { await client.close(); }
