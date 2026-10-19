import BpmnModeler from 'bpmn-js/lib/Modeler';
import 'bpmn-js/dist/assets/diagram-js.css';
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn.css';
import './style.css';
import './design.css';
import { restoreWorkshop } from './workshop-data.js';
import { mountWorkshop } from './workshop.js';

const app = document.querySelector('#app');
app.innerHTML = `
<header class="topbar">
  <div class="app-title"><h1>MasterBPMN</h1><p>Combining team BPMNs into a shared disciplinary process</p></div>
  <div class="top-actions"><span id="saveState" class="saved">Workshop version</span><button id="downloadAll" class="button primary">Download workspace</button></div>
</header>
<section class="contextbar">
  <label>Team<select id="team"></select></label>
  <div id="provenance" class="provenance">Loading submitted work…</div>
  <a id="repoLink" class="button ghost" target="_blank">Open repository</a>
</section>
<nav class="tabs">
  <button class="tab" data-tab="design">Design</button>
  <button class="tab active" data-tab="diagrams">Team diagrams</button>
  <button class="tab" data-tab="connections">Connections <span id="mapCount">0</span></button>
  <button class="tab" data-tab="nominations">Master nominations <span id="nomCount">0</span></button>
  <button class="tab" data-tab="dependencies">Inputs, outputs &amp; handoffs <span id="depCount">0</span></button>
</nav>
<main>
  <section id="diagrams" class="tabpage active">
    <div class="instruction"><strong>Start with the submitted work.</strong> Select an element in each diagram, then create a connection. General BPMN elements provide candidates for the disciplinary master; scoped details remain behind the callable activity.</div>
    <div class="workspace">
      <article class="panel"><div class="panelhead"><div><span>GENERAL</span><h2>Professional process</h2></div><div class="panel-actions"><label class="upload">Upload<input id="generalUpload" type="file" accept=".bpmn,.xml" /></label><button data-download="general">Download</button></div></div><div id="generalStatus" class="status"></div><div id="generalCanvas" class="canvas"></div><footer><span id="generalSelection">Select an event, activity, gateway or data object</span><button id="nominate" class="button">Propose for discipline master</button></footer></article>
      <aside class="connector"><button id="connect" title="Connect current selections">⇄</button><small>Connect</small></aside>
      <article class="panel"><div class="panelhead"><div><span>SCOPED</span><h2>Tool implementation</h2></div><div class="panel-actions"><label class="upload">Upload<input id="scopedUpload" type="file" accept=".bpmn,.xml" /></label><button data-download="scoped">Download</button></div></div><div id="scopedStatus" class="status"></div><div id="scopedCanvas" class="canvas"></div><footer><span id="scopedSelection">Select the implementation element(s)</span><span class="legend"><i></i> Submitted version</span></footer></article>
    </div>
  </section>
  <section id="connections" class="tabpage"><div class="pagegrid"><div><h2>General ↔ scoped connections</h2><p>Each link records how the scoped tool supports the professional process.</p><div id="mappingList" class="cards empty"></div></div><aside class="help"><h3>Relationship types</h3><p>Implements, partially implements, provides input, supports decision, raises event, or not implemented.</p></aside></div></section>
  <section id="nominations" class="tabpage"><div class="pagegrid"><div><h2>Proposals for the disciplinary master</h2><p>Curated high-level elements from the general BPMN.</p><div id="nominationList" class="cards empty"></div></div><aside class="help"><h3>Master rule</h3><p>Promote professional activities, shared information, decisions and significant events. Keep file handling, loops and calculations in the scoped process.</p></aside></div></section>
  <section id="dependencies" class="tabpage"></section>
  <section id="design" class="tabpage"><div class="design-page"><div class="design-intro"><h2>Design brief</h2><p>Read-only excerpts from the team README, organized under the normalized A2 assignment sections. Update the source README in GitHub to change these answers.</p><div class="design-source-row"><div id="designSource" class="status">Loading the team README…</div><button id="refreshDesign" class="button">Refresh from GitHub</button></div></div><div id="designSections" class="design-sections"></div></div></section>
</main>
<div id="modal" class="modal hidden"><div class="modal-card"><h3>Create connection</h3><p id="modalSummary"></p><label>Relationship<select id="relation"><option>Implements</option><option>Partially implements</option><option>Provides input to</option><option>Receives input from</option><option>Supports decision</option><option>Raises event or warning</option><option>Relevant but not implemented</option></select></label><label>Explanation<textarea id="explanation" placeholder="Explain the relationship"></textarea></label><div><button id="cancelModal" class="button">Cancel</button><button id="saveMapping" class="button primary">Save connection</button></div></div></div>`;

const blank = name => `<?xml version="1.0" encoding="UTF-8"?><bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" id="Definitions_1" targetNamespace="http://masterbpmn.local"><bpmn:process id="Process_1" isExecutable="false"><bpmn:startEvent id="StartEvent_1" name="${name}"/></bpmn:process><bpmndi:BPMNDiagram id="BPMNDiagram_1"><bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Process_1"><bpmndi:BPMNShape id="StartEvent_1_di" bpmnElement="StartEvent_1"><dc:Bounds x="180" y="120" width="36" height="36"/></bpmndi:BPMNShape></bpmndi:BPMNPlane></bpmndi:BPMNDiagram></bpmn:definitions>`;

