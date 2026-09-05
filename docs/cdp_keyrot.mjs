
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
  // rotAnim を exposed していない → __game だけ。まず1回 ArrowUp → 待って rot。
  for (let n = 1; n <= 4; n++) {
    await Runtime.evaluate({ expression: `window.dispatchEvent(new KeyboardEvent('keydown', {key:'ArrowUp'}))` });
    await new Promise(r => setTimeout(r, 80));
    await Runtime.evaluate({ expression: `window.dispatchEvent(new KeyboardEvent('keyup', {key:'ArrowUp'}))` });
    await new Promise(r => setTimeout(r, 500));
    const st = await Runtime.evaluate({ expression: `JSON.stringify({rot: window.__game.curRot})`, returnByValue: true });
    console.log('after ArrowUp x', n, st.result.value);
  }
} finally { await client.close(); }
