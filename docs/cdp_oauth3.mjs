import CDP from 'chrome-remote-interface';
const client = await CDP({ port: 9222 });
const { Runtime, Page } = client;
try {
  await Page.enable();
  await Page.navigate({ url: 'http://localhost:5174/?fresh=' + Date.now() });
  await Page.loadEventFired();
  await new Promise(r => setTimeout(r, 2500));
  const d = await Runtime.evaluate({
    expression: `(async () => {
      try {
        const mod = await import('/src/supabase/auth.ts');
        if (!mod.testOAuthUrl) return 'no testOAuthUrl';
        return JSON.stringify(await mod.testOAuthUrl());
      } catch (e) { return 'EXC:' + e.message; }
    })()`,
    returnByValue: true, awaitPromise: true });
  console.log(JSON.stringify(d.result.value ?? d.result));
} catch (e) { console.log('ERRC', e.message); }
finally { await client.close(); }
