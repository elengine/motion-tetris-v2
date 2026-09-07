import CDP from 'chrome-remote-interface';
const client = await CDP({ port: 9222 });
const { Runtime, Page } = client;
try {
  await Page.enable();
  await Page.navigate({ url: 'http://localhost:5174/' });
  await Page.loadEventFired();
  await new Promise(r => setTimeout(r, 2200));
  const d = await Runtime.evaluate({ expression: `(function(){ return JSON.stringify({ a: 1 }); })()`, returnByValue: true });
  console.log(JSON.stringify(d));
} catch (e) { console.log('ERRC', e.message); }
finally { await client.close(); }
