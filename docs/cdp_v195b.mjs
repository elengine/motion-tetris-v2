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
  // スタート画面のサウンドボタンは有効
  let d = await ev(`return JSON.stringify({ visible: getComputedStyle(document.getElementById('title-toggles')).display });`);
  console.log('title toggles visible:', d.result.value);
  // 押してトグル→戻す
  await ev(`document.getElementById('title-sound-btn').dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}));`);
  await new Promise(r => setTimeout(r, 200));
  d = await ev(`return localStorage.getItem('ntv2:muted');`);
  console.log('title toggle press ->', d.result.value, '(1 期待)');
  await ev(`document.getElementById('title-sound-btn').dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}));`);
  await new Promise(r => setTimeout(r, 200));
  // プレイ開始 → toggles non表示
  await ev(`document.querySelector('.mode-btn[data-mode="marathon"]').click();`);
  await new Promise(r => setTimeout(r, 600));
  d = await ev(`return JSON.stringify({ display: getComputedStyle(document.getElementById('title-toggles')).display });`);
  console.log('during play toggles display:', d.result.value, '(none 期待)');
  // tap rotate が機能するか
  await Input.dispatchTouchEvent({ type: 'touchStart', touchPoints: [{ x: 172, y: 440 }] });
  await new Promise(r => setTimeout(r, 60));
  await Input.dispatchTouchEvent({ type: 'touchEnd', touchPoints: [] });
  await new Promise(r => setTimeout(r, 300));
  d = await ev(`return window.__game.state();`);
  console.log('after tap state:', d.result.value, '(1=playing 期待)');
} catch (e) { console.log('ERRC', e.message); }
finally { await client.close(); }
