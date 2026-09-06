
import CDP from 'chrome-remote-interface';
const client = await CDP({ port: 9222 });
const { Runtime, Page } = client;
const tc = (y, x) => `(function(){ window.__game.set_cell(${x}, ${y}, 6) })()`;  // J=6?
try {
  await Page.enable();
  await Page.navigate({ url: 'http://localhost:5174/?v=' + Date.now() });
  await Page.loadEventFired();
  await new Promise(r => setTimeout(r, 1800));
  await Runtime.evaluate({ expression: `(function(){ document.getElementById('mode-select').value='sprint'; document.getElementById('ov-action').click(); })()` });
  await new Promise(r => setTimeout(r, 500));
  // set_cell で行埋め+hard_dropで消化して 40 ラインまで
  const d = await Runtime.evaluate({ expression: `(async function(){
    for (let i=0;i<45;i++){
      for (let y=4;y<24;y++) for (let x=0;x<10;x++) { window.__game.set_cell(x, y, 1); }  // I=0? i数字
      window.__game.hard_drop();
    }
    return JSON.stringify({state: window.__game.state, finished: window.__game.finished, lines: window.__game.lines});
  })()`, returnByValue: true, awaitPromise: true });
  console.log('sprint loop:', d.result.value);
  await new Promise(r => setTimeout(r, 400));
  const d2 = await Runtime.evaluate({ expression: `(function(){ return JSON.stringify({title: document.getElementById('ov-title').textContent, sfx: window.__sfxLog.slice(-6)}); })()`, returnByValue: true });
  console.log('sprint overlay:', d2.result.value);
} finally { await client.close(); }
