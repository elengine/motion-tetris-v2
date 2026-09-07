import CDP from 'chrome-remote-interface';
const client = await CDP({ port: 9222 });
const { Runtime, Page, Emulation } = client;
try {
  await Page.enable();
  await Page.navigate({ url: 'http://localhost:5174/?fresh=' + Date.now() });
  await Page.loadEventFired();
  await new Promise(r => setTimeout(r, 2500));
  const d = await Runtime.evaluate({
    expression: `(async () => {
      try {
        const mod = await import('/src/supabase/client.ts');
        const c = mod.authClient ?? mod.default;
        const data = await c.auth.signInWithOAuth({ provider: 'google', options: { skipBrowserRedirect: true } });
        return JSON.stringify({ ok: !!data.data?.url, url: String(data.data?.url ?? '').slice(0,140), err: data.error?.message ?? null });
      } catch (e) { return 'EXC:' + e.message; }
    })()`,
    returnByValue: true, awaitPromise: true });
  console.log(JSON.stringify(d.result.value ?? d.result));
} catch (e) { console.log('ERRC', e.message); }
finally { await client.close(); }
