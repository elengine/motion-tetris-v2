
import CDP from 'chrome-remote-interface';
const client = await CDP({ port: 9222 });
const { Runtime, Page, Input } = client;
try {
  await Page.enable();
  await Page.navigate({ url: 'http://localhost:5174/' });
  await Page.loadEventFired();
  await new Promise(r => setTimeout(r, 2200));
  await Runtime.evaluate({ expression: `(function(){ var b=document.getElementById('ov-action'); if(b)b.click(); })()`, returnByValue: true });
  await new Promise(r => setTimeout(r, 300));
  const r1 = await Runtime.evaluate({ expression: `(function(){ var b=document.getElementById('mute-btn'); var r=b.getBoundingClientRect(); return r.x+','+r.y+','+r.width+','+r.height; })()`, returnByValue: true });
  const [rx, ry, rw, rh] = r1.result.value.split(',').map(Number);
  await Input.dispatchTouchEvent({ type:'touchStart', touchPoints:[{x:rx+rw/2, y:ry+rh/2, id:1}] });
  await new Promise(r => setTimeout(r, 70));
  await Input.dispatchTouchEvent({ type:'touchEnd', touchPoints:[] });
  await new Promise(r => setTimeout(r, 200));
  const d = await Runtime.evaluate({ expression: `(function(){ return document.getElementById('mute-btn').textContent; })()`, returnByValue: true });
  console.log('mute text after touch:', d.result.value);
} finally { await client.close(); }
