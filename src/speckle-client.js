import { objectPropertyTables } from './speckle-object-properties.js';

const authKey = 'masterbpmn:speckle:auth';
const pendingKey = 'masterbpmn:speckle:pending';
const callbackPath = '/speckle/callback';

export const isCapture = node => node?.functionId === 'speckle.capture-model';

export function projectIdFromUrl(value, serverUrl = 'https://app.speckle.systems') {
  let url;
  try { url = new URL(value.trim()); }
  catch { throw new Error('Enter a full Speckle project URL.'); }
  if (url.origin !== serverUrl || !/^\/projects\/[a-zA-Z0-9]+\/?$/.test(url.pathname) ||
      url.username || url.password || url.search || url.hash) {
    throw new Error(`Use a project URL such as ${serverUrl}/projects/5616d1c8e8, not a workspace or model URL.`);
  }
  return url.pathname.split('/')[2];
}

export function captureReference(project, model, version, serverUrl = 'https://app.speckle.systems') {
  if (![project, model, version].every(item => typeof item?.id === 'string' && item.id) ||
      typeof project.name !== 'string' || typeof model.name !== 'string' ||
      !Number.isFinite(Date.parse(version.createdAt))) {
    throw new Error('Choose a valid project, model and exact version before saving the Capture block.');
  }
  return {
    serverUrl, projectId: project.id, projectName: project.name,
    modelId: model.id, modelName: model.name, versionId: version.id,
    versionCreatedAt: version.createdAt, versionMessage: version.message || ''
  };
}

export function setCaptureReference(node, reference) {
  if (!isCapture(node) || node.outputs.length !== 1) throw new Error('Invalid Capture block.');
  node.capture = reference;
  // Keep the socket ID stable: changing the selected version must not delete wires.
  node.outputs[0].label = `${reference.modelName} @ ${reference.versionId}`;
}

