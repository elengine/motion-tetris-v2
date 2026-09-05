
import CDP from 'chrome-remote-interface';
const client = await CDP({ port: 9222 });
const { Runtime, Page } = client;
try {
  await Page.enable();
  await Page.navigate({ url: 'http://localhost:5174/' });
  await Page.loadEventFired();
  await new Promise(r => setTimeout(r, 1600));
  await Runtime.evaluate({ expression: `document.getElementById('ov-action').click()` });
  await new Promise(r => setTimeout(r, 3000));
  const d = await Runtime.evaluate({ expression: `JSON.stringify({sfx: window.__sfxLog, curRot: window.__game.curRot, score: String(window.__game.score), state: String(window.__game.state), elapsed: String(window.__game.elapsedMs), debug: window.__debug})`, returnByValue: true });
  console.log(d.result.value);
} finally { await client.close(); }
