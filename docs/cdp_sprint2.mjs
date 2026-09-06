
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
  // 一度だけ 同期
  const d = await Runtime.evaluate({ expression: `(function(){
    var res=[];
    for (var i=0;i<45;i++){
      for (var y=4;y<24;y++) for (var x=0;x<10;x++) { try { window.__game.set_cell(x, y, 1); res.push('sc') } catch(e){ return 'ERR:'+e.message; } }
      window.__game.hard_drop();
      res.push(window.__game.lines);
      if (window.__game.state !== 1) break;
    }
    return JSON.stringify({last: res.slice(-4), state: window.__game.state, finished: window.__game.finished, lines: window.__game.lines});
  })()`, returnByValue: true });
  console.log('sprint sync:', d.result.value);
} finally { await client.close(); }