function base64url(bytes) {
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function pkcePair(cryptoProvider = globalThis.crypto) {
  const verifier = base64url(cryptoProvider.getRandomValues(new Uint8Array(32)));
  const digest = await cryptoProvider.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  return { verifier, challenge: base64url(new Uint8Array(digest)) };
}

const modelsQuery = `query CaptureModels($projectId: String!, $cursor: String) {
  project(id: $projectId) {
    id name
    models(limit: 25, cursor: $cursor) { totalCount cursor items { id name } }
  }
}`;
const versionsQuery = `query CaptureVersions($projectId: String!, $modelId: String!, $cursor: String) {
  project(id: $projectId) {
    id
    model(id: $modelId) {
      id
      versions(limit: 25, cursor: $cursor) { totalCount cursor items { id createdAt message } }
    }
  }
}`;
const versionQuery = `query CapturePropertiesVersion($projectId: String!, $modelId: String!, $versionId: String!) {
  project(id: $projectId) {
    id model(id: $modelId) { id version(id: $versionId) { id schemaVersion referencedObject } }
  }
}`;
const objectPropertiesQuery = `query CaptureObjectProperties($projectId: String!, $objectId: String!, $cursor: String, $includeRoot: Boolean!) {
  project(id: $projectId) {
    id
    object(id: $objectId) {
      id applicationId @include(if: $includeRoot) data @include(if: $includeRoot)
      children(limit: 250, depth: 100000, cursor: $cursor,
        select: ["applicationId", "properties", "@properties", "Attributes", "attributes", "type", "GlobalId"]) {
        totalCount cursor objects { id applicationId data }
      }
    }
  }
}`;

export function createSpeckleClient({
  config, storage, location, history, fetcher = fetch, cryptoProvider = globalThis.crypto,
  now = Date.now, onChange = () => {}
}) {
  let userId = null, token = null, epoch = 0;
  function disconnect() {
    token = null;
    ++epoch;
    storage.removeItem(authKey);
    storage.removeItem(pendingKey);
    onChange();
  }
  function setUser(id) {
    if (id === userId) {
      if (!id) storage.removeItem(authKey);
      return;
    }
    if (userId) storage.removeItem(pendingKey);
    token = null;
    ++epoch;
    userId = id;
    const saved = storage.getItem(authKey);
    if (saved) {
      let auth;
      try { auth = JSON.parse(saved); }
      catch { disconnect(); throw new Error('Unreadable Speckle session was removed. Connect Speckle again.'); }
      if (id && auth.userId === id && auth.appId === config.appId && auth.serverUrl === config.serverUrl &&
          typeof auth.token === 'string' && auth.token) token = auth.token;
      else storage.removeItem(authKey);
    }
    onChange();
  }
  async function connect() {
    if (!userId) throw new Error('Sign in to MasterBPMN before connecting Speckle.');
    const redirect = new URL(config.redirectUrl);
    if (redirect.origin !== location.origin || redirect.pathname !== callbackPath || redirect.search || redirect.hash) {
      throw new Error(`This Speckle app is registered for ${config.redirectUrl}. Open that origin, or register a matching callback and configure SPECKLE_REDIRECT_URL.`);
    }
    const owner = userId, startedEpoch = epoch;
    const { verifier, challenge } = await pkcePair(cryptoProvider);
    if (owner !== userId || startedEpoch !== epoch) throw new Error('Your account changed. Connect Speckle again.');
    storage.setItem(pendingKey, JSON.stringify({
      verifier, userId, appId: config.appId, origin: location.origin, startedAt: now()
    }));
    const url = new URL(`/authn/verify/${encodeURIComponent(config.appId)}/${challenge}`, config.serverUrl);
    url.searchParams.set('code_challenge_method', 'S256');
    location.assign(url.href);
  }
  async function completeCallback() {
    if (location.pathname !== callbackPath) return false;
    const params = new URLSearchParams(location.search);
    // Strip the one-time code before any further work or page navigation.
    history.replaceState(null, '', '/');
    const raw = storage.getItem(pendingKey);
    storage.removeItem(pendingKey);
    if (params.has('error')) throw new Error('Speckle authorization was declined or failed. Connect Speckle to try again.');
    const code = params.get('access_code');
    if (!raw || !code || !userId) throw new Error('Speckle authorization has no matching signed-in browser request. Sign in, then Connect Speckle again.');
    const pending = JSON.parse(raw);
    if (pending.userId !== userId || pending.appId !== config.appId || pending.origin !== location.origin ||
        !Number.isFinite(pending.startedAt) || now() - pending.startedAt > 10 * 60 * 1000 ||
        now() < pending.startedAt || !/^[\w-]{43}$/.test(pending.verifier)) {
      throw new Error('Speckle authorization expired or belongs to another account. Connect Speckle again.');
    }
    const startedEpoch = epoch, owner = userId;
    const response = await fetcher(`${config.serverUrl}/oauth/token`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ appId: config.appId, accessCode: code, codeVerifier: pending.verifier }),
      signal: AbortSignal.timeout(20000)
    });
    if (!response.ok) throw new Error(`Speckle authorization failed (${response.status}). Connect again; check the registered callback and read scopes.`);
    const result = await response.json();
    if (typeof result.token !== 'string' || !result.token) throw new Error('Speckle did not return an access token. Connect again.');
    if (startedEpoch !== epoch || owner !== userId) throw new Error('Your account changed during Speckle authorization. Connect again.');
    storage.setItem(authKey, JSON.stringify({ userId, appId: config.appId, serverUrl: config.serverUrl, token: result.token }));
    token = result.token;
    ++epoch;
    onChange();
    return true;
  }
  async function query(document, variables) {
    if (!token || !userId) throw new Error('Connect Speckle before reading projects and models.');
    const startedEpoch = epoch;
    const signal = AbortSignal.timeout(20000);
    try {
      const response = await fetcher(`${config.serverUrl}/graphql`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ query: document, variables }), signal
      });
      if (startedEpoch !== epoch) throw new Error('The Speckle connection changed. Read the project again.');
      if (response.status === 401) {
        disconnect();
        throw new Error('Speckle authorization expired or was revoked. Connect Speckle again.');
      }
      if (!response.ok) throw new Error(`Speckle request failed (${response.status}). Check access and connection, then retry.`);
      const result = await response.json();
      if (startedEpoch !== epoch) throw new Error('The Speckle connection changed. Read the project again.');
      if (result.errors?.length) {
        throw new Error('Speckle could not read this project/model. Check project permissions and the app read scopes (Core, Model and any required version scope). No saved Capture reference was changed.');
      }
      if (!result.data) throw new Error('Speckle returned no project data.');
      return result.data;
    } catch (error) {
      if (signal.aborted && signal.reason?.name === 'TimeoutError') {
        throw new Error('Speckle did not finish this request within 20 seconds. No partial properties were captured. Retry Read model properties.');
      }
      throw error;
    }
  }
  function collection(page, fields) {
    if (!page || !Array.isArray(page.items) || !Number.isInteger(page.totalCount) ||
        !(page.cursor === null || typeof page.cursor === 'string') ||
        !page.items.every(item => fields.every(field => typeof item?.[field] === 'string' && item[field]))) {
      throw new Error('Speckle returned an unexpected collection. No saved Capture reference was changed.');
    }
    return page;
  }
  async function readObjectProperties(projectId, objectId, checkConnection, report) {
    const rows = [], ids = new Set(), cursors = new Set();
    let cursor = null, expectedCount = null, size = 0, pageNumber = 0;
    do {
      checkConnection();
      ++pageNumber;
      report(`Reading object-property page ${pageNumber}: ${ids.size}${expectedCount === null ? '' : `/${expectedCount}`} child objects received...`);
      const data = await query(objectPropertiesQuery, { projectId, objectId, cursor, includeRoot: cursor === null });
      checkConnection();
      const root = data.project?.object, page = root?.children;
      if (data.project?.id !== projectId || root?.id !== objectId || !page || !Array.isArray(page.objects) ||
          !Number.isInteger(page.totalCount) || page.totalCount < 0 ||
          !(page.cursor === null || typeof page.cursor === 'string')) {
        throw new Error('Speckle returned an invalid object-graph property page.');
      }
      if (page.totalCount > 99999) throw new Error('The object graph exceeds the 100,000 object browser limit (including its root).');
      if (expectedCount !== null && page.totalCount !== expectedCount) throw new Error('The object-graph result changed during pagination. Read the model again.');
      expectedCount = page.totalCount;
      size += new TextEncoder().encode(JSON.stringify(cursor === null ? [root.data, page.objects] : page.objects)).length;
      if (size > 32 * 1024 * 1024) throw new Error('The object-graph properties exceed the 32 MiB browser limit.');
      if (cursor === null) rows.push({ id: root.id, applicationId: root.applicationId, data: root.data });
      for (const row of page.objects) {
        if (typeof row?.id !== 'string' || !row.id || ids.has(row.id) || row.id === root.id) {
          throw new Error('Speckle returned duplicate or invalid child object IDs. No partial count was produced.');
        }
        ids.add(row.id);
        rows.push(row);
      }
      if (ids.size > expectedCount || page.objects.length > 250) throw new Error('Speckle returned an inconsistent object-graph page.');
      report(`Read object-property page ${pageNumber}: ${ids.size}/${expectedCount} child objects received.`);
      cursor = page.cursor;
      if (ids.size === expectedCount) break;
      if (!cursor || !page.objects.length || cursors.has(cursor)) throw new Error('The object-graph property read is incomplete. No partial count was produced.');
      cursors.add(cursor);
    } while (cursor);
    checkConnection();
    report(`Preparing IFC property tables from ${rows.length} objects...`);
    return objectPropertyTables(rows);
  }
  async function readProperties(reference, onProgress = () => {}) {
    if (reference?.serverUrl !== config.serverUrl ||
        !['projectId', 'modelId', 'versionId'].every(key => typeof reference?.[key] === 'string' && /^[a-zA-Z0-9]+$/.test(reference[key]))) {
      throw new Error('Choose a valid pinned Speckle model version.');
    }
    const startedEpoch = epoch;
    const checkConnection = () => {
      if (startedEpoch !== epoch || !token || !userId) throw new Error('The Speckle connection changed. Read model properties again.');
    };
    const { projectId, modelId, versionId } = reference;
    const report = message => {
      console.info('[MasterBPMN Speckle] property read progress', { projectId, modelId, versionId, message });
      onProgress(message);
    };
    report('Resolving the pinned model version...');
    console.info('[MasterBPMN Speckle] property read resolving version', { projectId, modelId, versionId });
    const data = await query(versionQuery, { projectId, modelId, versionId });
    const version = data.project?.model?.version;
    if (data.project?.id !== projectId || data.project.model?.id !== modelId || version?.id !== versionId) {
      throw new Error('The selected model version is missing or inaccessible.');
    }
    if ((version.schemaVersion === null || version.schemaVersion === 3) &&
        typeof version.referencedObject === 'string' && /^[a-f0-9]{32}$/i.test(version.referencedObject)) {
      console.info('[MasterBPMN Speckle] property read format', { projectId, modelId, versionId, format: 'object-graph' });
      return readObjectProperties(projectId, version.referencedObject, checkConnection, report);
    }
    if (version.schemaVersion !== 3 || typeof version.referencedObject !== 'string' || !version.referencedObject.startsWith('bundle.')) {
      const schemaVersion = version.schemaVersion === null ? 'null' :
        typeof version.schemaVersion === 'number' ? String(version.schemaVersion) : `unexpected ${typeof version.schemaVersion}`;
      const referenceFormat = typeof version.referencedObject !== 'string' ? `unexpected ${typeof version.referencedObject}` :
        /^[a-f0-9]{32}$/i.test(version.referencedObject) ? 'object-hash' :
        version.referencedObject.startsWith('bundle.') ? 'bundle' : `unrecognised string (${version.referencedObject.length} characters)`;
      throw new Error(`Speckle returned an unsupported or invalid model data format (schemaVersion=${schemaVersion}; reference=${referenceFormat}). No properties were captured.`);
    }
    console.info('[MasterBPMN Speckle] property read format', { projectId, modelId, versionId, format: 'bundle' });
    checkConnection();
    report('Reading the bundle artifact listing...');
    const response = await fetcher(`${config.serverUrl}/api/v2/projects/${projectId}/models/${modelId}/versions/${versionId}/artifacts`, {
      headers: { Authorization: `Bearer ${token}` }, credentials: 'omit', signal: AbortSignal.timeout(20000)
    });
    checkConnection();
    if (response.status === 401) {
      disconnect();
      throw new Error('Speckle authorization expired. Connect Speckle again.');
    }
    if (!response.ok) throw new Error(`Unable to read model artifacts (${response.status}). Check project data-read access and app scopes, then retry.`);
    const listing = await response.json();
    checkConnection();
    const { readPropertyTables } = await import('./speckle-properties.js');
    checkConnection();
    report('Downloading and decoding bundle property tables...');
    return readPropertyTables(listing.files, fetcher, checkConnection);
  }
  return {
    setUser, connect, completeCallback, disconnect, readProperties,
    connected: () => !!token && !!userId,
    async models(projectId, cursor = null) {
      const data = await query(modelsQuery, { projectId, cursor });
      if (data.project?.id !== projectId || typeof data.project.name !== 'string') throw new Error('The Speckle project is missing or inaccessible.');
      return { project: { id: data.project.id, name: data.project.name }, ...collection(data.project.models, ['id', 'name']) };
    },
    async versions(projectId, modelId, cursor = null) {
      const data = await query(versionsQuery, { projectId, modelId, cursor });
      if (data.project?.id !== projectId || data.project.model?.id !== modelId) throw new Error('The Speckle model is missing or inaccessible.');
      return collection(data.project.model.versions, ['id', 'createdAt']);
    }
  };
}
