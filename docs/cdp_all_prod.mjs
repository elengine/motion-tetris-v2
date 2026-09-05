
import CDP from 'chrome-remote-interface';
const client = await CDP({ port: 9222 });
const { Runtime, Page } = client;
try {
  await Page.enable();
  await Page.navigate({ url: 'https://elengine.github.io/motion-tetris-v2/?v=' + Date.now() });
  await Page.loadEventFired();
  await new Promise(r => setTimeout(r, 3500));
  await Runtime.evaluate({ expression: `document.getElementById('ov-action').click()` });
  // 回転方向: ArrowUp → mid rotAnim (負=時計回り正解)
  await Runtime.evaluate({ expression: `window.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowUp'}))` });
  await new Promise(r => setTimeout(r, 60));
  const mid = await Runtime.evaluate({ expression: `JSON.stringify(window.__debug)`, returnByValue: true });
  // 自然落下 lock音: ArrowDown 連打
  for (let i = 0; i < 20; i++) {
    await Runtime.evaluate({ expression: `window.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowDown'}))` });
    await new Promise(r => setTimeout(r, 70));
    await Runtime.evaluate({ expression: `window.dispatchEvent(new KeyboardEvent('keyup',{key:'ArrowDown'}))` });
  }
  await new Promise(r => setTimeout(r, 1100));
  const sfx = await Runtime.evaluate({ expression: `JSON.stringify(window.__sfxLog.slice(-4))`, returnByValue: true });
  console.log('rot mid:', mid.result.value);
  console.log('sfx tail:', sfx.result.value);
} finally { await client.close(); }
