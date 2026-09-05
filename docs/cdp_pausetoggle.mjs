
import CDP from 'chrome-remote-interface';
const client = await CDP({ port: 9222 });
const { Runtime, Page, Input } = client;
const tap = async (r) => {
  await Input.dispatchTouchEvent({ type:'touchStart', touchPoints:[{x:r.x+r.w/2, y:r.y+r.h/2, id:1}] });
  await new Promise(r2 => setTimeout(r2, 70));
  await Input.dispatchTouchEvent({ type:'touchEnd', touchPoints:[] });
  await new Promise(r2 => setTimeout(r2, 350));
};
try {
  await Page.enable();
  await Page.navigate({ url: 'http://localhost:5174/' });
  await Page.loadEventFired();
  await new Promise(r => setTimeout(r, 2200));
  await Runtime.evaluate({ expression: `(function(){ var b=document.getElementById('ov-action'); if(b)b.click(); })()`, returnByValue: true });
  await new Promise(r => setTimeout(r, 300));
  const rects = await Runtime.evaluate({ expression: `(function(){ var out={}; ['pause-btn','mute-btn'].forEach(function(id){ var r=document.getElementById(id).getBoundingClientRect(); out[id]={x:r.x,y:r.y,w:r.width,h:r.height}; }); return JSON.stringify(out); })()`, returnByValue: true });
  const R = JSON.parse(rects.result.value);
  // pause → resume
  await tap(R['pause-btn']); // paused
  await tap(R['pause-btn']); // resume
  const st = await Runtime.evaluate({ expression: `String(window.__game.state)`, returnByValue: true });
  console.log('state after pause->resume:', st.result.value, '(expect 1)');
} finally { await client.close(); }
