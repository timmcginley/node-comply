import test from 'node:test';
import assert from 'node:assert/strict';
import { addSharedResult, addExchange } from './handoff-data.js';
import { sharedResultDetails, exchangeDetails } from './handoff-ui.js';
import { restoreWorkshop } from './workshop-data.js';
import { makeBlock, saveWireHandoff } from './toolbench-data.js';
import { copyPatch, pastePatch } from './toolbench-edit.js';
import { focusPayload, validateFocusCanvas } from './focus-data.js';
import { workspacePayload, validateWorkspace } from './workspace-store.js';

function fixture() {
  const provider = { ...makeBlock('provider', 'suggestion', 'Window areas'), category: 'Calculate', owner: 'ARC-01' };
  const receiver = { ...makeBlock('receiver', 'suggestion', 'Daylight tool'), category: 'Check', owner: 'IND-01' };
  const wire = { id: 'wire', handoffId: 'handoff', kind: 'data', from: provider.id, fromPort: provider.outputs[0].id,
    to: receiver.id, toPort: receiver.inputs[0].id, label: 'Window areas' };
  const records = restoreWorkshop({ toolbenchNodes: [provider, receiver], toolbenchWires: [wire] });
  const context = { teamIds: ['ARC-01', 'IND-01'], providerTeamId: 'ARC-01', id: 'result-1', createdAt: '2026-11-23T09:00:00Z' };
  const input = { title: 'Areas v1', url: 'https://github.com/example/team/blob/abc/A4/result.json',
    model: 'Building A / revision 3', codeRevision: 'example/team @ abc', settings: 'None',
    description: 'GlobalIds and areas in m2; missing glazing areas flagged.', readyForReview: true };
  const response = { resultId: 'result-1', receiverTeamId: 'IND-01', reviewStatus: 'Ready to try',
    reviewNote: '', useStatus: 'Not tried', functionUrl: '', useNote: '' };
  return { provider, receiver, wire, records, context, input, response };
}

test('new deliveries and selection changes never replace prior result reviews or actual use', () => {
  const { provider, wire, records, context, input, response } = fixture();
  const first = addSharedResult(provider, input, context);
  const reviewed = addExchange(wire, provider, response, { ...context, id: 'review' });
  assert.notEqual(reviewed.result, first);
  assert.equal(reviewed.useStatus, 'Not tried');
  addSharedResult(provider, { ...input, title: 'Areas v2', model: 'Building A / revision 4' }, { ...context, id: 'result-2' });
  assert.equal(provider.selectedSharedResultId, 'result-2');
  assert.equal(reviewed.result.id, first.id);
  assert.equal(reviewed.result.model, 'Building A / revision 3');
  addExchange(wire, provider, { ...response, reviewStatus: 'Not reviewed', useStatus: 'Used',
    functionUrl: 'https://github.com/example/receiver/blob/def/A4/check.py',
    useNote: 'Converted m2 to mm2; enabled glazing ratio checks.' }, { ...context, id: 'use' });
  assert.equal(wire.exchanges[1].result.id, first.id);
  assert.equal(wire.exchanges[1].reviewStatus, 'Not reviewed');
  assert.equal(wire.exchanges[0], reviewed);
  saveWireHandoff(wire, records, 'IND-01');
  wire.label = 'Updated handoff name';
  saveWireHandoff(wire, records, 'ARC-01');
  assert.equal(wire.exchanges.length, 2);
  assert.equal(provider.sharedResults.length, 2);
});

test('invalid deliveries fail without appending or changing the selected result', () => {
  const { provider, context, input } = fixture();
  addSharedResult(provider, input, context);
  const before = structuredClone(provider);
  for (const invalid of [
    { ...input, url: 'javascript:alert(1)' }, { ...input, url: 'https://user:password@example.test/result' },
    { ...input, url: 'relative/result.json' }, { ...input, model: '' },
    { ...input, settings: '' }, { ...input, description: '' }, { ...input, readyForReview: 'yes' }
  ]) {
    assert.throws(() => addSharedResult(provider, invalid, { ...context, id: 'invalid' }));
    assert.deepEqual(provider, before);
  }
  assert.throws(() => addSharedResult(provider, input, { ...context, providerTeamId: 'unknown' }), /providing team/);
});

test('responses require an existing ready result, a receiver and meaningful review or use details', () => {
  const { provider, wire, context, input, response } = fixture();
  addSharedResult(provider, input, context);
  addSharedResult(provider, { ...input, readyForReview: false }, { ...context, id: 'draft' });
  for (const invalid of [
    { ...response, resultId: 'missing' }, { ...response, resultId: 'draft' },
    { ...response, receiverTeamId: 'unknown' }, { ...response, reviewStatus: 'Accepted' },
    { ...response, reviewStatus: 'Needs changes', reviewNote: '' },
    { ...response, reviewStatus: 'Need clarified', reviewNote: '' },
    { ...response, reviewStatus: 'Not reviewed' },
    { ...response, useStatus: 'Used', useNote: 'Used', functionUrl: '' },
    { ...response, useStatus: 'Blocked', useNote: '' },
    { ...response, functionUrl: 'file:///private/path' }
  ]) {
    assert.throws(() => addExchange(wire, provider, invalid, { ...context, id: 'invalid' }));
    assert.equal(wire.exchanges, undefined);
  }
  addExchange(wire, provider, { ...response, reviewStatus: 'Needs changes', reviewNote: 'Include units.',
    useStatus: 'Blocked', useNote: 'Cannot interpret area values yet.' }, { ...context, id: 'blocked' });
  assert.equal(wire.exchanges[0].useStatus, 'Blocked');
});

