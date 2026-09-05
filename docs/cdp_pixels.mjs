
import CDP from 'chrome-remote-interface';
const client = await CDP({ port: 9222 });
const { Runtime, Page } = client;
try {
  await Page.enable();
  await Page.navigate({ url: 'http://localhost:5174/' });
  await Page.loadEventFired();
  await new Promise(r => setTimeout(r, 1500));
  await Runtime.evaluate({ expression: `document.getElementById('ov-action')?.click()` });
  await new Promise(r => setTimeout(r, 400));
  const r = await Runtime.evaluate({ expression: `(() => {
    const cv = document.getElementById('game-canvas');
    const ctx = cv.getContext('2d');
    const d = ctx.getImageData(0, 0, cv.width, cv.height).data;
    let colored = 0;
    for (let i = 0; i < d.length; i += 4) {
      const [r0, g0, b0] = [d[i], d[i+1], d[i+2]];
      if (Math.abs(r0 - g0) > 40 || Math.abs(g0 - b0) > 40 || Math.abs(r0 - b0) > 40) colored++;
    }
    return { colored, w: cv.width, h: cv.height };
  })()`, returnByValue: true });
  console.log(JSON.stringify(r.result.value));
} finally { await client.close(); }
