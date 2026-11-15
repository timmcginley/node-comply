import test from 'node:test';
import assert from 'node:assert/strict';
import { mountFocusCanvases } from './focus-canvases.js';
import { focusPayload } from './focus-data.js';
import { restoreWorkshop } from './workshop-data.js';

function fixture(t) {
  const state = { user: 'user', tab: 'design', leaveTeam: true, confirm: true, transitioning: false, loads: [] };
  const storage = () => {
    const data = new Map();
    return { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) };
  };
  for (const [key, value] of Object.entries({
    localStorage: storage(), sessionStorage: storage(),
    window: { confirm: () => state.confirm, addEventListener() {} }
  })) {
    const original = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, { value, configurable: true });
    t.after(() => original ? Object.defineProperty(globalThis, key, original) : delete globalThis[key]);
  }
  const elements = new Map();
  const container = { innerHTML: '', querySelector(selector) {
    if (!elements.has(selector)) elements.set(selector, {
      value: '', classList: { toggle() {} }, listeners: {},
      addEventListener(type, handler) { this.listeners[type] = handler; },
      fire(type) { return this.listeners[type]({ target: this }); }
    });
    return elements.get(selector);
  } };
  const canvas = mountFocusCanvases({
    container, getUserId: () => state.user, getAccess: () => ({ teams: ['ARC-01'] }),
    isTransitioning: () => state.transitioning, getActiveTab: () => state.tab,
    render() {}, reset() {}, onScopeChange() {}, prepareLeaveTeam: () => state.leaveTeam
  });
  canvas.setClient({ from() {
    return { select() { return this; }, eq(_key, id) { this.id = id; return this; },
      async maybeSingle() {
        state.loads.push(this.id);
        return { data: { revision: 1, payload: focusPayload(this.id, restoreWorkshop({})) }, error: null };
      }
    };
  } });
  canvas.update();
  return { canvas, state, container, element: id => container.querySelector(`#${id}`) };
}

test('subject selector excludes the team canvas and remembers the subject across team tab visits', async t => {
  const { canvas, container, element, state } = fixture(t);
  assert.doesNotMatch(container.innerHTML, /option value=""/);
  assert.equal(canvas.active, false);
  assert.equal(await canvas.showSubjects(), true);
  assert.equal(element('focusCanvas').value, 'architecture');
  element('focusCanvas').value = 'materials';
  await element('focusCanvas').fire('change');
  assert.equal(await canvas.showTeam(), true);
  assert.equal(canvas.active, false);
  assert.equal(element('focusCanvas').value, 'materials');
  assert.equal(await canvas.showSubjects(), true);
  assert.equal(element('focusCanvas').value, 'materials');
  assert.deepEqual(state.loads, ['architecture', 'materials', 'materials']);
});

test('current canvas download is prominent and browser draft download is in a collapsed section', t => {
  const { container } = fixture(t);
  assert.match(container.innerHTML, /id="focusDownload"[^>]*>Download current canvas<\/button>/);
  assert.match(container.innerHTML, /<details>\s*<summary>Browser draft backup<\/summary>[\s\S]*?id="focusDownloadRecovery"[^>]*>Download browser draft<\/button>\s*<\/details>/);
});

test('cancelled team or subject departure retains the current scope and records', async t => {
  const { canvas, state, element } = fixture(t);
  state.leaveTeam = false;
  assert.equal(await canvas.showSubjects(), false);
  assert.equal(canvas.active, false);
  assert.deepEqual(state.loads, []);
  state.leaveTeam = true;
  await canvas.showSubjects();
  const records = canvas.records;
  canvas.persist();
  state.confirm = false;
  assert.equal(await canvas.showTeam(), false);
  assert.equal(canvas.active, true);
  assert.equal(canvas.records, records);
  assert.equal(element('focusCanvas').value, 'architecture');
  state.transitioning = true;
  assert.equal(await canvas.showTeam(), false);
});

test('session restoration respects the visible tab and remembers the subject per account', async t => {
  const { canvas, state, element } = fixture(t);
  sessionStorage.setItem('masterbpmn:focus-selection:user', 'structure');
  await canvas.sessionChanged();
  assert.equal(canvas.active, true);
  assert.equal(element('focusCanvas').value, 'structure');
  state.tab = 'diagrams';
  await canvas.sessionChanged();
  assert.equal(canvas.active, false);
  assert.equal(element('focusCanvas').value, 'structure');
  await canvas.showTeam();
  await canvas.showSubjects();
  assert.equal(element('focusCanvas').value, 'structure');
  state.user = 'other';
  state.tab = 'subjects';
  await canvas.sessionChanged();
  assert.equal(element('focusCanvas').value, 'architecture');
});

test('signed-out subject tabs stay subject-only and read-only without loading another account data', async t => {
  const { canvas, state, element } = fixture(t);
  await canvas.showSubjects();
  state.user = null;
  state.tab = 'subjects';
  const previousLoads = state.loads.length;
  await canvas.sessionChanged();
  assert.equal(canvas.active, true);
  assert.equal(canvas.canEdit(), false);
  assert.equal(element('focusControls').hidden, false);
  assert.equal(state.loads.length, previousLoads);
  assert.deepEqual(canvas.records, restoreWorkshop({}));
  assert.equal(await canvas.showTeam(), true);
});

test('canvas and recovery downloads export their respective JSON documents', async t => {
  const { canvas, element } = fixture(t);
  const downloads = [];
  const revoked = [];
  let blob;
  for (const [key, value] of Object.entries({
    document: {
      createElement(tag) {
        assert.equal(tag, 'a');
        return { click() { downloads.push({ name: this.download, href: this.href, blob }); } };
      }
    },
    URL: {
      createObjectURL(value) { blob = value; return `blob:canvas-${downloads.length}`; },
      revokeObjectURL(value) { revoked.push(value); }
    }
  })) {
    const original = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, { value, configurable: true });
    t.after(() => original ? Object.defineProperty(globalThis, key, original) : delete globalThis[key]);
  }

  await canvas.showSubjects();
  canvas.records.dependencies.push({ id: 'current' });
  element('focusDownload').fire('click');
  assert.equal(downloads.length, 1);
  assert.equal(downloads[0].name, 'architecture-course-canvas.json');
  assert.equal(downloads[0].blob.type, 'application/json');
  assert.deepEqual(JSON.parse(await downloads[0].blob.text()), focusPayload('architecture', canvas.records));

  canvas.persist();
  const savedDraft = focusPayload('architecture', canvas.records);
  canvas.records.dependencies.push({ id: 'after-recovery' });
  element('focusDownloadRecovery').fire('click');
  assert.equal(downloads.length, 2);
  assert.equal(downloads[1].name, 'architecture-canvas-recovery.json');
  assert.equal(downloads[1].blob.type, 'application/json');
  assert.deepEqual(JSON.parse(await downloads[1].blob.text()), savedDraft);
  assert.deepEqual(revoked, downloads.map(download => download.href));
});
