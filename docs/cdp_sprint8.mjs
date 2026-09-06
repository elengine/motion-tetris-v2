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
  await Runtime.evaluate({ expression: `for (var x=0;x<10;x++) window.__game.set_cell(x,23,0); 'rowdone'` });
  const d = await Runtime.evaluate({ expression: `window.__game.hard_drop(); 'ok'`, returnByValue: true, userGesture: true });
  console.log('hard_drop:', JSON.stringify(d.result), JSON.stringify(d.exceptionDetails ? d.exceptionDetails.exception.description : '').slice(0,400));
} finally { await client.close(); }
