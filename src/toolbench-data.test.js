import test from 'node:test';
import assert from 'node:assert/strict';
import { restoreWorkshop } from './workshop-data.js';
import { captureDesignClaim, makeBlock, projectBpmn, mergeProjection, wireError, saveWireHandoff, removeWire, removeBlock, blockWarnings } from './toolbench-data.js';

test('deleting a block removes only attached wires and their owned handoffs, retaining linked and archived records', () => {
  const records = restoreWorkshop({
    toolbenchNodes: [
      { ...makeBlock('capture', 'capture', 'Capture model'), functionId: 'speckle.capture-model' },
      makeBlock('keep', 'activity', 'Keep this tool'),
      makeBlock('claim', 'claim', 'Claim', 10, 10)
    ],
    toolbenchWires: [
      { id: 'outgoing', from: 'capture', to: 'keep' },
      { id: 'incoming', from: 'claim', to: 'capture' },
      { id: 'unrelated', from: 'claim', to: 'keep' }
    ],
    dependencies: [
      { id: 'delete-handoff', toolbenchWireId: 'outgoing' },
      { id: 'keep-handoff', toolbenchWireId: 'unrelated' },
      { id: 'legacy-handoff', from: 'capture', to: 'keep' }
    ],
    evidence: [{ id: 'archived' }], claims: [{ id: 'original-claim' }],
    requests: [{ id: 'original-request' }], mappings: [{ id: 'diagram-mapping' }]
  });
  const archive = JSON.stringify([records.evidence, records.claims, records.requests, records.mappings]);
  removeBlock('capture', records);
  assert.deepEqual(records.toolbenchNodes.map(node => node.id), ['keep', 'claim']);
  assert.deepEqual(records.toolbenchWires.map(wire => wire.id), ['unrelated']);
  assert.deepEqual(records.dependencies.map(item => item.id), ['keep-handoff', 'legacy-handoff']);
  assert.equal(JSON.stringify([records.evidence, records.claims, records.requests, records.mappings]), archive);
  const unchanged = JSON.stringify(records);
  assert.throws(() => removeBlock('missing', records), /no longer exists/);
  assert.equal(JSON.stringify(records), unchanged);
});

test('Design captures a claim directly for Toolbench without changing archived records or duplicating the same source', () => {
  const saved = restoreWorkshop({
    nominations: [{ id: 'legacy-nomination' }],
    activities: [{ id: 'legacy-activity' }],
    references: [{ id: 'legacy-reference' }],
    evidence: [{ id: 'legacy-evidence', kind: 'execution', outcome: 'Succeeded' }],
    dependencies: [{ from: 'Legacy provider', to: 'Legacy consumer', object: 'Legacy data' }]
  });
  const archived = JSON.stringify(saved);
  const input = { id: 'claim-1', teamId: 'ARC-01', text: 'Original student-selected claim.', sourceUrl: 'https://github.com/example/team/blob/main/A2/README.md', capturedAt: '2026-10-25T22:00:00Z' };
  const claim = captureDesignClaim(saved, input);
  assert.equal(claim.sourceExcerpt, input.text);
  assert.equal(claim.statement, input.text);
  assert.equal(claim.sourceUrl, input.sourceUrl);
  assert.equal(claim.draft, true);
  assert.equal(captureDesignClaim(saved, { ...input, id: 'unused' }), claim);
  assert.equal(saved.claims.length, 1);
  const changed = captureDesignClaim(saved, { ...input, id: 'claim-2', text: 'Revised source claim.' });
  assert.notEqual(changed.id, claim.id);
  assert.equal(claim.statement, input.text);
  const restored = restoreWorkshop(JSON.parse(JSON.stringify(saved)));
  assert.deepEqual(restored, saved);
  restored.claims = [];
  assert.equal(JSON.stringify(restored), archived);
  assert.throws(() => captureDesignClaim(saved, { ...input, text: '  ' }), /source claim excerpt/);
});

