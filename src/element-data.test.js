import test from 'node:test';
import assert from 'node:assert/strict';
import {
  captureElements, classificationPaths, filterKey, countElements, currentElements, currentCount, displayValue, elementStatus,
  currentPropertyLoad
} from './element-data.js';
import { wireError, blockWarnings, removeBlock } from './toolbench-data.js';
import { restoreWorkshop } from './workshop-data.js';
import { workspacePayload, importWorkspace } from './workspace-store.js';
import { objectPropertyTables } from './speckle-object-properties.js';

const path = 'properties.Attributes.type';
function properties() {
  return {
    objects: [
      { object_index: 0, application_id: 'window-guid-1' },
      { object_index: 1, application_id: 'window-guid-2' },
      { object_index: 2, application_id: 'window-type-guid' },
      { object_index: 3, application_id: 'wall-guid' },
      { object_index: 4, application_id: 'mesh-id' },
      { object_index: 5, application_id: 'window-guid-1' }
    ],
    paths: [
      { path_index: 0, path },
      { path_index: 1, path: 'properties.Element Type Attributes.type' },
      { path_index: 2, path: 'speckle_type' }
    ],
    eav: [
      { object_index: 0, path_index: 0, value_string: 'IfcWindow' },
      { object_index: 1, path_index: 0, value_string: 'IfcWindow' },
      { object_index: 2, path_index: 0, value_string: 'IfcWindowType' },
      { object_index: 3, path_index: 0, value_string: 'IfcWall' },
      { object_index: 5, path_index: 0, value_string: 'IfcWindow' },
      { object_index: 0, path_index: 1, value_string: 'IfcWindowType' },
      { object_index: 0, path_index: 2, value_string: 'Objects.Data.DataObject' },
      { object_index: 4, path_index: 2, value_string: 'Objects.Geometry.Mesh' }
    ]
  };
}
function flow() {
  const capture = {
    id: 'model', functionId: 'speckle.capture-model', functionVersion: 1, inputs: [], outputs: [{ id: 'model:out' }],
    capture: { serverUrl: 'https://app.speckle.systems', projectId: 'p1', modelId: 'm1', versionId: 'v1' }
  };
  const elements = {
    id: 'elements', functionId: 'ifc.capture-elements', functionVersion: 1, ifcClass: 'IfcWindow', classificationPath: path,
    inputs: [{ id: 'elements:in' }], outputs: [{ id: 'elements:out' }]
  };
  const count = { id: 'count', functionId: 'elements.count', functionVersion: 1, inputs: [{ id: 'count:in' }], outputs: [{ id: 'count:out' }] };
  const wires = [
    { id: 'w1', kind: 'data', from: 'model', fromPort: 'model:out', to: 'elements', toPort: 'elements:in' },
    { id: 'w2', kind: 'data', from: 'elements', fromPort: 'elements:out', to: 'count', toPort: 'count:in' }
  ];
  const records = restoreWorkshop({ toolbenchNodes: [capture, elements, count], toolbenchWires: wires });
  const [source, filter, calculator] = records.toolbenchNodes;
  filter.elementResult = {
    ...captureElements(properties(), 'IfcWindow', path), source: structuredClone(source.capture),
    inputKey: filterKey(filter, records), runId: 'run1', capturedAt: '2026-11-01T12:00:00Z'
  };
  calculator.countResult = { ...countElements(calculator, records), calculatedAt: '2026-11-01T12:01:00Z' };
  return { records, capture: source, elements: filter, count: calculator };
}

