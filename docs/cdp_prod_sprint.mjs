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
  let res = '';
  for (let i = 0; i < 45; i++) {
    const d = await Runtime.evaluate({ expression: `(function(){ try {
      for (var y=8;y<22;y++) for (var x=0;x<10;x++) window.__game.set_cell(x,y,1);
      window.__game.hard_drop();
      return JSON.stringify({st: window.__game.state, ln: window.__game.lines, fin: window.__game.finished});
    } catch(e) { return 'ERR:'+e.message; } })()`, returnByValue: true });
    res = String(d.result.value);
    if (res.includes('ERR') || res.includes('"st":3')) break;
  }
  console.log('sprint loop last:', res);
  await new Promise(r => setTimeout(r, 500));
  const d2 = await Runtime.evaluate({ expression: `(function(){ return JSON.stringify({title: document.getElementById('ov-title').textContent, hid: document.getElementById('overlay').classList.contains('hidden'), sfxTail: window.__sfxLog.slice(-5)}); })()`, returnByValue: true });
  console.log('PROD sprint finish:', d2.result.value);
} finally { await client.close(); }
