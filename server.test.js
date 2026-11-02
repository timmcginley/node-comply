import test from 'node:test';
import assert from 'node:assert/strict';
import { speckleConfig } from './server-config.js';

test('local Speckle defaults remain unchanged; production requires explicit registration', () => {
  assert.deepEqual(speckleConfig({}), {
    serverUrl: 'https://app.speckle.systems', appId: 'bc5cdc2972',
    redirectUrl: 'http://localhost:3000/speckle/callback'
  });
  assert.throws(() => speckleConfig({ NODE_ENV: 'production' }), /SPECKLE_APP_ID/);
  assert.throws(() => speckleConfig({ NODE_ENV: 'production', SPECKLE_APP_ID: 'registered' }), /SPECKLE_REDIRECT_URL/);
});

test('production Speckle config uses only the explicit public app ID and exact HTTPS callback', () => {
  assert.deepEqual(speckleConfig({
    NODE_ENV: 'production', SPECKLE_APP_ID: 'production-app',
    SPECKLE_REDIRECT_URL: 'https://tools.boxbuild.dk/speckle/callback', SPECKLE_APP_SECRET: 'not-for-browser'
  }), {
    serverUrl: 'https://app.speckle.systems', appId: 'production-app',
    redirectUrl: 'https://tools.boxbuild.dk/speckle/callback'
  });
});

test('production rejects local, insecure and malformed Speckle callbacks without exposing their values', () => {
  for (const redirect of [
    'http://localhost:3000/speckle/callback', 'https://localhost/speckle/callback',
    'https://127.0.0.1/speckle/callback', 'https://[::1]/speckle/callback',
    'http://tools.boxbuild.dk/speckle/callback', 'not-a-url',
    'https://tools.boxbuild.dk/wrong', 'https://tools.boxbuild.dk/speckle/callback?code=secret-value',
    'https://tools.boxbuild.dk/speckle/callback#fragment', 'https://secret-value@example.test/speckle/callback'
  ]) {
    assert.throws(() => speckleConfig({
      NODE_ENV: 'production', SPECKLE_APP_ID: 'production-app', SPECKLE_REDIRECT_URL: redirect
    }), error => /SPECKLE_REDIRECT_URL/.test(error.message) && !error.message.includes('secret-value'));
  }
});

test('Express production smoke: health, registry, public config and API errors', async t => {
  const keys = ['PORT', 'NODE_ENV', 'SPECKLE_APP_ID', 'SPECKLE_REDIRECT_URL', 'SUPABASE_PUBLISHABLE_KEY'];
  const original = Object.fromEntries(keys.map(key => [key, process.env[key]]));
  process.env.PORT = '0';
  process.env.NODE_ENV = 'production';
  process.env.SPECKLE_APP_ID = 'production-app';
  process.env.SPECKLE_REDIRECT_URL = 'https://tools.boxbuild.dk/speckle/callback';
  process.env.SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_fixture';
  const { server } = await import('./server.js');
  try {
    if (!server.listening) await new Promise(resolve => server.once('listening', resolve));
    const origin = `http://127.0.0.1:${server.address().port}`;
    await t.test('health and public registry respond without authentication', async () => {
      assert.deepEqual(await (await fetch(`${origin}/api/health`)).json(), { ok: true, app: 'MasterBPMN' });
      const teams = await (await fetch(`${origin}/api/teams`)).json();
      assert.equal(teams.length, 21);
    });
    await t.test('browser configuration is public, non-cacheable and uses the production callback', async () => {
      const response = await fetch(`${origin}/api/speckle/config`);
      assert.equal(response.status, 200);
      assert.equal(response.headers.get('cache-control'), 'no-store');
      assert.equal((await response.json()).redirectUrl, process.env.SPECKLE_REDIRECT_URL);
      const auth = await fetch(`${origin}/api/config`);
      assert.equal(auth.headers.get('cache-control'), 'no-store');
      assert.equal((await auth.json()).publishableKey, 'sb_publishable_fixture');
    });
    await t.test('missing Speckle settings report an actionable error instead of a localhost fallback', async () => {
      delete process.env.SPECKLE_APP_ID;
      const response = await fetch(`${origin}/api/speckle/config`);
      assert.equal(response.status, 503);
      assert.equal(response.headers.get('cache-control'), 'no-store');
      assert.match((await response.json()).error, /Set SPECKLE_APP_ID/);
      process.env.SPECKLE_APP_ID = 'production-app';
    });
    await t.test('secret Supabase keys are rejected and never returned to the browser', async () => {
      process.env.SUPABASE_PUBLISHABLE_KEY = 'sb_secret_do-not-return';
      const response = await fetch(`${origin}/api/config`);
      assert.equal(response.status, 500);
      assert.equal(response.headers.get('cache-control'), 'no-store');
      assert.ok(!(await response.text()).includes('sb_secret_do-not-return'));
    });
    await t.test('unknown API routes return JSON 404, never a successful HTML app shell', async () => {
      const response = await fetch(`${origin}/api/not-a-route`);
      assert.equal(response.status, 404);
      assert.match(response.headers.get('content-type'), /application\/json/);
      assert.deepEqual(await response.json(), { error: 'API route not found.' });
    });
  } finally {
    await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    for (const key of keys) {
      if (original[key] === undefined) delete process.env[key];
      else process.env[key] = original[key];
    }
  }
});
