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
  const before = await ev(`return JSON.stringify({ muted: localStorage.getItem('ntv2:muted'), cls: document.getElementById('mute-btn').className });`);
  console.log('before:', before.result.value);
  // タップ: Input dispatch で 実機に近いタップ
  const dims = await ev(`const c=document.querySelector('canvas'); const r=c.getBoundingClientRect(); return JSON.stringify({x: r.left+r.width/2, y: r.top+r.height/2});`);
  const p0 = JSON.parse(dims.result.value);
  console.log('canvas center:', p0);
  // pointer events
  const ev2 = await ev(`return (function(){
    const c = document.querySelector('canvas');
    const r = c.getBoundingClientRect();
    const x = r.left+r.width/2, y = r.top+r.height/2;
    c.dispatchEvent(new PointerEvent('pointerdown', {bubbles:true, clientX:x, clientY:y, pointerId:1, isPrimary:true}));
    c.dispatchEvent(new PointerEvent('pointerup', {bubbles:true, clientX:x, clientY:y, pointerId:1, isPrimary:true}));
    return JSON.stringify({x, y});
  })()`);
  console.log('dispatched', ev2.result.value);
  await new Promise(r => setTimeout(r, 500));
  const after = await ev(`return JSON.stringify({ muted: localStorage.getItem('ntv2:muted'), cls: document.getElementById('mute-btn').className });`);
  console.log('after:', after.result.value);
} catch (e) { console.log('ERRC', e.message, e.stack.split('\n')[1]); }
finally { await client.close(); }
