import CDP from 'chrome-remote-interface';
const client = await CDP({ port: 9222 });
const { Runtime, Page } = client;
async function evals(exprs) {
  const { Runtime, Page } = client;
  for (const e of exprs) {
    const d = await Runtime.evaluate({ expression: e, returnByValue: true });
    console.log(e.slice(0,60), '=>', String(JSON.stringify(d.result && d.result.value)).slice(0,100));
  }
}
try {
  await Page.enable();
  await Page.navigate({ url: 'http://localhost:5174/?v=' + Date.now() });
  await Page.loadEventFired();
  await new Promise(r => setTimeout(r, 1800));
  await evals([`(function(){ document.getElementById('mode-select').value='sprint'; document.getElementById('ov-action').click(); return 'go' })()`]);
  await new Promise(r => setTimeout(r, 500));
  await evals([`(function(){ window.__game.set_cell(3,23,1); return 'a'; })()`]);
  await evals([`(function(){ window.__game.set_cell(5,22,1); return 'b'; })()`]);
  await evals([`(function(){ for (var x=0;x<10;x++) window.__game.set_cell(x,23,0); return 'row23'; })()`]);
  await evals([`(function(){ window.__game.hard_drop(); return 'st'+window.__game.state+' ln'+window.__game.lines; })()`]);
} finally { await client.close(); }
