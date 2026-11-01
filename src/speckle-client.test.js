import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash, webcrypto } from 'node:crypto';
import {
  createSpeckleClient, pkcePair, projectIdFromUrl, captureReference, setCaptureReference
} from './speckle-client.js';
import { workspacePayload, importWorkspace } from './workspace-store.js';
import { blockWarnings } from './toolbench-data.js';
import { restoreWorkshop } from './workshop-data.js';
import { parquetWriteBuffer } from 'hyparquet-writer';
import { readPropertyTables } from './speckle-properties.js';

const config = {
  serverUrl: 'https://app.speckle.systems', appId: 'bc5cdc2972',
  redirectUrl: 'http://localhost:3000/speckle/callback'
};
const authKey = 'masterbpmn:speckle:auth', pendingKey = 'masterbpmn:speckle:pending';
function fixture(fetcher = async () => { throw new Error('Unexpected network request'); }) {
  const entries = new Map(), redirects = [], cleanups = [];
  const storage = { getItem: key => entries.get(key) ?? null, setItem: (key, value) => entries.set(key, value), removeItem: key => entries.delete(key) };
  const location = { origin: 'http://localhost:3000', pathname: '/', search: '', assign: url => redirects.push(url) };
  let time = 1000000;
  const client = createSpeckleClient({
    config, storage, location, history: { replaceState: (...args) => cleanups.push(args) },
    fetcher, cryptoProvider: webcrypto, now: () => time
  });
  const seed = (userId = 'alice') => storage.setItem(authKey, JSON.stringify({ userId, appId: config.appId, serverUrl: config.serverUrl, token: 'test-token' }));
  return { client, storage, location, seed, redirects, cleanups, advance: milliseconds => { time += milliseconds; } };
}
const response = (data, status = 200) => ({ ok: status >= 200 && status < 300, status, json: async () => data });
const modelPage = (cursor = null) => ({ data: { project: {
  id: 'project1', name: 'Project', models: { cursor, totalCount: cursor ? 30 : 1, items: [{ id: 'model1', name: 'Architecture' }] }
} } });

test('PKCE uses a random 43-character verifier and its RFC 7636 SHA-256 challenge', async () => {
  const first = await pkcePair(webcrypto), second = await pkcePair(webcrypto);
  assert.match(first.verifier, /^[\w-]{43}$/);
  assert.notEqual(first.verifier, second.verifier);
  assert.equal(first.challenge, createHash('sha256').update(first.verifier).digest('base64url'));
});

test('Capture accepts only a full project URL on the selected Speckle server', () => {
  assert.equal(projectIdFromUrl(' https://app.speckle.systems/projects/5616d1c8e8 '), '5616d1c8e8');
  for (const url of [
    '5616d1c8e8', 'https://evil.test/projects/5616d1c8e8', 'https://app.speckle.systems/workspaces/abd-26',
    'https://app.speckle.systems/projects/x/models/y', 'https://user:password@app.speckle.systems/projects/x',
    'https://app.speckle.systems/projects/x?token=example', 'https://app.speckle.systems/projects/x#fragment'
  ]) assert.throws(() => projectIdFromUrl(url));
});

test('Connect requires a signed-in app account and matching registered callback origin', async () => {
  const f = fixture();
  await assert.rejects(f.client.connect(), /Sign in/);
  f.client.setUser('alice');
  f.location.origin = 'http://localhost:4317';
  await assert.rejects(f.client.connect(), /registered/);
  assert.equal(f.redirects.length, 0);
});

test('authorization redirects with PKCE, binds a pending request to the account and stores no secret', async () => {
  const f = fixture();
  f.client.setUser('alice');
  await f.client.connect();
  const pending = JSON.parse(f.storage.getItem(pendingKey));
  assert.equal(pending.userId, 'alice');
  const url = new URL(f.redirects[0]);
  assert.equal(url.origin, config.serverUrl);
  assert.equal(url.searchParams.get('code_challenge_method'), 'S256');
  assert.equal(url.pathname.split('/').at(-1), createHash('sha256').update(pending.verifier).digest('base64url'));
  assert.equal(f.storage.getItem(authKey), null);
  assert.equal(url.href.includes(pending.verifier), false);
});

