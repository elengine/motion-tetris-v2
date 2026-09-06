import CDP from 'chrome-remote-interface';
const client = await CDP({ port: 9222 });
const { Runtime, Page } = client;
try {
  await Page.enable();
  await Page.navigate({ url: 'http://localhost:5174/?v=' + Date.now() });
  await Page.loadEventFired();
  await new Promise(r => setTimeout(r, 2200));
  await Runtime.evaluate({ expression: `(function(){ document.querySelector('.mode-btn[data-mode="ultra"]').click(); })()` });
  await new Promise(r => setTimeout(r, 500));
  await Runtime.evaluate({ expression: `window.__game.tick(125000)` });
  await new Promise(r => setTimeout(r, 800));
  const fin = await Runtime.evaluate({ expression: `(function(){ return JSON.stringify({
    title: document.getElementById('ov-title').textContent,
    backVisible: document.getElementById('back-to-title').style.display !== 'none',
    modeBtnsHidden: getComputedStyle(document.getElementById('mode-buttons')).display === 'none' }); })()`, returnByValue: true });
  console.log('ULTRA FIN:', fin.result.value);
  // 戻る→マラソンボタンclick
  await Runtime.evaluate({ expression: `document.getElementById('back-to-title').click()` });
  await new Promise(r => setTimeout(r, 400));
  await Runtime.evaluate({ expression: `(function(){ document.querySelector('.mode-btn[data-mode="sprint"]').click(); })()` });
  await new Promise(r => setTimeout(r, 400));
  const st = await Runtime.evaluate({ expression: `String(window.__game.mode)`, returnByValue: true });
  console.log('restart sprint mode:', st.result.value, '(1=Sprint)');
} finally { await client.close(); }
