import CDP from 'chrome-remote-interface';
const client = await CDP({ port: 9222 });
const { Runtime, Page, Emulation } = client;
try {
  await Page.enable();
  await Emulation.setDeviceMetricsOverride({ width: 344, height: 882, deviceScaleFactor: 1, mobile: true });
  await Page.navigate({ url: 'http://localhost:5174/?fresh=' + Date.now() });
  await Page.loadEventFired();
  await new Promise(r => setTimeout(r, 2800));
  const d = await Runtime.evaluate({ expression: `(function(){ const b=document.getElementById('login-btn-title'); return b ? 'loginBtn yes' : ('no: ' + document.getElementById('ov-version').textContent); })()`, returnByValue: true });
  console.log(JSON.stringify(d.result));
} catch (e) { console.log('ERRC', e.message); }
finally { await client.close(); }
