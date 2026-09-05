
import CDP from 'chrome-remote-interface';
const client = await CDP({ port: 9222 });
const { Runtime } = client;
try {
  const r = await Runtime.evaluate({ expression: `(() => {
    const g = window.__game;
    const props = [];
    for (let o = g; o && o !== Object.prototype; o = Object.getPrototypeOf(o))
      props.push(...Object.getOwnPropertyNames(o));
    return [...new Set(props)].join(',');
  })()`, returnByValue: true });
  console.log(r.result.value);
} finally { await client.close(); }
