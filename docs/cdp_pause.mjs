
import CDP from 'chrome-remote-interface';
const client = await CDP({ port: 9222 });
const { Runtime, Page, Input } = client;
try {
  await Page.enable();
  await Page.navigate({ url: 'http://localhost:5174/' });
  await Page.loadEventFired();
  await new Promise(r => setTimeout(r, 1800));
  await Runtime.evaluate({ expression: `document.getElementById('ov-action').click()` });
  await new Promise(r => setTimeout(r, 300));
  const r1 = await Runtime.evaluate({ expression: `JSON.stringify((r)=>({x:r.x,y:r.y,w:r.width,h:r.height}))(document.getElementById('pause-btn').getBoundingClientRect())`, returnByValue: true });
  const rect = JSON.parse(r1.result.value);
  console.log('pause rect:', rect);
  // calc effective top element
  const top = await Runtime.evaluate({ expression: `document.elementFromPoint(${rect.x+rect.w/2}, ${rect.y+rect.h/2})?.id || document.elementFromPoint(${rect.x+rect.w/2}, ${rect.y+rect.h/2})?.className`, returnByValue: true });
  console.log('elementFromPoint:', top.result.value);
  // touch click
  await Input.dispatchTouchEvent({ type:'touchStart', touchPoints:[{x:rect.x+rect.w/2, y:rect.y+rect.h/2, id:1}] });
  await new Promise(r => setTimeout(r, 60));
  await Input.dispatchTouchEvent({ type:'touchEnd', touchPoints:[] });
  await new Promise(r => setTimeout(r, 300));
  const st = await Runtime.evaluate({ expression: `JSON.stringify({state: String(window.__game.state)})`, returnByValue: true });
  console.log('after touch pause:', st.result.value);
} finally { await client.close(); }
