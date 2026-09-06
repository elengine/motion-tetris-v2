
import CDP from 'chrome-remote-interface';
const client = await CDP({ port: 9222 });
const { Runtime, Page, Emulation } = client;
try {
  await Page.enable();
  await Page.navigate({ url: 'http://localhost:5174/?v=' + Date.now() });
  await Page.loadEventFired();
  await new Promise(r => setTimeout(r, 1800));
  // ウルトラ選択して開始
  await Runtime.evaluate({ expression: `(function(){ var ms=document.getElementById('mode-select'); ms.value='ultra'; document.getElementById('ov-action').click(); })()` });
  await new Promise(r => setTimeout(r, 600));
  await Runtime.evaluate({ expression: `(function(){ window.__sfxLog.length=0; })()` });
  // 残り時間を一気に進める (elapsed>=120000 → tick で finish)
  for (let i = 0; i < 10; i++) {
    await Runtime.evaluate({ expression: `window.__game.tick(13000)` });
  }
  await new Promise(r => setTimeout(r, 800));
  const d = await Runtime.evaluate({ expression: `(function(){
    return JSON.stringify({
      state: window.__game.state,      // 2=GameOver想定
      finished: window.__game.finished,
      ovTitle: document.getElementById('ov-title').textContent,
      ovAction: document.getElementById('ov-action').textContent,
      overlayHidden: document.getElementById('overlay').classList.contains('hidden'),
      sfx: window.__sfxLog.slice(-6)
    });
  })()`, returnByValue: true });
  console.log('ULTRA finish:', d.result.value);
} finally { await client.close(); }
