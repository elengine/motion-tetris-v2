import CDP from 'chrome-remote-interface';
import fs from 'node:fs';
const client = await CDP({ port: 9222 });
const { Runtime, Page, Emulation } = client;
try {
  await Page.enable();
  await Emulation.setDeviceMetricsOverride({ width: 344, height: 882, deviceScaleFactor: 1, mobile: true });
  await Page.navigate({ url: 'http://localhost:5174/?fresh=' + Date.now() });
  await Page.loadEventFired();
  await new Promise(r => setTimeout(r, 2800));
  let d = await Runtime.evaluate({ expression: `(function(){ return JSON.stringify({ ver: document.getElementById('ov-version').textContent, rank: !!document.getElementById('rank-link') }); })()`, returnByValue: true });
  console.log('title:', d.result.value);
  const b = await Page.captureScreenshot({ format: 'png' });
  fs.writeFileSync('/opt/share/tetris-v2/docs/ui_start_v200.png', Buffer.from(b.data, 'base64'));
  await Runtime.evaluate({ expression: `document.getElementById('rank-link').click()` });
  await new Promise(r => setTimeout(r, 1000));
  d = await Runtime.evaluate({ expression: `(function(){ return JSON.stringify({ title: document.getElementById('ov-title').textContent, tabs: document.querySelectorAll('.rank-tab').length, body: document.getElementById('rank-body').textContent.slice(0,50), back: document.getElementById('back-to-title').style.display }); })()`, returnByValue: true });
  console.log('ranking:', d.result.value);
  const b2 = await Page.captureScreenshot({ format: 'png' });
  fs.writeFileSync('/opt/share/tetris-v2/docs/ui_ranking_v200.png', Buffer.from(b2.data, 'base64'));
  await Runtime.evaluate({ expression: `document.getElementById('history-link').click()` });
  await new Promise(r => setTimeout(r, 1000));
  d = await Runtime.evaluate({ expression: `(function(){ return JSON.stringify({ title: document.getElementById('ov-title').textContent, name: !!document.getElementById('name-input'), logout: !!document.getElementById('logout-btn2') === false }); })()`, returnByValue: true });
  console.log('history:', d.result.value);
  const b3 = await Page.captureScreenshot({ format: 'png' });
  fs.writeFileSync('/opt/share/tetris-v2/docs/ui_history_v200.png', Buffer.from(b3.data, 'base64'));
  await Runtime.evaluate({ expression: `document.getElementById('hist-back').click()` });
  await new Promise(r => setTimeout(r, 500));
  d = await Runtime.evaluate({ expression: `document.getElementById('ov-title').textContent`, returnByValue: true });
  console.log('back title:', d.result.value);
} catch (e) { console.log('ERRC', e.message); }
finally { await client.close(); }
