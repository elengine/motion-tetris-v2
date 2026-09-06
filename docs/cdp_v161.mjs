import CDP from 'chrome-remote-interface';
import fs from 'node:fs';
const client = await CDP({ port: 9222 });
const { Runtime, Page } = client;
const gaps = async () => {
  const d = await Runtime.evaluate({ expression: `(function(){
    var ms=[]; document.querySelectorAll('.mode-btn').forEach(function(b){ var r=b.getBoundingClientRect(); ms.push({top:Math.round(r.top), h:Math.round(r.height), label:b.textContent.trim().slice(0,6)}); });
    var v1=document.querySelector('.v1-link').getBoundingClientRect();
    var ov=document.getElementById('ov-body').getBoundingClientRect();
    return JSON.stringify({ms:ms, ovBottom:Math.round(ov.bottom), vTop:Math.round(v1.top), gapOvV:Math.round(v1.top-ov.bottom)});
  })()`, returnByValue: true });
  console.log(d.result.value);
};
try {
  await Page.enable();
  await Page.navigate({ url: 'http://localhost:5174/?v=' + Date.now() });
  await Page.loadEventFired();
  await new Promise(r => setTimeout(r, 2200));
  await gaps();
  const b = await Page.captureScreenshot({ format: 'png' });
  fs.writeFileSync('/opt/share/tetris-v2/docs/ui_start_v161.png', Buffer.from(b.data, 'base64'));
  // 完了画面間隔
  await Runtime.evaluate({ expression: `(function(){ document.querySelector('.mode-btn[data-mode="ultra"]').click(); })()` });
  await new Promise(r => setTimeout(r, 500));
  await Runtime.evaluate({ expression: `window.__game.tick(125000)` });
  await new Promise(r => setTimeout(r, 800));
  const d2 = await Runtime.evaluate({ expression: `(function(){
    var fr=document.querySelector('.finish-frame').getBoundingClientRect();
    var act=document.getElementById('ov-action').getBoundingClientRect();
    var back=document.getElementById('back-to-title').getBoundingClientRect();
    var v1=document.querySelector('.v1-link');
    return JSON.stringify({gapFrameAct: Math.round(act.top-fr.bottom), actH: Math.round(act.height), backH: Math.round(back.height), gapActBack: Math.round(back.top-act.bottom), v1None: getComputedStyle(v1).display==='none'});
  })()`, returnByValue: true });
  console.log('finish:', d2.result.value);
  const b2 = await Page.captureScreenshot({ format: 'png' });
  fs.writeFileSync('/opt/share/tetris-v2/docs/ui_finish_v161.png', Buffer.from(b2.data, 'base64'));
} finally { await client.close(); }