test('callback exchanges only app ID, code and verifier; strips code and discards refresh token', async () => {
  let submitted;
  const f = fixture(async (url, options) => {
    assert.equal(url, `${config.serverUrl}/oauth/token`);
    assert.equal(f.cleanups.length, 1);
    assert.equal(f.storage.getItem(pendingKey), null);
    submitted = JSON.parse(options.body);
    return response({ token: 'result-token', refreshToken: 'never-retained' });
  });
  f.client.setUser('alice');
  await f.client.connect();
  const pending = JSON.parse(f.storage.getItem(pendingKey));
  f.location.pathname = '/speckle/callback';
  f.location.search = '?access_code=one-time-code';
  assert.equal(await f.client.completeCallback(), true);
  assert.deepEqual(submitted, { appId: config.appId, accessCode: 'one-time-code', codeVerifier: pending.verifier });
  const stored = f.storage.getItem(authKey);
  assert.equal(stored.includes('never-retained'), false);
  assert.equal(stored.includes('one-time-code'), false);
  assert.equal(f.client.connected(), true);
  await assert.rejects(f.client.completeCallback(), /no matching/);
});

test('callback rejects missing, expired, denied and account-mismatched requests without a token exchange', async () => {
  for (const scenario of ['missing', 'expired', 'account', 'denied']) {
    const f = fixture();
    f.client.setUser('alice');
    await f.client.connect();
    f.location.pathname = '/speckle/callback';
    f.location.search = '?access_code=code';
    if (scenario === 'missing') f.storage.removeItem(pendingKey);
    if (scenario === 'expired') f.advance(600001);
    if (scenario === 'account') f.client.setUser('bob');
    if (scenario === 'denied') f.location.search = '?error=access_denied';
    await assert.rejects(f.client.completeCallback());
    assert.equal(f.storage.getItem(pendingKey), null);
    assert.equal(f.cleanups[0][2], '/');
    assert.equal(f.client.connected(), false);
  }
});

test('account changes and disconnect clear Speckle credentials without touching workspace drafts', async () => {
  const f = fixture();
  f.storage.setItem('masterbpmn:ARC-01:recovery:alice', 'draft');
  f.seed();
  f.client.setUser('alice');
  assert.equal(f.client.connected(), true);
  f.client.setUser('bob');
  assert.equal(f.client.connected(), false);
  assert.equal(f.storage.getItem(authKey), null);
  f.seed('bob');
  f.client.setUser(null);
  assert.equal(f.storage.getItem(authKey), null);
  f.seed('alice');
  f.client.setUser('alice');
  f.client.disconnect();
  assert.equal(f.storage.getItem('masterbpmn:ARC-01:recovery:alice'), 'draft');
});

test('GraphQL queries use exact project/model IDs, bounded pages and explicit cursors', async () => {
  const requests = [];
  const f = fixture(async (url, options) => {
    assert.equal(url, `${config.serverUrl}/graphql`);
    assert.equal(options.headers.Authorization, 'Bearer test-token');
    const body = JSON.parse(options.body);
    requests.push(body);
    if (body.query.includes('CaptureModels')) return response(modelPage('next'));
    return response({ data: { project: { id: 'project1', model: { id: 'model1', versions: {
      totalCount: 1, cursor: null, items: [{ id: 'v1', createdAt: '2026-11-01T12:00:00Z', message: 'Published' }]
    } } } } });
  });
  f.seed(); f.client.setUser('alice');
  const models = await f.client.models('project1');
  assert.equal(models.project.name, 'Project');
  await f.client.models('project1', models.cursor);
  assert.deepEqual(requests[1].variables, { projectId: 'project1', cursor: 'next' });
  const versions = await f.client.versions('project1', 'model1');
  assert.equal(versions.items[0].id, 'v1');
  assert.deepEqual(requests[2].variables, { projectId: 'project1', modelId: 'model1', cursor: null });
  assert.match(requests[0].query, /limit: 25/);
});

