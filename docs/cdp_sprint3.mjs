
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
  const d = await Runtime.evaluate({ expression: `(function(){
    try {
      for (var i=0;i<50;i++){
        for (var y=10;y<24;y++) for (var x=0;x<10;x++) { window.__game.set_cell(x, y, 1); }
        window.__game.hard_drop();
        if (window.__game.state !== 1) break;
      }
      return JSON.stringify({state: window.__game.state, finished: window.__game.finished, lines: window.__game.lines});
    } catch(e) { return 'ERR:'+e.message; }
  })()`, returnByValue: true });
  console.log('sprint loop:', d.result.value);
  await new Promise(r => setTimeout(r, 400));
  const d2 = await Runtime.evaluate({ expression: `(function(){ return JSON.stringify({title: document.getElementById('ov-title').textContent, hid: document.getElementById('overlay').classList.contains('hidden'), sfx: window.__sfxLog.slice(-8), act: document.getElementById('ov-action').textContent}); })()`, returnByValue: true });
  console.log('sprint overlay:', d2.result.value);
} finally { await client.close(); }
