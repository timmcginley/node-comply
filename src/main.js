import BpmnModeler from 'bpmn-js/lib/Modeler';
import 'bpmn-js/dist/assets/diagram-js.css';
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn.css';
import './style.css';
import './design.css';
import { restoreWorkshop } from './workshop-data.js';
import { mountToolbench } from './toolbench.js';
import { mountAuth } from './auth.js';
import { createWorkspaceRepository, workspacePayload, importWorkspace, readRecovery, writeRecovery, sameWorkspace, WorkspaceConflict } from './workspace-store.js';
import { mountFocusCanvases } from './focus-canvases.js';
import { createFocusRepository } from './focus-data.js';
import { exportAllCanvases } from './canvas-export.js';

const app = document.querySelector('#app');
app.innerHTML = `
<header class="topbar">
  <div class="app-title"><h1>node-comply</h1><p>Connecting student claims, capabilities and evidence across disciplines</p></div>
  <button id="profileButton" class="button" aria-haspopup="dialog">Sign in</button>
</header>
<dialog id="profileDialog"><div class="profile-heading"><h2>Profile</h2><button id="closeProfile" class="button">Close</button></div>
<section id="auth" class="auth-area"></section>
<section class="workspace-bar"><label>My team<select id="myTeam" disabled></select></label><button id="chooseTeam" class="button" disabled>Update my team</button><p id="membershipFeedback" role="status">Sign in, then set your team. Viewing another team does not change membership.</p><p id="profileRole"></p></section>
</dialog>
<nav class="tabs">
  <button class="tab active" data-tab="design">Design</button>
  <button class="tab" data-tab="diagrams">Team diagrams</button>
  <button class="tab" data-tab="subjects">Subject diagrams</button>
  <button class="tab" data-tab="settings">Settings</button>
</nav>
<main>
  <section id="diagrams" class="tabpage">
    <section id="teamContext" class="contextbar">
      <label>View team<select id="team"></select></label>
      <div id="provenance" class="provenance">Loading team diagram…</div>
      <a id="repoLink" class="button ghost" target="_blank" rel="noopener">Open repository</a>
      <div id="teamWorkspaceActions" class="top-actions"><span id="saveState" class="saved">Read-only</span><button id="saveShared" class="button primary" disabled>Save team diagram</button></div>
    </section>
    <section id="teamWorkspaceBar" class="workspace-bar"><p id="workspaceFeedback" role="status">Sign in to load saved team diagrams.</p><span id="accessState">Read-only</span><button id="resolveTeamBackup" class="button" hidden>Resolve local backup in Settings</button></section>
    <button id="backToSubject" class="button" hidden>Back to subject diagram</button>
    <div id="teamDiagramCanvas"><div id="toolbenchCanvas"></div></div>
  </section>
  <section id="subjects" class="tabpage"><div id="focusCanvases" class="workspace-bar"></div><div id="subjectDiagramCanvas"></div></section>
  <section id="settings" class="tabpage settings-page">
    <h2>Settings: saved versions and local backups</h2>
    <p>A saved version is shared online. A local backup belongs to this account in this browser and can contain unsaved changes. Restoring it does not save it online.</p>
    <section class="settings-card"><h3 id="teamSettingsTitle">Team diagram</h3><p id="teamSettingsFeedback" role="status"></p>
      <div class="workspace-bar"><button id="loadShared" class="button" disabled>Reload saved version</button><button id="recoverDraft" class="button" disabled>Restore local backup</button><button id="keepShared" class="button" hidden>Keep saved version</button><button id="downloadRecovery" class="button" disabled>Download local backup</button><button id="downloadAll" class="button">Download team diagram</button><label class="upload">Import team diagram<input id="workspaceUpload" type="file" accept=".json" disabled></label></div>
    </section>
    <section class="settings-card"><h3>Subject diagram</h3><div id="subjectSettings"></div></section>
    <section class="settings-card"><h3>Course export</h3><button id="downloadCanvases" class="button" disabled>Download all diagrams</button><p id="canvasExportFeedback" role="status">All saved team and subject diagrams, plus this account's local backups. Does not save edits or include backups on other devices.</p></section>
  </section>
  <section id="design" class="tabpage active"><div class="design-page"><div class="design-intro"><h2>Your design claim</h2><p>Start with the claim or issue your team already chose to investigate. These A2 answers are read-only excerpts from GitHub; change the source README to update them.</p><p>Take your claim into Team diagrams to sketch the tools, information and collaborators it needs. A proposed tool is not proof of a claim.</p><div class="design-source-row"><div id="designSource" class="status">Loading the team README…</div><button id="refreshDesign" class="button">Refresh from GitHub</button><button id="planDesignClaim" class="button primary" disabled>Plan this claim in Team diagrams</button></div></div><div id="designSections" class="design-sections"></div></div></section>
</main>
<div id="legacyDiagrams" hidden inert>
    <div class="workspace">
      <article class="panel"><div class="panelhead"><div><span>GENERAL</span><h2>Professional process</h2></div><div class="panel-actions"><label class="upload">Upload<input id="generalUpload" type="file" accept=".bpmn,.xml" /></label><button data-download="general">Download</button></div></div><div id="generalStatus" class="status"></div><div id="generalCanvas" class="canvas"></div><footer><span id="generalSelection">Select an event, activity, gateway or data object</span></footer></article>
      <aside class="connector"><button id="connect" title="Connect current selections">⇄</button><small>Connect</small></aside>
      <article class="panel"><div class="panelhead"><div><span>SCOPED</span><h2>Tool implementation</h2></div><div class="panel-actions"><label class="upload">Upload<input id="scopedUpload" type="file" accept=".bpmn,.xml" /></label><button data-download="scoped">Download</button></div></div><div id="scopedStatus" class="status"></div><div id="scopedCanvas" class="canvas"></div><footer><span id="scopedSelection">Select the implementation element(s)</span><span class="legend"><i></i> Submitted version</span></footer></article>
    </div>
</div>
<div id="modal" class="modal hidden"><div class="modal-card"><h3>Create connection</h3><p id="modalSummary"></p><label>Relationship<select id="relation"><option>Implements</option><option>Partially implements</option><option>Provides input to</option><option>Receives input from</option><option>Supports decision</option><option>Raises event or warning</option><option>Relevant but not implemented</option></select></label><label>Explanation<textarea id="explanation" placeholder="Explain the relationship"></textarea></label><div><button id="cancelModal" class="button">Cancel</button><button id="saveMapping" class="button primary">Save connection</button></div></div></div>`;

