import CDP from 'chrome-remote-interface';
const client = await CDP({ port: 9222 });
const { Runtime, Page } = client;
try {
  await Page.enable();
  await Page.navigate({ url: 'http://localhost:5174/?fresh=' + Date.now() });
  await Page.loadEventFired();
  await new Promise(r => setTimeout(r, 2500));
  await Runtime.evaluate({ expression: `document.getElementById('howto-link').click()` });
  await new Promise(r => setTimeout(r, 500));
  const d = await Runtime.evaluate({ expression: `(function(){ const o=document.getElementById('overlay'); return JSON.stringify({ sh: o.scrollHeight, ch: o.clientHeight, cando: getComputedStyle(o).overflowY, just: getComputedStyle(o).justifyContent }); })()`, returnByValue: true });
  console.log(d.result.value);
} catch(e){ console.log('ERRC', e.message); }
finally { await client.close(); }
