
import CDP from 'chrome-remote-interface';
const client = await CDP({ port: 9222 });
const { Runtime, Page, Input, Emulation } = client;
const tap = async (r) => {
  await Input.dispatchTouchEvent({ type:'touchStart', touchPoints:[{x:r.x+r.w/2, y:r.y+r.h/2, id:1}] });
  await new Promise(r2 => setTimeout(r2, 80));
  await Input.dispatchTouchEvent({ type:'touchEnd', touchPoints:[] });
  await new Promise(r2 => setTimeout(r2, 400));
};
try {
  await Page.enable();
  await Emulation.setDeviceMetricsOverride({ width: 344, height: 882, deviceScaleFactor: 2.625, mobile: true });
  await Emulation.setTouchEmulationEnabled({ enabled: true, maxTouchPoints: 5 });
  await Page.navigate({ url: 'http://localhost:5174/?v=' + Date.now() });
  await Page.loadEventFired();
  await new Promise(r => setTimeout(r, 1800));
  await Runtime.evaluate({ expression: `document.getElementById('ov-action').click()` });
  await new Promise(r => setTimeout(r, 500));
  const rects = await Runtime.evaluate({ expression: `(function(){ var o={}; ['pause-btn','mute-btn'].forEach(function(id){ var r=document.getElementById(id).getBoundingClientRect(); o[id]={x:r.x,y:r.y,w:r.width,h:r.height}; }); return JSON.stringify(o); })()`, returnByValue: true });
  const R = JSON.parse(rects.result.value);
  await tap(R['pause-btn']);
  const s1 = await Runtime.evaluate({ expression: `String(window.__game.state)`, returnByValue: true });
  await tap(R['pause-btn']);
  const s2 = await Runtime.evaluate({ expression: `String(window.__game.state)`, returnByValue: true });
  await tap(R['mute-btn']);
  const mcls = await Runtime.evaluate({ expression: `document.getElementById('mute-btn').className`, returnByValue: true });
  console.log('pause->', s1.result.value, 'resume->', s2.result.value, 'mute class:', mcls.result.value);
} finally { await client.close(); }
