import BpmnModeler from 'bpmn-js/lib/Modeler';
import 'bpmn-js/dist/assets/diagram-js.css';
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn.css';
import './style.css';

const app = document.querySelector('#app');
app.innerHTML = `
<header class="topbar">
  <div class="brand"><span class="brand-mark">M</span><div><strong>MasterBPMN</strong><small>From submitted workflows to a shared process</small></div></div>
  <div class="top-actions"><span id="saveState" class="saved">Workshop version</span><button id="downloadAll" class="button primary">Download workspace</button></div>
</header>
<section class="contextbar">
  <label>Subject<select id="subject"><option>ARC</option></select></label>
  <label>Team<select id="team"></select></label>
  <div id="provenance" class="provenance">Loading submitted work…</div>
  <a id="repoLink" class="button ghost" target="_blank">Open repository</a>
</section>
<nav class="tabs">
  <button class="tab active" data-tab="diagrams">Team diagrams</button>
  <button class="tab" data-tab="connections">Connections <span id="mapCount">0</span></button>
  <button class="tab" data-tab="nominations">ARC nominations <span id="nomCount">0</span></button>
  <button class="tab" data-tab="dependencies">Dependencies <span id="depCount">0</span></button>
</nav>
<main>
  <section id="diagrams" class="tabpage active">
    <div class="instruction"><strong>Start with the submitted work.</strong> Select an element in each diagram, then create a connection. General BPMN elements provide candidates for the ARC master; scoped details remain behind the callable activity.</div>
    <div class="workspace">
      <article class="panel"><div class="panelhead"><div><span>GENERAL</span><h2>Professional process</h2></div><div class="panel-actions"><label class="upload">Upload<input id="generalUpload" type="file" accept=".bpmn,.xml" /></label><button data-download="general">Download</button></div></div><div id="generalStatus" class="status"></div><div id="generalCanvas" class="canvas"></div><footer><span id="generalSelection">Select an event, activity, gateway or data object</span><button id="nominate" class="button">Propose for ARC master</button></footer></article>
      <aside class="connector"><button id="connect" title="Connect current selections">⇄</button><small>Connect</small></aside>
      <article class="panel"><div class="panelhead"><div><span>SCOPED</span><h2>Tool implementation</h2></div><div class="panel-actions"><label class="upload">Upload<input id="scopedUpload" type="file" accept=".bpmn,.xml" /></label><button data-download="scoped">Download</button></div></div><div id="scopedStatus" class="status"></div><div id="scopedCanvas" class="canvas"></div><footer><span id="scopedSelection">Select the implementation element(s)</span><span class="legend"><i></i> Submitted version</span></footer></article>
    </div>
  </section>
  <section id="connections" class="tabpage"><div class="pagegrid"><div><h2>General ↔ scoped connections</h2><p>Each link records how the scoped tool supports the professional process.</p><div id="mappingList" class="cards empty"></div></div><aside class="help"><h3>Relationship types</h3><p>Implements, partially implements, provides input, supports decision, raises event, or not implemented.</p></aside></div></section>
  <section id="nominations" class="tabpage"><div class="pagegrid"><div><h2>Proposals for the ARC master</h2><p>Curated high-level elements from the general BPMN.</p><div id="nominationList" class="cards empty"></div></div><aside class="help"><h3>Master rule</h3><p>Promote professional activities, shared information, decisions and significant events. Keep file handling, loops and calculations in the scoped process.</p></aside></div></section>
  <section id="dependencies" class="tabpage"><div class="pagegrid"><div><h2>Dependency graph input</h2><p>Record what this team needs and what it produces.</p><form id="dependencyForm" class="dependency-form"><input id="depFrom" placeholder="Producer or source" required><select id="depType"><option>Data dependency</option><option>Process dependency</option><option>Model dependency</option><option>Decision dependency</option><option>Human dependency</option><option>Optional dependency</option></select><input id="depTo" placeholder="Consumer or target" required><input id="depObject" placeholder="Information or condition exchanged" required><button class="button primary">Add dependency</button></form><div id="dependencyList" class="cards empty"></div></div><aside class="help"><h3>Status</h3><p>New dependencies begin as <strong>Declared</strong>. A receiving team can later make them Reciprocal, then Validated and Implemented.</p></aside></div></section>
</main>
<div id="modal" class="modal hidden"><div class="modal-card"><h3>Create connection</h3><p id="modalSummary"></p><label>Relationship<select id="relation"><option>Implements</option><option>Partially implements</option><option>Provides input to</option><option>Receives input from</option><option>Supports decision</option><option>Raises event or warning</option><option>Relevant but not implemented</option></select></label><label>Explanation<textarea id="explanation" placeholder="Explain the relationship"></textarea></label><div><button id="cancelModal" class="button">Cancel</button><button id="saveMapping" class="button primary">Save connection</button></div></div></div>`;