function sharedFlow() {
  const f = flow(), data = properties();
  data.eav.find(row => row.value_string === 'IfcWall').value_string = 'IfcSlab';
  const loader = {
    id: 'loader', functionId: 'speckle.read-properties', functionVersion: 1,
    inputs: [{ id: 'loader:in' }], outputs: [{ id: 'loader:out' }],
    propertyResult: { source: structuredClone(f.capture.capture), inputNodeId: f.capture.id, runId: 'load1', objectCount: data.objects.length }
  };
  f.records.toolbenchNodes.push(loader);
  Object.assign(f.records.toolbenchWires[0], { from: loader.id, fromPort: 'loader:out' });
  f.records.toolbenchWires.push({ id: 'load-wire', kind: 'data', from: f.capture.id, fromPort: 'model:out', to: loader.id, toPort: 'loader:in' });
  f.elements.functionId = 'ifc.filter-elements';
  f.elements.elementResult.inputKey = filterKey(f.elements, f.records);
  f.count.countResult = countElements(f.count, f.records);
  const slab = {
    ...structuredClone(f.elements), id: 'slabs', ifcClass: 'IfcSlab',
    inputs: [{ id: 'slabs:in' }], outputs: [{ id: 'slabs:out' }]
  };
  const slabCount = {
    id: 'slab-count', functionId: 'elements.count', functionVersion: 1,
    inputs: [{ id: 'slab-count:in' }], outputs: [{ id: 'slab-count:out' }]
  };
  f.records.toolbenchNodes.push(slab, slabCount);
  f.records.toolbenchWires.push(
    { id: 'slab-input', kind: 'data', from: loader.id, fromPort: 'loader:out', to: slab.id, toPort: 'slabs:in' },
    { id: 'slab-count-input', kind: 'data', from: slab.id, fromPort: 'slabs:out', to: slabCount.id, toPort: 'slab-count:in' }
  );
  slab.elementResult = {
    ...captureElements(data, slab.ifcClass, path), source: structuredClone(f.capture.capture),
    inputKey: filterKey(slab, f.records), runId: 'slab-run'
  };
  slabCount.countResult = countElements(slabCount, f.records);
  return { ...f, loader, slab, slabCount };
}

test('one property-loader output feeds separate window/slab filters and independent counts', () => {
  const f = sharedFlow();
  assert.equal(currentPropertyLoad(f.loader, f.records).objectCount, 6);
  assert.equal(elementStatus(f.loader, f.records).current, true);
  assert.equal(countElements(f.count, f.records).value, 2);
  assert.equal(countElements(f.slabCount, f.records).value, 1);
  assert.deepEqual(currentElements(f.slab, f.records).elementIds, ['wall-guid']);
  for (const wire of f.records.toolbenchWires) assert.equal(wireError(wire, f.records), '');
  f.slab.ifcClass = 'IfcDoor';
  assert.equal(elementStatus(f.slabCount, f.records).current, false);
  assert.equal(currentCount(f.count, f.records).value, 2);
});

test('loader rereads, changed model/version, missing/ambiguous wires and deletion invalidate both branches', () => {
  for (const change of [
    f => { f.loader.propertyResult.runId = 'load2'; },
    f => { f.capture.capture.versionId = 'v2'; },
    f => { f.capture.capture.modelId = 'm2'; },
    f => { f.capture.capture.projectId = 'p2'; },
    f => { f.loader.outputs[0].id = 'replacement'; },
    f => { f.loader.functionVersion = 2; },
    f => { delete f.loader.propertyResult; },
    f => { f.loader.propertyResult.objectCount = -1; },
    f => { f.loader.propertyResult.inputNodeId = 'different-source'; },
    f => { const wire = f.records.toolbenchWires.find(wire => wire.id === 'load-wire'); f.records.toolbenchWires.push({ ...wire, id: 'extra-load-wire' }); },
    f => { removeBlock(f.loader.id, f.records); }
  ]) {
    const f = sharedFlow(), display = addDisplay(f);
    change(f);
    for (const node of [f.elements, f.count, f.slab, f.slabCount, display]) {
      assert.equal(elementStatus(node, f.records).current, false);
    }
  }
});

test('new wire contracts require model to loader to filter, allow fan-out and preserve legacy inputs', () => {
  const f = sharedFlow(), filterWire = f.records.toolbenchWires[0];
  assert.match(wireError({ ...filterWire, from: 'model', fromPort: 'model:out' }, f.records), /IFC filter needs/);
  assert.match(wireError({ ...filterWire, kind: 'association' }, f.records), /solid wire/);
  assert.match(wireError({ ...filterWire, id: 'duplicate' }, f.records), /exactly one/);
  const loaderWire = f.records.toolbenchWires.find(wire => wire.id === 'load-wire');
  assert.match(wireError({ ...loaderWire, from: 'elements', fromPort: 'elements:out' }, f.records), /Load model properties needs/);
  const old = flow();
  assert.equal(wireError(old.records.toolbenchWires[0], old.records), '');
  assert.equal(currentCount(old.count, old.records).value, 2);
});

