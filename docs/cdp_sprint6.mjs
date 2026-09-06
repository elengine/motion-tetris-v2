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
  // 分割呼び出し: 各行 set_cell を after tick を挟まず実行し、hard_dropは個別
  for (let i = 0; i < 50; i++) {
    const set = await Runtime.evaluate({ expression: `(function(){ for (var y=10;y<24;y++) for (var x=0;x<10;x++) window.__game.set_cell(x,y,1); return 'set'+i; })()`, returnByValue: true });
    if (set.result && set.result.value && String(set.result.value).startsWith && set.result.value.includes && set.result.value.startsWith('ERR')) { console.log('set err', set.result.value); break; }
    const drop = await Runtime.evaluate({ expression: `(function(){ try { window.__game.hard_drop(); return 'st'+window.__game.state+' ln'+window.__game.lines; } catch(e){ return 'ERR:'+e.message } })()`, returnByValue: true });
    const v = String(drop.result.value);
    console.log(i, v);
    if (v.includes('4') || v.includes('ERR')) break;
  }
  await new Promise(r => setTimeout(r, 500));
  const d2 = await Runtime.evaluate({ expression: `(function(){ return JSON.stringify({title: document.getElementById('ov-title').textContent, hid: document.getElementById('overlay').classList.contains('hidden'), sfx: window.__sfxLog.slice(-8), act: document.getElementById('ov-action').textContent, st: window.__game.state, fin: window.__game.finished}); })()`, returnByValue: true });
  console.log('sprint overlay:', d2.result.value);
} finally { await client.close(); }