const blank = name => `<?xml version="1.0" encoding="UTF-8"?><bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" id="Definitions_1" targetNamespace="http://masterbpmn.local"><bpmn:process id="Process_1" isExecutable="false"><bpmn:startEvent id="StartEvent_1" name="${name}"/></bpmn:process><bpmndi:BPMNDiagram id="BPMNDiagram_1"><bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Process_1"><bpmndi:BPMNShape id="StartEvent_1_di" bpmnElement="StartEvent_1"><dc:Bounds x="180" y="120" width="36" height="36"/></bpmndi:BPMNShape></bpmndi:BPMNPlane></bpmndi:BPMNDiagram></bpmn:definitions>`;

const modelers = {
  general: new BpmnModeler({ container: '#generalCanvas' }),
  scoped: new BpmnModeler({ container: '#scopedCanvas' })
};
let teams = [], currentTeam = null;
let selected = { general: null, scoped: null };
let records = restoreWorkshop({});
const diagramReady = { general: false, scoped: false };
let session = null, repository = null, focusRepository = null, access = { teams: [], facilitator: false };
let baseRevision = null, dirty = false, blocked = false, pendingTasks = 0;
let transition = Promise.resolve(), recoveryTask = Promise.resolve();
let recoveryFailed = false, pendingSession;
let recoveryPending = false;
let focusCanvases = null, displayedMembership = null, membershipError = '';
let returningToSubject = false;

const $ = id => document.getElementById(id);
const hasTeamAccess = () => !!session && baseRevision !== null && !pendingTasks &&
  (access.facilitator || access.teams.includes(currentTeam?.id));
const canEdit = () => hasTeamAccess() && !recoveryPending;
const canEditCanvas = () => focusCanvases?.active ? focusCanvases.canEdit() : canEdit();
const ownDesignTeam = () => teams.find(team => team.id === access.teams[0]);
const canPlanOwnDesign = () => !!session && !!ownDesignTeam() && !pendingTasks;
const elementName = el => el?.businessObject?.name || el?.type?.replace('bpmn:', '') || el?.id || 'Unnamed element';
const toolbench = mountToolbench({
  container: $('toolbenchCanvas'), getRecords: () => focusCanvases?.active ? focusCanvases.records : records,
  getTeam: () => focusCanvases?.active ? { id: access.teams[0] || '' } : currentTeam,
  getTeams: () => teams, getOwnTeam: () => access.teams[0] || '', modelers,
  getTitle: () => focusCanvases?.active ? 'Subject diagrams' : `Team diagrams${currentTeam ? ` - ${currentTeam.id}` : ''}`,
  isSubject: () => !!focusCanvases?.active,
  openTeamDiagram,
  isSourceReady: () => !focusCanvases?.active && diagramReady.general, canEdit: canEditCanvas,
  getUserId: () => session?.user.id || null,
  async prepareLeave() {
    if (!focusCanvases.mayLeave()) return false;
    if (!mayLeaveDraft()) return false;
    await recoveryTask;
    if (recoveryFailed && dirty) throw new Error('Download your workspace before connecting Speckle: browser recovery failed.');
    return true;
  },
  persist: () => focusCanvases?.active ? focusCanvases.persist() : persist()
});
focusCanvases = mountFocusCanvases({
  container: $('focusCanvases'), getUserId: () => session?.user.id || null,
  getAccess: () => access, isTransitioning: () => !!pendingTasks,
  getActiveTab: () => document.querySelector('.tab.active')?.dataset.tab,
  render: () => toolbench.render(), reset: () => toolbench.reset(), settingsContainer: $('subjectSettings'),
  openSettings: () => navigate('settings'),
  onScopeChange: updateScopeVisibility, prepareLeaveTeam: mayLeaveDraft
});

