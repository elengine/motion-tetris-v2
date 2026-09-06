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
  const logs = [];
  const d = await Runtime.evaluate({ expression: `(function(){ try {
    for (var x=0;x<10;x++) window.__game.set_cell(x,23,1);
    window.__game.hard_drop();
    return 'ok st'+window.__game.state+' ln'+window.__game.lines;
  } catch(e) { return 'ERR:'+e.message.slice(0,100); } })()`, returnByValue: true });
  console.log('dev single row:', d.result.value);
  await Page.reload();
  await Page.loadEventFired();
  await new Promise(r => setTimeout(r, 2500));
} finally { await client.close(); }
