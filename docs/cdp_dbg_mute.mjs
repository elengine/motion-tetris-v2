import CDP from 'chrome-remote-interface';
const client = await CDP({ port: 9222 });
const { Runtime, Page } = client;
const ev = (expr) => Runtime.evaluate({ expression: `(function(){ ${expr} })()`, returnByValue: true });
try {
  await Page.enable();
  await Page.navigate({ url: 'http://localhost:5174/?fresh=' + Date.now() });
  await Page.loadEventFired();
  await new Promise(r => setTimeout(r, 2500));
  await ev(`document.querySelector('.mode-btn[data-mode="marathon"]').click();`);
  await new Promise(r => setTimeout(r, 600));
  // 中央タップ: canvas tap → rotate 音が鳴るか, muted 状態変化するか
  const before = await ev(`return JSON.stringify({ muted: localStorage.getItem('ntv2:muted'), btnClass: document.getElementById('mute-btn').className });`);
  console.log('before:', before.result.value);
  await ev(`
    const c = document.querySelector('#board, canvas');
    const r = c.getBoundingClientRect();
    const x = r.left + r.width/2, y = r.top + r.height/2;
    ['pointerdown','pointerup'].forEach(t => c.dispatchEvent(new PointerEvent(t, {bubbles:true, clientX:x, clientY:y, pointerId:1})));
  `);
  await new Promise(r => setTimeout(r, 400));
  const after = await ev(`return JSON.stringify({ muted: localStorage.getItem('ntv2:muted'), btnClass: document.getElementById('mute-btn').className, state: window.__game.state });`);
  console.log('after center tap:', after.result.value);
} catch (e) { console.log('ERRC', e.message); }
finally { await client.close(); }
