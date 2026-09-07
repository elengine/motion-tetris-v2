import CDP from 'chrome-remote-interface';
const client = await CDP({ port: 9222 });
const { Runtime, Page, Emulation, Input } = client;
const ev = (expr) => Runtime.evaluate({ expression: `(function(){ ${expr} })()`, returnByValue: true });
try {
  await Page.enable();
  await Emulation.setDeviceMetricsOverride({ width: 344, height: 882, deviceScaleFactor: 1, mobile: true });
  await Emulation.setTouchEmulationEnabled({ enabled: true, maxTouchPoints: 5 });
  await Page.navigate({ url: 'http://localhost:5174/?fresh=' + Date.now() });
  await Page.loadEventFired();
  await new Promise(r => setTimeout(r, 2500));
  const t0 = await ev(`const tb=document.getElementById('title-sound-btn').getBoundingClientRect(); return JSON.stringify({x: Math.round(tb.left+tb.width/2), y: Math.round(tb.top+tb.height/2)});`);
  console.log('title sound btn pos (title screen):', t0.result.value);
  const p0 = JSON.parse(t0.result.value);
  // プレイ開始
  await ev(`document.querySelector('.mode-btn[data-mode="marathon"]').click();`);
  await new Promise(r => setTimeout(r, 600));
  // その位置をタップ (見えないボタンがあった位置)
  await Input.dispatchTouchEvent({ type: 'touchStart', touchPoints: [{ x: p0.x, y: p0.y }] });
  await new Promise(r => setTimeout(r, 80));
  await Input.dispatchTouchEvent({ type: 'touchEnd', touchPoints: [] });
  await new Promise(r => setTimeout(r, 500));
  const after = await ev(`return JSON.stringify({ muted: localStorage.getItem('ntv2:muted') });`);
  console.log('tap at title-sound-btn pos during play:', after.result.value, '(muted=false 期待=修正済)');
} catch (e) { console.log('ERRC', e.message); }
finally { await client.close(); }
