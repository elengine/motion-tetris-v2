import CDP from 'chrome-remote-interface';
const client = await CDP({ port: 9222 });
const { Runtime, Page } = client;
try {
  await Page.enable();
  await Page.navigate({ url: 'http://localhost:5174/?v=' + Date.now() });
  await Page.loadEventFired();
  await new Promise(r => setTimeout(r, 2200));
  const d = await Runtime.evaluate({ expression: `(function(){ return JSON.stringify({
    startBtnHidden: getComputedStyle(document.getElementById('ov-action')).display === 'none',
    modeBtns: document.querySelectorAll('.mode-btn').length }); })()`, returnByValue: true });
  console.log('title:', d.result.value);
} finally { await client.close(); }
