import CDP from 'chrome-remote-interface';
const client = await CDP({ port: 9222 });
const { Runtime, Page } = client;
try {
  await Page.enable();
  await Page.navigate({ url: 'http://localhost:5174/?v=' + Date.now() });
  await Page.loadEventFired();
  await new Promise(r => setTimeout(r, 2200));
  await Runtime.evaluate({ expression: `(function(){ document.getElementById('mode-select').value='marathon'; document.getElementById('ov-action').click(); })()` });
  await new Promise(r => setTimeout(r, 500));
  for (const e2 of [
    `(function(){ for (var y=2;y<22;y++) for (var x=0;x<10;x++) window.__game.set_cell(x,y,1); return 'set'; })()`,
    `(function(){ window.__game.hard_drop(); return 'drop st='+window.__game.state; })()`,
    `(function(){ return 'events='+JSON.stringify(window.__game.popEvents && window.__game.popEvents()); })()`,
  ]) {
    const d = await Runtime.evaluate({ expression: e2, returnByValue: true });
    console.log(JSON.stringify(d.result).slice(0,220));
  }
  await new Promise(r => setTimeout(r, 1200));
  const d2 = await Runtime.evaluate({ expression: `(function(){ return JSON.stringify({title: document.getElementById('ov-title').textContent, danger: !!document.querySelector('.finish-frame.danger')}); })()`, returnByValue: true });
  console.log('overlay:', d2.result.value);
} finally { await client.close(); }
