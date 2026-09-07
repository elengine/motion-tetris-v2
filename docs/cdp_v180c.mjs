import CDP from 'chrome-remote-interface';
const client = await CDP({ port: 9222 });
const { Runtime, Page } = client;
try {
  await Page.enable();
  await Page.navigate({ url: 'http://localhost:5174/' });
  await Page.loadEventFired();
  await new Promise(r => setTimeout(r, 2200));
  await Runtime.evaluate({ expression: `document.getElementById('howto-link').click()` });
  await new Promise(r => setTimeout(r, 500));
  const d = await Runtime.evaluate({ expression: `(function(){ const c=document.querySelector('.overlay-card'); return c ? ('exist sh='+c.scrollHeight+' ch='+c.clientHeight) : ('NULL: ' + document.getElementById('overlay').innerHTML.slice(0,120)); })()`, returnByValue: true });
  console.log(d.result.value);
} catch(e){ console.log('ERRC', e.message); }
finally { await client.close(); }
