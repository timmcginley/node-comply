import { saveWireHandoff, wireError } from './toolbench-data.js';
import { isCapture } from './speckle-client.js';
import { isPropertyLoader, isElementCapture, isElementCount, elementStatus } from './element-data.js';

const linkedCollections = { claim: 'claims', request: 'requests', provider: 'offers', assumption: 'assumptions' };
const links = { claimId: 'claims', requestId: 'requests', selectedOfferId: 'offers' };
const resultFields = ['propertyResult', 'elementResult', 'countResult'];
const sourceFields = ['sourceId', 'sourceName', 'sourceType', 'confirmedFromBpmn'];

export function selectionBounds(start, end) {
  return { x: Math.min(start.x, end.x), y: Math.min(start.y, end.y),
    width: Math.abs(end.x - start.x), height: Math.abs(end.y - start.y) };
}

export function blocksInSelection(bounds, blocks) {
  if (!bounds.width || !bounds.height) return [];
  return blocks.filter(block => block.x < bounds.x + bounds.width && block.x + block.width > bounds.x &&
    block.y < bounds.y + bounds.height && block.y + block.height > bounds.y).map(block => block.id);
}

export function blockSummary(node, records) {
  const rows = [];
  if (isCapture(node) && node.capture) {
    rows.push(['Model', node.capture.modelName || node.capture.modelId], ['Version', node.capture.versionId]);
  } else if (isPropertyLoader(node)) {
    const incoming = records.toolbenchWires.filter(wire => wire.kind === 'data' && wire.to === node.id);
    const source = incoming.length === 1 ? records.toolbenchNodes.find(item => item.id === incoming[0].from) : null;
    if (isCapture(source) && source.capture) {
      rows.push(['Model', source.capture.modelName || source.capture.modelId], ['Version', source.capture.versionId]);
    }
  } else if (isElementCapture(node)) {
    if (node.ifcClass) rows.push(['Class', node.ifcClass]);
    if (node.classificationPath) rows.push(['Property', node.classificationPath]);
  } else if (isElementCount(node)) {
    const status = elementStatus(node, records);
    rows.push(['Count', status.current ? String(status.value) : 'Not current - calculate when input is ready']);
  } else if (node.kind === 'data') {
    if (node.informationValue !== undefined && node.informationValue !== '') {
      rows.push(['Value', `${node.informationValue}${node.informationUnits ? ` ${node.informationUnits}` : ''}`]);
    }
    if (node.informationReference) rows.push(['Reference', node.informationReference]);
  }
  return rows;
}

export function canvasShortcut(event) {
  if (event.isComposing || event.altKey || event.target.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="textbox"]') ||
      !event.target.closest('#tbStage, .tb-toolbar')) return '';
  const key = event.key.toLowerCase();
  if (event.ctrlKey || event.metaKey) return { a: 'all', c: 'copy', v: 'paste' }[key] || '';
  return ['Delete', 'Backspace'].includes(event.key) ? 'delete' : '';
}

export function copyPatch(records, nodeIds) {
  const ids = new Set(nodeIds);
  const nodes = structuredClone(records.toolbenchNodes.filter(node => ids.has(node.id)));
  if (!nodes.length) throw new Error('Select at least one block to copy. Shift-click adds blocks to the selection.');
  for (const node of nodes) for (const key of resultFields) delete node[key];
  const wires = structuredClone(records.toolbenchWires.filter(wire => ids.has(wire.from) && ids.has(wire.to)));
  const planning = Object.fromEntries(Object.values(linkedCollections).map(key => [key, []]));
  function include(collection, id) {
    if (!id || planning[collection].some(item => item.id === id)) return;
    const record = records[collection].find(item => item.id === id);
    if (!record) return;
    planning[collection].push(structuredClone(record));
    for (const [key, target] of Object.entries(links)) include(target, record[key]);
  }
  for (const node of nodes) {
    if (linkedCollections[node.kind]) include(linkedCollections[node.kind], node.recordId);
    include('claims', node.claimId);
  }
  return { nodes, wires, planning };
}