function fixture() {
  const shape = (id, type, name, x, y, parents = []) => ({
    id, type: `bpmn:${type}`, x, y,
    businessObject: {
      id, name,
      $instanceOf: value => value === `bpmn:${type}` || parents.includes(value)
    }
  });
  const start = shape('start', 'StartEvent', 'Start', 100, 100, ['bpmn:Event']);
  const activity = shape('task', 'UserTask', 'Review quantities', 200, 100, ['bpmn:Activity']);
  const gateway = shape('gate', 'ExclusiveGateway', 'Accepted?', 400, 100, ['bpmn:Gateway']);
  const data = shape('data', 'DataObjectReference', 'Quantity table', 200, 300);
  const subprocess = shape('sub', 'SubProcess', 'Detailed tool', 600, 100, ['bpmn:Activity']);
  const nested = shape('nested', 'Task', 'Internal step', 650, 130, ['bpmn:Activity']);
  nested.parent = subprocess;
  const edge = (id, type, source, target) => ({ id, type: `bpmn:${type}`, source, target, businessObject: { id, $instanceOf: () => false } });
  const order = edge('order', 'SequenceFlow', activity, gateway);
  order.businessObject.conditionExpression = { body: 'review complete' };
  activity.businessObject.default = order.businessObject;
  const association = edge('association', 'DataInputAssociation', data, activity);
  const elements = [start, activity, gateway, data, subprocess, nested, order, association, {
    ...activity, id: 'task_label', labelTarget: activity
  }];
  return {
    elements,
    modeler: { get: name => {
      assert.equal(name, 'elementRegistry');
      return { filter: predicate => elements.filter(predicate) };
    } }
  };
}

const wire = (from, to, id = 'wire') => ({
  id, handoffId: `handoff:${id}`, kind: 'data', from: from.id, to: to.id,
  fromPort: from.outputs[0].id, toPort: to.inputs[0].id, label: 'Quantity table'
});

test('BPMN projection preserves controls, conditions and data associations without turning order into data', () => {
  const { modeler } = fixture();
  const projection = projectBpmn(modeler);
  assert.deepEqual(projection.nodes.map(node => [node.sourceId, node.kind]), [
    ['start', 'event'], ['task', 'activity'], ['gate', 'gateway'], ['data', 'data'], ['sub', 'activity']
  ]);
  assert.deepEqual(projection.nodes[0].inputs, []);
  assert.deepEqual(projection.nodes[2].outputs, []);
  const sequence = projection.wires.find(item => item.kind === 'sequence');
  assert.equal(sequence.fromPort, '');
  assert.match(sequence.label, /review complete/);
  assert.match(sequence.label, /default branch/);
  const association = projection.wires.find(item => item.kind === 'association');
  assert.equal(association.from, 'general:data');
  assert.equal(association.to, 'general:task');
  assert.equal(projection.nodes.find(node => node.kind === 'data').inputs.length, 0);
  assert.equal(projection.nodes[0].x, 40);
  assert.equal(projection.nodes[0].y, 40);
});

test('regeneration is idempotent and preserves canvas edits, confirmed handoffs and deleted source markers', () => {
  const { modeler, elements } = fixture();
  const saved = restoreWorkshop({});
  const projection = projectBpmn(modeler);
  mergeProjection(saved, projection);
  const activity = saved.toolbenchNodes.find(node => node.sourceId === 'task');
  activity.title = 'Workshop name';
  activity.x = 777;
  activity.inputs[0].label = 'Custom input';
  const association = saved.toolbenchWires.find(item => item.kind === 'association');
  Object.assign(association, { kind: 'data', confirmedFromBpmn: true, label: 'Agreed quantity schedule' });
  mergeProjection(saved, projectBpmn(modeler));
  assert.equal(saved.toolbenchNodes.length, projection.nodes.length);
  assert.equal(activity.x, 777);
  assert.equal(activity.title, 'Workshop name');
  assert.equal(activity.inputs[0].label, 'Custom input');
  assert.equal(saved.toolbenchWires.find(item => item.id === association.id).label, 'Agreed quantity schedule');
  elements.splice(elements.findIndex(item => item.id === 'task'), 1);
  const updated = projectBpmn(modeler);
  mergeProjection(saved, updated);
  assert.ok(saved.toolbenchNodes.includes(activity));
  assert.ok(blockWarnings(activity.id, saved, new Set(updated.nodes.map(node => node.sourceId))).includes('BPMN source missing'));
});

test('wire validation rejects missing sockets, self connections and duplicates', () => {
  const saved = restoreWorkshop({});
  const from = makeBlock('from', 'activity', 'Extract');
  const to = makeBlock('to', 'activity', 'Assess');
  saved.toolbenchNodes.push(from, to);
  const link = wire(from, to);
  assert.equal(wireError(link, saved), '');
  saved.toolbenchWires.push(link);
  assert.match(wireError({ ...link, id: 'duplicate' }, saved), /already connected/);
  assert.match(wireError({ ...link, toPort: 'missing' }, saved), /socket/);
  assert.match(wireError({ ...link, to: 'missing' }, saved), /block/);
  assert.match(wireError(wire(from, from), saved), /different blocks/);
});