test('API errors, partial GraphQL failures and invalid collections are never successful empty results', async () => {
  for (const result of [
    response(null, 503), response({ data: modelPage().data, errors: [{ message: 'denied' }] }),
    response({ data: { project: { id: 'project1', name: 'Project', models: null } } }),
    response({ data: { project: { id: 'wrong', name: 'Project', models: {} } } })
  ]) {
    const f = fixture(async () => result);
    f.seed(); f.client.setUser('alice');
    await assert.rejects(f.client.models('project1'));
  }
  const f = fixture(async () => response(null, 401));
  f.seed(); f.client.setUser('alice');
  await assert.rejects(f.client.models('project1'), /expired|revoked/);
  assert.equal(f.client.connected(), false);
});

test('responses cannot be used after an account change during request or JSON parsing', async () => {
  for (const stage of ['response', 'json']) {
    let release;
    const blocked = new Promise(resolve => { release = resolve; });
    const f = fixture(async () => {
      if (stage === 'response') await blocked;
      return { ok: true, status: 200, json: async () => {
        if (stage === 'json') await blocked;
        return modelPage();
      } };
    });
    f.seed(); f.client.setUser('alice');
    const query = f.client.models('project1');
    await new Promise(resolve => setImmediate(resolve));
    f.client.setUser('bob');
    release();
    await assert.rejects(query, /connection changed/);
  }
});

test('Capture stores a pinned model reference without tokens and preserves socket IDs, legacy records and XML on export/import', () => {
  const reference = captureReference({ id: 'project1', name: 'Building' }, { id: 'model1', name: 'Architecture' },
    { id: 'v1', createdAt: '2026-11-01T12:00:00Z', message: 'Published' });
  const node = { id: 'capture1', functionId: 'speckle.capture-model', category: 'Capture',
    inputs: [], outputs: [{ id: 'stable-output', label: '' }] };
  setCaptureReference(node, reference);
  setCaptureReference(node, { ...reference, versionId: 'v2' });
  assert.equal(node.outputs[0].id, 'stable-output');
  assert.match(node.outputs[0].label, /Architecture @ v2/);
  const records = restoreWorkshop({ toolbenchNodes: [node], evidence: [{ id: 'archived' }] });
  const saved = workspacePayload('ARC-01', records, { general: '<general/>', scoped: '<scoped/>' });
  assert.deepEqual(importWorkspace(JSON.parse(JSON.stringify(saved)), 'ARC-01', {}), saved);
  assert.equal(JSON.stringify(saved).includes('token'), false);
  assert.equal(blockWarnings(node.id, records).includes('Capture version not selected'), false);
  delete node.capture;
  assert.equal(blockWarnings(node.id, records).includes('Capture version not selected'), true);
  assert.throws(() => captureReference({}, {}, {}), /Choose a valid/);
});

const propertyReference = { serverUrl: config.serverUrl, projectId: 'p1', modelId: 'm1', versionId: 'v1' };
const versionData = schemaVersion => ({ data: { project: { id: 'p1', model: { id: 'm1', version: {
  id: 'v1', schemaVersion, referencedObject: schemaVersion === 3 ? 'bundle.example' : 'oldObject'
} } } } });
function propertyFiles() {
  const columns = {
    objects: [{ name: 'object_index', type: 'INT32', data: [0] }, { name: 'application_id', type: 'STRING', data: ['window-guid'] }],
    paths: [{ name: 'path_index', type: 'INT32', data: [0] }, { name: 'path', type: 'STRING', data: ['properties.Attributes.type'] }],
    eav: [
      { name: 'object_index', type: 'INT32', data: [0] }, { name: 'path_index', type: 'INT32', data: [0] },
      { name: 'value_string', type: 'STRING', data: ['IfcWindow'] },
      { name: 'future_column', type: 'STRING', data: ['ignored'] }
    ]
  };
  const buffers = Object.fromEntries(Object.entries(columns).map(([name, columnData]) => [name, parquetWriteBuffer({ columnData })]));
  const files = Object.keys(columns).map(name => ({ name: `source-ifc.eav.${name}.parquet`, url: `https://files.example/${name}?signed=temporary` }));
  files.push({ name: 'source-ifc.geometries.parquet', url: 'https://files.example/geometry' });
  return { buffers, files };
}

