import test from 'node:test';
import assert from 'node:assert/strict';
import { restoreWorkshop } from './workshop-data.js';
import { makeBlock, wireError } from './toolbench-data.js';
import { selectionBounds, blocksInSelection, blockSummary, canvasShortcut, copyPatch, pastePatch } from './toolbench-edit.js';
import { captureElements, filterKey, countElements, elementStatus } from './element-data.js';
import { focusPayload, validateFocusCanvas } from './focus-data.js';
import { workspacePayload } from './workspace-store.js';

const ids = () => {
  let next = 0;
  return () => `fresh-${++next}`;
};

test('drag selection normalizes every drag direction and selects overlapping blocks, not touching edges or empty areas', () => {
  const blocks = [
    { id: 'inside', x: 30, y: 40, width: 20, height: 30 },
    { id: 'partial', x: 90, y: 90, width: 30, height: 40 },
    { id: 'edge', x: 100, y: 40, width: 20, height: 20 },
    { id: 'outside', x: 150, y: 150, width: 30, height: 30 }
  ];
  for (const [start, end] of [
    [{ x: 20, y: 20 }, { x: 100, y: 100 }],
    [{ x: 100, y: 100 }, { x: 20, y: 20 }],
    [{ x: 20, y: 100 }, { x: 100, y: 20 }],
    [{ x: 100, y: 20 }, { x: 20, y: 100 }]
  ]) {
    const bounds = selectionBounds(start, end);
    assert.deepEqual(bounds, { x: 20, y: 20, width: 80, height: 80 });
    assert.deepEqual(blocksInSelection(bounds, blocks), ['inside', 'partial']);
  }
  assert.deepEqual(blocksInSelection({ x: 30, y: 40, width: 0, height: 20 }, blocks), []);
  assert.deepEqual(blocksInSelection({ x: 30, y: 40, width: 20, height: 0 }, blocks), []);
  assert.deepEqual(blocksInSelection({ x: -40, y: -40, width: 20, height: 20 }, blocks), []);
});
function planning() {
  const information = { ...makeBlock('info', 'data', 'Room areas', 40, 60), inputs: [],
    informationValue: '0', informationUnits: 'm2', informationReference: 'Model schedule' };
  const capture = { ...makeBlock('capture', 'suggestion', 'Capture room data', 350, 80), category: 'Capture' };
  const other = makeBlock('outside', 'suggestion', 'Outside selection', 700, 100);
  const wire = { id: 'wire', kind: 'data', from: 'info', fromPort: 'info:out', to: 'capture', toPort: 'capture:in',
    handoffId: 'original-handoff', label: 'Areas', note: 'm2; exact model revision required' };
  return restoreWorkshop({
    toolbenchNodes: [information, capture, other], toolbenchWires: [wire,
      { id: 'external', kind: 'data', from: 'capture', fromPort: 'capture:out', to: 'outside', toPort: 'outside:in' }],
    evidence: [{ id: 'historical' }], dependencies: [{ id: 'old', toolbenchWireId: 'wire' }, { id: 'legacy' }]
  });
}

test('group copying retains only internal wires and strips execution snapshots without touching the source', () => {
  const records = planning();
  Object.assign(records.toolbenchNodes[1], { propertyResult: { runId: 'load' }, elementResult: { elementIds: ['a'] }, countResult: { value: 1 } });
  const original = structuredClone(records);
  const copied = copyPatch(records, ['info', 'capture']);
  assert.equal(copied.nodes.length, 2);
  assert.deepEqual(copied.wires.map(wire => wire.id), ['wire']);
  for (const key of ['propertyResult', 'elementResult', 'countResult']) assert.equal(copied.nodes[1][key], undefined);
  assert.deepEqual(records, original);
  assert.throws(() => copyPatch(records, []), /at least one block/);
});

