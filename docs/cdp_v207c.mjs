import CDP from 'chrome-remote-interface';
const client = await CDP({ port: 9222 });
const { Runtime, Page, Emulation } = client;
try {
  await Page.enable();
  await Emulation.setDeviceMetricsOverride({ width: 344, height: 882, deviceScaleFactor: 1, mobile: true });
  await Page.addScriptToEvaluateOnNewDocument({ source: String.raw`(function(){ try { const row = document.getElementById('login-row'); if (!row) return; const seq = []; window.__mut = seq; const mo = new MutationObserver(() => { const vis = getComputedStyle(row).visibility; const hasLogin = !!row.querySelector('#login-btn-title'); const hasName = !!row.querySelector('.login-name'); if (hasLogin || hasName) { seq.push((hasLogin?'LOGINBTN':'NAME')+'|ready='+row.classList.contains('ready')+'|vis='+vis); } }); mo.observe(row, { childList: true, subtree: true, attributes: true, attributeFilter:['class'] }); } catch(e) { window.__mutErr = String(e); } })();` });
  await Page.navigate({ url: 'http://localhost:5176/?v=' + Date.now() });
  await Page.loadEventFired();
  await new Promise(r => setTimeout(r, 3000));
  const e = await Runtime.evaluate({ expression: `(function(){ return JSON.stringify({ mut: window.__mut ?? 'none', err: window.__mutErr ?? null, row: document.getElementById('login-row').innerHTML.slice(0,40), ready: document.getElementById('login-row').classList.contains('ready') }); })()`, returnByValue: true });
  console.log(e.result.value);
} catch (e2) { console.log('E', e2.message); }
finally { await client.close(); }
