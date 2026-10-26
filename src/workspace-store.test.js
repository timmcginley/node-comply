import test from 'node:test';
import assert from 'node:assert/strict';
import { restoreWorkshop } from './workshop-data.js';
import {
  workspacePayload, validateWorkspace, sameWorkspace, createWorkspaceRepository,
  WorkspaceConflict, recoveryKey, readRecovery, writeRecovery, importWorkspace
} from './workspace-store.js';

const payload = teamId => workspacePayload(teamId, restoreWorkshop({
  claims: [{ id: 'claim', text: 'Original claim' }],
  evidence: [{ id: 'archived', result: 'historical evidence' }],
  nominations: [{ id: 'retired-record' }]
}), { general: '<general/>', scoped: '<scoped/>' });
const storage = () => {
  const entries = new Map();
  return { getItem: key => entries.get(key) ?? null, setItem: (key, value) => entries.set(key, value) };
};

test('complete workspace round trips both diagrams and all archived collections without sharing mutable records', () => {
  const records = restoreWorkshop({ evidence: [{ id: 'old' }] });
  const saved = workspacePayload('ARC-01', records, { general: '<xml/>', scoped: null });
  records.evidence[0].id = 'changed';
  assert.equal(saved.records.evidence[0].id, 'old');
  assert.deepEqual(validateWorkspace(JSON.parse(JSON.stringify(saved)), 'ARC-01'), saved);
});

test('validation rejects missing collections, mismatched teams, unknown schemas and empty/missing XML', () => {
  const original = payload('ARC-01');
  for (const mutate of [
    saved => { saved.teamId = 'ARC-02'; },
    saved => { saved.schemaVersion = 2; },
    saved => { delete saved.records.evidence; },
    saved => { saved.records.claims = {}; },
    saved => { saved.diagrams.general = ''; },
    saved => { delete saved.diagrams.scoped; }
  ]) {
    const saved = structuredClone(original);
    mutate(saved);
    assert.throws(() => validateWorkspace(saved, 'ARC-01'));
  }
});

test('client save size limit is exactly 10 MiB of UTF-8, including the envelope', () => {
  const saved = payload('ARC-01');
  saved.records.claims[0].text = '';
  const overhead = new TextEncoder().encode(JSON.stringify(saved)).length;
  saved.records.claims[0].text = 'x'.repeat(10 * 1024 * 1024 - overhead);
  assert.equal(validateWorkspace(saved, 'ARC-01'), saved);
  saved.records.claims[0].text += 'é';
  assert.throws(() => validateWorkspace(saved, 'ARC-01'), /10 MiB/);
});

test('legacy metadata and separate XML drafts are offered explicitly without rewriting or deleting them', () => {
  const local = storage();
  const original = JSON.stringify({ ...payload('ARC-01').records, design: { legacy: true } });
  local.setItem('masterbpmn:ARC-01', original);
  local.setItem('masterbpmn:ARC-01:general:xml', '<legacy-general/>');
  const recovery = readRecovery(local, 'ARC-01', 'alice');
  assert.equal(recovery.legacy, true);
  assert.equal(recovery.payload.diagrams.general, '<legacy-general/>');
  assert.equal(recovery.payload.diagrams.scoped, null);
  assert.equal(recovery.payload.records.evidence[0].id, 'archived');
  assert.equal(local.getItem('masterbpmn:ARC-01'), original);
  assert.equal(readRecovery(local, 'ARC-02', 'alice'), null);
});

test('recovery is isolated by account and team; it retains a base revision and does not replace legacy storage', () => {
  const local = storage();
  writeRecovery(local, 'alice', 7, payload('ARC-01'));
  assert.equal(readRecovery(local, 'ARC-01', 'alice').baseRevision, 7);
  assert.equal(readRecovery(local, 'ARC-01', 'bob'), null);
  assert.equal(readRecovery(local, 'ARC-02', 'alice'), null);
  assert.equal(local.getItem('masterbpmn:ARC-01'), null);
  local.setItem(recoveryKey('ARC-01', 'alice'), '{corrupt');
  assert.throws(() => readRecovery(local, 'ARC-01', 'alice'));
});

