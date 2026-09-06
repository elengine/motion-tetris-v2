import CDP from 'chrome-remote-interface';
import fs from 'node:fs';
const client = await CDP({ port: 9222 });
const { Runtime, Page, Emulation } = client;
const shot = async (name) => {
  const b = await Page.captureScreenshot({ format: 'png' });
  fs.writeFileSync('/opt/share/tetris-v2/docs/' + name, Buffer.from(b.data, 'base64'));
};
const go = async (label, w, h, file) => {
  await Emulation.setDeviceMetricsOverride({ width: w, height: h, deviceScaleFactor: 2.625, mobile: true });
  await Emulation.setTouchEmulationEnabled({ enabled: true, maxTouchPoints: 5 });
  await Page.navigate({ url: 'http://localhost:5174/?v=' + Date.now() });
  await Page.loadEventFired();
  await new Promise(r => setTimeout(r, 1800));
  await Runtime.evaluate({ expression: `(function(){ document.getElementById('ov-action').click(); })()` });
  await new Promise(r => setTimeout(r, 2500));
  await shot(file);
  console.log(label, 'shot saved');
  await Emulation.clearDeviceMetricsOverride();
};
try {
  await Page.enable();
  await go('portrait', 344, 882, 'ui_play_portrait.png');
  await go('landscape', 828, 690, 'ui_play_landscape.png');
} finally { await client.close(); }
