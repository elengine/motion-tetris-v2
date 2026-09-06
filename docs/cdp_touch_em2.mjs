
import CDP from 'chrome-remote-interface';
const client = await CDP({ port: 9222 });
const { Runtime, Page, Emulation, Input } = client;
try {
  await Page.enable();
  await Emulation.setDeviceMetricsOverride({ width: 344, height: 882, deviceScaleFactor: 2.625, mobile: true });
  await Emulation.setTouchEmulationEnabled({ enabled: true, maxTouchPoints: 5 });
  await Emulation.setEmitTouchEventsForMouse({ enabled: true, configuration: 'mobile' });
  await Page.navigate({ url: 'http://localhost:5174/?v=' + Date.now() });
  await Page.loadEventFired();
  await new Promise(r => setTimeout(r, 1800));
  const d = await Runtime.evaluate({ expression: `(function(){
    var pad=document.getElementById('touchpad'); var pr=pad.getBoundingClientRect();
    var mq = window.matchMedia('(pointer: coarse)').matches;
    var c=document.getElementById('game-canvas');
    return { mqCoarse: mq, padDisplay: getComputedStyle(pad).display, padTop: Math.round(pr.top), padH: Math.round(pr.height), canvasH: c.clientHeight };
  })()`, returnByValue: true });
  console.log('portrait(touch-em):', JSON.stringify(d.result.value));
} finally { await client.close(); }
