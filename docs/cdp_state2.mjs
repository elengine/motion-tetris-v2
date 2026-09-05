
import CDP from 'chrome-remote-interface';
const client = await CDP({ port: 9222 });
const { Runtime, Page } = client;
try {
  await Page.enable();
  const pages = await (await fetch('http://localhost:9222/json')).json();
  const tgt = pages.find(p => p.url.includes('localhost:5174') && p.type === 'page');
  const c2 = tgt ? await CDP({ port: 9222, target: tgt.webSocketDebuggerUrl || tgt.id }) : client;
  const { Runtime } = c2;
  const d = await Runtime.evaluate({ expression: `JSON.stringify({curY: window.__game.curY, ghost: window.__game.ghostY, sfx: window.__sfxLog, elapsed: String(window.__game.elapsedMs)})`, returnByValue: true });
  console.log(d.result.value);
  await c2.close();
} catch (e) { console.log('ERR', e.message); }
