
import CDP from 'chrome-remote-interface';
const client = await CDP({ port: 9222 });
const { Runtime } = client;
try {
  const r = await Runtime.evaluate({ expression: `(() => {
    const g = window.__game;
    const vals = new Set();
    for (let y = 0; y < 20; y++) for (let x = 0; x < 10; x++) vals.add(g.get_cell(x, y));
    return { vals: [...vals].slice(0, 15).map(String), cellCharSample: g.cell_char(0,0), cellCharT: g.cell_char(4,0) };
  })()`, returnByValue: true });
  console.log(JSON.stringify(r.result.value));
} finally { await client.close(); }
