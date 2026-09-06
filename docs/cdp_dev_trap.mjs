import CDP from 'chrome-remote-interface';
const client = await CDP({ port: 9222 });
const { Runtime, Page } = client;
try {
  await Page.enable();
  await Page.navigate({ url: 'http://localhost:5174/?v=' + Date.now() });
  await Page.loadEventFired();
  await new Promise(r => setTimeout(r, 2500));
  await Runtime.evaluate({ expression: `(function(){ document.getElementById('mode-select').value='sprint'; document.getElementById('ov-action').click(); })()` });
  await new Promise(r => setTimeout(r, 500));
  const d = await Runtime.evaluate({ expression: `(function(){
    for (var x=0;x<10;x++) window.__game.set_cell(x,21,1);
    try { window.__game.hard_drop(); return 'ok'; }
    catch(e) { return 'ST:'+ (e.stack||'').slice(0,500); }
  })()`, returnByValue: true });
  console.log(String(d.result.value).slice(0,600));
} finally { await client.close(); }
