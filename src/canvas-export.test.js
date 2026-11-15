import test from 'node:test';
import assert from 'node:assert/strict';
import { exportAllCanvases } from './canvas-export.js';
import { workspacePayload, writeRecovery } from './workspace-store.js';
import { FOCUS_AREAS, focusPayload, focusRecoveryKey } from './focus-data.js';
import { restoreWorkshop } from './workshop-data.js';

function fixture() {
  const teams = Array.from({ length: 21 }, (_, i) => ({ id: `TEAM-${i}`, repositoryUrl: `https://example.com/team-${i}` }));
  const entries = new Map();
  const storage = { getItem: key => entries.get(key) ?? null, setItem: (key, value) => entries.set(key, value) };
  const loads = [];
  const teamPayload = workspacePayload(teams[0].id, restoreWorkshop({
    toolbenchNodes: [{ id: 'team-block' }], evidence: [{ id: 'old-evidence' }]
  }), { general: '<general/>', scoped: '<scoped/>' });
  const subjectPayload = focusPayload('architecture', restoreWorkshop({
    dependencies: [{ id: 'subject-dependency' }]
  }));
  const repository = { async load(id) {
    loads.push(id);
    return id === teams[0].id ? { payload: teamPayload, revision: 3 } : null;
  } };
  const focusRepository = { async load(id) {
    loads.push(id);
    return id === 'architecture' ? { payload: subjectPayload, revision: 2 } : null;
  } };
  return { teams, storage, entries, loads, repository, focusRepository, userId: 'alice', teamPayload, subjectPayload };
}

test('one export includes every registered team and subject, explicitly missing saves, XML and separate account-scoped recovery', async () => {
  const options = fixture();
  writeRecovery(options.storage, 'alice', 2, options.teamPayload);
  writeRecovery(options.storage, 'bob', 99, options.teamPayload);
  const subjectDraft = { payload: options.subjectPayload, baseRevision: 1, capturedAt: '2026-11-15T12:00:00Z' };
  options.storage.setItem(focusRecoveryKey('architecture', 'alice'), JSON.stringify(subjectDraft));
  options.storage.setItem('sb-project-auth-token', 'secret-that-must-not-be-exported');
  const originalEntries = [...options.entries];
  const exported = JSON.parse(JSON.stringify(await exportAllCanvases(options)));
  assert.equal(exported.exportType, 'masterbpmn-all-canvases');
  assert.equal(exported.schemaVersion, 1);
  assert.equal(exported.teamCanvases.length, 21);
  assert.equal(exported.subjectCanvases.length, 5);
  assert.deepEqual(options.loads.sort(), [...options.teams.map(team => team.id), ...FOCUS_AREAS.map(area => area.id)].sort());
  assert.deepEqual(exported.teamCanvases[0].shared.payload, options.teamPayload);
  assert.deepEqual(exported.subjectCanvases[0].shared.payload, options.subjectPayload);
  assert.equal(exported.teamCanvases[1].shared, null);
  assert.equal(exported.subjectCanvases[1].shared, null);
  assert.equal(exported.browserRecovery.teamCanvases.length, 1);
  assert.equal(exported.browserRecovery.teamCanvases[0].baseRevision, 2);
  assert.deepEqual(exported.browserRecovery.subjectCanvases, [{ focusArea: 'architecture', ...subjectDraft }]);
  assert.ok(Date.parse(exported.completedAt) >= Date.parse(exported.startedAt));
  assert.doesNotMatch(JSON.stringify(exported), /secret-that-must-not-be-exported/);
  assert.deepEqual([...options.entries], originalEntries);
});

test('export rejects signed-out access, failed shared reads and corrupt recovery instead of returning partial success', async () => {
  await assert.rejects(exportAllCanvases({ ...fixture(), userId: null }), /Sign in/);
  for (const key of ['repository', 'focusRepository']) {
    await assert.rejects(exportAllCanvases({
      ...fixture(), [key]: { async load() { throw new Error('Database unavailable'); } }
    }), /Database unavailable/);
  }
  const corruptTeam = fixture();
  corruptTeam.storage.setItem('masterbpmn:TEAM-0:recovery:alice', '{broken');
  await assert.rejects(exportAllCanvases(corruptTeam), SyntaxError);
  const corruptSubject = fixture();
  corruptSubject.storage.setItem(focusRecoveryKey('architecture', 'alice'), JSON.stringify({ payload: { schemaVersion: 99 } }));
  await assert.rejects(exportAllCanvases(corruptSubject), /schema/);
});
