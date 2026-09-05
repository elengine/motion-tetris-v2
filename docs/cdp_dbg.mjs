
import CDP from 'chrome-remote-interface';
const client = await CDP({ port: 9222 });
const { Runtime, Page } = client;
try {
  await Page.enable();
  const pages = await (await fetch('http://localhost:9222/json')).json();
  const tgt = pages.find(p => p.url.includes('motion-tetris-v2') && p.type === 'page');
  const c2 = tgt ? await CDP({ port: 9222, target: tgt }) : client;
  const { Runtime } = c2;
  const d = await Runtime.evaluate({ expression: `JSON.stringify({hasDebug: !!window.__debug, href: location.href})`, returnByValue: true });
  console.log(d.result.value);
} finally { await client.close(); }
