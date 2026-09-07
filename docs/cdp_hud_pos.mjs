import CDP from 'chrome-remote-interface';
const client = await CDP({ port: 9222 });
const { Runtime, Page, Emulation } = client;
const ev = (expr) => Runtime.evaluate({ expression: `(function(){ ${expr} })()`, returnByValue: true });
try {
  await Page.enable();
  await Emulation.setDeviceMetricsOverride({ width: 717, height: 512, deviceScaleFactor: 1, mobile: true });
  await Page.navigate({ url: 'http://localhost:5174/?fresh=' + Date.now() });
  await Page.loadEventFired();
  await new Promise(r => setTimeout(r, 2500));
  await ev(`document.querySelector('.mode-btn[data-mode="marathon"]').click();`);
  await new Promise(r => setTimeout(r, 600));
  const d = await ev(`const mb=document.getElementById('mute-btn').getBoundingClientRect(); const pb=document.getElementById('pause-btn').getBoundingClientRect(); return JSON.stringify({ muteX: Math.round(mb.left+mb.width/2), muteY: Math.round(mb.top+mb.height/2), pauseY: Math.round(pb.top+pb.height/2), boardTop: Math.round(document.querySelector('canvas').getBoundingClientRect().top) });`);
  console.log('717x512:', d.result.value);
  await Emulation.setDeviceMetricsOverride({ width: 344, height: 882, deviceScaleFactor: 1, mobile: true });
  await new Promise(r => setTimeout(r, 800));
  const d2 = await ev(`const mb=document.getElementById('mute-btn').getBoundingClientRect(); return JSON.stringify({ muteX: Math.round(mb.left+mb.width/2), muteY: Math.round(mb.top+mb.height/2) });`);
  console.log('344x882:', d2.result.value);
} catch (e) { console.log('ERRC', e.message); }
finally { await client.close(); }