test('shared loader/filter metadata and saved results round-trip without serializing raw properties', () => {
  const f = sharedFlow(), display = addDisplay(f);
  const saved = workspacePayload('ARC-01', f.records, { general: '<general/>', scoped: '<scoped/>' });
  const restored = restoreWorkshop(importWorkspace(JSON.parse(JSON.stringify(saved)), 'ARC-01', {}).records);
  assert.equal(currentPropertyLoad(restored.toolbenchNodes.find(node => node.id === 'loader'), restored).runId, 'load1');
  assert.equal(displayValue(restored.toolbenchNodes.find(node => node.id === display.id), restored).value, 2);
  assert.equal(currentCount(restored.toolbenchNodes.find(node => node.id === 'slab-count'), restored).value, 1);
  assert.equal(JSON.stringify(saved).includes('object_index'), false);
  assert.equal(JSON.stringify(saved).includes('value_string'), false);
});

test('exact instance classes exclude types/geometry and deduplicate retained application IDs', () => {
  const result = captureElements(properties(), 'IfcWindow', path);
  assert.deepEqual(result.elementIds, ['window-guid-1', 'window-guid-2']);
  assert.equal(result.classifiedObjects, 4);
  assert.equal(result.totalObjects, 5);
  assert.deepEqual(classificationPaths(properties()), [path]);
  assert.throws(() => captureElements(properties(), 'IfcWindow', 'properties.Element Type Attributes.type'), /not Element Type/);
  assert.throws(() => captureElements(properties(), 'ifcwindow', path), /exact IFC class/);
  assert.equal(captureElements(properties(), 'IfcDoor', path).elementIds.length, 0);
});

test('unavailable/missing classification and malformed identities cannot become a successful zero', () => {
  assert.throws(() => captureElements(null, 'IfcWindow', path), /not been loaded/);
  assert.throws(() => captureElements(properties(), 'IfcWindow', 'unknown.path'), /no .* property/);
  const empty = properties();
  empty.eav = [];
  assert.throws(() => captureElements(empty, 'IfcWindow', path), /not a zero count/);
  const invalid = properties();
  invalid.objects[0].application_id = '';
  assert.throws(() => captureElements(invalid, 'IfcWindow', path), /identity/);
  const conflict = properties();
  conflict.eav.push({ object_index: 0, path_index: 0, value_string: 'IfcDoor' });
  assert.throws(() => captureElements(conflict, 'IfcWindow', path), /conflicting IFC/);
  const broken = properties();
  broken.eav[0].object_index = 100;
  assert.throws(() => captureElements(broken, 'IfcWindow', path), /without an object/);
  const generic = properties();
  generic.eav[0].value_string = 'Objects.Data.DataObject';
  assert.throws(() => captureElements(generic, 'IfcWindow', path), /not a complete IFC/);
});

test('count is the captured unique ID collection size, including a valid zero', () => {
  const f = flow();
  assert.equal(countElements(f.count, f.records).value, 2);
  assert.equal(elementStatus(f.count, f.records).text, 'Count: 2');
  f.elements.elementResult.elementIds = [];
  f.count.countResult = countElements(f.count, f.records);
  assert.equal(elementStatus(f.count, f.records).text, 'Count: 0');
});

