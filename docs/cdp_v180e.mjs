import CDP from 'chrome-remote-interface';
import fs from 'node:fs';
const client = await CDP({ port: 9222 });
const { Runtime, Page } = client;
try {
  await Page.enable();
  await Page.navigate({ url: 'http://localhost:5174/?fresh=' + Date.now() });
  await Page.loadEventFired();
  await new Promise(r => setTimeout(r, 2500));
  await Runtime.evaluate({ expression: `document.getElementById('howto-link').click()` });
  await new Promise(r => setTimeout(r, 500));
  const d = await Runtime.evaluate({ expression: `(function(){ const o=document.getElementById('overlay'); o.scrollTop=99999; return JSON.stringify({ st: o.scrollTop, atBottom: o.scrollTop + o.clientHeight >= o.scrollHeight - 4 }); })()`, returnByValue: true });
  console.log(d.result.value);
  const b = await Page.captureScreenshot({ format: 'png' });
  fs.writeFileSync('/opt/share/tetris-v2/docs/ui_howto_v180.png', Buffer.from(b.data, 'base64'));
} finally { await client.close(); }
