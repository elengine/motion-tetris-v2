import CDP from 'chrome-remote-interface';
const client = await CDP({ port: 9222 });
const { Runtime, Page, Emulation } = client;
const ev = (expr) => Runtime.evaluate({ expression: `(function(){ ${expr} })()`, returnByValue: true });
try {
  await Page.enable();
  await Emulation.setDeviceMetricsOverride({ width: 344, height: 882, deviceScaleFactor: 1, mobile: true });
  await Page.navigate({ url: 'http://localhost:5174/?fresh=' + Date.now() });
  await Page.loadEventFired();
  await new Promise(r => setTimeout(r, 2500));
  await ev(`document.getElementById('howto-link').click();`);
  await new Promise(r => setTimeout(r, 400));
  let d = await ev(`return document.getElementById('ov-title').textContent;`);
  console.log('title:', d.result.value, "(「あそびかた」期待)");
  // 最下部までスクロール
  d = await ev(`const o=document.getElementById('overlay'); o.scrollTop=99999; return o.scrollTop;`);
  console.log('scrolled to:', d.result.value);
  // 戻る→また遊び方
  await ev(`document.getElementById('back-to-title').click();`);
  await new Promise(r => setTimeout(r, 300));
  await ev(`document.getElementById('howto-link').click();`);
  await new Promise(r => setTimeout(r, 400));
  d = await ev(`return document.getElementById('overlay').scrollTop;`);
  console.log('re-open scrollTop:', d.result.value, '(0 期待)');
} catch (e) { console.log('ERRC', e.message); }
finally { await client.close(); }
