import CDP from 'chrome-remote-interface';
const client = await CDP({ port: 9222, maxTimeout: 15000 });
const { Runtime, Page } = client;
try {
  await Page.enable();
  await Page.navigate({ url: 'http://localhost:5174/' });
  await Page.loadEventFired();
  await new Promise(r => setTimeout(r, 2500));
  const d = await Runtime.evaluate({ expression: `location.href`, returnByValue: true });
  console.log(JSON.stringify(d.result));
} catch (e) { console.log('ERRC:', e.message); }
finally { await client.close(); }
