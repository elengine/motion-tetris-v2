import CDP from 'chrome-remote-interface';
const client = await CDP({ port: 9222 });
const { Runtime, Page } = client;
try {
  await Page.enable();
  await Page.navigate({ url: 'http://localhost:5174/?v=' + Date.now() });
  await Page.loadEventFired();
  await new Promise(r => setTimeout(r, 1800));
  await Runtime.evaluate({ expression: `(function(){ document.getElementById('mode-select').value='sprint'; document.getElementById('ov-action').click(); })()` });
  await new Promise(r => setTimeout(r, 500));
  const exprs = [
    `window.__game.set_cell(0,23,1)`,
    `window.__game.set_cell(0,22,1)`,
    `(function(){ return typeof window.__game.get_grid })()`,
    `(function(){ try { return window.__game.get_grid().length } catch(e){ return 'ERR:'+e.message } })()`,
  ];
  for (const e2 of exprs) {
    const d = await Runtime.evaluate({ expression: e2, returnByValue: true });
    const val = d.result ? JSON.stringify(d.result.value) : 'noresult';
    console.log(e2.slice(0,45), '=>', String(val).slice(0,80));
  }
} finally { await client.close(); }