test('changed version, class/path, source socket, duplicate inputs or deleted blocks invalidate downstream counts', () => {
  for (const change of [
    f => { f.capture.capture.versionId = 'v2'; },
    f => { f.elements.ifcClass = 'IfcDoor'; },
    f => { f.elements.classificationPath = 'type'; },
    f => { f.capture.outputs[0].id = 'replacement'; },
    f => { f.records.toolbenchWires.push({ ...f.records.toolbenchWires[0], id: 'duplicate' }); },
    f => { removeBlock(f.capture.id, f.records); },
    f => { f.records.toolbenchWires[0].kind = 'association'; }
  ]) {
    const f = flow();
    change(f);
    assert.equal(elementStatus(f.elements, f.records).current, false);
    assert.equal(elementStatus(f.count, f.records).current, false);
    assert.throws(() => countElements(f.count, f.records));
    assert.ok(blockWarnings(f.count.id, f.records).length);
  }
});

test('recapture needs recount; saved outputs and provenance survive the complete workspace round trip', () => {
  const f = flow();
  const saved = workspacePayload('ARC-01', f.records, { general: '<general/>', scoped: '<scoped/>' });
  assert.deepEqual(importWorkspace(JSON.parse(JSON.stringify(saved)), 'ARC-01', {}), saved);
  const restored = restoreWorkshop(saved.records);
  assert.equal(elementStatus(restored.toolbenchNodes[2], restored).text, 'Count: 2');
  f.elements.elementResult.runId = 'run2';
  assert.equal(elementStatus(f.count, f.records).current, false);
  f.count.countResult = countElements(f.count, f.records);
  assert.equal(elementStatus(f.count, f.records).current, true);
  f.elements.elementResult.elementIds.push('window-guid-1');
  assert.throws(() => currentElements(f.elements, f.records), /Capture elements first/);
});

test('known function inputs reject mismatched sources and multiple incoming wires, preserving legacy sketches', () => {
  const f = flow();
  assert.equal(wireError(f.records.toolbenchWires[0], f.records), '');
  assert.equal(wireError(f.records.toolbenchWires[1], f.records), '');
  assert.match(wireError({ ...f.records.toolbenchWires[0], id: 'wrong', to: f.count.id, toPort: 'count:in' }, f.records), /Count needs/);
  assert.match(wireError({ ...f.records.toolbenchWires[0], id: 'another' }, f.records), /exactly one/);
  const legacy = { id: 'legacy', inputs: [{ id: 'legacy:in' }], outputs: [], kind: 'activity' };
  f.records.toolbenchNodes.push(legacy);
  assert.equal(wireError({ ...f.records.toolbenchWires[0], id: 'legacyWire', to: legacy.id, toPort: 'legacy:in' }, f.records), '');
});

test('unsupported function versions or missing classification coverage cannot validate a saved result', () => {
  const f = flow();
  f.elements.functionVersion = 2;
  assert.throws(() => countElements(f.count, f.records), /not supported/);
  f.elements.functionVersion = 1;
  f.count.functionVersion = 2;
  assert.throws(() => countElements(f.count, f.records), /not supported/);
  f.count.functionVersion = 1;
  f.elements.elementResult.elementIds = [];
  f.elements.elementResult.classifiedObjects = 0;
  assert.equal(elementStatus(f.elements, f.records).current, false);
  assert.equal(elementStatus(f.count, f.records).current, false);
});

function addDisplay(f) {
  const display = {
    id: 'display', kind: 'communicate', functionId: 'communicate.display-value', functionVersion: 1, displayLabel: 'Window count',
    inputs: [{ id: 'display:in' }], outputs: []
  };
  f.records.toolbenchNodes.push(display);
  f.records.toolbenchWires.push({ id: 'w3', kind: 'data', from: 'count', fromPort: 'count:out', to: 'display', toPort: 'display:in' });
  return display;
}

test('Display value follows the current count, including zero, without storing a second result', () => {
  const f = flow(), display = addDisplay(f);
  assert.equal(displayValue(display, f.records).value, 2);
  assert.equal(elementStatus(display, f.records).value, 2);
  assert.equal(currentCount(f.count, f.records).value, 2);
  f.elements.elementResult.elementIds = [];
  f.elements.elementResult.runId = 'empty-run';
  assert.equal(elementStatus(display, f.records).current, false);
  f.count.countResult = countElements(f.count, f.records);
  assert.equal(displayValue(display, f.records).value, 0);
  assert.equal(elementStatus(display, f.records).text, 'Value: 0');
  assert.equal(Object.hasOwn(display, 'countResult'), false);
  const saved = workspacePayload('ARC-01', f.records, { general: '<general/>', scoped: '<scoped/>' });
  const imported = importWorkspace(JSON.parse(JSON.stringify(saved)), 'ARC-01', {});
  assert.equal(imported.records.toolbenchNodes[3].displayLabel, 'Window count');
  assert.equal(displayValue(imported.records.toolbenchNodes[3], imported.records).value, 0);
});

