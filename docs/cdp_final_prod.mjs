
import CDP from 'chrome-remote-interface';
const client = await CDP({ port: 9222 });
const { Runtime, Page } = client;
try {
  await Page.enable();
  await Page.navigate({ url: 'https://elengine.github.io/motion-tetris-v2/?v=' + Date.now() });
  await Page.loadEventFired();
  await new Promise(r => setTimeout(r, 3000));
  await Runtime.evaluate({ expression: `document.getElementById('ov-action').click()` });
  await new Promise(r => setTimeout(r, 150));
  await Runtime.evaluate({ expression: `window.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowUp'}))` });
  let maxOff = null;
  for (let i = 0; i < 6; i++) {
    await new Promise(r => setTimeout(r, 12));
    const v = await Runtime.evaluate({ expression: `window.__debug.rotAnim`, returnByValue: true });
    if (maxOff === null || Math.abs(v.result.value) > Math.abs(maxOff)) maxOff = v.result.value;
  }
  // ArrowDown 連打で自然lock音
  for (let i = 0; i < 20; i++) {
    await Runtime.evaluate({ expression: `window.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowDown'}))` });
    await new Promise(r => setTimeout(r, 70));
    await Runtime.evaluate({ expression: `window.dispatchEvent(new KeyboardEvent('keyup',{key:'ArrowDown'}))` });
  }
  await new Promise(r => setTimeout(r, 1000));
  const sfx = await Runtime.evaluate({ expression: `JSON.stringify(window.__sfxLog.slice(-5))`, returnByValue: true });
  console.log('max mid offset (clockwise = negative):', maxOff?.toFixed(4));
  console.log('sfx tail:', sfx.result.value);
} finally { await client.close(); }