test('workspace comparison ignores PostgreSQL jsonb object-key ordering but preserves array order', () => {
  assert.equal(sameWorkspace({ a: { b: 2, a: 1 }, c: [1, 2] }, { c: [1, 2], a: { a: 1, b: 2 } }), true);
  assert.equal(sameWorkspace({ c: [1, 2] }, { c: [2, 1] }), false);
});

test('JSON import validates current exports, rejects foreign/unknown formats and preserves diagrams for legacy exports', () => {
  const modern = payload('ARC-01');
  assert.deepEqual(importWorkspace(modern, 'ARC-01', {}), modern);
  assert.throws(() => importWorkspace(modern, 'ARC-02', {}), /does not match/);
  assert.throws(() => importWorkspace({ ...modern, schemaVersion: 2 }, 'ARC-01', {}), /schema/);
  assert.throws(() => importWorkspace({}, 'ARC-01', {}), /Not a workspace export/);
  assert.throws(() => importWorkspace({ ...modern, records: {} }, 'ARC-01', {}), /collection/);
  const legacy = { team: { id: 'ARC-01' }, ...modern.records };
  const diagrams = { general: '<keep/>', scoped: null };
  assert.deepEqual(importWorkspace(legacy, 'ARC-01', diagrams), { ...modern, diagrams });
});
function mockClient({ membershipError, facilitatorError, loadError, saved, saveError } = {}) {
  const calls = [];
  return {
    calls,
    from(table) {
      return { select: () => ({ eq: (column, value) => {
        calls.push({ table, column, value });
        return {
          data: table === 'team_memberships' ? [{ team_id: 'ARC-01' }] : [],
          error: table === 'team_memberships' ? membershipError : facilitatorError,
          maybeSingle: async () => ({ data: saved || null, error: loadError })
        };
      } }) };
    },
    async rpc(name, args) { calls.push({ name, args }); return { data: saved, error: saveError }; }
  };
}

test('repository obtains private self-membership and facilitator access and fails closed on lookup errors', async () => {
  const client = mockClient();
  assert.deepEqual(await createWorkspaceRepository(client).permissions('alice'), { teams: ['ARC-01'], facilitator: false });
  assert.deepEqual(client.calls.map(call => [call.column, call.value]), [['user_id', 'alice'], ['user_id', 'alice']]);
  for (const option of ['membershipError', 'facilitatorError']) {
    await assert.rejects(createWorkspaceRepository(mockClient({ [option]: { message: 'denied' } })).permissions('alice'), /denied/);
  }
});

test('repository distinguishes missing workspace, failed load and invalid remote payload', async () => {
  assert.equal(await createWorkspaceRepository(mockClient()).load('ARC-01'), null);
  await assert.rejects(createWorkspaceRepository(mockClient({ loadError: { message: 'database unavailable' } })).load('ARC-01'), /database unavailable/);
  await assert.rejects(createWorkspaceRepository(mockClient({ saved: { payload: payload('ARC-02') } })).load('ARC-01'), /does not match/);
});

test('repository sends exact base revision, classifies conflicts and does not mutate the unsaved payload on failure', async () => {
  const draft = payload('ARC-01');
  const original = structuredClone(draft);
  const client = mockClient({ saveError: { code: '40001', message: 'conflict' } });
  await assert.rejects(createWorkspaceRepository(client).save('ARC-01', 3, draft), WorkspaceConflict);
  assert.deepEqual(draft, original);
  assert.deepEqual(client.calls[0], {
    name: 'save_workspace', args: { p_team_id: 'ARC-01', p_expected_revision: 3, p_payload: draft }
  });
  await assert.rejects(createWorkspaceRepository(mockClient({ saveError: { code: '42501', message: 'denied' } })).save('ARC-01', 3, draft), /not saved: denied/);
  await assert.rejects(createWorkspaceRepository(mockClient({ saved: { revision: 9 } })).save('ARC-01', 3, draft), /did not confirm/);
  const saved = { revision: 4 };
  assert.equal(await createWorkspaceRepository(mockClient({ saved })).save('ARC-01', 3, draft), saved);
});
