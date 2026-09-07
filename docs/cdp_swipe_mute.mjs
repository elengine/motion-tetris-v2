import CDP from 'chrome-remote-interface';
const client = await CDP({ port: 9222 });
const { Runtime, Page, Emulation, Input } = client;
const ev = (expr) => Runtime.evaluate({ expression: `(function(){ ${expr} })()`, returnByValue: true });
try {
  await Page.enable();
  // touch 有効化
  await Emulation.setEmitTouchOnMouse({ enabled: true });
  await Emulation.setDeviceMetricsOverride({ width: 717, height: 512, deviceScaleFactor: 1, mobile: true });
  await Emulation.setTouchEmulationEnabled({ enabled: true, maxTouchPoints: 5 });
  await Page.navigate({ url: 'http://localhost:5174/?fresh=' + Date.now() });
  await Page.loadEventFired();
  await new Promise(r => setTimeout(r, 2500));
  await ev(`document.querySelector('.mode-btn[data-mode="marathon"]').click();`);
  await new Promise(r => setTimeout(r, 600));
  // 中央スワイプ touchStart(358,256)→touchMove(398,256)→touchEnd
  await Input.dispatchTouchEvent({ type: 'touchStart', touchPoints: [{ x: 320, y: 256 }] });
  await Input.dispatchTouchEvent({ type: 'touchMove', touchPoints: [{ x: 400, y: 256 }] });
  await new Promise(r => setTimeout(r, 100));
  await Input.dispatchTouchEvent({ type: 'touchEnd', touchPoints: [] });
  await new Promise(r => setTimeout(r, 500));
  const after = await ev(`return JSON.stringify({ muted: localStorage.getItem('ntv2:muted') });`);
  console.log('after center swipe:', after.result.value);
} catch (e) { console.log('ERRC', e.message); }
finally { await client.close(); }
