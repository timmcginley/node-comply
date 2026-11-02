import { restoreWorkshop, escapeHtml as html } from './workshop-data.js';
import { sameWorkspace, WorkspaceConflict } from './workspace-store.js';
import { FOCUS_AREAS, createFocusRepository, focusPayload, validateFocusCanvas, focusRecoveryKey } from './focus-data.js';

export function mountFocusCanvases({ container, getUserId, getAccess, isTransitioning, getActiveTab = () => null, render, reset, onScopeChange, prepareLeaveTeam }) {
  container.innerHTML = `<label>Canvas<select id="focusCanvas">
    ${FOCUS_AREAS.map(area => `<option value="${area.id}">${html(area.name)} - course-wide</option>`).join('')}</select></label>
    <div id="focusControls" hidden>
      <p>Shared across all teams. Any team member may edit and assign suggestions to any team. Suggestions are plans, not implemented tools.</p>
      <div class="tb-small-actions"><button id="focusSave" class="button primary">Save course canvas</button>
        <button id="focusLoad" class="button">Load latest canvas</button><button id="focusDownload" class="button">Download canvas</button>
        <button id="focusRecover" class="button">Recover canvas draft</button><button id="focusDownloadRecovery" class="button">Download canvas recovery</button>
        <button id="focusKeep" class="button" hidden>Use loaded canvas instead</button></div>
      <p id="focusFeedback" role="status"></p>
    </div>`;
  const $ = id => container.querySelector(`#${id}`);
  let focusId = '', records = restoreWorkshop({}), revision = null, repository = null;
  let lastSubject = FOCUS_AREAS[0].id;
  let dirty = false, busy = false, blocked = false, recoveryPending = false, generation = 0;
  const selectionKey = () => `masterbpmn:focus-selection:${getUserId()}`;
  const subjectKey = () => `masterbpmn:last-subject:${getUserId()}`;
  const name = () => FOCUS_AREAS.find(area => area.id === focusId)?.name || 'Team';
  const canAccess = () => !!getUserId() && (getAccess().facilitator || getAccess().teams.length > 0);
  const canEdit = () => !!focusId && canAccess() && revision !== null && !busy && !isTransitioning() && !recoveryPending;
  const payload = () => focusPayload(focusId, records);
  const message = (text, error = false) => {
    $('focusFeedback').textContent = text;
    $('focusFeedback').classList.toggle('error', error);
    if (error) console.error(text);
  };
  function update() {
    $('focusCanvas').value = focusId || lastSubject;
    $('focusCanvas').disabled = busy || isTransitioning();
    $('focusControls').hidden = !focusId;
    $('focusSave').disabled = !canEdit() || !dirty || blocked;
    $('focusLoad').disabled = !getUserId() || busy || isTransitioning();
    $('focusDownload').disabled = !focusId || busy;
    $('focusRecover').disabled = !canAccess() || revision === null || busy || isTransitioning();
    $('focusDownloadRecovery').disabled = !getUserId() || busy || isTransitioning();
    $('focusKeep').hidden = !recoveryPending;
    $('focusKeep').disabled = busy || isTransitioning();
    render();
  }
  function recovery() {
    const text = localStorage.getItem(focusRecoveryKey(focusId, getUserId()));
    if (!text) return null;
    const draft = JSON.parse(text);
    validateFocusCanvas(draft.payload, focusId);
    return draft;
  }
  function retain() {
    localStorage.setItem(focusRecoveryKey(focusId, getUserId()), JSON.stringify({
      payload: payload(), baseRevision: revision, capturedAt: new Date().toISOString()
    }));
  }
  function persist() {
    dirty = true;
    try {
      retain();
      message(`${name()} has unsaved edits. Browser recovery updated; save the course canvas to share them.`);
    } catch (error) { message(`Browser recovery failed: ${error.message}. Download the canvas before leaving.`, true); }
    update();
  }
  function mayLeave() {
    return !dirty || window.confirm('This course canvas has unsaved edits. Continue with the draft only in browser recovery? Download first if recovery failed.');
  }
  async function run(action) {
    if (busy) return;
    const started = generation;
    busy = true;
    update();
    try { await action(() => generation === started); }
    catch (error) { if (generation === started) message(error.message, true); }
    finally {
      if (generation === started) { busy = false; update(); }
    }
  }
  async function load(valid) {
    if (!getUserId()) {
      records = restoreWorkshop({});
      revision = null;
      dirty = false;
      recoveryPending = false;
      reset();
      message('Sign in to view the course-wide canvases, then join a team to edit.');
      return;
    }
    message(`Loading ${name()} course canvas...`);
    const saved = await repository.load(focusId);
    if (!valid()) return;
    records = restoreWorkshop(saved?.payload.records || {});
    revision = saved?.revision || 0;
    dirty = false;
    blocked = false;
    recoveryPending = false;
    reset();
    message(`${name()}: ${saved ? `shared revision ${revision}` : 'no shared revision yet'}. ${canAccess() ? 'Edits are shared only after saving.' : 'Join a team to edit.'}`);
    try {
      const draft = recovery();
      recoveryPending = !!draft && !sameWorkspace(draft.payload, payload());
      if (recoveryPending) message('A different browser canvas draft exists. Choose Recover canvas draft or Use loaded canvas instead before editing.');
    } catch (error) { message(`Canvas loaded, but recovery could not be read: ${error.message}. Recovery is unchanged.`, true); }
  }
  async function switchTo(next) {
    if (busy || isTransitioning()) return false;
    if (next === focusId) return true;
    if (!mayLeave() || (!focusId && !prepareLeaveTeam())) {
      $('focusCanvas').value = focusId || lastSubject;
      return false;
    }
    focusId = next;
    if (focusId) lastSubject = focusId;
    records = restoreWorkshop({});
    revision = null;
    dirty = false;
    blocked = false;
    recoveryPending = false;
    reset();
    onScopeChange();
    if (getUserId()) {
      try {
        sessionStorage.setItem(selectionKey(), focusId);
        sessionStorage.setItem(subjectKey(), lastSubject);
      }
      catch (error) { message(`Canvas selection could not be retained across refresh: ${error.message}.`, true); }
    }
    if (focusId) await run(load);
    else update();
    return true;
  }
  $('focusCanvas').addEventListener('change', event => switchTo(event.target.value));
  $('focusLoad').addEventListener('click', () => {
    if (!mayLeave()) return;
    run(async valid => {
      try { await load(valid); }
      catch (error) {
        if (valid()) { revision = null; blocked = true; reset(); }
        throw new Error(`Canvas reload failed. The displayed canvas remains available for download, read-only. ${error.message}`);
      }
    });
  });
  $('focusSave').addEventListener('click', () => {
    if (!canEdit() || blocked || !dirty) return;
    run(async valid => {
      const document = payload();
      try { retain(); }
      catch (error) { message(`Browser recovery failed: ${error.message}. Attempting shared save; keep this page open.`, true); }
      try {
        const saved = await repository.save(focusId, revision, document);
        if (!valid()) return;
        revision = saved.revision;
        dirty = false;
        message(`Saved ${name()} course canvas revision ${revision}.`);
        try { retain(); }
        catch (error) { message(`Revision ${revision} WAS saved, but browser recovery failed: ${error.message}. Download a backup.`, true); }
      } catch (error) {
        if (valid() && error instanceof WorkspaceConflict) blocked = true;
        throw error;
      }
    });
  });
  function download(document, suffix) {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([JSON.stringify(document, null, 2)], { type: 'application/json' }));
    link.download = `${focusId}-${suffix}.json`;
    link.click();
    URL.revokeObjectURL(link.href);
  }
  $('focusDownload').addEventListener('click', () => {
    try { download(payload(), 'course-canvas'); }
    catch (error) { message(error.message, true); }
  });
  $('focusDownloadRecovery').addEventListener('click', () => {
    try {
      const draft = recovery();
      if (!draft) throw new Error('No recovery draft exists for this account and focus area.');
      download(draft.payload, 'canvas-recovery');
    } catch (error) { message(error.message, true); }
  });
  $('focusRecover').addEventListener('click', () => {
    if (!canAccess() || revision === null || busy || isTransitioning()) return;
    try {
      const draft = recovery();
      if (!draft) throw new Error('No recovery draft exists for this account and focus area.');
      if (!window.confirm(`Replace the displayed ${name()} canvas with this unsaved draft? Review it before saving over shared revision ${revision}.`)) return;
      records = restoreWorkshop(draft.payload.records);
      recoveryPending = false;
      blocked = false;
      reset();
      persist();
    } catch (error) { message(error.message, true); }
  });
  $('focusKeep').addEventListener('click', () => {
    if (!window.confirm('Use the loaded canvas? Your next edit will replace its browser recovery draft. Download that recovery first if needed.')) return;
    recoveryPending = false;
    message('Using the loaded canvas. Nothing has been saved.');
    update();
  });
  window.addEventListener('beforeunload', event => {
    if (dirty) { event.preventDefault(); event.returnValue = ''; }
  });
  return {
    get active() { return !!focusId; },
    get records() { return records; },
    canEdit, persist, mayLeave, update,
    setClient(client) { repository = createFocusRepository(client); },
    async sessionChanged() {
      ++generation;
      busy = false;
      records = restoreWorkshop({});
      revision = null;
      dirty = false;
      blocked = false;
      recoveryPending = false;
      try {
        const savedFocus = getUserId() ? sessionStorage.getItem(selectionKey()) : null;
        const savedSubject = getUserId() ? sessionStorage.getItem(subjectKey()) : null;
        const valid = id => FOCUS_AREAS.some(area => area.id === id);
        lastSubject = valid(savedFocus) ? savedFocus : valid(savedSubject) ? savedSubject : FOCUS_AREAS[0].id;
        focusId = getActiveTab() === 'subjects' ? lastSubject :
          getActiveTab() === 'diagrams' ? '' : valid(savedFocus) ? savedFocus : '';
      } catch (error) {
        lastSubject = FOCUS_AREAS[0].id;
        focusId = getActiveTab() === 'subjects' ? lastSubject : '';
        message(`Saved canvas selection could not be read: ${error.message}.`, true);
      }
      reset();
      onScopeChange();
      if (focusId) await run(load);
      else update();
    },
    showTeam() { return switchTo(''); },
    showSubjects() { return switchTo(lastSubject); }
  };
}
