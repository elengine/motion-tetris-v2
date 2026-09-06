
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
  for (const expr of [`window.__game.set_cell(0,0,1)`, `window.__game.set_cell(0,0,0)`, `String(window.__game.get_cell(0,0))`, `window.__game.get_grid().slice(0,20)`]) {
    const d = await Runtime.evaluate({ expression: expr, returnByValue: true });
    console.log(expr, '=>', JSON.stringify(d.result.value));
  }
} finally { await client.close(); }
