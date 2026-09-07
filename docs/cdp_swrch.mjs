import CDP from 'chrome-remote-interface';
const client = await CDP({ port: 9222 });
const { Runtime, Page, Emulation, Input } = client;
const ev = (expr) => Runtime.evaluate({ expression: `(function(){ ${expr} })()`, returnByValue: true });
try {
  await Page.enable();
  await Emulation.setDeviceMetricsOverride({ width: 344, height: 882, deviceScaleFactor: 1, mobile: true });
  await Emulation.setTouchEmulationEnabled({ enabled: true, maxTouchPoints: 5 });
  const logs = [];
  Runtime.consoleAPICalled((e) => logs.push(e.args.map(a=>String(a.value ?? a.description)).join(' ')));
  await Page.navigate({ url: 'http://localhost:5174/?fresh=' + Date.now() });
  await Page.loadEventFired();
  await new Promise(r => setTimeout(r, 2500));
  await ev(`document.querySelector('.mode-btn[data-mode="marathon"]').click();`);
  await new Promise(r => setTimeout(r, 600));
  const before = await ev(`const mb=document.getElementById('mute-btn').getBoundingClientRect(); return JSON.stringify({muteY: Math.round(mb.top+mb.height/2), muteX: Math.round(mb.left+mb.width/2), scrollY: window.scrollY, vh: window.innerHeight});`);
  console.log('before:', before.result.value);
  await Input.dispatchTouchEvent({ type: 'touchStart', touchPoints: [{ x: 172, y: 440 }] });
  for (let y=450;y<=480;y+=10) await Input.dispatchTouchEvent({ type: 'touchMove', touchPoints: [{ x: 172, y }] });
  await new Promise(r => setTimeout(r, 120));
  await Input.dispatchTouchEvent({ type: 'touchEnd', touchPoints: [] });
  await new Promise(r => setTimeout(r, 600));
  const after = await ev(`const mb=document.getElementById('mute-btn').getBoundingClientRect(); return JSON.stringify({muteY: Math.round(mb.top+mb.height/2), scrollY: window.scrollY, vh: window.innerHeight, muted: localStorage.getItem('ntv2:muted')});`);
  console.log('after:', after.result.value);
  console.log('logs:', logs.slice(-8));
} catch (e) { console.log('ERRC', e.message); }
finally { await client.close(); }