const modelers = {
  general: new BpmnModeler({ container: '#generalCanvas' }),
  scoped: new BpmnModeler({ container: '#scopedCanvas' })
};
let teams = [], currentTeam = null;
let selected = { general: null, scoped: null };
let records = restoreWorkshop({});

const $ = id => document.getElementById(id);
const key = () => `masterbpmn:${currentTeam?.id || 'none'}`;
const elementName = el => el?.businessObject?.name || el?.type?.replace('bpmn:', '') || el?.id || 'Unnamed element';
const workshop = mountWorkshop({
  container: $('dependencies'), getRecords: () => records, getTeam: () => currentTeam,
  modeler: modelers.scoped, persist
});
const designSections = [
  { key: 'A2a', title: 'A2a: About your group', pattern: /\bA2\s*a\b|about (our|the|your)?\s*group|group and focus/i },
  { key: 'A2b', title: 'A2b: Identify Claim', pattern: /\bA2\s*b\b|identify( the)? claim|claim and starting point/i },
  { key: 'A2c', title: 'A2c: Use Case', pattern: /\bA2\s*c\b|use case/i },
  { key: 'A2d', title: 'A2d: Scope the use case', pattern: /\bA2\s*d\b|scope( the)? use case|scope of (the )?tool/i },
  { key: 'A2e', title: 'A2e: Tool Idea', pattern: /\bA2\s*e\b|tool idea|own .*tool/i },
  { key: 'A2f', title: 'A2f: Information Requirements', pattern: /\bA2\s*f\b|information requirements/i },
  { key: 'A2g', title: 'A2g: Identify appropriate software licence', pattern: /\bA2\s*g\b|software licen[cs]e/i }
];

function persist() { localStorage.setItem(key(), JSON.stringify(records)); $('saveState').textContent = 'Saved locally'; renderRecords(); }
function restore() {
  const saved = JSON.parse(localStorage.getItem(key()) || '{}');
  if (Object.hasOwn(saved, 'design')) {
    delete saved.design;
    localStorage.setItem(key(), JSON.stringify(saved));
  }
  records = restoreWorkshop(saved);
  renderRecords();
}
function card(title, meta, body, index, type) { return `<article class="record"><div><strong>${title}</strong><small>${meta}</small><p>${body}</p></div><button data-remove="${type}:${index}" aria-label="Remove">×</button></article>`; }
function renderRecords() {
  $('mapCount').textContent = records.mappings.length; $('nomCount').textContent = records.nominations.length; $('depCount').textContent = records.dependencies.length;
  $('mappingList').innerHTML = records.mappings.length ? records.mappings.map((r,i)=>card(`${r.generalName} ↔ ${r.scopedName}`, r.relationship, r.explanation || 'No explanation supplied.', i, 'mappings')).join('') : '<div class="empty-state">No connections yet.</div>';
  $('nominationList').innerHTML = records.nominations.length ? records.nominations.map((r,i)=>card(r.name, `${r.type} · ${r.subject || currentTeam.subject} · ${r.teamId}`, 'Proposed from the submitted general BPMN.', i, 'nominations')).join('') : '<div class="empty-state">No master nominations yet.</div>';
  workshop.render();
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

async function loadDesign(refresh = false) {
  const team = currentTeam;
  const source = $('designSource');
  currentDesignSections = null;
  renderDesign();
  source.textContent = 'Loading the team README…';
  $('refreshDesign').disabled = true;

  try {
    const response = await fetch(`/api/design/${team.id}${refresh ? '?refresh=1' : ''}`);
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || `README request failed (${response.status}).`);
    if (currentTeam?.id !== team.id) return;
    currentDesignSections = parseDesignSections(result.markdown);
    renderDesign();
    source.textContent = `Source: ${result.path} · GitHub default branch: ${result.branch}`;
    const link = document.createElement('a');
    link.href = `${team.repositoryUrl}/blob/${encodeURIComponent(result.branch)}/${result.path.split('/').map(encodeURIComponent).join('/')}`;
    link.target = '_blank';
    link.rel = 'noopener';
    link.textContent = 'Open source README';
    source.append(' · ', link);
    if (result.cached) source.append(' · Cached; refresh to check GitHub for updates.');
  } catch (error) {
    if (currentTeam?.id !== team.id) return;
    source.textContent = error.message;
    renderDesign();
  } finally {
    if (currentTeam?.id === team.id) $('refreshDesign').disabled = false;
  }
}

