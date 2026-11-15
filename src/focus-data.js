import { restoreWorkshop } from './workshop-data.js';
import { SIX_CATEGORIES } from './toolbench-data.js';
import { WorkspaceConflict } from './workspace-store.js';

export const FOCUS_AREAS = [
  { id: 'architecture', name: 'Architecture' },
  { id: 'indoor-energy', name: 'Indoor / energy' },
  { id: 'structure', name: 'Structure' },
  { id: 'materials', name: 'Materials' },
  { id: 'build', name: 'Build' }
];

export function focusPayload(focusArea, records) {
  return validateFocusCanvas({
    schemaVersion: 1, focusArea, records: structuredClone(restoreWorkshop(records))
  }, focusArea);
}

export function validateFocusCanvas(payload, focusArea) {
  if (!FOCUS_AREAS.some(area => area.id === focusArea) || payload?.schemaVersion !== 1 ||
      payload.focusArea !== focusArea || !payload.records) {
    throw new Error('Canvas schema or focus area does not match. Your draft is unchanged.');
  }
  for (const key of Object.keys(restoreWorkshop({}))) {
    if (!Array.isArray(payload.records[key])) throw new Error(`Invalid canvas collection: ${key}.`);
  }
  for (const node of payload.records.toolbenchNodes) {
    if (!node || typeof node.id !== 'string' || typeof node.title !== 'string' ||
        !Array.isArray(node.inputs) || !Array.isArray(node.outputs)) {
      throw new Error('Invalid canvas block.');
    }
    if (node.kind === 'suggestion' &&
        (!node.title.trim() || !SIX_CATEGORIES.includes(node.category) || typeof node.owner !== 'string')) {
      throw new Error('Suggestions require a name, six-C category and responsible team or no assignment.');
    }
  }
  if (new TextEncoder().encode(JSON.stringify(payload)).length > 10 * 1024 * 1024) {
    throw new Error('Canvas exceeds the 10 MiB save limit. Download your draft.');
  }
  return payload;
}

export const focusRecoveryKey = (focusId, userId) => `masterbpmn:focus:${focusId}:recovery:${userId}`;

export function readFocusRecovery(storage, focusId, userId) {
  const text = storage.getItem(focusRecoveryKey(focusId, userId));
  if (!text) return null;
  const draft = JSON.parse(text);
  validateFocusCanvas(draft.payload, focusId);
  return draft;
}

export function createFocusRepository(client) {
  return {
    async load(focusId) {
      const { data, error } = await client.from('focus_canvases')
        .select('focus_id,revision,payload,updated_at,updated_by').eq('focus_id', focusId).maybeSingle();
      if (error) throw new Error(`Unable to load course canvas: ${error.message}. Check the focus-canvas migration.`);
      if (data) validateFocusCanvas(data.payload, focusId);
      return data;
    },
    async save(focusId, revision, payload) {
      validateFocusCanvas(payload, focusId);
      const { data, error } = await client.rpc('save_focus_canvas', {
        p_focus_id: focusId, p_expected_revision: revision, p_payload: payload
      });
      if (error?.code === '40001') {
        throw new WorkspaceConflict('Canvas save conflict. Your draft is retained. Load latest, then review/recover your draft before saving again.');
      }
      if (error) throw new Error(`Course canvas was not saved: ${error.message}. Your draft is retained.`);
      const saved = Array.isArray(data) ? data[0] : data;
      if (!saved || saved.revision !== revision + 1) throw new Error('The server did not confirm the canvas revision. Load latest before retrying.');
      return saved;
    }
  };
}
