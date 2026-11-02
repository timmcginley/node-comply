import test from 'node:test';
import assert from 'node:assert/strict';
import { FOCUS_AREAS, focusPayload, validateFocusCanvas, focusRecoveryKey, createFocusRepository } from './focus-data.js';
import { SIX_CATEGORIES, makeBlock, suggestionDetails, wireError } from './toolbench-data.js';
import { WorkspaceConflict, createWorkspaceRepository } from './workspace-store.js';

const suggestion = () => ({
  ...makeBlock('suggestion', 'suggestion', 'Window relationships'), category: 'Connect', owner: 'IND-13'
});
const payload = (focus = 'architecture') => focusPayload(focus, { toolbenchNodes: [suggestion()] });

test('five course-wide focus areas have isolated complete payloads, distinct from team workspaces', () => {
  assert.deepEqual(FOCUS_AREAS.map(area => area.id), ['architecture', 'indoor-energy', 'structure', 'materials', 'build']);
  const records = { toolbenchNodes: [suggestion()], evidence: [{ id: 'retain' }] };
  for (const { id } of FOCUS_AREAS) {
    const saved = focusPayload(id, records);
    assert.deepEqual(validateFocusCanvas(JSON.parse(JSON.stringify(saved)), id), saved);
    assert.notEqual(saved.records.toolbenchNodes[0], records.toolbenchNodes[0]);
    assert.equal(saved.records.evidence[0].id, 'retain');
    assert.equal(saved.teamId, undefined);
    assert.equal(saved.diagrams, undefined);
  }
  assert.notEqual(focusRecoveryKey('build', 'alice'), focusRecoveryKey('materials', 'alice'));
  assert.notEqual(focusRecoveryKey('build', 'alice'), focusRecoveryKey('build', 'bob'));
});

test('suggestions accept all six categories, no assignment or any registry team, never executable function IDs', () => {
  for (const category of SIX_CATEGORIES) {
    for (const owner of ['', 'ARC-01', 'IND-13']) {
      const details = suggestionDetails('  Proposed tool  ', category, owner, ['ARC-01', 'IND-13']);
      assert.deepEqual(details, { title: 'Proposed tool', category, owner });
      assert.equal(details.functionId, undefined);
      const proposed = { ...makeBlock('proposal', 'suggestion', details.title), ...details };
      const count = { ...makeBlock('count', 'calculate', 'Count'), functionId: 'elements.count' };
      assert.match(wireError({
        id: 'wire', kind: 'data', from: 'proposal', fromPort: 'proposal:out', to: 'count', toPort: 'count:in'
      }, { toolbenchNodes: [proposed, count], toolbenchWires: [] }), /IFC elements Capture/);
    }
  }
  assert.throws(() => suggestionDetails(' ', 'Capture', '', []), /name/);
  assert.throws(() => suggestionDetails('Tool', 'Discipline', '', []), /category/);
  assert.throws(() => suggestionDetails('Tool', 'Capture', 'UNKNOWN', ['ARC-01']), /existing/);
});

test('focus validation rejects foreign, incomplete, malformed and oversized payloads', () => {
  for (const mutate of [
    saved => { saved.focusArea = 'build'; },
    saved => { saved.schemaVersion = 2; },
    saved => { delete saved.records.evidence; },
    saved => { saved.records.toolbenchWires = null; },
    saved => { saved.records.toolbenchNodes[0] = null; },
    saved => { saved.records.toolbenchNodes[0].inputs = {}; },
    saved => { saved.records.toolbenchNodes[0].category = 'Architecture'; },
    saved => { saved.records.toolbenchNodes[0].title = ' '; },
    saved => { saved.records.toolbenchNodes[0].owner = null; }
  ]) {
    const saved = payload();
    mutate(saved);
    assert.throws(() => validateFocusCanvas(saved, 'architecture'));
  }
  assert.throws(() => focusPayload('unknown', {}), /focus area/);
  const saved = payload();
  saved.records.toolbenchNodes[0].note = '';
  const overhead = new TextEncoder().encode(JSON.stringify(saved)).length;
  saved.records.toolbenchNodes[0].note = 'x'.repeat(10 * 1024 * 1024 - overhead);
  assert.equal(validateFocusCanvas(saved, 'architecture'), saved);
  saved.records.toolbenchNodes[0].note += 'x';
  assert.throws(() => validateFocusCanvas(saved, 'architecture'), /10 MiB/);
});

function client(result) {
  const calls = [];
  return {
    calls,
    from(table) {
      return { select: () => ({ eq: (column, value) => {
        calls.push({ table, column, value });
        return { maybeSingle: async () => result };
      } }) };
    },
    async rpc(name, args) { calls.push({ name, args }); return result; }
  };
}

test('focus repository loads by focus ID, validates remote payloads and reports missing migrations explicitly', async () => {
  const connection = client({ data: { revision: 1, payload: payload() } });
  assert.equal((await createFocusRepository(connection).load('architecture')).revision, 1);
  assert.deepEqual(connection.calls, [{ table: 'focus_canvases', column: 'focus_id', value: 'architecture' }]);
  assert.equal(await createFocusRepository(client({ data: null })).load('build'), null);
  await assert.rejects(createFocusRepository(connection).load('build'), /does not match/);
  await assert.rejects(createFocusRepository(client({ error: { message: 'missing table' } })).load('build'), /migration/);
});

test('focus saves preserve drafts on errors, send expected revision and verify server confirmation', async () => {
  const document = payload();
  const original = structuredClone(document);
  const connection = client({ data: { revision: 4 } });
  assert.equal((await createFocusRepository(connection).save('architecture', 3, document)).revision, 4);
  assert.deepEqual(connection.calls, [{
    name: 'save_focus_canvas', args: { p_focus_id: 'architecture', p_expected_revision: 3, p_payload: document }
  }]);
  await assert.rejects(createFocusRepository(client({ error: { code: '40001' } })).save('architecture', 3, document), WorkspaceConflict);
  await assert.rejects(createFocusRepository(client({ error: { message: 'denied' } })).save('architecture', 3, document), /not saved/);
  await assert.rejects(createFocusRepository(client({ data: { revision: 5 } })).save('architecture', 3, document), /confirm/);
  assert.deepEqual(document, original);
});

test('team switching supplies no user ID and requires exact server confirmation', async () => {
  const connection = client({ data: 'IND-13' });
  assert.equal(await createWorkspaceRepository(connection).chooseTeam('IND-13'), 'IND-13');
  assert.deepEqual(connection.calls, [{ name: 'choose_team', args: { p_team_id: 'IND-13' } }]);
  await assert.rejects(createWorkspaceRepository(client({ error: { message: 'missing function' } })).chooseTeam('ARC-01'), /migration/);
  await assert.rejects(createWorkspaceRepository(client({ data: 'ARC-02' })).chooseTeam('ARC-01'), /confirm/);
});
