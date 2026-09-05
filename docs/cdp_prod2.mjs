
import CDP from 'chrome-remote-interface';
const client = await CDP({ port: 9222 });
const { Runtime, Page } = client;
try {
  await Page.enable();
  await Page.navigate({ url: 'https://elengine.github.io/motion-tetris-v2/' });
  await Page.loadEventFired();
  await new Promise(r => setTimeout(r, 3000));
  const r = await Runtime.evaluate({ expression: `(() => {
    const errs = [];
    return JSON.stringify({
      score: document.getElementById('hud-score')?.textContent,
      title: document.title,
      hasAction: !!document.getElementById('ov-action'),
    });
  })()`, returnByValue: true });
  console.log(r.result.value);
  await Runtime.evaluate({ expression: `document.getElementById('ov-action').click()` });
  await new Promise(r => setTimeout(r, 500));
  for (let i = 0; i < 4; i++) { await Runtime.evaluate({ expression: `window.__game && window.__game.hard_drop()` }); await new Promise(r => setTimeout(r, 150)); }
  const r2 = await Runtime.evaluate({ expression: `JSON.stringify({score: document.getElementById('hud-score').textContent, lines: document.getElementById('hud-lines').textContent})`, returnByValue: true });
  console.log('after play:', r2.result.value);
} finally { await client.close(); }
