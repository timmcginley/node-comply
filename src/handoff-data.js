export const REVIEW_STATES = ['Not reviewed', 'Ready to try', 'Needs changes', 'Need clarified'];
export const USE_STATES = ['Not tried', 'Used', 'Blocked'];

function text(value, label) {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${label} is required.`);
  return value.trim();
}

export function handoffUrl(value, label) {
  const raw = text(value, label);
  let url;
  try { url = new URL(raw); }
  catch { throw new Error(`${label} must be a full HTTP or HTTPS URL.`); }
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) {
    throw new Error(`${label} must be an HTTP or HTTPS URL without credentials.`);
  }
  return raw;
}

function validateResult(result) {
  if (!result || typeof result !== 'object') throw new Error('Invalid shared result.');
  for (const key of ['id', 'nodeId', 'providerTeamId', 'title', 'model', 'codeRevision', 'settings', 'description', 'createdAt']) {
    text(result[key], `Shared result ${key}`);
  }
  handoffUrl(result.url, 'Result link');
  if (typeof result.readyForReview !== 'boolean') throw new Error('Shared result readiness must be true or false.');
}

export function addSharedResult(node, input, { teamIds, providerTeamId, id, createdAt }) {
  if (!teamIds.includes(providerTeamId)) throw new Error('Assign an existing providing team before sharing a result.');
  const result = {
    id, nodeId: node.id, providerTeamId,
    title: text(input.title, 'Result name'),
    url: handoffUrl(input.url, 'Result link'),
    model: text(input.model, 'Model and version'),
    codeRevision: text(input.codeRevision, 'Code revision'),
    settings: text(input.settings, 'Settings (write "None" if not applicable)'),
    description: text(input.description, 'Output meaning, units and limitations'),
    readyForReview: input.readyForReview, createdAt
  };
  validateResult(result);
  if (node.sharedResults?.some(item => item.id === id)) throw new Error('This result ID already exists.');
  node.sharedResults = [...(node.sharedResults || []), result];
  node.selectedSharedResultId = id;
  return result;
}

function validateExchange(exchange) {
  if (!exchange || typeof exchange !== 'object') throw new Error('Invalid result exchange.');
  for (const key of ['id', 'receiverTeamId', 'createdAt']) text(exchange[key], `Exchange ${key}`);
  validateResult(exchange.result);
  if (!exchange.result.readyForReview) throw new Error('Select a result marked ready for review.');
  if (!REVIEW_STATES.includes(exchange.reviewStatus) || !USE_STATES.includes(exchange.useStatus)) {
    throw new Error('Choose a valid review and use state.');
  }
  for (const key of ['reviewNote', 'functionUrl', 'useNote']) {
    if (typeof exchange[key] !== 'string') throw new Error(`Invalid exchange ${key}.`);
  }
  if (exchange.reviewStatus === 'Not reviewed' && exchange.useStatus === 'Not tried') {
    throw new Error('Record a review or a use outcome before saving.');
  }
  if (['Needs changes', 'Need clarified'].includes(exchange.reviewStatus)) text(exchange.reviewNote, 'Review explanation');
  if (exchange.functionUrl) handoffUrl(exchange.functionUrl, 'Receiving function link');
  if (exchange.useStatus === 'Used') handoffUrl(exchange.functionUrl, 'Receiving function link');
  if (exchange.useStatus !== 'Not tried') text(exchange.useNote, 'What this enabled or what blocked use');
}

export function addExchange(wire, source, input, { teamIds, id, createdAt }) {
  if (wire.kind !== 'data' || wire.from !== source?.id) throw new Error('Choose an information connection with an existing provider.');
  const result = source.sharedResults?.find(item => item.id === input.resultId);
  if (!result) throw new Error('The selected result is missing. Choose an existing provider result.');
  if (!teamIds.includes(input.receiverTeamId)) throw new Error('Choose an existing receiving team.');
  const exchange = {
    id, result: structuredClone(result), receiverTeamId: input.receiverTeamId,
    reviewStatus: input.reviewStatus, reviewNote: (input.reviewNote || '').trim(),
    useStatus: input.useStatus, functionUrl: (input.functionUrl || '').trim(),
    useNote: (input.useNote || '').trim(), createdAt
  };
  validateExchange(exchange);
  if (wire.exchanges?.some(item => item.id === id)) throw new Error('This exchange ID already exists.');
  wire.exchanges = [...(wire.exchanges || []), exchange];
  return exchange;
}

export function validateHandoffs(records) {
  for (const node of records.toolbenchNodes) {
    if (node.sharedResults !== undefined) {
      if (!Array.isArray(node.sharedResults)) throw new Error('Invalid shared results list.');
      const ids = new Set();
      for (const result of node.sharedResults) {
        validateResult(result);
        if (result.nodeId !== node.id || ids.has(result.id)) throw new Error('Invalid or duplicate shared result identity.');
        ids.add(result.id);
      }
    }
    if (node.selectedSharedResultId !== undefined &&
        !node.sharedResults?.some(item => item.id === node.selectedSharedResultId)) {
      throw new Error('The selected shared result is missing.');
    }
  }
  for (const wire of records.toolbenchWires) {
    if (wire.exchanges === undefined) continue;
    if (wire.kind !== 'data' || !Array.isArray(wire.exchanges)) throw new Error('Invalid connection exchanges.');
    const ids = new Set();
    for (const exchange of wire.exchanges) {
      validateExchange(exchange);
      if (exchange.result.nodeId !== wire.from) throw new Error('The exchange result belongs to a different providing block.');
      if (ids.has(exchange.id)) throw new Error('Duplicate exchange identity.');
      ids.add(exchange.id);
    }
  }
}
