
import CDP from 'chrome-remote-interface';
const client = await CDP({ port: 9222 });
const { Runtime } = client;
try {
  const r = await Runtime.evaluate({ expression: `(() => {
    const g = window.__game;
    const grid = g.getGrid();
    let filled = grid.split('').filter(c => c !== '.' && c !== ',' && c !== ';').length;
    const ghost = g.ghostY;
    return { head: grid.slice(0, 120), filled, ghost, curY: g.curY, curX: g.curX };
  })()`, returnByValue: true });
  console.log(JSON.stringify(r.result.value).slice(0, 700));
} finally { await client.close(); }
