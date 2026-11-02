import { requestPlan } from './claim-data.js';
import { isPropertyLoader, isIfcFilter, isElementCapture, isElementCount, isValueDisplay, isElementFunction, elementStatus } from './element-data.js';
import { isCapture } from './speckle-client.js';

export const SIX_CATEGORIES = ['Capture', 'Connect', 'Calculate', 'Check', 'Compare', 'Communicate'];

export function suggestionDetails(title, category, owner, teamIds) {
  if (!title.trim()) throw new Error('Give this suggestion a name.');
  if (!SIX_CATEGORIES.includes(category)) throw new Error('Choose a six-C category.');
  if (owner !== '' && !teamIds.includes(owner)) throw new Error('Choose an existing responsible team.');
  return { title: title.trim(), category, owner };
}

export function captureDesignClaim(records, { id, teamId, text, sourceUrl, capturedAt }) {
  if (!text.trim()) throw new Error('A source claim excerpt is required.');
  const existing = records.claims.find(claim =>
    claim.teamId === teamId && claim.sourceUrl === sourceUrl && claim.sourceExcerpt === text
  );
  if (existing) return existing;
  const claim = {
    id, teamId, title: `${teamId} design claim`, statement: text, scope: '', acceptance: '',
    sourceUrl, sourceExcerpt: text, sourceCapturedAt: capturedAt, updatedAt: capturedAt, draft: true
  };
  records.claims.push(claim);
  return claim;
}

export function makeBlock(id, kind, title, x = 60, y = 60) {
  const context = ['event', 'gateway'].includes(kind);
  return {
    id, kind, title, x, y, owner: '',
    inputs: context || ['request', 'assumption'].includes(kind) ? [] : [{ id: `${id}:in`, label: '' }],
    outputs: context || kind === 'claim' ? [] : [{ id: `${id}:out`, label: '' }]
  };
}

export function projectBpmn(modeler) {
  const elements = modeler.get('elementRegistry').filter(element =>
    !element.labelTarget && element.id === element.businessObject?.id
  );
  const kindOf = element => {
    const object = element.businessObject;
    if (object.$instanceOf('bpmn:Activity')) return 'activity';
    if (object.$instanceOf('bpmn:Gateway')) return 'gateway';
    if (object.$instanceOf('bpmn:Event')) return 'event';
    if (['bpmn:DataObjectReference', 'bpmn:DataStoreReference'].includes(element.type)) return 'data';
    return '';
  };
  const shapes = elements.filter(element => {
    if (!kindOf(element)) return false;
    for (let parent = element.parent; parent; parent = parent.parent) {
      if (parent.businessObject?.$instanceOf('bpmn:SubProcess')) return false;
    }
    return true;
  });
  const minX = shapes.length ? Math.min(...shapes.map(element => element.x)) : 0;
  const minY = shapes.length ? Math.min(...shapes.map(element => element.y)) : 0;
  const nodes = shapes.map(element => ({
    ...makeBlock(`general:${element.id}`, kindOf(element),
      element.businessObject.name || element.type.replace('bpmn:', ''),
      Math.max(30, (element.x - minX) * 2.2 + 40),
      Math.max(30, (element.y - minY) * 1.8 + 40)),
    sourceId: element.id, sourceName: element.businessObject.name || '', sourceType: element.type
  }));
  const bySource = new Map(nodes.map(node => [node.sourceId, node]));
  const wires = [];
  for (const element of elements) {
    const sequence = element.type === 'bpmn:SequenceFlow';
    if (!sequence && !['bpmn:DataInputAssociation', 'bpmn:DataOutputAssociation'].includes(element.type)) continue;
    const from = bySource.get(element.source?.id);
    const to = bySource.get(element.target?.id);
    if (!from || !to) continue;
    const condition = element.businessObject.conditionExpression?.body;
    const isDefault = element.source.businessObject.default?.id === element.id;
    wires.push({
      id: `general-wire:${element.id}`, kind: sequence ? 'sequence' : 'association',
      sourceId: element.id, from: from.id, to: to.id,
      fromPort: sequence ? '' : from.outputs[0]?.id,
      toPort: sequence ? '' : to.inputs[0]?.id,
      label: [element.businessObject.name, condition, isDefault ? 'default branch' : ''].filter(Boolean).join(' | ')
    });
  }
  for (const node of nodes.filter(item => item.kind === 'data')) {
    if (!wires.some(wire => wire.kind === 'association' && wire.to === node.id)) node.inputs = [];
  }
  return { nodes, wires };
}

export function mergeProjection(records, projection) {
  const ids = new Set(records.toolbenchNodes.map(node => node.id));
  records.toolbenchNodes.push(...projection.nodes.filter(node => !ids.has(node.id)));
  for (const wire of projection.wires) {
    if (!records.toolbenchNodes.some(node => node.id === wire.from) ||
        !records.toolbenchNodes.some(node => node.id === wire.to)) continue;
    const index = records.toolbenchWires.findIndex(item => item.id === wire.id);
    if (index < 0) records.toolbenchWires.push(wire);
    else if (!records.toolbenchWires[index].confirmedFromBpmn) records.toolbenchWires[index] = wire;
  }
}

