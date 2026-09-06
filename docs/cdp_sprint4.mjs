
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
  for (const expr of [
    `(function(){ try { for (var y=10;y<24;y++) for (var x=0;x<10;x++) window.__game.set_cell(x,y,1); return 'cells ok, grid='+window.__game.get_grid().slice(200,260); } catch(e) { return 'ERR:'+e.message } })()`,
    `(function(){ try { window.__game.hard_drop(); return 'drop ok state='+window.__game.state+' lines='+window.__game.lines; } catch(e) { return 'ERR:'+e.message } })()`,
  ]) {
    const d = await Runtime.evaluate({ expression: expr, returnByValue: true });
    console.log(JSON.stringify(d.result.value).slice(0,200));
  }
} finally { await client.close(); }
