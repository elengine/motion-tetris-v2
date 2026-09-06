
import CDP from 'chrome-remote-interface';
const client = await CDP({ port: 9222 });
const { Runtime, Page, Emulation } = client;
const check = async (label, w, h) => {
  await Emulation.setDeviceMetricsOverride({ width: w, height: h, deviceScaleFactor: 2.625, mobile: true });
  await Emulation.setEmitTouchEventsForMouse({ enabled: true, configuration: 'mobile' });
  await Page.navigate({ url: 'http://localhost:5174/?v=' + Date.now() });
  await Page.loadEventFired();
  await new Promise(r => setTimeout(r, 1800));
  const d = await Runtime.evaluate({ expression: `(function(){
    var pad=document.getElementById('touchpad'); var pr=pad.getBoundingClientRect();
    var disp = getComputedStyle(pad).display;
    return { display: disp, padTop: Math.round(pr.top), padH: Math.round(pr.height) };
  })()`, returnByValue: true });
  console.log(label, JSON.stringify(d.result.value));
  await Emulation.clearDeviceMetricsOverride();
};
try {
  await Page.enable();
  await check('portrait:', 344, 882);
} finally { await client.close(); }