const blank = name => `<?xml version="1.0" encoding="UTF-8"?><bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" id="Definitions_1" targetNamespace="http://masterbpmn.local"><bpmn:process id="Process_1" isExecutable="false"><bpmn:startEvent id="StartEvent_1" name="${name}"/></bpmn:process><bpmndi:BPMNDiagram id="BPMNDiagram_1"><bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Process_1"><bpmndi:BPMNShape id="StartEvent_1_di" bpmnElement="StartEvent_1"><dc:Bounds x="180" y="120" width="36" height="36"/></bpmndi:BPMNShape></bpmndi:BPMNPlane></bpmndi:BPMNDiagram></bpmn:definitions>`;

const modelers = {
  general: new BpmnModeler({ container: '#generalCanvas' }),
  scoped: new BpmnModeler({ container: '#scopedCanvas' })
};
let teams = [], currentTeam = null;
let selected = { general: null, scoped: null };
let records = { mappings: [], nominations: [], dependencies: [] };

const $ = id => document.getElementById(id);
const key = () => `masterbpmn:${currentTeam?.id || 'none'}`;
const elementName = el => el?.businessObject?.name || el?.type?.replace('bpmn:', '') || el?.id || 'Unnamed element';

function persist() { localStorage.setItem(key(), JSON.stringify(records)); $('saveState').textContent = 'Saved locally'; renderRecords(); }
function restore() { records = JSON.parse(localStorage.getItem(key()) || '{"mappings":[],"nominations":[],"dependencies":[]}'); renderRecords(); }
function card(title, meta, body, index, type) { return `<article class="record"><div><strong>${title}</strong><small>${meta}</small><p>${body}</p></div><button data-remove="${type}:${index}" aria-label="Remove">×</button></article>`; }
function renderRecords() {
  $('mapCount').textContent = records.mappings.length; $('nomCount').textContent = records.nominations.length; $('depCount').textContent = records.dependencies.length;
  $('mappingList').innerHTML = records.mappings.length ? records.mappings.map((r,i)=>card(`${r.generalName} ↔ ${r.scopedName}`, r.relationship, r.explanation || 'No explanation supplied.', i, 'mappings')).join('') : '<div class="empty-state">No connections yet.</div>';
  $('nominationList').innerHTML = records.nominations.length ? records.nominations.map((r,i)=>card(r.name, `${r.type} · ${r.teamId}`, 'Proposed from the submitted general BPMN.', i, 'nominations')).join('') : '<div class="empty-state">No ARC master nominations yet.</div>';
  $('dependencyList').innerHTML = records.dependencies.length ? records.dependencies.map((r,i)=>card(`${r.from} → ${r.to}`, `${r.type} · Declared`, r.object, i, 'dependencies')).join('') : '<div class="empty-state">No dependencies declared yet.</div>';
}

for (const [kind, modeler] of Object.entries(modelers)) {
  modeler.on('selection.changed', event => {
    selected[kind] = event.newSelection[0] || null;
    $(`${kind}Selection`).textContent = selected[kind] ? elementName(selected[kind]) : (kind === 'general' ? 'Select an event, activity, gateway or data object' : 'Select the implementation element(s)');
  });
  modeler.on('commandStack.changed', () => { $('saveState').textContent = 'Unsaved diagram edits'; });
}