export function pastePatch(patch, records, { x, y, teamId, keepSourceLinks = false, makeId = () => crypto.randomUUID() }) {
  if (!patch?.nodes?.length) throw new Error('Copy some canvas blocks before pasting.');
  const nodes = structuredClone(patch.nodes), wires = structuredClone(patch.wires);
  const nodeIds = new Map(nodes.map(node => [node.id, makeId()]));
  const portIds = new Map();
  const recordIds = Object.fromEntries(Object.keys(patch.planning).map(collection => [
    collection, new Map(patch.planning[collection].map(item => [item.id,
      records[collection].some(existing => existing.id === item.id) ? item.id : makeId()]))
  ]));
  const staged = { ...records, toolbenchNodes: [...records.toolbenchNodes], toolbenchWires: [...records.toolbenchWires],
    dependencies: [...records.dependencies] };
  const minX = Math.min(...nodes.map(node => Number.isFinite(node.x) ? node.x : 30));
  const minY = Math.min(...nodes.map(node => Number.isFinite(node.y) ? node.y : 30));
  for (const node of nodes) {
    const oldId = node.id;
    node.id = nodeIds.get(oldId);
    node.x = (Number.isFinite(node.x) ? node.x : 30) - minX + x;
    node.y = (Number.isFinite(node.y) ? node.y : 30) - minY + y;
    for (const port of [...node.inputs, ...node.outputs]) {
      const oldPort = port.id;
      port.id = makeId();
      portIds.set(`${oldId}:${oldPort}`, port.id);
    }
    for (const key of [...resultFields, 'createdBy', 'createdAt']) delete node[key];
    if (!keepSourceLinks) for (const key of sourceFields) delete node[key];
    const collection = linkedCollections[node.kind];
    if (collection && recordIds[collection].has(node.recordId)) node.recordId = recordIds[collection].get(node.recordId);
    if (recordIds.claims.has(node.claimId)) node.claimId = recordIds.claims.get(node.claimId);
  }
  for (const [collection, items] of Object.entries(patch.planning)) {
    staged[collection] = [...records[collection]];
    for (const original of items) {
      if (records[collection].some(item => item.id === original.id)) continue;
      const item = structuredClone(original);
      item.id = recordIds[collection].get(original.id);
      for (const [key, target] of Object.entries(links)) {
        if (recordIds[target].has(item[key])) item[key] = recordIds[target].get(item[key]);
      }
      if (item.toolbenchNodeId) {
        const oldNode = item.toolbenchNodeId;
        if (portIds.has(`${oldNode}:${item.toolbenchPortId}`)) item.toolbenchPortId = portIds.get(`${oldNode}:${item.toolbenchPortId}`);
        else delete item.toolbenchPortId;
        if (nodeIds.has(oldNode)) item.toolbenchNodeId = nodeIds.get(oldNode);
        else delete item.toolbenchNodeId;
      }
      if (!keepSourceLinks) delete item.scopedElementId;
      if (collection === 'assumptions') item.acceptedBy = '';
      staged[collection].push(item);
    }
  }
  staged.toolbenchNodes.push(...nodes);
  for (const wire of wires) {
    const from = wire.from, to = wire.to;
    wire.id = makeId();
    wire.from = nodeIds.get(from);
    wire.to = nodeIds.get(to);
    wire.fromPort = portIds.get(`${from}:${wire.fromPort}`) || '';
    wire.toPort = portIds.get(`${to}:${wire.toPort}`) || '';
    if (!keepSourceLinks) for (const key of sourceFields) delete wire[key];
    delete wire.handoffId;
    if (wire.kind === 'data') wire.handoffId = makeId();
    const error = wireError(wire, staged);
    if (error) throw new Error(`Cannot paste this connection: ${error}`);
    staged.toolbenchWires.push(wire);
    saveWireHandoff(wire, staged, teamId);
    if (wire.kind === 'data' && wire.note) {
      staged.dependencies.find(item => item.toolbenchWireId === wire.id).note = wire.note;
    }
  }
  Object.assign(records, staged);
  return { nodes, wires };
}