for (const [kind, modeler] of Object.entries(modelers)) {
  modeler.on('selection.changed', event => {
    selected[kind] = event.newSelection[0] || null;
    $(`${kind}Selection`).textContent = selected[kind] ? elementName(selected[kind]) : (kind === 'general' ? 'Select an event, activity, gateway or data object' : 'Select the implementation element(s)');
  });
  modeler.on('commandStack.changed', () => {
    $('saveState').textContent = 'Unsaved diagram edits';
    if (kind === 'scoped' && $('dependencies').classList.contains('active')) workshop.render();
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

async function loadDiagram(kind) {
  const status = $(`${kind}Status`); status.className = 'status'; status.textContent = 'Loading submitted version…';
  const draft = localStorage.getItem(`${key()}:${kind}:xml`);
  try {
    const xml = draft || await (await fetch(`/api/diagram/${currentTeam.id}/${kind}`)).text();
    if (xml.trim().startsWith('{')) throw new Error(JSON.parse(xml).error);
    const { warnings } = await modelers[kind].importXML(xml);
    fitDiagram(kind);
    status.textContent = draft ? 'Workshop draft loaded' : `Submitted version preloaded${warnings.length ? ` · ${warnings.length} warning(s)` : ''}`;
    status.classList.add('good');
  } catch (error) {
    await modelers[kind].importXML(blank(kind === 'general' ? 'General process starts' : 'Tool process starts'));
    fitDiagram(kind);
    status.textContent = `${error.message || 'Diagram unavailable'} · blank working diagram opened`;
    status.classList.add('warn');
  }
}

async function selectTeam(id) {
  currentTeam = teams.find(t => t.id === id);
  selected = { general: null, scoped: null };
  workshop.reset();
  $('repoLink').href = currentTeam.repositoryUrl || '#'; $('repoLink').classList.toggle('disabled', !currentTeam.repositoryUrl);
  $('provenance').innerHTML = `<strong>${currentTeam.id}</strong> · Submitted work preloaded from the team repository`;
  restore();
  renderDesign();
  $('designSource').textContent = 'Open this tab to load the team README.';
  const loads = [loadDiagram('general'), loadDiagram('scoped')];
  if ($('design').classList.contains('active')) loads.push(loadDesign());
  await Promise.all(loads);
  workshop.render();
}

async function init() {
  teams = await (await fetch('/api/teams')).json();
  $('team').innerHTML = teams.map(team => `<option value="${team.id}">${team.id}</option>`).join('');
  await selectTeam($('team').value);
}

$('team').addEventListener('change', e => selectTeam(e.target.value));
$('connect').addEventListener('click', () => {
  if (!selected.general || !selected.scoped) return alert('Select one element in each diagram first.');
  $('modalSummary').textContent = `${elementName(selected.general)} ↔ ${elementName(selected.scoped)}`; $('modal').classList.remove('hidden');
});
$('cancelModal').addEventListener('click', () => $('modal').classList.add('hidden'));
$('saveMapping').addEventListener('click', () => {
  records.mappings.push({ generalId: selected.general.id, scopedId: selected.scoped.id, generalName: elementName(selected.general), scopedName: elementName(selected.scoped), relationship: $('relation').value, explanation: $('explanation').value });
  $('explanation').value = ''; $('modal').classList.add('hidden'); persist();
});
$('nominate').addEventListener('click', () => {
  if (!selected.general) return alert('Select an element in the general BPMN first.');
  records.nominations.push({ id: selected.general.id, name: elementName(selected.general), type: selected.general.type.replace('bpmn:', ''), teamId: currentTeam.id, subject: currentTeam.subject }); persist();
});
document.addEventListener('click', e => { const value = e.target.dataset.remove; if (!value) return; const [type,index] = value.split(':'); records[type].splice(Number(index),1); persist(); });

for (const input of document.querySelectorAll('input[type=file]')) input.addEventListener('change', async e => { const kind = e.target.id.startsWith('general') ? 'general' : 'scoped'; const xml = await e.target.files[0].text(); await modelers[kind].importXML(xml); fitDiagram(kind); $(`${kind}Status`).textContent = 'Uploaded workshop version'; });
for (const button of document.querySelectorAll('[data-download]')) button.addEventListener('click', async e => { const kind = e.target.dataset.download; const { xml } = await modelers[kind].saveXML({ format: true }); download(`${currentTeam.id}-${kind}.bpmn`, xml, 'application/xml'); });
function download(name, content, type) { const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([content],{type})); a.download=name; a.click(); URL.revokeObjectURL(a.href); }
$('downloadAll').addEventListener('click', async () => { for (const kind of ['general','scoped']) { const { xml } = await modelers[kind].saveXML({ format:true }); localStorage.setItem(`${key()}:${kind}:xml`, xml); } download(`${currentTeam.id}-masterbpmn-workspace.json`, JSON.stringify({ team: currentTeam, ...records }, null, 2), 'application/json'); persist(); });
for (const tab of document.querySelectorAll('.tab')) tab.addEventListener('click', () => {
  document.querySelectorAll('.tab,.tabpage').forEach(x=>x.classList.remove('active'));
  tab.classList.add('active');
  $(tab.dataset.tab).classList.add('active');
  if (tab.dataset.tab === 'design') loadDesign();
  if (tab.dataset.tab === 'dependencies') workshop.render();
  if (tab.dataset.tab === 'diagrams') {
    for (const kind of Object.keys(modelers)) fitDiagram(kind);
  }
});
$('refreshDesign').addEventListener('click', () => loadDesign(true));

init().catch(error => { console.error(error); $('provenance').textContent = 'Unable to load team registry'; });
