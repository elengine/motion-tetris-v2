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
  for (const e2 of [
    `(function(){ try { window.__game.set_cell(3,23,1); return '1ok'; } catch(e){ return 'E:'+e.message; } })()`,
    `(function(){ try { window.__game.set_cell(4,23,1); return '2ok'; } catch(e){ return 'E:'+e.message; } })()`,
    `(function(){ try { window.__game.set_cell(5,23,1); return '3ok'; } catch(e){ return 'E:'+e.message; } })()`,
  ]) {
    const d = await Runtime.evaluate({ expression: e2, returnByValue: true });
    console.log(JSON.stringify(d.result).slice(0,120));
  }
} finally { await client.close(); }
