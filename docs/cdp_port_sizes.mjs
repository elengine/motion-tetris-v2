
import CDP from 'chrome-remote-interface';
const client = await CDP({ port: 9222 });
const { Runtime, Page, Emulation } = client;
try {
  await Page.enable();
  await Page.navigate({ url: 'http://localhost:5174/' });
  await Page.loadEventFired();
  await new Promise(r => setTimeout(r, 1500));
  await Emulation.setDeviceMetricsOverride({ width: 344, height: 882, deviceScaleFactor: 2.625, mobile: true });
  await new Promise(r => setTimeout(r, 700));
  const d = await Runtime.evaluate({ expression: `(function(){ var tc=document.querySelector('#touchpad .tc'); var r=tc.getBoundingClientRect(); var pb=document.getElementById('pause-btn').getBoundingClientRect(); return JSON.stringify({tc:{w:Math.round(r.width),h:Math.round(r.height)}, pause:{w:pb.width,h:pb.height}}); })()`, returnByValue: true });
  console.log('portrait sizes:', d.result.value);
  await Emulation.clearDeviceMetricsOverride();
} finally { await client.close(); }