function updateScopeVisibility() {
  const host = $(focusCanvases.active ? 'subjectDiagramCanvas' : 'teamDiagramCanvas');
  if ($('toolbenchCanvas').parentElement !== host) host.append($('toolbenchCanvas'));
}
const designSections = [
  { key: 'A2a', title: 'A2a: About your group', pattern: /\bA2\s*a\b|about (our|the|your)?\s*group|group and focus/i },
  { key: 'A2b', title: 'A2b: Identify Claim', pattern: /\bA2\s*b\b|identify( the)? claim|claim and starting point/i },
  { key: 'A2c', title: 'A2c: Use Case', pattern: /\bA2\s*c\b|use case/i },
  { key: 'A2d', title: 'A2d: Scope the use case', pattern: /\bA2\s*d\b|scope( the)? use case|scope of (the )?tool/i },
  { key: 'A2e', title: 'A2e: Tool Idea', pattern: /\bA2\s*e\b|tool idea|own .*tool/i },
  { key: 'A2f', title: 'A2f: Information Requirements', pattern: /\bA2\s*f\b|information requirements/i },
  { key: 'A2g', title: 'A2g: Identify appropriate software licence', pattern: /\bA2\s*g\b|software licen[cs]e/i }
];

function feedback(text, error = false) {
  $('workspaceFeedback').textContent = text;
  $('workspaceFeedback').classList.toggle('error', error);
  $('teamSettingsFeedback').textContent = text;
  $('teamSettingsFeedback').classList.toggle('error', error);
}
function reportError(error) {
  console.error(error);
  feedback(error.message, true);
}
function updateSaveState() {
  $('saveState').textContent = dirty ? (recoveryFailed ? 'Unsaved - recovery failed' : 'Unsaved shared edits') :
    baseRevision ? `Shared revision ${baseRevision}` : session ? 'No shared revision loaded' : 'Read-only';
}
function updateControls() {
  const editable = canEdit();
  $('accessState').textContent = pendingTasks ? 'Loading / saving…' : !hasTeamAccess() ? 'Read-only' :
    recoveryPending ? 'Choose recovery or loaded version' : access.facilitator ? 'Facilitator: may edit all teams' : 'Your team: may edit';
  app.classList.toggle('read-only', !editable);
  $('team').disabled = !!pendingTasks;
  $('profileButton').textContent = session ? 'Profile' : 'Sign in';
  $('profileRole').textContent = session ? (access.facilitator ? 'Role: Facilitator - may edit every team and subject diagram.' : 'Role: Team member - may edit your team diagram and shared subject diagrams.') : '';
  $('teamSettingsTitle').textContent = `Team diagram${currentTeam ? ` - ${currentTeam.id}` : ''}`;
  $('resolveTeamBackup').hidden = !recoveryPending && !recoveryFailed && !blocked;
  $('backToSubject').disabled = !!pendingTasks;
  $('saveShared').disabled = !editable || !dirty || blocked;
  $('loadShared').disabled = !session || !!pendingTasks;
  $('recoverDraft').disabled = !hasTeamAccess();
  $('downloadRecovery').disabled = !session || !currentTeam || !!pendingTasks;
  $('keepShared').hidden = !recoveryPending || !hasTeamAccess();
  $('connect').disabled = !editable;
  $('workspaceUpload').disabled = !editable;
  for (const kind of ['general', 'scoped']) $(`${kind}Upload`).disabled = !editable;
  $('saveMapping').disabled = !editable;
  $('downloadAll').disabled = !currentTeam || !!pendingTasks;
  $('downloadCanvases').disabled = !session || !repository || !focusRepository || !!pendingTasks;
  document.querySelectorAll('[data-download]').forEach(button => { button.disabled = !currentTeam || !!pendingTasks; });
  $('planDesignClaim').disabled = !canPlanOwnDesign() || !currentDesignSections?.A2b?.text;
  $('myTeam').disabled = !session || !!pendingTasks;
  $('chooseTeam').disabled = !session || !!pendingTasks;
  const membership = access.teams.join(', ');
  if (displayedMembership !== membership) {
    $('myTeam').value = access.teams[0] || '';
    displayedMembership = membership;
  }
  $('membershipFeedback').classList.toggle('error', !!membershipError);
  $('membershipFeedback').textContent = membershipError || (session ?
    `${membership ? `Your team: ${membership}.` : 'No team selected.'} Updating your team changes membership and edit permissions. View team only browses diagrams.` :
    'Sign in with a facilitator-created account, then set your team.');
  updateSaveState();
  focusCanvases.update();
}
function enqueue(action) {
  finishDiagramEditing();
  ++pendingTasks;
  updateControls();
  transition = transition.then(action).catch(reportError).finally(() => {
    --pendingTasks;
    updateControls();
  });
  return transition;
}
async function snapshot() {
  const teamId = currentTeam.id;
  const savedRecords = structuredClone(records);
  const diagrams = {};
  await Promise.all(['general', 'scoped'].map(async kind => {
    diagrams[kind] = diagramReady[kind] ? (await modelers[kind].saveXML({ format: true })).xml : null;
  }));
  return workspacePayload(teamId, savedRecords, diagrams);
}
function persist() {
  dirty = true;
  updateControls();
  const userId = session?.user.id;
  const revision = baseRevision;
  recoveryTask = recoveryTask.then(async () => {
    if (!userId) throw new Error('Cannot retain a draft without a signed-in account.');
    writeRecovery(localStorage, userId, revision, await snapshot());
    recoveryFailed = false;
    recoveryPending = false;
  }).catch(error => {
    recoveryFailed = true;
    reportError(new Error(`Browser recovery failed: ${error.message}. Download your workspace before leaving.`));
  }).finally(updateSaveState);
}
function renderRecords() {
  toolbench.render();
}

