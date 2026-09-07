import CDP from 'chrome-remote-interface';
const client = await CDP({ port: 9222 });
const { Runtime, Page, Emulation, Input } = client;
const ev = (expr) => Runtime.evaluate({ expression: `(function(){ ${expr} })()`, returnByValue: true });
try {
  await Page.enable();
  await Emulation.setDeviceMetricsOverride({ width: 717, height: 512, deviceScaleFactor: 1, mobile: true });
  await Emulation.setTouchEmulationEnabled({ enabled: true, maxTouchPoints: 5 });
  await Page.navigate({ url: 'http://localhost:5174/?fresh=' + Date.now() });
  await Page.loadEventFired();
  await new Promise(r => setTimeout(r, 2500));
  await ev(`document.querySelector('.mode-btn[data-mode="marathon"]').click();`);
  await new Promise(r => setTimeout(r, 600));
  // 中央スワイプ x3
  for (let k=0; k<3; k++) {
    await Input.dispatchTouchEvent({ type: 'touchStart', touchPoints: [{ x: 300, y: 250 }] });
    for (let x=310;x<=400;x+=20) { await Input.dispatchTouchEvent({ type: 'touchMove', touchPoints: [{ x, y: 250 }] }); }
    await Input.dispatchTouchEvent({ type: 'touchEnd', touchPoints: [] });
  }
  await new Promise(r => setTimeout(r, 500));
  const after = await ev(`return JSON.stringify({ muted: localStorage.getItem('ntv2:muted') });`);
  console.log('after 3 center swipes:', after.result.value, '(muted=false 期待)');
  // 通常のmute btn操作はまだ機能するか (click 直押し)
  await ev(`const mb=document.getElementById('mute-btn'); mb.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true, clientX: mb.getBoundingClientRect().left+22, clientY: mb.getBoundingClientRect().top+22})); mb.click();`);
  await new Promise(r => setTimeout(r, 300));
  const st = await ev(`return JSON.stringify({ muted: localStorage.getItem('ntv2:muted') });`);
  console.log('mute btn direct:', st.result.value, '(muted=true 期待: 通常操作は有効)');
  await ev(`const mb=document.getElementById('mute-btn'); mb.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true, clientX: mb.getBoundingClientRect().left+22, clientY: mb.getBoundingClientRect().top+22})); mb.click();`);
  const st2 = await ev(`return JSON.stringify({ muted: localStorage.getItem('ntv2:muted') });`);
  console.log('mute btn back:', st2.result.value, '(muted=false 期待)');
} catch (e) { console.log('ERRC', e.message); }
finally { await client.close(); }