test('missing, stale, disconnected, wrong or ambiguous inputs never show a previous display value as current', () => {
  for (const change of [
    f => { delete f.count.countResult; },
    f => { delete f.elements.elementResult; },
    f => { f.capture.capture.versionId = 'v2'; },
    f => { f.elements.elementResult.runId = 'run2'; },
    f => { f.count.countResult.value = 999; },
    f => { f.records.toolbenchWires[2].fromPort = 'missing'; },
    f => { f.records.toolbenchWires[2].from = 'model'; f.records.toolbenchWires[2].fromPort = 'model:out'; },
    f => { f.records.toolbenchWires.push({ ...f.records.toolbenchWires[2], id: 'duplicate' }); },
    f => { removeBlock(f.count.id, f.records); }
  ]) {
    const f = flow(), display = addDisplay(f);
    change(f);
    assert.equal(elementStatus(display, f.records).current, false);
    assert.equal(elementStatus(display, f.records).value, undefined);
    assert.throws(() => displayValue(display, f.records));
    assert.ok(blockWarnings(display.id, f.records).length);
  }
});

test('Display value accepts one solid Count output and rejects an unsupported display version', () => {
  const f = flow(), display = addDisplay(f), wire = f.records.toolbenchWires[2];
  assert.equal(wireError(wire, f.records), '');
  assert.match(wireError({ ...wire, from: 'elements', fromPort: 'elements:out' }, f.records), /Display value needs/);
  assert.match(wireError({ ...wire, kind: 'association' }, f.records), /solid wire/);
  assert.match(wireError({ ...wire, id: 'duplicate' }, f.records), /exactly one/);
  display.functionVersion = 2;
  assert.equal(elementStatus(display, f.records).current, false);
  assert.throws(() => displayValue(display, f.records), /not supported/);
});

test('legacy JSON properties use the same exact IFC filter/count shape, including root objects and GUID fallback', () => {
  const data = objectPropertyTables([
    { id: 'root', data: { speckle_type: 'Collection' } },
    { id: 'window1', applicationId: 'window-guid', data: { properties: { Attributes: { type: 'IfcWindow', GlobalId: 'window-guid' } } } },
    { id: 'duplicate', data: { properties: { Attributes: { type: 'IfcWindow', GlobalId: 'window-guid' } } } },
    { id: 'type', applicationId: 'type-guid', data: { properties: { Attributes: { type: 'IfcWindowType' } } } },
    { id: 'geometry', data: {} }
  ]);
  assert.deepEqual(captureElements(data, 'IfcWindow', path).elementIds, ['window-guid']);
  assert.equal(captureElements(data, 'IfcDoor', path).elementIds.length, 0);
  const singleRoot = objectPropertyTables([{ id: 'root', applicationId: 'root-guid', data: { Attributes: { type: 'IfcWindow' } } }]);
  assert.deepEqual(captureElements(singleRoot, 'IfcWindow', 'Attributes.type').elementIds, ['root-guid']);
});

test('legacy IFC identities, unreadable data and detached properties never become guessed or partial counts', () => {
  assert.throws(() => objectPropertyTables([{ id: 'object', data: { properties: { Attributes: { type: 'IfcWindow' } } } }]), /no retained application ID/);
  assert.throws(() => objectPropertyTables([{ id: 'object', data: null }]), /without readable property/);
  assert.throws(() => objectPropertyTables([{ id: 'object', applicationId: 'guid', data: {
    properties: { speckle_type: 'reference', referencedId: 'property-id' }
  } }]), /detached property dictionaries/);
});