test('pinned bundle properties decode real Parquet by column name, without geometry or token forwarding', async () => {
  const { buffers, files } = propertyFiles(), requests = [];
  const f = fixture(async (url, options) => {
    requests.push(url);
    if (url.endsWith('/graphql')) {
      assert.deepEqual(JSON.parse(options.body).variables, { projectId: 'p1', modelId: 'm1', versionId: 'v1' });
      assert.match(JSON.parse(options.body).query, /schemaVersion referencedObject/);
      return response(versionData(3));
    }
    if (url.endsWith('/artifacts')) {
      assert.equal(url, `${config.serverUrl}/api/v2/projects/p1/models/m1/versions/v1/artifacts`);
      assert.equal(options.headers.Authorization, 'Bearer test-token');
      return response({ files });
    }
    assert.equal(options.headers, undefined);
    assert.equal(options.credentials, 'omit');
    assert.equal(options.referrerPolicy, 'no-referrer');
    return new Response(buffers[new URL(url).pathname.slice(1)]);
  });
  f.seed(); f.client.setUser('alice');
  const data = await f.client.readProperties(propertyReference);
  assert.deepEqual(data.objects, [{ object_index: 0, application_id: 'window-guid' }]);
  assert.deepEqual(data.eav, [{ object_index: 0, path_index: 0, value_string: 'IfcWindow' }]);
  assert.equal(requests.length, 5);
  assert.equal(requests.some(url => url.includes('geometry')), false);
  assert.equal(JSON.stringify(data).includes('signed'), false);
});

test('unsupported version errors identify schema and reference format without disclosing reference contents', async () => {
  for (const [schemaVersion, referencedObject, format] of [
    [2, 'a'.repeat(32), 'object-hash'],
    [4, 'a'.repeat(32), 'object-hash'],
    [null, 'bundle.private-reference', 'bundle'],
    [4, 'bundle.private-reference', 'bundle']
  ]) {
    const data = versionData(schemaVersion);
    data.data.project.model.version.referencedObject = referencedObject;
    const f = fixture(async () => response(data));
    f.seed(); f.client.setUser('alice');
    await assert.rejects(f.client.readProperties(propertyReference), error => {
      assert.ok(error.message.includes(`schemaVersion=${schemaVersion}; reference=${format}`));
      assert.equal(error.message.includes(referencedObject), false);
      return true;
    });
  }
});

test('unsupported versions, denied artifacts, missing/ambiguous tables and malformed Parquet fail explicitly', async () => {
  const { files } = propertyFiles();
  for (const schema of [null, 2, 4]) {
    const f = fixture(async () => response(versionData(schema)));
    f.seed(); f.client.setUser('alice');
    await assert.rejects(f.client.readProperties(propertyReference), error => {
      assert.match(error.message, /unsupported or invalid model data format/);
      assert.ok(error.message.includes(`schemaVersion=${schema}`));
      assert.ok(error.message.includes('reference=unrecognised string (9 characters)'));
      return true;
    });
  }
  for (const status of [401, 403, 404]) {
    const f = fixture(async url => url.endsWith('/graphql') ? response(versionData(3)) : response(null, status));
    f.seed(); f.client.setUser('alice');
    await assert.rejects(f.client.readProperties(propertyReference), /authorization expired|data-read access/);
    if (status === 401) assert.equal(f.client.connected(), false);
  }
  for (const listing of [[], [...files, files[0]], files.map(file => ({ ...file, url: 'http://insecure.example/file' }))]) {
    await assert.rejects(readPropertyTables(listing, async () => { throw new Error('Must not download'); }, () => {}), /exactly one|invalid property download URL/);
  }
  await assert.rejects(readPropertyTables(files, async () => new Response('not parquet'), () => {}));
  await assert.rejects(readPropertyTables(files, async () => new Response('bad', { headers: { 'content-length': String(32 * 1024 * 1024 + 1) } }), () => {}), /32 MiB/);
  const incomplete = parquetWriteBuffer({ columnData: [{ name: 'not_speckle', type: 'INT32', data: [1] }] });
  await assert.rejects(readPropertyTables(files, async () => new Response(incomplete), () => {}), /missing required/);
});

