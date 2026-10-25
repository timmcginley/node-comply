import test from 'node:test';
import assert from 'node:assert/strict';
import { restoreWorkshop, escapeHtml, scopedActivities, activityLinkWarning } from './workshop-data.js';

test('legacy workshop records survive restoration and export without rewriting dependencies', () => {
  const legacy = {
    mappings: [{ generalId: 'General_1', scopedId: 'Task_1' }],
    nominations: [{ id: 'General_1', teamId: 'ARC-01' }],
    dependencies: [{ from: 'ARC-01', to: 'STR-01', type: 'Data dependency', object: 'Volumes' }]
  };
  const restored = restoreWorkshop(legacy);
  assert.deepEqual(restored.dependencies, legacy.dependencies);
  assert.deepEqual(restored.mappings, legacy.mappings);
  assert.deepEqual(restored.nominations, legacy.nominations);
  assert.deepEqual(restored.activities, []);
  assert.deepEqual(restored.references, []);
  assert.deepEqual(JSON.parse(JSON.stringify(restored)), restored);
  assert.deepEqual(legacy, { mappings: restored.mappings, nominations: restored.nominations, dependencies: restored.dependencies });
});

test('new metadata and linked handoffs survive a storage and export round trip', () => {
  const saved = {
    activities: [{ id: 'notes-1', scopedElementId: 'Task_1', name: 'Analyse', owner: 'ARC-01', referenceIds: ['ref-1'], repeated: 'STR-01: Analyse' }],
    references: [{ id: 'ref-1', name: 'Materials', location: 'data/materials.csv', owner: 'MAT-01', refresh: 'When source changes' }],
    dependencies: [{ from: 'Analyse', to: 'STR-01', type: 'Data dependency', object: 'Results', sourceActivityId: 'Task_1' }]
  };
  const restored = restoreWorkshop(JSON.parse(JSON.stringify(saved)));
  for (const key of Object.keys(saved)) assert.deepEqual(restored[key], saved[key]);
  assert.equal(activityLinkWarning('Task_1', [{ id: 'Task_1' }]), '');
  assert.match(activityLinkWarning('Task_1', []), /missing/);
  assert.equal(activityLinkWarning(undefined, []), '');
});

test('missing or non-array collections are normalized independently', () => {
  assert.deepEqual(restoreWorkshop({ activities: null, references: {}, dependencies: 'invalid' }), {
    mappings: [], nominations: [], dependencies: [], activities: [], references: [],
    claims: [], requests: [], offers: [], assumptions: [], evidence: [], toolbenchNodes: [], toolbenchWires: []
  });
});

test('student text is escaped before insertion into workshop markup', () => {
  assert.equal(escapeHtml(`<img src=x onerror="alert('x')">&`), '&lt;img src=x onerror=&quot;alert(&#39;x&#39;)&quot;&gt;&amp;');
  assert.equal(escapeHtml(undefined), '');
});

test('only BPMN activities, not labels, events or gateways, are offered for linkage', () => {
  const element = (id, activity, name, labelTarget, businessObjectId = id) => ({
    id, labelTarget, businessObject: { id: businessObjectId, name, $instanceOf: type => type === 'bpmn:Activity' && activity }
  });
  const elements = [
    element('Task_1', true, 'Analyse'),
    element('SubProcess_1', true, 'Prepare model'),
    element('CallActivity_1', true),
    element('Event_1', false, 'Start'),
    element('Gateway_1', false, 'Ready?'),
    element('SubProcess_1_plane', true, 'Prepare model', undefined, 'SubProcess_1'),
    element('Task_1_label', true, 'Analyse', { id: 'Task_1' })
  ];
  const modeler = { get: name => {
    assert.equal(name, 'elementRegistry');
    return { filter: predicate => elements.filter(predicate) };
  } };
  assert.deepEqual(scopedActivities(modeler), [
    { id: 'Task_1', name: 'Analyse' },
    { id: 'SubProcess_1', name: 'Prepare model' },
    { id: 'CallActivity_1', name: 'CallActivity_1' }
  ]);
});