function parseDesignSections(markdown) {
  const headings = [...markdown.matchAll(/^#{1,6}\s+(.+)$/gm)].map(match => ({
    title: match[1].replace(/[`*_]/g, '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').trim(),
    start: match.index,
    end: match.index + match[0].length
  }));
  const matchedHeadings = new Map();
  const explicitSection = title => title.match(/\bA2\s*([a-g])\b/i)?.[1]?.toLowerCase();
  for (const section of designSections) {
    const letter = section.key.slice(-1).toLowerCase();
    const headingIndex = headings.findIndex(heading => explicitSection(heading.title) === letter);
    if (headingIndex >= 0) matchedHeadings.set(section.key, headingIndex);
  }
  for (const section of designSections) {
    if (matchedHeadings.has(section.key)) continue;
    const headingIndex = headings.findIndex((heading, index) =>
      !explicitSection(heading.title) &&
      ![...matchedHeadings.values()].includes(index) &&
      section.pattern.test(heading.title)
    );
    if (headingIndex >= 0) matchedHeadings.set(section.key, headingIndex);
  }
  const found = designSections.map(section => {
    const headingIndex = matchedHeadings.get(section.key);
    if (headingIndex === undefined) return [section.key, { text: '', sourceHeading: '' }];
    const heading = headings[headingIndex];
    const nextSectionIndex = [...matchedHeadings.values()]
      .filter(index => index > headingIndex)
      .sort((left, right) => left - right)[0];
    return [section.key, {
      text: markdown.slice(heading.end, headings[nextSectionIndex]?.start ?? markdown.length).trim(),
      sourceHeading: heading.title
    }];
  });
  return Object.fromEntries(found);
}

function renderDesign() {
  const host = $('designSections');
  host.replaceChildren();
  const sections = currentDesignSections || {};
  $('planDesignClaim').disabled = !canPlanOwnDesign() || !sections.A2b?.text;
  for (const section of designSections) {
    const saved = sections[section.key] || { text: '', sourceHeading: '' };
    const card = document.createElement('article');
    card.className = 'design-section';
    const title = document.createElement('h3');
    title.textContent = section.title;
    const reference = document.createElement('small');
    reference.textContent = saved.sourceHeading ? `README heading: ${saved.sourceHeading}` : 'No matching heading found in the README';
    const answer = document.createElement('div');
    answer.className = 'design-answer';
    answer.textContent = saved.text || 'No matching section found in this README.';
    card.append(title, reference, answer);
    host.append(card);
  }
}

let currentDesignSections = null;
let currentDesignSourceUrl = '';
let designLoadId = 0;

async function loadDesign(refresh = false) {
  const team = ownDesignTeam();
  const loadId = ++designLoadId;
  const source = $('designSource');
  currentDesignSections = null;
  currentDesignSourceUrl = '';
  renderDesign();
  source.textContent = 'Loading the team README…';
  $('refreshDesign').disabled = true;
  if (!team) {
    source.textContent = 'Set My team in Profile to see your own design claim.';
    return;
  }

  try {
    const response = await fetch(`/api/design/${team.id}${refresh ? '?refresh=1' : ''}`);
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || `README request failed (${response.status}).`);
    if (ownDesignTeam()?.id !== team.id || loadId !== designLoadId) return;
    currentDesignSections = parseDesignSections(result.markdown);
    currentDesignSourceUrl = `${team.repositoryUrl}/blob/${encodeURIComponent(result.branch)}/${result.path.split('/').map(encodeURIComponent).join('/')}`;
    renderDesign();
    source.textContent = `Source: ${result.path} · GitHub default branch: ${result.branch}`;
    const link = document.createElement('a');
    link.href = currentDesignSourceUrl;
    link.target = '_blank';
    link.rel = 'noopener';
    link.textContent = 'Open source README';
    source.append(' · ', link);
    if (result.cached) source.append(' · Cached; refresh to check GitHub for updates.');
  } catch (error) {
    if (ownDesignTeam()?.id !== team.id || loadId !== designLoadId) return;
    source.textContent = error.message;
    renderDesign();
  } finally {
    if (ownDesignTeam()?.id === team.id && loadId === designLoadId) $('refreshDesign').disabled = false;
  }
}

for (const [kind, modeler] of Object.entries(modelers)) {
  const stack = modeler.get('commandStack');
  // canExecute alone does not guard undo/redo in bpmn-js.
  modeler.on('commandStack.canExecute', 10000, () => canEdit() ? undefined : false);
  for (const method of ['execute', 'undo', 'redo']) {
    const original = stack[method];
    stack[method] = function (...args) {
      if (!canEdit()) { feedback('Read-only: sign in with permission to edit this team.'); return; }
      return original.apply(this, args);
    };
  }
  const directEditing = modeler.get('directEditing');
  const activate = directEditing.activate;
  directEditing.activate = function (...args) {
    if (!canEdit()) return false;
    return activate.apply(this, args);
  };
  modeler.on('selection.changed', event => {
    selected[kind] = event.newSelection[0] || null;
    $(`${kind}Selection`).textContent = selected[kind] ? elementName(selected[kind]) : (kind === 'general' ? 'Select an event, activity, gateway or data object' : 'Select the implementation element(s)');
  });
  modeler.on('commandStack.changed', () => {
    if (!canEdit()) return;
    diagramReady[kind] = true;
    persist();
  });
}

function fitDiagram(kind) {
  const container = $(`${kind}Canvas`);
  if (container.clientWidth && container.clientHeight) {
    const canvas = modelers[kind].get('canvas');
    // Imports in hidden tabs can cache a zero-sized viewbox.
    canvas.resized();
    canvas.zoom('fit-viewport');
  }
}

async function loadDiagram(kind, savedXML = undefined) {
  const team = currentTeam;
  const status = $(`${kind}Status`); status.className = 'status'; status.textContent = 'Loading submitted version…';
  try {
    let xml = savedXML;
    if (xml === null) throw new Error('This shared revision has no saved diagram');
    if (xml === undefined) {
      const response = await fetch(`/api/diagram/${team.id}/${kind}`);
      xml = await response.text();
      if (!response.ok) throw new Error(xml.trim().startsWith('{') ? JSON.parse(xml).error : `Diagram request failed (${response.status})`);
    }
    if (currentTeam !== team) return;
    if (xml.trim().startsWith('{')) throw new Error(JSON.parse(xml).error);
    const { warnings } = await modelers[kind].importXML(xml);
    if (currentTeam !== team) return;
    fitDiagram(kind);
    status.textContent = `${savedXML === undefined ? 'Submitted version preloaded' : 'Saved workspace diagram loaded'}${warnings.length ? ` · ${warnings.length} warning(s)` : ''}`;
    status.classList.add('good');
    diagramReady[kind] = true;
  } catch (error) {
    if (typeof savedXML === 'string') throw new Error(`Unable to load saved ${kind} diagram: ${error.message}. Editing is disabled; recovery data is unchanged.`);
    if (currentTeam !== team) return;
    await modelers[kind].importXML(blank(kind === 'general' ? 'General process starts' : 'Tool process starts'));
    if (currentTeam !== team) return;
    fitDiagram(kind);
    status.textContent = `${error.message || 'Diagram unavailable'} · blank working diagram opened`;
    status.classList.add('warn');
    diagramReady[kind] = false;
  }
  if (currentTeam === team) toolbench.render();
}

async function validateDiagrams(diagrams) {
  for (const xml of Object.values(diagrams)) {
    if (xml === null) continue;
    const testModeler = new BpmnModeler({ container: document.createElement('div') });
    try { await testModeler.importXML(xml); }
    finally { testModeler.destroy(); }
  }
}

async function applyPayload(payload) {
  await validateDiagrams(payload.diagrams);
  await Promise.all(['general', 'scoped'].map(kind => loadDiagram(kind, payload.diagrams[kind])));
  records = restoreWorkshop(payload.records);
  toolbench.reset();
  renderRecords();
}

async function selectTeam(id) {
  await recoveryTask;
  currentTeam = teams.find(t => t.id === id);
  $('team').value = id;
  baseRevision = null;
  dirty = false;
  blocked = false;
  recoveryFailed = false;
  recoveryPending = false;
  records = restoreWorkshop({});
  diagramReady.general = false;
  diagramReady.scoped = false;
  selected = { general: null, scoped: null };
  toolbench.reset();
  $('modal').classList.add('hidden');
  $('repoLink').href = currentTeam.repositoryUrl || '#'; $('repoLink').classList.toggle('disabled', !currentTeam.repositoryUrl);
  $('provenance').innerHTML = `<strong>${currentTeam.id}</strong> · Team-only planning canvas`;
  await Promise.all(Object.entries(modelers).map(([kind, modeler]) => modeler.importXML(blank(kind))));
  renderRecords();
  feedback(session ? 'Loading shared workspace…' : 'Signed out: submitted GitHub sources only. Sign in to see saved workspaces and edit your team.');
  const saved = session ? await repository.load(id) : null;
  if (saved) {
    await applyPayload(saved.payload);
    baseRevision = saved.revision;
    feedback(`Loaded shared revision ${saved.revision} (${new Date(saved.updated_at).toLocaleString()}). Other teams are read-only unless you are a facilitator.`);
  } else {
    await Promise.all(['general', 'scoped'].map(kind => loadDiagram(kind)));
    baseRevision = session ? 0 : null;
    if (session) feedback('No shared workspace yet. Recover any earlier browser draft deliberately, then save the first team canvas revision. Existing source data is retained in the background.');
  }
  if (session) {
    try {
      const recovery = readRecovery(localStorage, id, session.user.id);
      if (recovery && !sameWorkspace(recovery.payload, saved?.payload || await snapshot())) {
        recoveryPending = true;
        feedback(`${$('workspaceFeedback').textContent}\nA different browser recovery draft exists. It has NOT replaced the loaded workspace. Before editing, choose Recover browser draft or Use loaded version instead.`);
      }
    } catch (error) {
      reportError(new Error(`The shared workspace loaded, but browser recovery could not be read: ${error.message}. Original recovery data has not been changed.`));
    }
  }
}

async function applySession(nextSession) {
  await recoveryTask;
  session = nextSession;
  ++designLoadId;
  currentDesignSections = null;
  currentDesignSourceUrl = '';
  membershipError = '';
  returningToSubject = false;
  $('backToSubject').hidden = true;
  access = { teams: [], facilitator: false };
  baseRevision = null;
  try { toolbench.setUser(session?.user.id || null); }
  catch (error) { reportError(error); }
  await focusCanvases.sessionChanged();
  // Clear any prior account's shared records before looking up the new account.
  await selectTeam(currentTeam.id);
  if (session) access = await repository.permissions(session.user.id);
  if ($('design').classList.contains('active')) await loadDesign();
}

function mayLeaveDraft() {
  finishDiagramEditing();
  return !dirty || window.confirm('Your edits are not saved to the shared workspace. Keep them only in browser recovery and continue? Download first if recovery has failed.');
}

function finishDiagramEditing() {
  if (!canEdit()) return;
  for (const modeler of Object.values(modelers)) modeler.get('directEditing').complete();
}

async function init() {
  const response = await fetch('/api/teams');
  if (!response.ok) throw new Error('Unable to load team registry.');
  teams = await response.json();
  $('team').innerHTML = teams.map(team => `<option value="${team.id}">${team.id}</option>`).join('');
  $('myTeam').innerHTML = '<option value="">Choose your team</option>' + teams.map(team => `<option value="${team.id}">${team.id}</option>`).join('');
  await enqueue(() => selectTeam($('team').value));
  const client = await mountAuth({
    container: $('auth'), reportError,
    onSession(nextSession) {
      if (!repository) { pendingSession = nextSession; return; }
      enqueue(() => applySession(nextSession));
    }
  });
  repository = createWorkspaceRepository(client);
  focusRepository = createFocusRepository(client);
  focusCanvases.setClient(client);
  if (pendingSession !== undefined) await enqueue(() => applySession(pendingSession));
  try {
    if (await toolbench.initSpeckle()) await navigate(focusCanvases.active ? 'subjects' : 'diagrams');
  } catch (error) {
    await navigate(focusCanvases.active ? 'subjects' : 'diagrams');
    reportError(error);
  }
}

$('team').addEventListener('change', e => {
  const id = e.target.value;
  if (!mayLeaveDraft()) { e.target.value = currentTeam.id; return; }
  enqueue(() => selectTeam(id));
});
$('chooseTeam').addEventListener('click', () => {
  const teamId = $('myTeam').value;
  if (!session || pendingTasks) return;
  if (!teamId) {
    membershipError = 'Choose your team before joining.';
    updateControls();
    return;
  }
  if (!mayLeaveDraft()) return;
  membershipError = '';
  enqueue(async () => {
    await recoveryTask;
    // Fail closed until the server confirms the new permissions.
    access = { teams: [], facilitator: false };
    try {
      await repository.chooseTeam(teamId);
      access = await repository.permissions(session.user.id);
      await selectTeam(teamId);
      await loadDesign();
      feedback(`You joined ${teamId}. Previous team memberships were removed; your browser drafts are retained.`);
    } catch (error) {
      membershipError = `${error.message} Try joining again, or return to the team canvas and Load latest to refresh permissions.`;
      throw error;
    }
  });
  $('profileButton').addEventListener('click', () => $('profileDialog').showModal());
  $('closeProfile').addEventListener('click', () => $('profileDialog').close());
  $('resolveTeamBackup').addEventListener('click', () => navigate('settings'));
});
$('connect').addEventListener('click', () => {
  if (!canEdit()) return;
  if (!selected.general || !selected.scoped) return alert('Select one element in each diagram first.');
  $('modalSummary').textContent = `${elementName(selected.general)} ↔ ${elementName(selected.scoped)}`; $('modal').classList.remove('hidden');
});
$('cancelModal').addEventListener('click', () => $('modal').classList.add('hidden'));
$('saveMapping').addEventListener('click', () => {
  if (!canEdit()) return;
  records.mappings.push({ generalId: selected.general.id, scopedId: selected.scoped.id, generalName: elementName(selected.general), scopedName: elementName(selected.scoped), relationship: $('relation').value, explanation: $('explanation').value });
  $('explanation').value = ''; $('modal').classList.add('hidden'); persist();
});

for (const input of [$('generalUpload'), $('scopedUpload')]) input.addEventListener('change', e => {
  if (!canEdit() || !e.target.files[0]) return;
  const file = e.target.files[0];
  const kind = e.target.id.startsWith('general') ? 'general' : 'scoped';
  enqueue(async () => {
    await recoveryTask;
    const xml = await file.text();
    await validateDiagrams({ [kind]: xml });
    await modelers[kind].importXML(xml);
    diagramReady[kind] = true;
    fitDiagram(kind);
    $(`${kind}Status`).textContent = 'Uploaded draft - not yet saved to the shared workspace';
    persist();
  });
  e.target.value = '';
});
for (const button of document.querySelectorAll('[data-download]')) button.addEventListener('click', e => {
  const kind = e.target.dataset.download;
  enqueue(async () => {
    const { xml } = await modelers[kind].saveXML({ format: true });
    download(`${currentTeam.id}-${kind}.bpmn`, xml, 'application/xml');
  });
});
function download(name, content, type) { const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([content],{type})); a.download=name; a.click(); URL.revokeObjectURL(a.href); }
$('downloadAll').addEventListener('click', () => enqueue(async () => {
  const payload = await snapshot();
  // Keep the earlier top-level collections for existing export consumers.
  download(`${currentTeam.id}-node-comply-workspace.json`, JSON.stringify({ ...payload, team: currentTeam, ...payload.records }, null, 2), 'application/json');
}));
$('downloadCanvases').addEventListener('click', () => {
  if (!session || pendingTasks) return;
  enqueue(async () => {
    $('canvasExportFeedback').textContent = 'Reading all saved canvases. Your displayed canvas and shared data will not be replaced.';
    try {
      await recoveryTask;
      const exported = await exportAllCanvases({
        teams, repository, focusRepository, storage: localStorage, userId: session.user.id
      });
      const date = exported.completedAt.replace(/[:.]/g, '-');
      download(`node-comply-all-canvases-${date}.json`, JSON.stringify(exported, null, 2), 'application/json');
      const savedTeams = exported.teamCanvases.filter(canvas => canvas.shared).length;
      const savedSubjects = exported.subjectCanvases.filter(canvas => canvas.shared).length;
      $('canvasExportFeedback').textContent = `Exported ${savedTeams} saved team canvases and ${savedSubjects} saved subject canvases, with this account's browser recovery drafts listed separately. No edits were saved.`;
      $('canvasExportFeedback').classList.remove('error');
    } catch (error) {
      $('canvasExportFeedback').textContent = `All-canvas download failed: ${error.message}. No partial file was downloaded; no shared data was changed.`;
      $('canvasExportFeedback').classList.add('error');
      throw error;
    }
  });
});
$('saveShared').addEventListener('click', () => {
  if (!canEdit() || blocked) return;
  enqueue(async () => {
    await recoveryTask;
    const payload = await snapshot();
    try { writeRecovery(localStorage, session.user.id, baseRevision, payload); }
    catch (error) {
      recoveryFailed = true;
      reportError(new Error(`Browser recovery failed: ${error.message}. Attempting shared save; keep this page open until confirmed.`));
    }
    try {
      const saved = await repository.save(currentTeam.id, baseRevision, payload);
      baseRevision = saved.revision;
      dirty = false;
      blocked = false;
      feedback(`Saved shared revision ${saved.revision}. Team canvas and workspace records saved; archived diagram data retained.`);
      // Keep a recovery copy even after a successful save.
      try {
        writeRecovery(localStorage, session.user.id, baseRevision, payload);
        recoveryFailed = false;
      } catch (error) {
        recoveryFailed = true;
        reportError(new Error(`Shared revision ${saved.revision} WAS saved, but browser recovery failed: ${error.message}. Download a backup.`));
      }
    } catch (error) {
      if (error instanceof WorkspaceConflict) blocked = true;
      throw error;
    }
  });
});
$('loadShared').addEventListener('click', () => {
  if (!mayLeaveDraft()) return;
  enqueue(async () => {
    await recoveryTask;
    const previous = await snapshot();
    const wasDirty = dirty;
    try {
      access = { teams: [], facilitator: false };
      await selectTeam(currentTeam.id);
      access = await repository.permissions(session.user.id);
      membershipError = '';
    } catch (error) {
      await applyPayload(previous);
      baseRevision = null;
      dirty = wasDirty;
      blocked = true;
      throw new Error(`Reload failed. The previously displayed workspace is retained read-only for download; browser recovery is unchanged. ${error.message}`);
    }
  });
});
$('downloadRecovery').addEventListener('click', () => enqueue(async () => {
  await recoveryTask;
  const recovery = readRecovery(localStorage, currentTeam.id, session.user.id);
  if (!recovery) throw new Error('No browser recovery draft exists for this account/team.');
  const payload = recovery.payload;
  download(`${currentTeam.id}-browser-recovery.json`, JSON.stringify({
    ...payload, team: currentTeam, ...payload.records
  }, null, 2), 'application/json');
  feedback('Downloaded browser recovery without changing the displayed workspace or server revision.');
}));
$('recoverDraft').addEventListener('click', () => {
  if (!hasTeamAccess()) return;
  let recovery;
  try { recovery = readRecovery(localStorage, currentTeam.id, session.user.id); }
  catch (error) { reportError(error); return; }
  if (!recovery) { feedback('There is no browser draft for this account/team and no earlier legacy draft.'); return; }
  if (!window.confirm(`Replace the displayed ${currentTeam.id} workspace with this browser draft${recovery.legacy ? ' from the earlier local-only app' : ''}? It will remain unsaved. The next save will replace BOTH diagrams and ALL records, using loaded shared revision ${baseRevision} as its base. Download either version first if needed.`)) return;
  enqueue(async () => {
    await recoveryTask;
    await applyPayload(recovery.payload);
    blocked = false;
    recoveryPending = false;
    persist();
    feedback('Browser draft applied to the displayed workspace, not yet saved to the server. Review it and explicitly Save shared workspace when ready.');
  });
});
$('keepShared').addEventListener('click', () => {
  if (!hasTeamAccess()) return;
  if (!window.confirm('Continue editing the loaded version instead? Your NEXT edit will replace this account/team browser recovery draft. Legacy local-only drafts are never deleted. Download the old draft first if you need both versions.')) return;
  recoveryPending = false;
  feedback('Using the loaded version. The next edit will update browser recovery; nothing has been saved to the server.');
  updateControls();
});
$('workspaceUpload').addEventListener('change', event => {
  if (!canEdit() || !event.target.files[0]) return;
  const file = event.target.files[0];
  event.target.value = '';
  if (!window.confirm('Import this workspace as an unsaved replacement for the displayed team? Download the current version first if needed.')) return;
  enqueue(async () => {
    await recoveryTask;
    const imported = JSON.parse(await file.text());
    const payload = importWorkspace(imported, currentTeam.id, {
      general: diagramReady.general ? (await modelers.general.saveXML({ format: true })).xml : null,
      scoped: diagramReady.scoped ? (await modelers.scoped.saveXML({ format: true })).xml : null
    });
    await applyPayload(payload);
    persist();
    feedback('Workspace imported as a browser draft, not saved to the shared workspace. Earlier JSON exports contain no diagrams; those imports keep the displayed diagrams.');
  });
});
window.addEventListener('beforeunload', event => {
  if (dirty) { event.preventDefault(); event.returnValue = ''; }
});
let navigating = false;
async function openTeamDiagram(teamId) {
  if (navigating || pendingTasks) return;
  if (!teams.some(team => team.id === teamId)) throw new Error('The responsible team no longer exists.');
  if (!mayLeaveDraft()) return;
  await recoveryTask;
  if (!await navigate('diagrams')) return;
  returningToSubject = true;
  $('backToSubject').hidden = false;
  await enqueue(() => selectTeam(teamId));
}

