import CDP from 'chrome-remote-interface';
const client = await CDP({ port: 9222 });
const { Runtime, Page, Emulation } = client;
const ev = (expr) => Runtime.evaluate({ expression: `(function(){ ${expr} })()`, returnByValue: true });
try {
  await Page.enable();
  await Emulation.setDeviceMetricsOverride({ width: 344, height: 882, deviceScaleFactor: 1, mobile: true });
  await Emulation.setTouchEmulationEnabled({ enabled: true, maxTouchPoints: 5 });
  await Page.navigate({ url: 'http://localhost:5174/?fresh=' + Date.now() });
  await Page.loadEventFired();
  await new Promise(r => setTimeout(r, 2500));
  await ev(`document.querySelector('.mode-btn[data-mode="marathon"]').click();`);
  await new Promise(r => setTimeout(r, 600));
  const d = await ev(`return JSON.stringify({
    padTop: Math.round(document.getElementById('touchpad').getBoundingClientRect().top),
    padBottom: Math.round(document.getElementById('touchpad').getBoundingClientRect().bottom),
    boardTop: Math.round(document.querySelector('canvas').getBoundingClientRect().top),
    boardBottom: Math.round(document.querySelector('canvas').getBoundingClientRect().bottom),
    boardLeft: Math.round(document.querySelector('canvas').getBoundingClientRect().left),
    muteTop: Math.round(document.getElementById('mute-btn').getBoundingClientRect().top),
    muteBottom: Math.round(document.getElementById('mute-btn').getBoundingClientRect().bottom)});`);
  console.log('layout:', d.result.value);
} catch (e) { console.log('ERRC', e.message); }
finally { await client.close(); }
