
import CDP from 'chrome-remote-interface';
const client = await CDP({ port: 9222 });
const { Runtime } = client;
try {
  const r = await Runtime.evaluate({ expression: `(() => {
    const g = window.__game;
    const cc = g.currentCells();
    return { cc: Array.isArray(cc) ? cc.slice(0,6) : cc, piece: g.currentPiece() };
  })()`, returnByValue: true });
  console.log(JSON.stringify(r.result.value));
} finally { await client.close(); }
