
import CDP from 'chrome-remote-interface';
const client = await CDP({ port: 9222 });
const { Runtime, Page } = client;
try {
  await Page.enable();
  await Page.navigate({ url: 'http://localhost:5174/' });
  await Page.loadEventFired();
  await new Promise(r => setTimeout(r, 1600));
  await Runtime.evaluate({ expression: `document.getElementById('ov-action').click()` });
  // AudioContext を手動アンロック
  await Runtime.evaluate({ expression: `window.dispatchEvent(new KeyboardEvent('keydown',{key:'a'}))` });
  await new Promise(r => setTimeout(r, 200));
  // 接地しているまでソフトドロップは使わず hard_drop せず、自然落下で lock が ev action 'lock' になるか確認
  // 接地+500ms lock delay 待ち: gravity_interval はレベル1=~1000ms, spawn 位置 y=-1
  let sawLock = false;
  for (let i = 0; i < 140; i++) {  // ~2.5s
    await new Promise(r => setTimeout(r, 20));
  }
  // その間に main tick が lock を起す（ループ時は tick は RAF で回るので待てばよい）
  // popEvents は main 側が消化するので drainActions を直接叩く
  const acts = await Runtime.evaluate({ expression: `window.__game.drainActions()`, returnByValue: true });
  console.log('actions seen:', JSON.stringify(acts.result.value));
} finally { await client.close(); }