export function wireError(wire, records) {
  const from = records.toolbenchNodes.find(node => node.id === wire.from);
  const to = records.toolbenchNodes.find(node => node.id === wire.to);
  if (!from || !to) return 'A connected block is missing.';
  if (wire.kind === 'sequence') return '';
  if (!from.outputs.some(port => port.id === wire.fromPort) || !to.inputs.some(port => port.id === wire.toPort)) {
    return 'A connected socket is missing.';
  }
  if (wire.from === wire.to) return 'Connect different blocks.';
  if (isPropertyLoader(to) && (!isCapture(from) || wire.kind !== 'data')) return 'Load model properties needs a solid wire from a Speckle model Capture.';
  if (isIfcFilter(to) && (!isPropertyLoader(from) || wire.kind !== 'data')) return 'IFC filter needs a solid wire from Load model properties.';
  if (isElementCapture(to) && !isIfcFilter(to) && (!isCapture(from) || wire.kind !== 'data')) return 'IFC Capture needs a solid wire from a Speckle model Capture.';
  if (isElementCount(to) && (!isElementCapture(from) || wire.kind !== 'data')) return 'Count needs a solid wire from an IFC elements Capture.';
  if (isValueDisplay(to) && (!isElementCount(from) || wire.kind !== 'data')) return 'Display value needs a solid wire from Calculate: Count elements.';
  if (isElementFunction(to) &&
      records.toolbenchWires.some(item => item.id !== wire.id && item.kind !== 'sequence' && item.to === wire.to && item.toPort === wire.toPort)) {
    return 'This function accepts exactly one input source. Remove the existing input wire first.';
  }
  if (records.toolbenchWires.some(item => item.id !== wire.id && item.kind !== 'sequence' &&
      item.from === wire.from && item.to === wire.to && item.fromPort === wire.fromPort && item.toPort === wire.toPort)) {
    return 'These sockets are already connected.';
  }
  return '';
}

export function saveWireHandoff(wire, records, teamId) {
  if (wire.kind !== 'data') return;
  const from = records.toolbenchNodes.find(node => node.id === wire.from);
  const to = records.toolbenchNodes.find(node => node.id === wire.to);
  const index = records.dependencies.findIndex(item => item.toolbenchWireId === wire.id);
  const handoff = {
    id: wire.handoffId, toolbenchWireId: wire.id, teamId,
    from: from.title, to: to.title, type: 'Data dependency',
    object: wire.label || 'Unnamed information (Toolbench draft)', draft: !wire.label
  };
  if (index < 0) records.dependencies.push(handoff);
  else records.dependencies[index] = { ...records.dependencies[index], ...handoff };
}

export function removeWire(id, records) {
  records.toolbenchWires = records.toolbenchWires.filter(wire => wire.id !== id);
  records.dependencies = records.dependencies.filter(item => item.toolbenchWireId !== id);
}

export function removeBlock(id, records) {
  if (!records.toolbenchNodes.some(node => node.id === id)) throw new Error('The selected block no longer exists.');
  for (const wire of records.toolbenchWires.filter(item => item.from === id || item.to === id)) removeWire(wire.id, records);
  records.toolbenchNodes = records.toolbenchNodes.filter(node => node.id !== id);
}

export function blockWarnings(id, records, sourceIds = null) {
  const warnings = new Set();
  const visited = new Set();
  function visit(nodeId, path) {
    if (path.has(nodeId)) { warnings.add('Cycle — planning only'); return; }
    if (visited.has(nodeId)) return;
    visited.add(nodeId);
    const node = records.toolbenchNodes.find(item => item.id === nodeId);
    if (!node) { warnings.add('Missing block'); return; }
    if (isElementFunction(node)) {
      const execution = elementStatus(node, records);
      if (!execution.current) warnings.add(execution.text);
    }
    if (node.functionId === 'speckle.capture-model' && !node.capture?.versionId) warnings.add('Capture version not selected');
    if (node.sourceId && sourceIds && !sourceIds.has(node.sourceId)) warnings.add('BPMN source missing');
    if (node.kind === 'request') {
      const request = records.requests.find(item => item.id === node.recordId);
      if (!request) warnings.add('Request record missing');
      else {
        const plan = requestPlan(request, records);
        if (!plan.offer) warnings.add('Open request');
        if (request.draft) warnings.add('Draft contract');
        if (plan.assumptions.length) warnings.add(plan.label.startsWith('Blocked') ? 'Blocked assumption' : 'Provisional');
      }
    }
    if (node.kind === 'assumption') {
      const assumption = records.assumptions.find(item => item.id === node.recordId);
      const request = records.requests.find(item => item.id === assumption?.requestId);
      warnings.add(assumption?.acceptedBy?.trim() && request?.allowAssumption ? 'Provisional' : 'Unapproved assumption');
    }
    if (node.kind === 'provider' && !records.offers.some(item => item.id === node.recordId)) warnings.add('Provider record missing');
    const pathNext = new Set([...path, nodeId]);
    for (const input of node.inputs) {
      const incoming = records.toolbenchWires.filter(wire => wire.kind !== 'sequence' && wire.to === nodeId && wire.toPort === input.id);
      if (!incoming.length) warnings.add('Missing input');
      if (incoming.length > 1) warnings.add('Multiple sources — review');
      for (const wire of incoming) {
        const error = wireError(wire, records);
        if (error) warnings.add(error);
        if (wire.kind === 'association') warnings.add('BPMN data link — confirm contract');
        visit(wire.from, pathNext);
      }
    }
  }
  visit(id, new Set());
  return [...warnings];
}
