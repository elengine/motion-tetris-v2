import CDP from 'chrome-remote-interface';
const client = await CDP({ port: 9222 });
const { Runtime, Page, Emulation } = client;
try {
  await Page.enable();
  await Emulation.setDeviceMetricsOverride({ width: 344, height: 882, deviceScaleFactor: 1, mobile: true });
  await Page.navigate({ url: 'http://localhost:5174/?fresh=' + Date.now() });
  await Page.loadEventFired();
  await new Promise(r => setTimeout(r, 2500));
  // クリックしては実際に離脱するので、signInWithOAuth の URL 生成だけ検証: クライアント URL プロパティを eval
  const d = await Runtime.evaluate({
    expression: `(async () => {
      const { authClient } = await import('/src/supabase/client.ts');
      const data = await authClient.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: location.origin + '/', skipBrowserRedirect: true } });
      return JSON.stringify({ url: data.data?.url?.slice(0, 160), error: data.error?.message ?? null });
    })()`,
    returnByValue: true, awaitPromise: true });
  console.log(JSON.stringify(d.result));
} catch (e) { console.log('ERRC', e.message); }
finally { await client.close(); }
