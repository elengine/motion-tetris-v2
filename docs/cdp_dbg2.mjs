
import CDP from 'chrome-remote-interface';
const client = await CDP({ port: 9222, target: 'page' });
const { Runtime, Page } = client;
try {
  await Page.enable();
  await Page.navigate({ url: 'https://elengine.github.io/motion-tetris-v2/?nocache=' + Date.now() });
  await Page.loadEventFired();
  await new Promise(r => setTimeout(r, 3500));
  const d = await Runtime.evaluate({ expression: `JSON.stringify({hasDebug: !!window.__debug, hasGame: !!window.__game, href: location.href})`, returnByValue: true });
  console.log(d.result.value);
} finally { await client.close(); }
