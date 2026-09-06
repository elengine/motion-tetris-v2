import CDP from 'chrome-remote-interface';
import fs from 'node:fs';
const client = await CDP({ port: 9222 });
const { Runtime, Page, Log } = client;
try {
  await Page.enable(); await Log.enable();
  globalThis.logs = [];
  Log.entryAdded(({entry}) => fs.appendFileSync('/tmp/panics.log', (entry.text||'').slice(0,300)+'\n'));
  fs.writeFileSync('/tmp/panics.log','');
  await Page.navigate({ url: 'http://localhost:5174/?v=' + Date.now() });
  await Page.loadEventFired();
  await new Promise(r => setTimeout(r, 2500));
  await Runtime.evaluate({ expression: `(function(){ document.getElementById('mode-select').value='sprint'; document.getElementById('ov-action').click(); })()` });
  await new Promise(r => setTimeout(r, 500));
  await Runtime.evaluate({ expression: `(function(){ for (var x=0;x<10;x++) window.__game.set_cell(x,23,1); })()` });
  await Runtime.evaluate({ expression: `(function(){ try { window.__game.hard_drop(); } catch(e){} })()` });
  await new Promise(r => setTimeout(r, 900));
  console.log('CONSOLE PANIC:', fs.readFileSync('/tmp/panics.log','utf8').split('\n').filter(l => l.includes('panic') || l.includes('thread')).slice(-3).join(' | ').slice(0,400));
} finally { await client.close(); }
