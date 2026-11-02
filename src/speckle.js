import { escapeHtml as html } from './workshop-data.js';
import { createSpeckleClient, projectIdFromUrl, captureReference, setCaptureReference } from './speckle-client.js';

export function mountSpeckle({ container, getUserId, canEdit, getRecords, persist, prepareLeave, feedback, onConnectionChange = () => {} }) {
  const callbackLocation = {
    origin: window.location.origin, pathname: window.location.pathname, search: window.location.search,
    assign: url => window.location.assign(url)
  };
  if (callbackLocation.pathname === '/speckle/callback') window.history.replaceState(null, '', '/');
  container.innerHTML = `<div class="tb-speckle"><span id="speckleStatus">Speckle not connected</span>
    <button id="speckleConnect" class="button">Connect Speckle</button>
    <button id="speckleDisconnect" class="button" hidden>Disconnect Speckle</button></div>`;
  const $ = id => container.querySelector(`#${id}`);
  let client = null, config = null, busy = false, generation = 0, drafts = new Map(), active = null, setupError = '';

  function connectionChanged() {
    ++generation;
    drafts.clear();
    onConnectionChange();
    renderConnection();
    if (active) renderCapture(active.inspector, active.node);
  }
  function renderConnection() {
    const connected = client?.connected();
    $('speckleStatus').textContent = busy ? 'Connecting Speckle...' : setupError || (connected ?
      'Speckle connected (this tab)' : 'Speckle not connected');
    $('speckleConnect').hidden = !!connected;
    $('speckleConnect').disabled = busy || !client || !getUserId();
    $('speckleDisconnect').hidden = !connected;
  }
  $('speckleConnect').addEventListener('click', async () => {
    if (!client || busy) return;
    busy = true;
    renderConnection();
    try {
      if (!await prepareLeave()) return;
      await client.connect();
    } catch (error) { feedback(error.message); }
    finally { busy = false; renderConnection(); }
  });
  $('speckleDisconnect').addEventListener('click', () => {
    try { client.disconnect(); feedback('Speckle disconnected in this tab. Saved model references are unchanged. Revoke the app in Speckle settings to remove its authorization.'); }
    catch (error) { feedback(error.message); }
  });
  renderConnection();

  function state(node) {
    if (!drafts.has(node.id)) drafts.set(node.id, {
      url: node.capture ? `${node.capture.serverUrl}/projects/${node.capture.projectId}` : '',
      project: null, models: [], modelId: '', modelCursor: null, modelTotal: 0,
      versions: [], versionId: '', versionCursor: null, versionTotal: 0, busy: false, message: ''
    });
    return drafts.get(node.id);
  }
  function renderCapture(inspector, node) {
    active = { inspector, node };
    const draft = state(node), saved = node.capture;
    const editable = canEdit();
    const readable = !!client?.connected() && editable && !draft.busy;
    inspector.innerHTML = `<h3>Capture: Speckle model</h3>
      <p>Choose one model and pin an exact version. Only references are captured here; model objects are not downloaded or analysed.</p>
      ${saved ? `<div class="tb-capture-saved"><strong>Applied reference</strong><p>${html(saved.projectName)} / ${html(saved.modelName)}</p>
        <p>Version: ${html(saved.versionId)}<br>${html(saved.versionCreatedAt)}</p>
        <a target="_blank" rel="noopener noreferrer" href="https://app.speckle.systems/projects/${encodeURIComponent(saved.projectId)}/models/${encodeURIComponent(saved.modelId)}">Open model in Speckle</a></div>` :
        '<p class="tb-warning">No model version selected yet.</p>'}
      <form id="captureProjectForm"><label>Speckle project URL<input name="projectUrl" type="url" required placeholder="https://app.speckle.systems/projects/..." value="${html(draft.url)}" ${!readable ? 'disabled' : ''}></label>
        <button class="button" ${!readable ? 'disabled' : ''}>Load models</button></form>
      ${draft.project ? `<p>${html(draft.project.name)} (${draft.models.length}/${draft.modelTotal} models)</p>
        <label>Model<select id="captureModel" ${!readable ? 'disabled' : ''}><option value="">Choose a model</option>
        ${draft.models.map(model => `<option value="${html(model.id)}" ${model.id === draft.modelId ? 'selected' : ''}>${html(model.name)}</option>`).join('')}</select></label>
        ${draft.modelCursor && draft.models.length < draft.modelTotal ? `<button id="captureMoreModels" class="button" ${!readable ? 'disabled' : ''}>More models</button>` : ''}` : ''}
      ${draft.modelId ? `<p>${draft.versions.length}/${draft.versionTotal} versions loaded</p><label>Exact version<select id="captureVersion" ${!readable ? 'disabled' : ''}>
        <option value="">Choose a version</option>${draft.versions.map(version => `<option value="${html(version.id)}" ${version.id === draft.versionId ? 'selected' : ''}>${html(version.id)} - ${html(version.createdAt)}${version.message ? ` - ${html(version.message)}` : ''}</option>`).join('')}</select></label>
        ${draft.versionCursor && draft.versions.length < draft.versionTotal ? `<button id="captureMoreVersions" class="button" ${!readable ? 'disabled' : ''}>More versions</button>` : ''}
        <button id="captureSave" class="button primary" ${!readable || !draft.versionId ? 'disabled' : ''}>Use selected version</button>` : ''}
      <p role="status">${html(draft.busy ? 'Reading Speckle...' : draft.message || (!client?.connected() ? 'Connect Speckle above to read available models.' : 'Changing these selectors does not replace the saved reference until you choose Use selected version.'))}</p>
      <button class="button" data-tb-remove-node ${!editable || draft.busy ? 'disabled' : ''}>Remove Capture block</button>`;

    const valid = () => generation === startedGeneration && drafts.get(node.id) === draft &&
      getRecords().toolbenchNodes.includes(node) && canEdit();
    const startedGeneration = generation;
    async function action(callback) {
      if (!readable || !valid()) return;
      draft.busy = true;
      draft.message = '';
      renderCapture(inspector, node);
      try { await callback(valid); }
      catch (error) {
        if (drafts.get(node.id) === draft) draft.message = error.message;
        feedback(error.message);
      } finally {
        draft.busy = false;
        if (active?.node === node && drafts.get(node.id) === draft) renderCapture(inspector, node);
      }
    }
    const form = inspector.querySelector('#captureProjectForm');
    form.addEventListener('submit', event => {
      event.preventDefault();
      event.stopPropagation();
      draft.url = form.elements.projectUrl.value.trim();
      action(async valid => {
        const id = projectIdFromUrl(draft.url, config.serverUrl);
        const result = await client.models(id);
        if (!valid()) return;
        Object.assign(draft, {
          project: result.project, models: result.items, modelCursor: result.cursor, modelTotal: result.totalCount,
          modelId: '', versions: [], versionId: '', versionCursor: null, versionTotal: 0,
          message: result.items.length ? 'Choose a model.' : 'This project has no available models.'
        });
      });
    });
    inspector.querySelector('#captureModel')?.addEventListener('change', event => {
      const id = event.target.value;
      Object.assign(draft, { modelId: id, versions: [], versionId: '', versionCursor: null, versionTotal: 0 });
      if (!id) { renderCapture(inspector, node); return; }
      action(async valid => {
        const result = await client.versions(draft.project.id, id);
        if (!valid()) return;
        Object.assign(draft, { versions: result.items, versionCursor: result.cursor, versionTotal: result.totalCount,
          message: result.items.length ? 'Choose an exact version.' : 'This model has no available versions.' });
      });
    });
    inspector.querySelector('#captureVersion')?.addEventListener('change', event => {
      const accepted = valid();
      const details = {
        nodeId: node.id, projectId: draft.project?.id, modelId: draft.modelId,
        versionId: event.target.value, appliedVersionId: node.capture?.versionId ?? null,
        accepted, editable: canEdit(), currentGeneration: generation === startedGeneration,
        currentDraft: drafts.get(node.id) === draft, nodePresent: getRecords().toolbenchNodes.includes(node)
      };
      if (!accepted) {
        console.warn('[MasterBPMN Speckle] version selection ignored', details);
        feedback('Version selection ignored because this block is no longer editable or current. Select the Capture block again.');
        return;
      }
      draft.versionId = event.target.value;
      draft.message = draft.versionId ?
        `Selected version ${draft.versionId}. Choose Use selected version to apply it; no model properties have been read yet.` :
        'Choose an exact version. The applied reference is unchanged.';
      console.info('[MasterBPMN Speckle] version selected (not applied)', details);
      renderCapture(inspector, node);
    });
    inspector.querySelector('#captureMoreModels')?.addEventListener('click', () => action(async valid => {
      const result = await client.models(draft.project.id, draft.modelCursor);
      if (!valid()) return;
      const ids = new Set(draft.models.map(model => model.id));
      draft.models.push(...result.items.filter(model => !ids.has(model.id)));
      draft.modelCursor = result.cursor;
      draft.modelTotal = result.totalCount;
    }));
    inspector.querySelector('#captureMoreVersions')?.addEventListener('click', () => action(async valid => {
      const result = await client.versions(draft.project.id, draft.modelId, draft.versionCursor);
      if (!valid()) return;
      const ids = new Set(draft.versions.map(version => version.id));
      draft.versions.push(...result.items.filter(version => !ids.has(version.id)));
      draft.versionCursor = result.cursor;
      draft.versionTotal = result.totalCount;
    }));
    inspector.querySelector('#captureSave')?.addEventListener('click', () => {
      if (!readable || !valid()) return;
      try {
        const reference = captureReference(draft.project, draft.models.find(model => model.id === draft.modelId),
          draft.versions.find(version => version.id === draft.versionId), config.serverUrl);
        setCaptureReference(node, reference);
        persist();
        console.info('[MasterBPMN Speckle] version applied', {
          nodeId: node.id, projectId: reference.projectId,
          modelId: reference.modelId, versionId: reference.versionId
        });
        feedback('Capture reference updated as a browser draft. Save this canvas to commit it. The selected version stays pinned; no calculation has run.');
      } catch (error) { feedback(error.message); }
    });
  }
  return {
    renderCapture,
    readProperties(reference, onProgress) {
      if (!client) throw new Error('Connect Speckle before reading model properties.');
      return client.readProperties(reference, onProgress);
    },
    clearInspector() { active = null; },
    reset() { ++generation; drafts.clear(); active = null; },
    setUser(id) { if (client) client.setUser(id); renderConnection(); },
    async init() {
      setupError = '';
      renderConnection();
      try {
        const response = await fetch('/api/speckle/config');
        config = await response.json();
        if (!response.ok) throw new Error(config.error || 'Unable to load Speckle application settings.');
        if (config.serverUrl !== 'https://app.speckle.systems' || !config.appId || !config.redirectUrl) {
          throw new Error('Invalid Speckle application settings.');
        }
        client = createSpeckleClient({ config, storage: sessionStorage, location: callbackLocation,
          history: window.history, onChange: connectionChanged });
        client.setUser(getUserId());
        return await client.completeCallback();
      } catch (error) {
        setupError = `Speckle unavailable: ${error.message}`;
        renderConnection();
        throw error;
      }
    }
  };
}
