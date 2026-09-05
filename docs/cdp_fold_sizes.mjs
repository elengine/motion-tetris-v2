
import CDP from 'chrome-remote-interface';
const client = await CDP({ port: 9222 });
const { Runtime, Page, Emulation } = client;
try {
  await Page.enable();
  await Page.navigate({ url: 'http://localhost:5174/' });
  await Page.loadEventFired();
  await new Promise(r => setTimeout(r, 1500));
  // Fold8 展開相当: 1812x2176 (portraitの大きさ?) → landscape 4:3 = 2176x1812 の CSS pxを ~1/2.625 dpr で
  await Emulation.setDeviceMetricsOverride({ width: 828, height: 690, deviceScaleFactor: 2.625, mobile: true });
  await new Promise(r => setTimeout(r, 600));
  const d = await Runtime.evaluate({ expression: `(function(){ var tc=document.querySelector('#touchpad .tc'); var r=tc.getBoundingClientRect(); var pb=document.getElementById('pause-btn').getBoundingClientRect(); return JSON.stringify({tc:{w:r.width,h:r.height}, pause:{w:pb.width,h:pb.height}}); })()`, returnByValue: true });
  console.log('landscape sizes:', d.result.value);
  await Emulation.clearDeviceMetricsOverride();
} finally { await client.close(); }
