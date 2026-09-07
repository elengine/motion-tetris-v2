import CDP from 'chrome-remote-interface';
const client = await CDP({ port: 9222 });
const { Runtime, Page, Log } = client;
try {
  await Log.enable(); Log.entryAdded(e => console.log('LOG:', e.entry.text));
  await Page.enable();
  await Page.navigate({ url: 'http://localhost:5174/?v=' + Date.now() });
  await Page.loadEventFired();
  await new Promise(r => setTimeout(r, 2500));
  const t = await Runtime.evaluate({ expression: `document.getElementById('ov-sub').textContent + ' | ' + document.getElementById('howto-link') + ' | ' + document.querySelectorAll('.mode-btn').length`, returnByValue: true });
  console.log('RAW:', JSON.stringify(t));
} catch(e) { console.log('ERR', e.message); }
finally { await client.close(); }
