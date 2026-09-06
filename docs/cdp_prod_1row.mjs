import CDP from 'chrome-remote-interface';
const client = await CDP({ port: 9222 });
const { Runtime, Page } = client;
try {
  await Page.enable();
  await Page.navigate({ url: 'https://elengine.github.io/motion-tetris-v2/?v=' + Date.now() });
  await Page.loadEventFired();
  await new Promise(r => setTimeout(r, 3200));
  await Runtime.evaluate({ expression: `(function(){ document.getElementById('mode-select').value='sprint'; document.getElementById('ov-action').click(); })()` });
  await new Promise(r => setTimeout(r, 500));
  // t20と同じ: 1行のみ
  const d = await Runtime.evaluate({ expression: `(function(){ try {
    for (var x=0;x<10;x++) window.__game.set_cell(x,23,1);
    window.__game.hard_drop();
    return 'ok st'+window.__game.state+' ln'+window.__game.lines;
  } catch(e) { return 'ERR:'+e.message.slice(0,80); } })()`, returnByValue: true });
  console.log('single row:', d.result.value);
} finally { await client.close(); }
