import CDP from 'chrome-remote-interface';
import fs from 'node:fs';
const client = await CDP({ port: 9222 });
const { Runtime, Page, Input } = client;
try {
  await Page.enable();
  await Page.navigate({ url: 'http://localhost:5174/?fresh=' + Date.now() });
  await Page.loadEventFired();
  await new Promise(r => setTimeout(r, 2500));
  // バグ1: マラソン開始→ポーズ→スタート画面へ戻る→HUD表示確認
  await Runtime.evaluate({ expression: `document.querySelector('.mode-btn[data-mode="marathon"]').click()` });
  await new Promise(r => setTimeout(r, 600));
  await Runtime.evaluate({ expression: `window.__game.pause_toggle()` });
  await new Promise(r => setTimeout(r, 300));
  await Runtime.evaluate({ expression: `document.getElementById('back-to-title').click()` });
  await new Promise(r => setTimeout(r, 400));
  const hud = await Runtime.evaluate({ expression: `(function(){ return JSON.stringify({ hudVis: getComputedStyle(document.getElementById('hud')).visibility, title: document.getElementById('ov-title').textContent }); })()`, returnByValue: true });
  console.log('BUG1 HUD after back:', hud.result.value);
  const b = await Page.captureScreenshot({ format: 'png' });
  fs.writeFileSync('/opt/share/tetris-v2/docs/ui_title_afterback_v191.png', Buffer.from(b.data, 'base64'));
  // あそびかた画面確認
  await Runtime.evaluate({ expression: `document.getElementById('howto-link').click()` });
  await new Promise(r => setTimeout(r, 500));
  const hw = await Runtime.evaluate({ expression: `(function(){ const li7=document.querySelectorAll('.howto-card')[1].querySelectorAll('li').length; const btns=document.querySelectorAll('.why')[0]; const sz=getComputedStyle(document.querySelector('.howto-realbtn')).width; const noBtnWord = !document.querySelector('.howto-card')?.textContent.includes('ボタン</span>'); return JSON.stringify({ li7, size: sz }); })()`, returnByValue: true });
  console.log('HOWTO:', hw.result.value);
  const b2 = await Page.captureScreenshot({ format: 'png' });
  fs.writeFileSync('/opt/share/tetris-v2/docs/ui_howto_v191.png', Buffer.from(b2.data, 'base64'));
} catch (e) { console.log('ERRC', e.message); }
finally { await client.close(); }