test('multiple input providers remain a visible review condition rather than an implicit merge', () => {
  const saved = restoreWorkshop({});
  const one = makeBlock('one', 'data', 'First dataset');
  const two = makeBlock('two', 'data', 'Second dataset');
  const consumer = makeBlock('consumer', 'activity', 'Analyse');
  saved.toolbenchNodes.push(one, two, consumer);
  saved.toolbenchWires.push(wire(one, consumer, 'one'), wire(two, consumer, 'two'));
  assert.ok(blockWarnings(consumer.id, saved).includes('Multiple sources — review'));
});

test('canvas wires become existing-format handoff proposals without rewriting legacy records', () => {
  const legacy = { from: 'ARC-01', to: 'MAT-35', type: 'Data dependency', object: 'Legacy material list' };
  const saved = restoreWorkshop({ dependencies: [legacy] });
  const from = makeBlock('from', 'activity', 'Extract');
  const to = makeBlock('to', 'activity', 'Assess');
  saved.toolbenchNodes.push(from, to);
  const link = wire(from, to);
  saved.toolbenchWires.push(link);
  saveWireHandoff(link, saved, 'ARC-01');
  assert.equal(saved.dependencies.length, 2);
  assert.equal(saved.dependencies[0], legacy);
  assert.equal(saved.dependencies[1].object, 'Quantity table');
  to.title = 'Review quantities';
  saveWireHandoff(link, saved, 'ARC-01');
  assert.equal(saved.dependencies.length, 2);
  assert.equal(saved.dependencies[1].to, 'Review quantities');
  assert.deepEqual(restoreWorkshop(JSON.parse(JSON.stringify(saved))), saved);
  removeWire(link.id, saved);
  assert.deepEqual(saved.dependencies, [legacy]);
  assert.deepEqual(saved.toolbenchWires, []);
});

test('sequence guides never satisfy missing inputs or create handoffs', () => {
  const saved = restoreWorkshop({});
  const from = makeBlock('from', 'activity', 'First');
  const to = makeBlock('to', 'activity', 'Second');
  saved.toolbenchNodes.push(from, to);
  const guide = { ...wire(from, to), kind: 'sequence' };
  saved.toolbenchWires.push(guide);
  saveWireHandoff(guide, saved, 'ARC-01');
  assert.deepEqual(saved.dependencies, []);
  assert.deepEqual(blockWarnings(to.id, saved), ['Missing input']);
});

test('unmatched requests and provisional assumptions remain visible downstream, including cycles', () => {
  const saved = restoreWorkshop({});
  const input = makeBlock('input', 'request', 'Missing expertise');
  input.recordId = 'request';
  const analysis = makeBlock('analysis', 'activity', 'Analyse');
  const report = makeBlock('report', 'claim', 'Design claim');
  saved.toolbenchNodes.push(input, analysis, report);
  saved.requests.push({ id: 'request', draft: true, allowAssumption: false });
  saved.toolbenchWires.push(wire(input, analysis, 'one'), wire(analysis, report, 'two'));
  assert.ok(blockWarnings(report.id, saved).includes('Open request'));
  assert.ok(blockWarnings(report.id, saved).includes('Draft contract'));
  input.kind = 'assumption';
  input.recordId = 'assumption';
  saved.assumptions.push({ id: 'assumption', requestId: 'request', acceptedBy: 'Reviewer' });
  assert.ok(blockWarnings(report.id, saved).includes('Unapproved assumption'));
  saved.requests[0].allowAssumption = true;
  assert.ok(blockWarnings(report.id, saved).includes('Provisional'));
  analysis.inputs.push({ id: 'loop', label: '' });
  report.outputs.push({ id: 'loop-output', label: '' });
  saved.toolbenchWires.push({ ...wire(report, analysis, 'loop'), toPort: 'loop' });
  assert.ok(blockWarnings(report.id, saved).includes('Cycle — planning only'));
});

test('unavailable BPMN is not mistaken for deleted sources and missing providers remain explicit', () => {
  const saved = restoreWorkshop({});
  const node = makeBlock('node', 'provider', 'Candidate tool');
  node.sourceId = 'task';
  node.recordId = 'deleted-offer';
  saved.toolbenchNodes.push(node);
  assert.ok(!blockWarnings(node.id, saved, null).includes('BPMN source missing'));
  assert.ok(blockWarnings(node.id, saved).includes('Provider record missing'));
});
