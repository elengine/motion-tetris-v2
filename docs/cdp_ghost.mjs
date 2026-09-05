
import CDP from 'chrome-remote-interface';
const client = await CDP({ port: 9222 });
const { Runtime, Page } = client;
try {
  await Page.enable();
  await Page.navigate({ url: 'http://localhost:5174/' });
  await Page.loadEventFired();
  await new Promise(r => setTimeout(r, 1500));
  await Runtime.evaluate({ expression: `document.getElementById('ov-action').click()` });
  const seq = [];
  for (let i = 0; i < 12; i++) {
    await new Promise(r => setTimeout(r, 400));
    const d = await Runtime.evaluate({ expression: `JSON.stringify({y: window.__game.curY, ghost: window.__game.ghostY, sfx: window.__sfxLog.slice(-3)})`, returnByValue: true });
    seq.push(d.result.value);
  }
  console.log(seq.join('\n'));
} finally { await client.close(); }