test('pasting groups remaps every block/port/wire/handoff, preserves layout and notes, and leaves archived data unchanged', () => {
  const source = planning(), target = restoreWorkshop({ evidence: [{ id: 'keep' }], dependencies: [{ id: 'legacy' }] });
  const copied = copyPatch(source, ['info', 'capture']);
  const makeId = ids();
  const first = pastePatch(copied, target, { x: 100, y: 120, teamId: 'ARC-01', makeId });
  const second = pastePatch(copied, target, { x: 140, y: 160, teamId: 'STR-20', makeId });
  assert.deepEqual(first.nodes.map(node => [node.x, node.y]), [[100, 120], [410, 140]]);
  const allIds = [...target.toolbenchNodes.flatMap(node => [node.id, ...node.inputs.map(port => port.id), ...node.outputs.map(port => port.id)]),
    ...target.toolbenchWires.flatMap(wire => [wire.id, wire.handoffId])];
  assert.equal(new Set(allIds).size, allIds.length);
  for (const group of [first, second]) {
    const wire = group.wires[0];
    assert.equal(wire.from, group.nodes[0].id);
    assert.equal(wire.fromPort, group.nodes[0].outputs[0].id);
    assert.equal(wire.to, group.nodes[1].id);
    assert.equal(wire.toPort, group.nodes[1].inputs[0].id);
    assert.equal(wireError(wire, target), '');
    const handoff = target.dependencies.find(item => item.toolbenchWireId === wire.id);
    assert.equal(handoff.id, wire.handoffId);
    assert.equal(handoff.note, copied.wires[0].note);
  }
  assert.equal(target.dependencies.length, 3);
  assert.deepEqual(target.evidence, [{ id: 'keep' }]);
  assert.equal(target.toolbenchNodes[0].informationValue, '0');
  assert.equal(target.toolbenchNodes[0].informationReference, 'Model schedule');
  assert.equal(source.toolbenchWires[0].id, 'wire');
  assert.deepEqual(validateFocusCanvas(JSON.parse(JSON.stringify(focusPayload('architecture', target))), 'architecture').records, target);
  assert.deepEqual(workspacePayload('ARC-01', target, { general: null, scoped: null }).records, target);
});

test('copying linked planning context across canvases preserves source snapshots but never transfers historical evidence or approvals', () => {
  const claim = { id: 'claim', title: 'Source claim', sourceExcerpt: 'Original A2 statement', sourceUrl: 'https://example.test/claim',
    scopedElementId: 'diagram-element' };
  const request = { id: 'request', claimId: claim.id, selectedOfferId: 'offer', toolbenchNodeId: 'request-node', toolbenchPortId: 'request-node:out' };
  const offer = { id: 'offer', requestId: request.id, providerTeamId: 'STR-20' };
  const assumption = { id: 'assumption', requestId: request.id, acceptedBy: 'Earlier review' };
  const source = restoreWorkshop({
    claims: [claim], requests: [request], offers: [offer], assumptions: [assumption], evidence: [{ id: 'past' }],
    toolbenchNodes: [
      { ...makeBlock('request-node', 'request', 'Needed input'), recordId: request.id, claimId: claim.id, sourceId: 'bpmn-source' },
      { ...makeBlock('assumption-node', 'assumption', 'Provisional input'), recordId: assumption.id }
    ]
  });
  const copied = copyPatch(source, ['request-node', 'assumption-node']);
  const target = restoreWorkshop({});
  const pasted = pastePatch(copied, target, { x: 50, y: 50, teamId: 'MAT-34', makeId: ids() });
  assert.equal(target.claims[0].sourceExcerpt, claim.sourceExcerpt);
  assert.equal(target.claims[0].sourceUrl, claim.sourceUrl);
  assert.equal(target.claims[0].scopedElementId, undefined);
  assert.equal(target.requests[0].claimId, target.claims[0].id);
  assert.equal(target.requests[0].selectedOfferId, target.offers[0].id);
  assert.equal(target.offers[0].requestId, target.requests[0].id);
  assert.equal(target.assumptions[0].requestId, target.requests[0].id);
  assert.equal(target.assumptions[0].acceptedBy, '');
  assert.equal(target.requests[0].toolbenchNodeId, pasted.nodes[0].id);
  assert.equal(target.requests[0].toolbenchPortId, pasted.nodes[0].outputs[0].id);
  assert.equal(pasted.nodes[0].sourceId, undefined);
  assert.deepEqual(target.evidence, []);
  const originalClaim = source.claims[0];
  pastePatch(copied, source, { x: 100, y: 100, teamId: 'ARC-01', keepSourceLinks: true, makeId: ids() });
  assert.equal(source.claims.length, 1);
  assert.equal(source.claims[0], originalClaim);
  assert.equal(source.assumptions[0].acceptedBy, 'Earlier review');
  assert.equal(source.toolbenchNodes.at(-2).sourceId, 'bpmn-source');
});

