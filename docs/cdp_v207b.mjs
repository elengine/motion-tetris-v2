import CDP from 'chrome-remote-interface';
import fs from 'node:fs';
const client = await CDP({ port: 9222 });
const { Runtime, Page, Emulation } = client;
try {
  await Page.enable();
  await Emulation.setDeviceMetricsOverride({ width: 344, height: 882, deviceScaleFactor: 1, mobile: true });
  await Page.navigate({ url: 'http://localhost:5176/' });
  await Page.loadEventFired();
  await new Promise(r => setTimeout(r, 1200));
  await Runtime.evaluate({ expression: `(async () => { const rs = await navigator.serviceWorker.getRegistrations(); for (const r of rs) await r.unregister(); const ks = await caches.keys(); for (const k of ks) await caches.delete(k); })()`, awaitPromise: true });
  // login-row 内容変化のログ取り (ちらつき検出)
  await Page.navigate({ url: 'http://localhost:5176/' });
  await Page.loadEventFired();
  await new Promise(r => setTimeout(r, 2000));
  // Page.addScriptToEvaluateOnNewDocument 相当: Runtime.evaluate は遅い→まずフラグ設置後 reload
  await Runtime.evaluate({ expression: `(function(){ const seq = []; window.__mut = seq; try { sessionStorage.setItem('ntv2:probe','1'); } catch(e){} const row = document.getElementById('login-row'); if (!row) return 'no row at probe time'; const mo = new MutationObserver(() => { const vis = getComputedStyle(row).visibility; seq.push(row.innerHTML.length + ':' + row.classList.contains('ready') + ':' + vis.slice(0,6)); }); mo.observe(row, { childList: true, attributes: true, subtree: false }); return 'armed'; })()`, returnByValue: true });
  // すぐに評価 (init前後)
  const e1 = await Runtime.evaluate({ expression: `(function(){ const row=document.getElementById('login-row'); return row ? JSON.stringify({ html: row.innerHTML.slice(0,40), ready: row.classList.contains('ready') }) : 'no row'; })()`, returnByValue: true });
  console.log('early:', e1.result.value);
  await Page.loadEventFired();
  await new Promise(r => setTimeout(r, 2500));
  const e2 = await Runtime.evaluate({ expression: `(function(){ const row=document.getElementById('login-row'); const vis=getComputedStyle(row).visibility; return JSON.stringify({ html: row.innerHTML.slice(0,60), ready: row.classList.contains('ready'), vis }); })()`, returnByValue: true });
  console.log('settled:', e2.result.value);
  const e2b = await Runtime.evaluate({ expression: `(function(){ return JSON.stringify({ mut: window.__mut ?? 'none', err: window.__mutErr ?? null }); })()`, returnByValue: true });
  console.log('mut-seq:', e2b.result.value);
  // howto: panels/touchpad も hidden か
  await Runtime.evaluate({ expression: `document.getElementById('howto-link').click()` });
  await new Promise(r => setTimeout(r, 400));
  const e3 = await Runtime.evaluate({ expression: `(function(){ const cv=document.getElementById('game-canvas'), tp=document.getElementById('touchpad'), pn=document.getElementById('panels'); return JSON.stringify({ cv: getComputedStyle(cv).visibility, tp: getComputedStyle(tp).visibility, pn: getComputedStyle(pn).visibility }); })()`, returnByValue: true });
  console.log('howto overlay-hidden objects:', e3.result.value);
  // タイトルに戻る → reappears
  await Runtime.evaluate({ expression: `document.getElementById('back-to-title').click()` });
  await new Promise(r => setTimeout(r, 300));
  const e4 = await Runtime.evaluate({ expression: `(function(){ const cv=document.getElementById('game-canvas'), tp=document.getElementById('touchpad'); return JSON.stringify({ cv: getComputedStyle(cv).visibility, tp: getComputedStyle(tp).visibility }); })()`, returnByValue: true });
  console.log('back-title objects:', e4.result.value);
  // ゲーム開始
  await Runtime.evaluate({ expression: `[...document.querySelectorAll('.mode-btn')][0].click()` });
  await new Promise(r => setTimeout(r, 700));
  const e5 = await Runtime.evaluate({ expression: `(function(){ const cv=document.getElementById('game-canvas'), tp=document.getElementById('touchpad'); return JSON.stringify({ cv: getComputedStyle(cv).visibility, tp: getComputedStyle(tp).visibility }); })()`, returnByValue: true });
  console.log('playing objects:', e5.result.value);
  const b = await Page.captureScreenshot({ format: 'png' });
  fs.writeFileSync('/opt/share/tetris-v2/docs/ui_start_v207.png', Buffer.from(b.data, 'base64'));
} catch (e) { console.log('E', e.message); }
finally { await client.close(); }
