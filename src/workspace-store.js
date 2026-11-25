import { restoreWorkshop } from './workshop-data.js';
import { validateHandoffs } from './handoff-data.js';

export function workspacePayload(teamId, records, diagrams) {
  return validateWorkspace({
    schemaVersion: 1, teamId, records: structuredClone(restoreWorkshop(records)), diagrams: { ...diagrams }
  }, teamId);
}

export function validateWorkspace(payload, teamId) {
  if (!payload || payload.schemaVersion !== 1 || payload.teamId !== teamId ||
      !payload.records || !payload.diagrams) {
    throw new Error('Workspace schema or team does not match. No local work has been replaced.');
  }
  for (const key of Object.keys(restoreWorkshop({}))) {
    if (!Array.isArray(payload.records[key])) throw new Error(`Invalid workspace collection: ${key}.`);
  }
  validateHandoffs(payload.records);
  for (const kind of ['general', 'scoped']) {
    const xml = payload.diagrams[kind];
    if (xml !== null && (typeof xml !== 'string' || !xml.trim())) {
      throw new Error(`Invalid ${kind} diagram: expected XML text or explicit null.`);
    }
  }
  if (new TextEncoder().encode(JSON.stringify(payload)).length > 10 * 1024 * 1024) {
    throw new Error('Workspace exceeds the 10 MiB save limit. Download your work before reducing its size.');
  }
  return payload;
}

export class WorkspaceConflict extends Error {}

export function sameWorkspace(left, right) {
  const canonical = value => JSON.stringify(value, (_key, item) =>
    item && typeof item === 'object' && !Array.isArray(item)
      ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b)))
      : item);
  return canonical(left) === canonical(right);
}

export function importWorkspace(imported, teamId, currentDiagrams) {
  if (imported?.schemaVersion !== undefined) {
    validateWorkspace(imported, teamId);
    return workspacePayload(teamId, imported.records, imported.diagrams);
  }
  if (imported?.team?.id !== teamId) {
    throw new Error('Not a workspace export for the displayed team.');
  }
  return workspacePayload(teamId, imported, currentDiagrams);
}

export function createWorkspaceRepository(client) {
  return {
    async chooseTeam(teamId) {
      const { data, error } = await client.rpc('choose_team', { p_team_id: teamId });
      if (error) throw new Error(`Team membership was not changed: ${error.message}. Check the self-service membership migration.`);
      if (data !== teamId) throw new Error('The server did not confirm your chosen team. Reload permissions before editing.');
      return data;
    },
    async permissions(userId) {
      const [memberships, facilitators] = await Promise.all([
        client.from('team_memberships').select('team_id').eq('user_id', userId),
        client.from('facilitators').select('user_id').eq('user_id', userId)
      ]);
      if (memberships.error) throw new Error(`Unable to read team membership: ${memberships.error.message}. Check the database setup.`);
      if (facilitators.error) throw new Error(`Unable to read facilitator access: ${facilitators.error.message}.`);
      return { teams: memberships.data.map(row => row.team_id), facilitator: facilitators.data.length > 0 };
    },
    async load(teamId) {
      const { data, error } = await client.from('workspaces')
        .select('team_id,revision,schema_version,payload,updated_at,updated_by').eq('team_id', teamId).maybeSingle();
      if (error) throw new Error(`Unable to load shared workspace: ${error.message}. Your browser recovery data is unchanged.`);
      if (data) validateWorkspace(data.payload, teamId);
      return data;
    },
    async save(teamId, revision, payload) {
      validateWorkspace(payload, teamId);
      const { data, error } = await client.rpc('save_workspace', {
        p_team_id: teamId, p_expected_revision: revision, p_payload: payload
      });
      if (error?.code === '40001') {
        throw new WorkspaceConflict('Save conflict: another editor saved a newer revision. Your browser recovery is retained. Load latest, compare, then deliberately recover your draft if you want to replace it.');
      }
      if (error) throw new Error(`Workspace was not saved: ${error.message}. Browser recovery is retained.`);
      const saved = Array.isArray(data) ? data[0] : data;
      if (!saved || saved.revision !== revision + 1) throw new Error('The server did not confirm the expected saved revision. Check Load latest before retrying.');
      return saved;
    }
  };
}

export const recoveryKey = (teamId, userId) => `masterbpmn:${teamId}:recovery:${userId}`;

export function readRecovery(storage, teamId, userId) {
  const personal = storage.getItem(recoveryKey(teamId, userId));
  if (personal) {
    const recovery = JSON.parse(personal);
    validateWorkspace(recovery.payload, teamId);
    return recovery;
  }
  const legacy = storage.getItem(`masterbpmn:${teamId}`);
  const general = storage.getItem(`masterbpmn:${teamId}:general:xml`);
  const scoped = storage.getItem(`masterbpmn:${teamId}:scoped:xml`);
  if (legacy === null && general === null && scoped === null) return null;
  return {
    legacy: true,
    payload: workspacePayload(teamId, legacy ? JSON.parse(legacy) : {}, { general, scoped }),
    baseRevision: null
  };
}

export function writeRecovery(storage, userId, baseRevision, payload) {
  storage.setItem(recoveryKey(payload.teamId, userId), JSON.stringify({
    payload, baseRevision, capturedAt: new Date().toISOString()
  }));
}