test('account changes during artifact listing, download and streamed body invalidate all property results', async () => {
  for (const stage of ['listing', 'download', 'body']) {
    const { buffers, files } = propertyFiles();
    let release, blockedAt;
    const blocked = new Promise(resolve => { release = resolve; });
    const reached = new Promise(resolve => { blockedAt = resolve; });
    const f = fixture(async url => {
      if (url.endsWith('/graphql')) return response(versionData(3));
      if (url.endsWith('/artifacts')) return { ok: true, status: 200, json: async () => {
        if (stage === 'listing') { blockedAt(); await blocked; }
        return { files };
      } };
      if (stage === 'download') { blockedAt(); await blocked; }
      if (stage === 'body') return new Response(new ReadableStream({
        async start(controller) {
          blockedAt(); await blocked;
          controller.enqueue(new Uint8Array(buffers[new URL(url).pathname.slice(1)]));
          controller.close();
        }
      }));
      return new Response(buffers[new URL(url).pathname.slice(1)]);
    });

    f.seed(); f.client.setUser('alice');
    const reading = f.client.readProperties(propertyReference);
    await reached;
    f.client.setUser('bob');
    release();
    await assert.rejects(reading, /connection changed/);
  }
});

test('32 MiB file boundary is accepted, while a streamed next byte fails even without Content-Length', async () => {
  const { buffers, files } = propertyFiles(), limit = 32 * 1024 * 1024;
  const boundary = new Uint8Array(limit);
  boundary.set(new Uint8Array(buffers.objects));
  // Keep the original page offsets valid and place a duplicate footer at the boundary.
  boundary.set(new Uint8Array(buffers.objects), limit - buffers.objects.byteLength);
  const fetcher = async url => {
    const name = new URL(url).pathname.slice(1);
    return new Response(name === 'objects' ? boundary : buffers[name]);
  };
  assert.deepEqual((await readPropertyTables(files, fetcher, () => {})).objects, [
    { object_index: 0, application_id: 'window-guid' }
  ]);
  let cancelled = false;
  await assert.rejects(readPropertyTables(files, async url => {
    if (!url.includes('/objects?')) return new Response(buffers[new URL(url).pathname.slice(1)]);
    return new Response(new ReadableStream({
      start(controller) { controller.enqueue(boundary); controller.enqueue(new Uint8Array(1)); },
      cancel() { cancelled = true; }
    }));
  }, () => {}), /32 MiB/);
  assert.equal(cancelled, true);
});

const legacyRoot = '0123456789abcdef0123456789abcdef';
const legacyVersion = () => {
  const value = versionData(null);
  value.data.project.model.version.referencedObject = legacyRoot;
  return value;
};
const legacyPage = (objects, cursor, totalCount = 2) => ({ data: { project: { id: 'p1', object: {
  id: legacyRoot, data: { speckle_type: 'Speckle.Core.Models.Collection' },
  children: { objects, cursor, totalCount }
} } } });
const legacyObject = (id, applicationId, type = 'IfcWindow') => ({
  id, applicationId, data: { properties: { Attributes: { type, GlobalId: applicationId } } }
});

