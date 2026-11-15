import { readRecovery } from './workspace-store.js';
import { FOCUS_AREAS, readFocusRecovery } from './focus-data.js';

export async function exportAllCanvases({ teams, repository, focusRepository, storage, userId }) {
  if (!userId) throw new Error('Sign in to download all canvases.');
  const startedAt = new Date().toISOString();
  const browserRecovery = { teamCanvases: [], subjectCanvases: [] };
  for (const team of teams) {
    const draft = readRecovery(storage, team.id, userId);
    if (draft) browserRecovery.teamCanvases.push({ teamId: team.id, ...draft });
  }
  for (const area of FOCUS_AREAS) {
    const draft = readFocusRecovery(storage, area.id, userId);
    if (draft) browserRecovery.subjectCanvases.push({ focusArea: area.id, ...draft });
  }
  const [teamCanvases, subjectCanvases] = await Promise.all([
    Promise.all(teams.map(async team => ({
      team: structuredClone(team), shared: await repository.load(team.id)
    }))),
    Promise.all(FOCUS_AREAS.map(async area => ({
      ...area, shared: await focusRepository.load(area.id)
    })))
  ]);
  return {
    exportType: 'masterbpmn-all-canvases', schemaVersion: 1,
    startedAt, completedAt: new Date().toISOString(),
    scope: "Latest shared revisions for all registered teams and five subjects, plus this account's browser recovery drafts. Reads are not an atomic database snapshot. No revision history, other devices' drafts or in-memory-only edits.",
    teamCanvases, subjectCanvases, browserRecovery
  };
}
