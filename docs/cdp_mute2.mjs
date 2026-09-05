
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
  await Runtime.evaluate({ expression: `(function(){ window.__evLog=[]; var b=document.getElementById('mute-btn');
    ['pointerdown','pointerup','touchstart','click'].forEach(function(t){ b.addEventListener(t, function(e){ window.__evLog.push(t); }, {passive:false}); });
  })()`, returnByValue: true });
  const [rx, ry, rw, rh] = (await Runtime.evaluate({ expression: `(function(){ var r=document.getElementById('mute-btn').getBoundingClientRect(); return [r.x,r.y,r.width,r.height]; })()`, returnByValue: true })).result.value;
  await Input.dispatchTouchEvent({ type:'touchStart', touchPoints:[{x:rx+rw/2, y:ry+rh/2, id:1}] });
  await new Promise(r => setTimeout(r, 70));
  await Input.dispatchTouchEvent({ type:'touchEnd', touchPoints:[] });
  await new Promise(r => setTimeout(r, 250));
  const d = await Runtime.evaluate({ expression: `JSON.stringify(window.__evLog)`, returnByValue: true });
  console.log('events:', d.result.value);
} finally { await client.close(); }
