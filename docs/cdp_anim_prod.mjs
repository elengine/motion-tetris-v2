
import CDP from 'chrome-remote-interface';
const client = await CDP({ port: 9222 });
const { Runtime, Page } = client;
try {
  await Page.enable();
  await Page.navigate({ url: 'https://elengine.github.io/motion-tetris-v2/' });
  await Page.loadEventFired();
  await new Promise(r => setTimeout(r, 3000));
  await Runtime.evaluate({ expression: `document.getElementById('ov-action').click()` });
  await new Promise(r => setTimeout(r, 500));
  let maxMid = 0;
  for (let n = 1; n <= 6; n++) {
    await Runtime.evaluate({ expression: `window.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowUp'}))` });
    for (let i = 0; i < 4; i++) {
      await new Promise(r => setTimeout(r, 15));
      const d = await Runtime.evaluate({ expression: `Math.abs(window.__debug.rotAnim)`, returnByValue: true });
      maxMid = Math.max(maxMid, d.result.value);
    }
    await Runtime.evaluate({ expression: `window.dispatchEvent(new KeyboardEvent('keyup',{key:'ArrowUp'}))` });
    await new Promise(r => setTimeout(r, 300));
    const d2 = await Runtime.evaluate({ expression: `JSON.stringify({rot: window.__game.curRot, animAfter: window.__debug.rotAnim})`, returnByValue: true });
    console.log('x' + n, d2.result.value);
  }
  console.log('MAX mid offset (must be <= PI/2=1.5708):', maxMid.toFixed(4));
} finally { await client.close(); }