async function loadDiagram(kind) {
  const status = $(`${kind}Status`); status.className = 'status'; status.textContent = 'Loading submitted version…';
  const draft = localStorage.getItem(`${key()}:${kind}:xml`);
  try {
    const xml = draft || await (await fetch(`/api/diagram/${currentTeam.id}/${kind}`)).text();
    if (xml.trim().startsWith('{')) throw new Error(JSON.parse(xml).error);
    const { warnings } = await modelers[kind].importXML(xml);
    modelers[kind].get('canvas').zoom('fit-viewport');
    status.textContent = draft ? 'Workshop draft loaded' : `Submitted version preloaded${warnings.length ? ` · ${warnings.length} warning(s)` : ''}`;
    status.classList.add('good');
  } catch (error) {
    await modelers[kind].importXML(blank(kind === 'general' ? 'General process starts' : 'Tool process starts'));
    modelers[kind].get('canvas').zoom('fit-viewport');
    status.textContent = `${error.message || 'Diagram unavailable'} · blank working diagram opened`;
    status.classList.add('warn');
  }
}

async function selectTeam(id) {
  currentTeam = teams.find(t => t.id === id);
  selected = { general: null, scoped: null };
  $('repoLink').href = currentTeam.repositoryUrl || '#'; $('repoLink').classList.toggle('disabled', !currentTeam.repositoryUrl);
  $('provenance').innerHTML = `<strong>${currentTeam.id}</strong> · Submitted work preloaded from the team repository`;
  restore(); await Promise.all([loadDiagram('general'), loadDiagram('scoped')]);
}

async function init() {
  teams = await (await fetch('/api/teams')).json();
  $('team').innerHTML = teams.map(t => `<option value="${t.id}">${t.id}</option>`).join('');
  await selectTeam(teams[0].id);
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
  records.nominations.push({ id: selected.general.id, name: elementName(selected.general), type: selected.general.type.replace('bpmn:', ''), teamId: currentTeam.id }); persist();
});
$('dependencyForm').addEventListener('submit', e => { e.preventDefault(); records.dependencies.push({ from: $('depFrom').value, to: $('depTo').value, type: $('depType').value, object: $('depObject').value }); e.target.reset(); persist(); });
document.addEventListener('click', e => { const value = e.target.dataset.remove; if (!value) return; const [type,index] = value.split(':'); records[type].splice(Number(index),1); persist(); });

for (const input of document.querySelectorAll('input[type=file]')) input.addEventListener('change', async e => { const kind = e.target.id.startsWith('general') ? 'general' : 'scoped'; const xml = await e.target.files[0].text(); await modelers[kind].importXML(xml); modelers[kind].get('canvas').zoom('fit-viewport'); $(`${kind}Status`).textContent = 'Uploaded workshop version'; });
for (const button of document.querySelectorAll('[data-download]')) button.addEventListener('click', async e => { const kind = e.target.dataset.download; const { xml } = await modelers[kind].saveXML({ format: true }); download(`${currentTeam.id}-${kind}.bpmn`, xml, 'application/xml'); });
function download(name, content, type) { const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([content],{type})); a.download=name; a.click(); URL.revokeObjectURL(a.href); }
$('downloadAll').addEventListener('click', async () => { for (const kind of ['general','scoped']) { const { xml } = await modelers[kind].saveXML({ format:true }); localStorage.setItem(`${key()}:${kind}:xml`, xml); } download(`${currentTeam.id}-masterbpmn-workspace.json`, JSON.stringify({ team: currentTeam, ...records }, null, 2), 'application/json'); persist(); });
for (const tab of document.querySelectorAll('.tab')) tab.addEventListener('click', () => { document.querySelectorAll('.tab,.tabpage').forEach(x=>x.classList.remove('active')); tab.classList.add('active'); $(tab.dataset.tab).classList.add('active'); });

init().catch(error => { console.error(error); $('provenance').textContent = 'Unable to load team registry'; });