test('older pinned object graphs read all projected property pages through project.object, preserving IFC GUIDs', async () => {
  const requests = [];
  const f = fixture(async (url, options) => {
    assert.equal(url, `${config.serverUrl}/graphql`);
    const body = JSON.parse(options.body);
    requests.push(body);
    if (body.query.includes('CapturePropertiesVersion')) return response(legacyVersion());
    assert.match(body.query, /object\(id: \$objectId\)/);
    assert.match(body.query, /limit: 250, depth: 100000/);
    assert.match(body.query, /select: \["applicationId", "properties"/);
    assert.equal(body.query.includes('displayValue'), false);
    assert.equal(body.query.includes('stream('), false);
    return response(legacyPage([legacyObject(body.variables.cursor ? 'object2' : 'object1', 'same-guid')], body.variables.cursor ? null : 'next'));
  });
  f.seed(); f.client.setUser('alice');
  const data = await f.client.readProperties(propertyReference);
  assert.equal(requests.length, 3);
  assert.deepEqual(requests[1].variables, { projectId: 'p1', objectId: legacyRoot, cursor: null, includeRoot: true });
  assert.deepEqual(requests[2].variables, { projectId: 'p1', objectId: legacyRoot, cursor: 'next', includeRoot: false });
  assert.equal(data.objects.length, 3);
  assert.equal(data.objects[1].application_id, 'same-guid');
  assert.equal(data.paths.some(row => row.path === 'properties.Attributes.type'), true);
});

test('schema 3 versions with object-hash references use projected object properties, not bundle artifacts', async () => {
  const requests = [];
  const f = fixture(async (url, options) => {
    assert.equal(url, `${config.serverUrl}/graphql`);
    const body = JSON.parse(options.body);
    requests.push(body);
    if (body.query.includes('CapturePropertiesVersion')) {
      const version = legacyVersion();
      version.data.project.model.version.schemaVersion = 3;
      return response(version);
    }
    assert.equal(body.variables.objectId, legacyRoot);
    return response(legacyPage([legacyObject('window1', 'window-guid')], null, 1));
  });
  f.seed(); f.client.setUser('alice');
  const data = await f.client.readProperties(propertyReference);
  assert.equal(requests.length, 2);
  assert.equal(data.objects[1].application_id, 'window-guid');
  assert.equal(data.paths.some(row => row.path === 'properties.Attributes.type'), true);
  assert.equal(data.eav.some(row => row.value_string === 'IfcWindow'), true);
});

test('object-property progress reports waiting pages, received totals and table preparation', async () => {
  const progress = [];
  let release, reached;
  const blocked = new Promise(resolve => { release = resolve; });
  const started = new Promise(resolve => { reached = resolve; });
  const f = fixture(async (url, options) => {
    const body = JSON.parse(options.body);
    if (body.query.includes('CapturePropertiesVersion')) return response(legacyVersion());
    if (!body.variables.cursor) return response(legacyPage([legacyObject('object1', 'guid1')], 'next'));
    reached();
    await blocked;
    return response(legacyPage([legacyObject('object2', 'guid2')], null));
  });
  f.seed(); f.client.setUser('alice');
  const reading = f.client.readProperties(propertyReference, message => progress.push(message));
  await started;
  assert.ok(progress.includes('Read object-property page 1: 1/2 child objects received.'));
  assert.equal(progress.at(-1), 'Reading object-property page 2: 1/2 child objects received...');
  release();
  const data = await reading;
  assert.equal(data.objects.length, 3);
  assert.ok(progress.includes('Read object-property page 2: 2/2 child objects received.'));
  assert.equal(progress.at(-1), 'Preparing IFC property tables from 3 objects...');
});

test('object-property request and response-body timeouts report the 20-second limit without partial results', async t => {
  let controller;
  t.mock.method(AbortSignal, 'timeout', milliseconds => {
    assert.equal(milliseconds, 20000);
    controller = new AbortController();
    return controller.signal;
  });
  for (const stage of ['request', 'body']) {
    let reached;
    const started = new Promise(resolve => { reached = resolve; });
    const f = fixture(async (url, options) => {
      if (JSON.parse(options.body).query.includes('CapturePropertiesVersion')) return response(legacyVersion());
      const waitForAbort = () => new Promise((resolve, reject) => {
        options.signal.addEventListener('abort', () => reject(options.signal.reason), { once: true });
        reached();
      });
      if (stage === 'request') return waitForAbort();
      return { ok: true, status: 200, json: waitForAbort };
    });
    f.seed(); f.client.setUser('alice');
    const reading = f.client.readProperties(propertyReference);
    await started;
    controller.abort(new DOMException('Timed out', 'TimeoutError'));
    await assert.rejects(reading, /within 20 seconds.*No partial properties/);
  }
});

test('legacy property pagination rejects missing pages, cycles, duplicates, changed counts and oversized graphs', async () => {
  for (const scenario of ['missing-cursor', 'cycle', 'duplicate', 'changed', 'oversize', 'missing-data']) {
    let pages = 0;
    const f = fixture(async (url, options) => {
      if (JSON.parse(options.body).query.includes('CapturePropertiesVersion')) return response(legacyVersion());
      pages++;
      if (scenario === 'oversize') return response(legacyPage([], null, 100000));
      if (scenario === 'missing-data') return response(legacyPage([{ id: 'object1', data: null }], null, 1));
      if (scenario === 'missing-cursor') return response(legacyPage([legacyObject('object1', 'guid1')], null));
      if (scenario === 'cycle') return response(legacyPage([legacyObject(`object${pages}`, `guid${pages}`)], 'same', 3));
      if (scenario === 'duplicate') return response(legacyPage([legacyObject('object1', 'guid1')], pages === 1 ? 'next' : null));
      return response(legacyPage([legacyObject(`object${pages}`, `guid${pages}`)], 'next', pages === 1 ? 2 : 3));
    });
    f.seed(); f.client.setUser('alice');
    await assert.rejects(f.client.readProperties(propertyReference), /incomplete|duplicate|changed|limit|without readable/);
  }
});

test('account changes while reading an old object-graph page discard all accumulated properties', async () => {
  let release, reached;
  const blocked = new Promise(resolve => { release = resolve; });
  const started = new Promise(resolve => { reached = resolve; });
  const f = fixture(async (url, options) => {
    if (JSON.parse(options.body).query.includes('CapturePropertiesVersion')) return response(legacyVersion());
    return { ok: true, status: 200, json: async () => {
      reached(); await blocked;
      return legacyPage([legacyObject('object1', 'guid1')], null, 1);
    } };
  });
  f.seed(); f.client.setUser('alice');
  const reading = f.client.readProperties(propertyReference);
  await started;
  f.client.setUser('bob');
  release();
  await assert.rejects(reading, /connection changed/);
});

test('legacy root properties accept exactly 32 MiB and reject the next UTF-8 byte before returning data', async () => {
  const limit = 32 * 1024 * 1024;
  for (const extra of [0, 1]) {
    const page = legacyPage([], '', 0), root = page.data.project.object;
    root.applicationId = 'root-guid';
    root.data = { properties: { Attributes: { type: 'IfcWindow' } }, padding: '' };
    const overhead = new TextEncoder().encode(JSON.stringify([root.data, []])).length;
    root.data.padding = 'x'.repeat(limit - overhead + extra);
    const f = fixture(async (url, options) => response(JSON.parse(options.body).query.includes('CapturePropertiesVersion') ? legacyVersion() : page));
    f.seed(); f.client.setUser('alice');
    if (extra) await assert.rejects(f.client.readProperties(propertyReference), /32 MiB/);
    else assert.equal((await f.client.readProperties(propertyReference)).objects[0].application_id, 'root-guid');
  }
});
