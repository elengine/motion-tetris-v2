
import CDP from 'chrome-remote-interface';
const client = await CDP({ port: 9222 });
const { Runtime, Page, Emulation, Input } = client;
const check = async (label, w, h) => {
  await Emulation.setDeviceMetricsOverride({ width: w, height: h, deviceScaleFactor: 2.625, mobile: true });
  await Page.navigate({ url: 'http://localhost:5174/?v=' + Date.now() });
  await Page.loadEventFired();
  await new Promise(r => setTimeout(r, 1800));
  const d = await Runtime.evaluate({ expression: `(function(){
    var c=document.getElementById('game-canvas'), board=null;
    // renderer.layout は直接取れないので盤面枠は main の __debug? → canvas全体と touchpad rect で判定
    var pad=document.getElementById('touchpad'); var pr=pad.getBoundingClientRect();
    var mb=document.getElementById('mute-btn').getBoundingClientRect();
    var ms=document.getElementById('mode-select'); var mr=ms?ms.getBoundingClientRect():null;
    var visibleInGame = ms && getComputedStyle(ms.closest('#overlay')||ms).display!=='none';
    return { padTop: Math.round(pr.top), padBottom: Math.round(pr.bottom), padH: Math.round(pr.height),
             mute: {x:Math.round(mb.x), y:Math.round(mb.y), w:Math.round(mb.width), h:Math.round(mb.height)},
             overlayVisible: !!document.querySelector('#overlay:not(.hidden)'),
             padBgOpaque: getComputedStyle(pad).backgroundImage.includes('gradient') };
  })()`, returnByValue: true });
  console.log(label, JSON.stringify(d.result.value));
  await Emulation.clearDeviceMetricsOverride();
};
try {
  await Page.enable();
  await check('portrait:', 344, 882);
  await check('landscape:', 828, 690);
} finally { await client.close(); }