test('legacy and extended payloads round-trip through team and subject validation, rejecting malformed records', () => {
  const { provider, wire, records, context, input, response } = fixture();
  const teamPayload = () => workspacePayload('ARC-01', records, { general: null, scoped: null });
  assert.doesNotThrow(teamPayload);
  assert.doesNotThrow(() => focusPayload('architecture', records));
  addSharedResult(provider, input, context);
  addExchange(wire, provider, response, { ...context, id: 'review' });
  const subject = JSON.parse(JSON.stringify(focusPayload('architecture', records)));
  assert.deepEqual(validateFocusCanvas(subject, 'architecture').records, records);
  assert.deepEqual(validateWorkspace(JSON.parse(JSON.stringify(teamPayload())), 'ARC-01').records, records);
  for (const mutate of [
    data => { data.toolbenchNodes[0].sharedResults = {}; },
    data => { data.toolbenchNodes[0].selectedSharedResultId = 'missing'; },
    data => { data.toolbenchNodes[0].sharedResults[0].url = 'javascript:alert(1)'; },
    data => { data.toolbenchWires[0].exchanges[0].result.url = 'javascript:alert(1)'; },
    data => { data.toolbenchWires[0].exchanges[0].useStatus = 'Succeeded'; },
    data => { data.toolbenchWires[0].exchanges[0].result.nodeId = 'another-provider'; },
    data => { data.toolbenchWires[0].exchanges.push(data.toolbenchWires[0].exchanges[0]); }
  ]) {
    const invalid = structuredClone(subject);
    mutate(invalid.records);
    assert.throws(() => validateFocusCanvas(invalid, 'architecture'));
    assert.throws(() => validateWorkspace({ schemaVersion: 1, teamId: 'ARC-01',
      diagrams: { general: null, scoped: null }, records: invalid.records }, 'ARC-01'));
  }
});

test('copy and paste retain plans but do not transfer deliveries, receiver reviews or use declarations', () => {
  const { provider, wire, records, context, input, response } = fixture();
  addSharedResult(provider, input, context);
  addExchange(wire, provider, response, { ...context, id: 'review' });
  const original = structuredClone(records);
  const patch = copyPatch(records, ['provider', 'receiver']);
  assert.equal(patch.nodes[0].sharedResults, undefined);
  assert.equal(patch.wires[0].exchanges, undefined);
  // Even an older clipboard object is scrubbed on paste.
  patch.nodes[0].sharedResults = provider.sharedResults;
  patch.nodes[0].selectedSharedResultId = provider.selectedSharedResultId;
  patch.wires[0].exchanges = wire.exchanges;
  let next = 0;
  for (const target of [restoreWorkshop({}), records]) {
    const pasted = pastePatch(patch, target, { x: 30, y: 30, teamId: 'IND-01', makeId: () => `new-${++next}` });
    assert.equal(pasted.nodes[0].sharedResults, undefined);
    assert.equal(pasted.nodes[0].selectedSharedResultId, undefined);
    assert.equal(pasted.wires[0].exchanges, undefined);
  }
  assert.deepEqual(provider, original.toolbenchNodes[0]);
  assert.deepEqual(wire, original.toolbenchWires[0]);
});

test('receiver inspector shows pinned history after the source changes, escapes text and supports read-only viewing', () => {
  const { provider, wire, records, context, input, response } = fixture();
  addSharedResult(provider, { ...input, title: '<script>not executable</script>' }, context);
  addExchange(wire, provider, response, { ...context, id: 'review' });
  addSharedResult(provider, { ...input, title: 'New result' }, { ...context, id: 'result-2' });
  const nodeHtml = sharedResultDetails(provider, { canEdit: false, providerTeamId: provider.owner });
  assert.match(nodeHtml, /fieldset disabled/);
  assert.doesNotMatch(nodeHtml, /<script>/);
  assert.match(nodeHtml, /&lt;script&gt;/);
  const rendered = exchangeDetails(wire, records, { canEdit: false, teams: [], ownTeam: '' });
  assert.match(rendered, /value="result-2" selected/);
  assert.match(rendered, /Ready to try \/ Not tried/);
  assert.match(rendered, /Building A \/ revision 3/);
  assert.match(rendered, /not authenticated approvals/);
  provider.sharedResults = [];
  delete provider.selectedSharedResultId;
  assert.match(exchangeDetails(wire, records, { canEdit: false, teams: [], ownTeam: '' }), /Open exact result/);
});
