
import CDP from 'chrome-remote-interface';
const client = await CDP({ port: 9222 });
const { Runtime, Page } = client;
try {
  await Page.enable();
  await Page.navigate({ url: 'http://localhost:5174/?v=' + Date.now() });
  await Page.loadEventFired();
  await new Promise(r => setTimeout(r, 1800));
  await Runtime.evaluate({ expression: `(function(){ document.getElementById('mode-select').value='ultra'; document.getElementById('ov-action').click(); })()` });
  await new Promise(r => setTimeout(r, 500));
  for (let i = 0; i < 10; i++) {
    await Runtime.evaluate({ expression: `window.__game.tick(13000)` });
  }
  await new Promise(r => setTimeout(r, 500));
  await Runtime.evaluate({ expression: `(function(){ window.__sfxLog.length=0; })()` });
  // 終了後に下スワイプ相当 (hard_drop + sound.play('hard') は touchmove guard入りで発火しないはず)
  await Runtime.evaluate({ expression: `window.__game.hard_drop()` });
  await new Promise(r => setTimeout(r, 400));
  const d = await Runtime.evaluate({ expression: `JSON.stringify({sfx: window.__sfxLog, title: document.getElementById('ov-title').textContent})`, returnByValue: true });
  console.log('after finish hard_drop:', d.result.value);
  // 「もう一度遊ぶ」で再開できること
  await Runtime.evaluate({ expression: `document.getElementById('ov-action').click()` });
  await new Promise(r => setTimeout(r, 500));
  const s = await Runtime.evaluate({ expression: `String(window.__game.state)`, returnByValue: true });
  console.log('restart state:', s.result.value, '(expect 1=Playing)');
} finally { await client.close(); }
