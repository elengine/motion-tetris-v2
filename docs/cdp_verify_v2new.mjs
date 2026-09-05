// CDP 検証: 新設計版を開いてエラー0・盤面描画・ゴースト位置を確認
import CDP from 'chrome-remote-interface';

const client = await CDP({ port: 9222 });
const { Runtime, Page, Log } = client;
const errors = [];
try {
  await Log.enable();
  Log.entryAdded(({ entry }) => errors.push(`${entry.level}: ${entry.text}`));
  Runtime.consoleAPICalled(({ type, args }) => {
    if (type === 'error' || type === 'warning')
      errors.push(`${type}: ${args.map(a => a.value ?? a.description ?? '').join(' ')}`);
  });
  await Page.enable();
  await Page.navigate({ url: 'http://localhost:5174/' });
  await Page.loadEventFired();
  await new Promise(r => setTimeout(r, 2500));

  const state = await Runtime.evaluate({ expression: `(() => {
    const cv = document.getElementById('game-canvas');
    const overlayTitle = document.getElementById('ov-title')?.textContent ?? '';
    return {
      hasCanvas: !!cv,
      canvasSize: cv ? cv.width + 'x' + cv.height : null,
      overlayTitle,
      hud: {
        score: document.getElementById('hud-score')?.textContent,
        lines: document.getElementById('hud-lines')?.textContent,
      },
      title: document.title,
    };
  })()`, returnByValue: true });
  console.log(JSON.stringify(state.result.value, null, 2));
  console.log('ERRORS:', JSON.stringify(errors.filter(e => !/favicon/.test(e)), null, 1));
} finally {
  await client.close();
}
