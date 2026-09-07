import CDP from 'chrome-remote-interface';
import fs from 'node:fs';
const client = await CDP({ port: 9222 });
const { Runtime, Page, Emulation } = client;
try {
  await Page.enable();
  await Emulation.setDeviceMetricsOverride({ width: 344, height: 882, deviceScaleFactor: 1, mobile: true });
  await Page.navigate({ url: 'http://localhost:5174/?fresh=' + Date.now() });
  await Page.loadEventFired();
  await new Promise(r => setTimeout(r, 2500));
  let d = await Runtime.evaluate({ expression: `(function(){ const b=document.getElementById('title-rank-btn'); const snd=document.getElementById('title-sound-btn'); return JSON.stringify({ trophy: !!b, nextToSound: !!(b && snd && snd.nextElementSibling === b) }); })()`, returnByValue: true });
  console.log('title:', d.result.value);
  const b = await Page.captureScreenshot({ format: 'png' });
  fs.writeFileSync('/opt/share/tetris-v2/docs/ui_start_v201.png', Buffer.from(b.data, 'base64'));
  await Runtime.evaluate({ expression: `document.getElementById('title-rank-btn').click()` });
  await new Promise(r => setTimeout(r, 900));
  d = await Runtime.evaluate({ expression: `document.getElementById('ov-title').textContent`, returnByValue: true });
  console.log('after trophy click:', d.result.value);
  await Runtime.evaluate({ expression: `document.getElementById('history-link').click()` });
  await new Promise(r => setTimeout(r, 900));
  d = await Runtime.evaluate({ expression: `(function(){ return JSON.stringify({ backBtns: [...document.querySelectorAll('#overlay button')].filter(b2=>/スタート画面へ戻る/.test(b2.textContent)).length, title: document.getElementById('ov-title').textContent }); })()`, returnByValue: true });
  console.log('history:', d.result.value);
  // 戻る(back-to-title)で復帰確認
  await Runtime.evaluate({ expression: `document.getElementById('back-to-title').click()` });
  await new Promise(r => setTimeout(r, 400));
  d = await Runtime.evaluate({ expression: `document.getElementById('ov-title').textContent`, returnByValue: true });
  console.log('back to:', d.result.value);
} catch (e) { console.log('ERRC', e.message); }
finally { await client.close(); }