$('backToSubject').addEventListener('click', () => navigate('subjects'));

async function navigate(name) {
  if (navigating || pendingTasks) return false;
  navigating = true;
  document.querySelectorAll('.tab').forEach(tab => { tab.disabled = true; });
  try {
    if (name === 'subjects' && !await focusCanvases.showSubjects()) return false;
    if (name === 'diagrams' && !await focusCanvases.showTeam()) return false;
    if (name === 'subjects') returningToSubject = false;
    $('backToSubject').hidden = name !== 'diagrams' || !returningToSubject;
    document.querySelectorAll('.tab,.tabpage').forEach(x=>x.classList.remove('active'));
    document.querySelector(`[data-tab="${name}"]`).classList.add('active');
    $(name).classList.add('active');
    updateScopeVisibility();
    if (name === 'design') loadDesign();
    else toolbench.render();
    return true;
  } catch (error) {
    reportError(error);
    return false;
  } finally {
    navigating = false;
    document.querySelectorAll('.tab').forEach(tab => { tab.disabled = false; });
  }
}
for (const tab of document.querySelectorAll('.tab')) tab.addEventListener('click', () => navigate(tab.dataset.tab));
$('refreshDesign').addEventListener('click', () => loadDesign(true));
$('planDesignClaim').addEventListener('click', async () => {
  if (!canPlanOwnDesign()) return;
  if (!currentDesignSections?.A2b?.text) return alert('Load a README with an A2b claim section first.');
  const claim = { text: currentDesignSections.A2b.text, sourceUrl: currentDesignSourceUrl };
  const team = ownDesignTeam();
  if (currentTeam?.id !== team.id && !mayLeaveDraft()) return;
  if (!await navigate('diagrams')) return;
  if (currentTeam?.id !== team.id) await enqueue(() => selectTeam(team.id));
  if (canEdit()) toolbench.startClaim(claim);
});

init().catch(reportError);
