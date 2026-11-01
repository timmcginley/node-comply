import { isCapture } from './speckle-client.js';

export const isPropertyLoader = node => node?.functionId === 'speckle.read-properties';
export const isIfcFilter = node => node?.functionId === 'ifc.filter-elements';
export const isElementCapture = node => node?.functionId === 'ifc.capture-elements' || isIfcFilter(node);
export const isElementCount = node => node?.functionId === 'elements.count';
export const isValueDisplay = node => node?.functionId === 'communicate.display-value';
export const isElementFunction = node => isPropertyLoader(node) || isElementCapture(node) || isElementCount(node) || isValueDisplay(node);

export function referenceKey(reference) {
  if (!reference || !['serverUrl', 'projectId', 'modelId', 'versionId'].every(key => typeof reference[key] === 'string' && reference[key])) {
    throw new Error('Choose a project, model and exact version in the upstream Speckle Capture block.');
  }
  return JSON.stringify([reference.serverUrl, reference.projectId, reference.modelId, reference.versionId]);
}

export function inputNode(node, records, accepts) {
  if (node.inputs?.length !== 1) throw new Error('This function needs exactly one input socket.');
  const incoming = records.toolbenchWires.filter(wire => wire.kind !== 'sequence' && wire.to === node.id && wire.toPort === node.inputs[0].id);
  if (incoming.length !== 1 || incoming[0].kind !== 'data') throw new Error('Connect exactly one solid information wire to this input.');
  const source = records.toolbenchNodes.find(item => item.id === incoming[0].from);
  if (!accepts(source) || source.outputs?.length !== 1 || source.outputs[0].id !== incoming[0].fromPort) {
    throw new Error('The input is connected to the wrong function or a missing socket.');
  }
  return source;
}

export function currentPropertyLoad(node, records) {
  if (!isPropertyLoader(node) || node.functionVersion !== 1) throw new Error('Connect a supported Load model properties block.');
  const source = inputNode(node, records, isCapture);
  const result = node.propertyResult;
  if (!result || result.inputNodeId !== source.id || typeof result.runId !== 'string' || !result.runId ||
      !Number.isInteger(result.objectCount) || result.objectCount < 0 ||
      referenceKey(result.source) !== referenceKey(source.capture)) {
    throw new Error('Read model properties in the upstream loader first, or read again after changing its model/version.');
  }
  return result;
}

export function elementInput(node, records) {
  if (isIfcFilter(node)) {
    const loader = inputNode(node, records, isPropertyLoader);
    const result = currentPropertyLoad(loader, records);
    return { reference: result.source, key: JSON.stringify([loader.id, result.runId, referenceKey(result.source)]) };
  }
  const source = inputNode(node, records, isCapture);
  return { reference: source.capture, key: referenceKey(source.capture) };
}

export function filterKey(node, records) {
  return JSON.stringify([elementInput(node, records).key, node.ifcClass, node.classificationPath]);
}

export function classificationPaths(data) {
  const used = new Set(data.eav.filter(row => typeof row.value_string === 'string' && /^Ifc[A-Za-z0-9]+$/.test(row.value_string)).map(row => row.path_index));
  return data.paths.filter(row => used.has(row.path_index) && !/element type attributes/i.test(row.path)).map(row => row.path).sort();
}

