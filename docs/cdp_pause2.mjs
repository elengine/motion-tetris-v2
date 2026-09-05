
import CDP from 'chrome-remote-interface';
const client = await CDP({ port: 9222 });
const { Runtime, Page, Input } = client;
try {
  await Page.enable();
  await Page.navigate({ url: 'http://localhost:5174/' });
  await Page.loadEventFired();
  await new Promise(r => setTimeout(r, 2200));
  await Runtime.evaluate({ expression: `(function(){ var b = document.getElementById('ov-action'); if (b) b.click(); return !!b; })()`, returnByValue: true });
  await new Promise(r => setTimeout(r, 400));
  const r1 = await Runtime.evaluate({ expression: `(function(){ var b=document.getElementById('pause-btn'); var r=b.getBoundingClientRect(); return r.x+','+r.y+','+r.width+','+r.height; })()`, returnByValue: true });
  console.log('rect:', r1.result.value);
  const [rx, ry, rw, rh] = r1.result.value.split(',').map(Number);
  const top = await Runtime.evaluate({ expression: `(function(){ var e=document.elementFromPoint(${rx+rw/2}, ${ry+rh/2}); return e ? (e.id || e.tagName + '.' + e.className) : 'none'; })()`, returnByValue: true });
  console.log('hit element:', top.result.value);
  await Input.dispatchTouchEvent({ type:'touchStart', touchPoints:[{x:rx+rw/2, y:ry+rh/2, id:1}] });
  await new Promise(r => setTimeout(r, 80));
  await Input.dispatchTouchEvent({ type:'touchEnd', touchPoints:[] });
  await new Promise(r => setTimeout(r, 300));
  const st = await Runtime.evaluate({ expression: `(function(){ return String(window.__game.state); })()`, returnByValue: true });
  console.log('state after touch:', st.result.value);
} finally { await client.close(); }