test('invalid internal connections fail atomically without partially pasting nodes, planning records or handoffs', () => {
  const source = planning();
  source.toolbenchNodes[1].functionId = 'elements.count';
  const patch = copyPatch(source, ['info', 'capture']);
  const target = restoreWorkshop({ claims: [{ id: 'existing' }] });
  const before = structuredClone(target);
  assert.throws(() => pastePatch(patch, target, { x: 30, y: 30, teamId: 'ARC-01', makeId: ids() }), /Cannot paste.*IFC elements Capture/);
  assert.deepEqual(target, before);
});

test('block summaries show applied settings, Information zero and only current calculated values', () => {
  const model = { ...makeBlock('model', 'capture', 'Model'), inputs: [], functionId: 'speckle.capture-model', functionVersion: 1,
    capture: { serverUrl: 'https://app.speckle.systems', projectId: 'project', modelId: 'model', modelName: 'Building', versionId: 'version' } };
  const filter = { ...makeBlock('filter', 'capture', 'Filter'), functionId: 'ifc.capture-elements', functionVersion: 1,
    ifcClass: 'IfcWindow', classificationPath: 'Attributes.type' };
  const count = { ...makeBlock('count', 'calculate', 'Count'), functionId: 'elements.count', functionVersion: 1 };
  const records = restoreWorkshop({ toolbenchNodes: [model, filter, count], toolbenchWires: [
    { id: 'w1', kind: 'data', from: 'model', fromPort: 'model:out', to: 'filter', toPort: 'filter:in' },
    { id: 'w2', kind: 'data', from: 'filter', fromPort: 'filter:out', to: 'count', toPort: 'count:in' }
  ] });
  filter.elementResult = {
    ...captureElements({ objects: [{ object_index: 0, application_id: 'wall' }], paths: [{ path_index: 0, path: 'Attributes.type' }],
      eav: [{ object_index: 0, path_index: 0, value_string: 'IfcWall' }] }, 'IfcWindow', 'Attributes.type'),
    source: model.capture, inputKey: filterKey(filter, records), runId: 'run'
  };
  count.countResult = countElements(count, records);
  assert.equal(elementStatus(count, records).current, true);
  assert.deepEqual(blockSummary(model, records), [['Model', 'Building'], ['Version', 'version']]);
  assert.deepEqual(blockSummary(filter, records), [['Class', 'IfcWindow'], ['Property', 'Attributes.type']]);
  assert.deepEqual(blockSummary(count, records), [['Count', '0']]);
  assert.deepEqual(blockSummary(planning().toolbenchNodes[0], records), [['Value', '0 m2'], ['Reference', 'Model schedule']]);
  model.capture.versionId = 'changed';
  assert.equal(blockSummary(count, records)[0][1].includes('Not current'), true);
  const copied = copyPatch(records, ['model', 'filter', 'count']);
  const target = restoreWorkshop({});
  const pasted = pastePatch(copied, target, { x: 30, y: 30, teamId: 'ARC-01', makeId: ids() });
  assert.equal(pasted.nodes[0].capture.versionId, 'changed');
  assert.equal(pasted.nodes[1].ifcClass, 'IfcWindow');
  assert.equal(pasted.nodes[1].elementResult, undefined);
  assert.equal(pasted.nodes[2].countResult, undefined);
  assert.equal(elementStatus(pasted.nodes[2], target).current, false);
});

test('keyboard commands are canvas-only and never hijack text editing, inspector forms, composition or Alt shortcuts', () => {
  const event = (key, options = {}) => ({ key, target: { closest: selector => selector === '#tbStage, .tb-toolbar' ? {} : null }, ...options });
  for (const [key, command] of [['c', 'copy'], ['v', 'paste'], ['a', 'all']]) {
    assert.equal(canvasShortcut(event(key, { ctrlKey: true })), command);
    assert.equal(canvasShortcut(event(key.toUpperCase(), { metaKey: true })), command);
  }
  assert.equal(canvasShortcut(event('Delete')), 'delete');
  assert.equal(canvasShortcut(event('Backspace')), 'delete');
  assert.equal(canvasShortcut(event('Delete', { target: { closest: () => ({}) } })), '');
  assert.equal(canvasShortcut(event('v', { ctrlKey: true, target: { closest: () => null } })), '');
  assert.equal(canvasShortcut(event('Delete', { isComposing: true })), '');
  assert.equal(canvasShortcut(event('Delete', { altKey: true })), '');
});