export function captureElements(data, ifcClass, classificationPath) {
  if (typeof ifcClass !== 'string' || !/^Ifc[A-Za-z0-9]+$/.test(ifcClass)) throw new Error('Enter an exact IFC class, for example IfcWindow (case-sensitive).');
  if (!classificationPath) throw new Error('Select the instance IFC-class property, not an element-type property.');
  if (/element type attributes/i.test(classificationPath)) throw new Error('Use Attributes > type for instances, not Element Type Attributes.');
  if (!data || !['objects', 'paths', 'eav'].every(name => Array.isArray(data[name]))) throw new Error('Model properties have not been loaded.');
  const identities = new Map(), paths = new Map();
  for (const row of data.objects) {
    if (!Number.isInteger(row.object_index) || row.object_index < 0 || typeof row.application_id !== 'string' || !row.application_id.trim() ||
        identities.has(row.object_index) && identities.get(row.object_index) !== row.application_id) {
      throw new Error('The bundle contains a missing or conflicting element identity.');
    }
    identities.set(row.object_index, row.application_id);
  }
  for (const row of data.paths) {
    if (!Number.isInteger(row.path_index) || row.path_index < 0 || typeof row.path !== 'string' ||
        paths.has(row.path_index) && paths.get(row.path_index) !== row.path) throw new Error('The bundle contains invalid property paths.');
    paths.set(row.path_index, row.path);
  }
  if (![...paths.values()].includes(classificationPath)) throw new Error(`The model has no "${classificationPath}" property. Read its properties and select the actual instance-class path.`);
  const classes = new Map();
  for (const row of data.eav) {
    if (!identities.has(row.object_index) || !paths.has(row.path_index)) throw new Error('The bundle contains a property without an object or path identity.');
    if (paths.get(row.path_index) !== classificationPath) continue;
    if (typeof row.value_string !== 'string' || !/^Ifc[A-Za-z0-9]+$/.test(row.value_string)) {
      throw new Error('The selected property is not a complete IFC-class field. Choose the instance-class property.');
    }
    const id = identities.get(row.object_index);
    if (classes.has(id) && classes.get(id) !== row.value_string) throw new Error('An element has conflicting IFC classes.');
    classes.set(id, row.value_string);
  }
  if (!classes.size) throw new Error('No IFC classification data is available at the selected path; this is not a zero count.');
  const elementIds = [...classes].filter(([, value]) => value === ifcClass).map(([id]) => id).sort();
  return { elementIds, classifiedObjects: classes.size, totalObjects: new Set(identities.values()).size };
}

export function currentElements(node, records) {
  if (!isElementCapture(node)) throw new Error('Connect a Capture: IFC elements block.');
  if (node.functionVersion !== 1) throw new Error('This IFC Capture function version is not supported.');
  const key = filterKey(node, records), result = node.elementResult;
  if (!result || result.inputKey !== key || !Array.isArray(result.elementIds) || typeof result.runId !== 'string' || !result.runId ||
      referenceKey(result.source) !== referenceKey(elementInput(node, records).reference) ||
      !Number.isInteger(result.classifiedObjects) || !Number.isInteger(result.totalObjects) ||
      result.classifiedObjects < 1 || result.classifiedObjects < result.elementIds.length || result.totalObjects < result.classifiedObjects ||
      !result.elementIds.every(id => typeof id === 'string' && id) ||
      new Set(result.elementIds).size !== result.elementIds.length) {
    throw new Error(isIfcFilter(node) ?
      'Apply IFC filter first, or apply it again after changing the loader, class or property path.' :
      'Capture elements first, or read them again after changing the source, class or property path.');
  }
  return result;
}

export function countElements(node, records) {
  if (!isElementCount(node) || node.functionVersion !== 1) throw new Error('This count function version is not supported.');
  const source = inputNode(node, records, isElementCapture), result = currentElements(source, records);
  return { value: result.elementIds.length, inputRunId: result.runId, inputNodeId: source.id, source: result.source, ifcClass: source.ifcClass };
}

export function currentCount(node, records) {
  const expected = countElements(node, records), result = node.countResult;
  if (!result || result.inputRunId !== expected.inputRunId || result.inputNodeId !== expected.inputNodeId || result.value !== expected.value ||
      referenceKey(result.source) !== referenceKey(expected.source) || result.ifcClass !== expected.ifcClass) {
    throw new Error('Calculate count needed');
  }
  return result;
}

export function displayValue(node, records) {
  if (!isValueDisplay(node) || node.functionVersion !== 1) throw new Error('This display function version is not supported.');
  return currentCount(inputNode(node, records, isElementCount), records);
}

export function elementStatus(node, records) {
  try {
    if (node.functionVersion !== 1) throw new Error('This function version is not supported.');
    if (isPropertyLoader(node)) {
      const result = currentPropertyLoad(node, records);
      return { current: true, text: `${result.objectCount} property objects read` };
    }
    if (isElementCapture(node)) {
      const result = currentElements(node, records);
      return { current: true, text: `${result.elementIds.length} ${node.ifcClass} elements` };
    }
    const result = isValueDisplay(node) ? displayValue(node, records) : currentCount(node, records);
    return { current: true, text: `${isValueDisplay(node) ? 'Value' : 'Count'}: ${result.value}`, value: result.value };
  } catch (error) { return { current: false, text: error.message }; }
}
