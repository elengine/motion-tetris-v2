import CDP from 'chrome-remote-interface';
const client = await CDP({ port: 9222 });
const { Runtime, Page, Emulation } = client;
try {
  await Page.enable();
  await Emulation.setDeviceMetricsOverride({ width: 344, height: 882, deviceScaleFactor: 1, mobile: true });
  const probe = `(function(){
    window.__mut=[]; window.__mutErr=null;
    const start=()=>{
      const row=document.getElementById('login-row');
      if(!row){ setTimeout(start,4); return; }
      const snap=()=>{ const vis=getComputedStyle(row).visibility; const L=!!row.querySelector('#login-btn-title'); const N=!!row.querySelector('.login-name'); if(L||N) window.__mut.push((L?'LOGINBTN':'NAME')+'|ready='+row.classList.contains('ready')+'|vis='+vis); };
      new MutationObserver(snap).observe(row,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
      snap();
    }; start();
  })();`;
  await Page.addScriptToEvaluateOnNewDocument({ source: probe });
  await Page.navigate({ url: 'http://localhost:5176/?v=' + Date.now() });
  await Page.loadEventFired();
  await new Promise(r => setTimeout(r, 3000));
  const e = await Runtime.evaluate({ expression: `(function(){ return JSON.stringify({ mut: window.__mut, err: window.__mutErr, ready: document.getElementById('login-row').classList.contains('ready') }); })()`, returnByValue: true });
  console.log(e.result.value);
} catch (e2) { console.log('E', e2.message); }
finally { await client.close(); }
