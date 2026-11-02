export function speckleConfig(env = process.env) {
  const production = env.NODE_ENV === 'production';
  const appId = (env.SPECKLE_APP_ID || (production ? '' : 'bc5cdc2972')).trim();
  const redirectUrl = (env.SPECKLE_REDIRECT_URL ||
    (production ? '' : 'http://localhost:3000/speckle/callback')).trim();
  if (!appId) throw new Error('Set SPECKLE_APP_ID to the registered production Speckle app ID in Render.');
  if (!redirectUrl) throw new Error('Set SPECKLE_REDIRECT_URL to the exact registered production callback URL in Render.');
  let callback;
  try { callback = new URL(redirectUrl); }
  catch { throw new Error('SPECKLE_REDIRECT_URL must be an absolute callback URL.'); }
  if (!['http:', 'https:'].includes(callback.protocol) || callback.username || callback.password ||
      callback.pathname !== '/speckle/callback' || callback.search || callback.hash) {
    throw new Error('SPECKLE_REDIRECT_URL must end in /speckle/callback without credentials, query or fragment.');
  }
  if (production && (callback.protocol !== 'https:' ||
      ['localhost', '[::1]'].includes(callback.hostname) || /^127\./.test(callback.hostname))) {
    throw new Error('SPECKLE_REDIRECT_URL must use a public HTTPS origin in production, not localhost.');
  }
  return { serverUrl: 'https://app.speckle.systems', appId, redirectUrl };
}
