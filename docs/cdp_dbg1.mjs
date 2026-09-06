import CDP from 'chrome-remote-interface';
const client = await CDP({ port: 9222 });
const { Runtime, Page } = client;
try {
  await Page.enable();
  const r1 = await Runtime.evaluate({ expression: `1+1`, returnByValue: true });
  console.log('eval 1+1:', JSON.stringify(r1).slice(0,200));
  await Page.navigate({ url: 'http://localhost:5174/?v=' + Date.now() });
  await Page.loadEventFired();
  await new Promise(r => setTimeout(r, 2500));
  const d = await Runtime.evaluate({ expression: `(function(){ return document.querySelectorAll('.mode-btn').length; })()`, returnByValue: true });
  console.log('modeBtns:', JSON.stringify(d).slice(0,300));
} finally { await client.close(); }
