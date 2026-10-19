import { escapeHtml as html, scopedActivities, activityLinkWarning } from './workshop-data.js';
import './workshop.css';

let nextHelpId = 0;
function info(term, text) {
  const id = `workshop-help-${++nextHelpId}`;
  return `<div class="term-help"><button type="button" class="term-trigger" aria-label="Explain ${term}" aria-expanded="false" aria-controls="${id}" aria-describedby="${id}">i</button><div id="${id}" class="term-tip" role="tooltip"><strong>${term}</strong><p>${text}</p></div></div>`;
}

function field(id, label, control, explanation = '') {
  return `<div class="workshop-field"><div class="field-heading"><label for="${id}">${label}</label>${explanation}</div>${control}</div>`;
}

const input = (id, required = false, placeholder = '') =>
  `<input id="${id}" ${required ? 'required' : ''} placeholder="${placeholder}">`;
const textarea = id => `<textarea id="${id}" rows="2"></textarea>`;
const activitySelect = id => `<select id="${id}" class="scoped-activity"></select>`;
const handoffTypes = [
  ['Data dependency', 'Data or results'],
  ['Process dependency', 'Completion of another activity'],
  ['Model dependency', 'Model information'],
  ['Decision dependency', 'A decision'],
  ['Human dependency', 'Human input or review'],
  ['Optional dependency', 'Optional support']
];

export function mountWorkshop({ container, getRecords, getTeam, modeler, persist }) {
  container.innerHTML = `
    <div class="pagegrid workshop-page"><div>
      <h2>Inputs, outputs &amp; handoffs</h2>
      <p>Start with a scoped activity: what does it need, what does it produce, and who does the work?</p>
      <p class="workshop-note">Workshop metadata only: these records do not change submitted BPMNs, merge activities, store lookup-table contents, or share work with other browsers.</p>
      <h3>1. Describe an activity</h3>
      <form id="activityForm" class="workshop-form">
        ${field('activityElement', 'Scoped activity', activitySelect('activityElement'), info('Activity', 'A BPMN activity is work being performed, such as a task, subprocess or call activity. Events and gateways are not activities. Select one from the scoped diagram.'))}
        ${field('activityOwner', 'Responsible team or role', input('activityOwner', true, 'For example: ARC-01 / model analysis'), info('Task team', 'In ISO 19650, a task team carries out a specific task. Record who will perform this activity in the combined process; this does not automatically assign formal appointed-party roles.'))}
        ${field('activityPurpose', 'What does this activity do?', textarea('activityPurpose'))}
        ${field('activityInputs', 'Information needed', textarea('activityInputs'), info('Information requirements', 'Specify the information needed, why it is needed, and any quality or timing conditions. An input filename alone does not explain the requirement. These workshop notes are not a formal project or exchange information requirements document.'))}
        ${field('activityOutputs', 'Information produced', textarea('activityOutputs'), info('Information exchange', 'Describe what information another activity or team will receive, in what form, and when it is ready to use. Add an explicit handoff below to name the recipient.'))}
        ${field('activityReferences', 'Reusable reference information used (optional)', '<select id="activityReferences" multiple size="3" aria-describedby="referenceSelectionHelp"></select><small id="referenceSelectionHelp">Choose one or more saved references; use Ctrl/Cmd to select multiple.</small>')}
        ${field('activityRepeated', 'Similar or repeated work to review (optional)', textarea('activityRepeated'), info('Responsibility matrix', 'A responsibility matrix relates work or information deliverables to responsible teams. These activity records are a starting point, not a completed formal matrix. Note the other team and activity here; similar names do not prove the work should be merged.'))}
        <div class="form-actions"><button id="saveActivity" class="button primary">Save activity notes</button><button id="cancelActivity" type="button" class="button" hidden>Cancel edit</button></div>
      </form>
      <div id="activityList" class="cards"></div>
      <h3>2. Plan reusable reference information</h3>
      <p>Identify information that can be extracted or maintained once, then reused instead of repeatedly reading source IFCs.</p>
      <form id="referenceForm" class="workshop-form">
        ${field('referenceName', 'Table or reference name', input('referenceName', true, 'For example: material properties lookup'), info('Reference information', 'Existing or maintained information used to support a task. A reusable lookup table can support several activities; record its source and update rules so reuse does not mean using stale information.'))}
        ${field('referenceLocation', 'Planned storage location', input('referenceLocation', true, 'Repository path, database table, or shared file'), info('Information container', 'ISO 19650 uses information container for an identifiable collection of information retrievable from a file, system or application storage hierarchy. A managed CSV or database table could be a container; an individual value need not be one.'))}
        ${field('referenceOwner', 'Maintaining team or role', input('referenceOwner', true))}
        ${field('referenceSource', 'Source IFC information or other provenance', textarea('referenceSource'))}
        ${field('referenceContents', 'Contents, keys and units', textarea('referenceContents'))}
        ${field('referenceRefresh', 'When must it be checked or rebuilt?', textarea('referenceRefresh'))}
        <div class="form-actions"><button id="saveReference" class="button primary">Save reference plan</button><button id="cancelReference" type="button" class="button" hidden>Cancel edit</button></div>
      </form>
      <div id="referenceList" class="cards"></div>
      <h3>3. Connect activities and teams</h3>
      <p>Record explicit handoffs. Use a scoped activity to fill a name, or describe an external team, source, or recipient.</p>
      <form id="dependencyForm" class="workshop-form">
        ${field('depSourceActivity', 'Source scoped activity (optional)', activitySelect('depSourceActivity'))}
        ${field('depFrom', 'Providing activity, team or source', input('depFrom', true))}
        ${field('depTargetActivity', 'Receiving scoped activity (optional)', activitySelect('depTargetActivity'))}
        ${field('depTo', 'Receiving activity or team', input('depTo', true))}
        ${field('depType', 'What is handed over or needed?', `<select id="depType">${handoffTypes.map(([value, label]) => `<option value="${value}">${label}</option>`).join('')}</select>`)}
        ${field('depObject', 'Information or condition exchanged', input('depObject', true), info('Information exchange', 'Name the information or condition passed between the provider and recipient. Include format, readiness or acceptance conditions where useful. This records a proposed exchange, not confirmation from the receiving team.'))}
        <button class="button primary">Add handoff</button>
      </form>
      <div id="dependencyList" class="cards"></div>
      <p id="workshopFeedback" class="status" role="status"></p>
    </div><aside class="help"><h3>Plain language first</h3>
      <p>Hover over an info icon, focus it with the keyboard, or click/tap to keep its explanation open. Press Escape to close explanations.</p>
      <p>The ISO 19650 connections are paraphrased learning guidance, not quotations, formal appointments, or a claim of compliance.</p>
      <h3>Combining processes</h3><p>Compare purpose, inputs and outputs before merging repeated work. Agree which team performs the shared activity and who maintains its reference information.</p>
      <p>Scoped activities describe implementation. The general BPMN still supplies master nominations.</p>
      <h3>Handoff status</h3><p>Handoffs are declared proposals. Recipient confirmation and facilitator review are not implemented yet.</p>
      <h3>Managed sharing</h3><p>A storage path is not by itself a common data environment (CDE). A CDE also needs an agreed workflow for managing, reviewing and sharing information.</p>
    </aside></div>`;

  const $ = id => container.querySelector(`#${id}`);
  let editingActivity = null;
  let editingReference = null;
  const value = id => $(id).value.trim();
  const feedback = message => { $('workshopFeedback').textContent = message; };
  const empty = message => `<div class="empty-state">${message}</div>`;
  const line = (label, text) => `<p><strong>${label}:</strong> ${html(text || 'Not recorded')}</p>`;
  const warning = text => text ? `<p class="status warn">${html(text)}</p>` : '';
  const actions = (type, index, editable = true) => `<div class="record-actions">${editable ? `<button type="button" data-edit="${type}:${index}" aria-label="Edit ${type === 'activities' ? 'activity notes' : 'reference plan'}">Edit</button>` : ''}<button type="button" data-remove="${type}:${index}" aria-label="Remove ${type === 'activities' ? 'activity notes' : type === 'references' ? 'reference plan' : 'handoff'}">×</button></div>`;
  const options = (select, activities, placeholder) => {
    const previous = select.value;
    select.innerHTML = `<option value="">${placeholder}</option>` + activities.map(activity =>
      `<option value="${html(activity.id)}">${html(activity.name)} [${html(activity.id)}]</option>`).join('');
    if (previous && !activities.some(activity => activity.id === previous)) {
      select.insertAdjacentHTML('beforeend', `<option value="${html(previous)}">Missing activity [${html(previous)}] - relink</option>`);
    }
    select.value = previous;
  };

  function refreshActivities() {
    const activities = scopedActivities(modeler);
    for (const select of container.querySelectorAll('.scoped-activity')) {
      options(select, activities, select.id === 'activityElement' ? 'Choose a scoped activity' : 'External or unspecified activity');
    }
    return activities;
  }

  function resetActivity() {
    editingActivity = null;
    $('activityForm').reset();
    $('saveActivity').textContent = 'Save activity notes';
    $('cancelActivity').hidden = true;
  }
  function resetReference() {
    editingReference = null;
    $('referenceForm').reset();
    $('saveReference').textContent = 'Save reference plan';
    $('cancelReference').hidden = true;
  }
  function reset() {
    resetActivity();
    resetReference();
    $('dependencyForm').reset();
    for (const select of container.querySelectorAll('.scoped-activity')) select.innerHTML = '';
    feedback('');
  }

  function render() {
    const records = getRecords();
    const activities = refreshActivities();
    const selectedReferences = [...$('activityReferences').selectedOptions].map(option => option.value);
    const referenceIds = new Set(selectedReferences);
    $('activityReferences').innerHTML = records.references.map(reference =>
      `<option value="${html(reference.id)}">${html(reference.name)}</option>`).join('') +
      [...referenceIds].filter(id => !records.references.some(reference => reference.id === id)).map(id =>
        `<option value="${html(id)}">Missing reference [${html(id)}] - remove or replace</option>`).join('');
    for (const option of $('activityReferences').options) option.selected = referenceIds.has(option.value);
    $('activityList').innerHTML = records.activities.length ? records.activities.map((record, index) => {
      const activity = activities.find(item => item.id === record.scopedElementId);
      const references = (record.referenceIds || []).map(id =>
        records.references.find(reference => reference.id === id)?.name || `Missing reference [${id}]`);
      return `<article class="record"><div><strong>${html(activity?.name || record.name)}</strong><small>${html(record.teamId)} / ${html(record.scopedElementId)}</small>
        ${warning(activityLinkWarning(record.scopedElementId, activities))}
        ${line('Responsible', record.owner)}${line('Purpose', record.purpose)}${line('Needs', record.inputs)}${line('Produces', record.outputs)}
        ${line('Reusable information', references.join(', '))}${line('Repeated work to review', record.repeated)}
        </div>${actions('activities', index)}</article>`;
    }).join('') : empty('No activity notes yet. Choose an activity from the scoped diagram.');
    $('referenceList').innerHTML = records.references.length ? records.references.map((record, index) => {
      const users = records.activities.filter(activity => activity.referenceIds?.includes(record.id));
      return `<article class="record"><div><strong>${html(record.name)}</strong>
        ${line('Planned storage', record.location)}${line('Maintained by', record.owner)}${line('Source', record.source)}
        ${line('Contents, keys and units', record.contents)}${line('Check or rebuild', record.refresh)}
        ${line('Used by', users.map(activity => activities.find(item => item.id === activity.scopedElementId)?.name || activity.name).join(', '))}
        </div>${actions('references', index)}</article>`;
    }).join('') : empty('No reusable reference plans yet. Table contents are maintained outside this workspace.');
    $('dependencyList').innerHTML = records.dependencies.length ? records.dependencies.map((record, index) =>
      `<article class="record"><div><strong>${html(record.from)} → ${html(record.to)}</strong><small>${html(handoffTypes.find(([value]) => value === record.type)?.[1] || record.type)} · Declared</small>
        ${line('Exchange', record.object)}
        ${warning(activityLinkWarning(record.sourceActivityId, activities))}${warning(activityLinkWarning(record.targetActivityId, activities))}
        </div>${actions('dependencies', index, false)}</article>`
    ).join('') : empty('No handoffs declared yet.');
  }

  $('activityElement').required = true;
  $('activityForm').addEventListener('submit', event => {
    event.preventDefault();
    const activity = scopedActivities(modeler).find(item => item.id === value('activityElement'));
    if (!activity) return alert('Choose an activity that exists in the scoped diagram.');
    if (!value('activityOwner')) return alert('Record the responsible team or role.');
    const records = getRecords();
    const duplicate = records.activities.find(record => record.scopedElementId === activity.id && record.id !== editingActivity);
    if (duplicate) return alert('This activity already has notes. Edit its existing record.');
    const record = {
      id: editingActivity || crypto.randomUUID(), teamId: getTeam().id, scopedElementId: activity.id, name: activity.name,
      owner: value('activityOwner'), purpose: value('activityPurpose'), inputs: value('activityInputs'), outputs: value('activityOutputs'),
      referenceIds: [...$('activityReferences').selectedOptions].map(option => option.value), repeated: value('activityRepeated')
    };
    const index = records.activities.findIndex(item => item.id === editingActivity);
    if (index >= 0) records.activities[index] = record;
    else records.activities.push(record);
    resetActivity();
    persist();
    feedback('Activity notes saved in this browser.');
  });
  $('referenceForm').addEventListener('submit', event => {
    event.preventDefault();
    if (!value('referenceName') || !value('referenceLocation') || !value('referenceOwner')) {
      return alert('Record the reference name, planned storage location and maintaining team or role.');
    }
    const records = getRecords();
    const record = {
      id: editingReference || crypto.randomUUID(), teamId: getTeam().id,
      name: value('referenceName'), location: value('referenceLocation'), owner: value('referenceOwner'),
      source: value('referenceSource'), contents: value('referenceContents'), refresh: value('referenceRefresh')
    };
    const index = records.references.findIndex(item => item.id === editingReference);
    if (index >= 0) records.references[index] = record;
    else records.references.push(record);
    resetReference();
    persist();
    feedback('Reference plan saved. No table contents have been uploaded or stored.');
  });
  for (const [selectId, nameId] of [['depSourceActivity', 'depFrom'], ['depTargetActivity', 'depTo']]) {
    $(selectId).addEventListener('change', () => {
      const activity = scopedActivities(modeler).find(item => item.id === value(selectId));
      $(nameId).value = activity?.name || '';
    });
    $(nameId).addEventListener('input', () => { $(selectId).value = ''; });
  }
  $('dependencyForm').addEventListener('submit', event => {
    event.preventDefault();
    if (!value('depFrom') || !value('depTo') || !value('depObject')) return alert('Record a provider, recipient and information or condition exchanged.');
    const activities = scopedActivities(modeler);
    const sourceActivityId = value('depSourceActivity');
    const targetActivityId = value('depTargetActivity');
    if (activityLinkWarning(sourceActivityId, activities) || activityLinkWarning(targetActivityId, activities)) {
      return alert('A selected activity is missing. Relink it or describe the external source or recipient.');
    }
    getRecords().dependencies.push({
      from: value('depFrom'), to: value('depTo'), type: value('depType'), object: value('depObject'),
      sourceActivityId, targetActivityId, teamId: getTeam().id
    });
    event.target.reset();
    persist();
    feedback('Handoff declared. It has not been confirmed by the receiving team.');
  });
  $('cancelActivity').addEventListener('click', resetActivity);
  $('cancelReference').addEventListener('click', resetReference);
  container.addEventListener('click', event => {
    const edit = event.target.closest('[data-edit]');
    const remove = event.target.closest('[data-remove]');
    if (remove) {
      event.stopPropagation();
      const [type, index] = remove.dataset.remove.split(':');
      const record = getRecords()[type][Number(index)];
      if (type === 'references' && getRecords().activities.some(activity => activity.referenceIds?.includes(record.id))) {
        if (!confirm('This reference is used by activity notes. Remove the plan? Those notes will show a missing reference until relinked.')) return;
      }
      getRecords()[type].splice(Number(index), 1);
      if (record.id === editingActivity) resetActivity();
      if (record.id === editingReference) resetReference();
      persist();
      feedback('Workshop record removed.');
    }
    if (!edit) return;
    const [type, index] = edit.dataset.edit.split(':');
    const record = getRecords()[type][Number(index)];
    if (type === 'activities') {
      editingActivity = record.id;
      refreshActivities();
      const select = $('activityElement');
      if (![...select.options].some(option => option.value === record.scopedElementId)) {
        select.insertAdjacentHTML('beforeend', `<option value="${html(record.scopedElementId)}">Missing activity - choose a replacement</option>`);
      }
      select.value = record.scopedElementId;
      for (const [id, key] of [['activityOwner', 'owner'], ['activityPurpose', 'purpose'], ['activityInputs', 'inputs'], ['activityOutputs', 'outputs'], ['activityRepeated', 'repeated']]) $(id).value = record[key] || '';
      const referenceIds = new Set(record.referenceIds || []);
      for (const id of referenceIds) {
        if (![...$('activityReferences').options].some(option => option.value === id)) {
          $('activityReferences').insertAdjacentHTML('beforeend', `<option value="${html(id)}">Missing reference [${html(id)}] - remove or replace</option>`);
        }
      }
      for (const option of $('activityReferences').options) option.selected = referenceIds.has(option.value);
      render();
      $('saveActivity').textContent = 'Update activity notes';
      $('cancelActivity').hidden = false;
      select.focus();
    } else {
      editingReference = record.id;
      for (const [id, key] of [['referenceName', 'name'], ['referenceLocation', 'location'], ['referenceOwner', 'owner'], ['referenceSource', 'source'], ['referenceContents', 'contents'], ['referenceRefresh', 'refresh']]) $(id).value = record[key] || '';
      $('saveReference').textContent = 'Update reference plan';
      $('cancelReference').hidden = false;
      $('referenceName').focus();
    }
  });
  const dismissHelp = [];
  const positionHelp = [];
  for (const help of container.querySelectorAll('.term-help')) {
    const trigger = help.querySelector('button');
    const tip = help.querySelector('.term-tip');
    let hovered = false, focused = false, pinned = false, dismissed = false;
    const update = () => {
      const visible = !dismissed && (hovered || focused || pinned);
      help.dataset.open = String(visible);
      trigger.setAttribute('aria-expanded', String(visible));
      if (visible) {
        const left = help.getBoundingClientRect().left;
        const width = tip.getBoundingClientRect().width;
        tip.style.left = `${Math.max(16, Math.min(left, document.documentElement.clientWidth - width - 16)) - left}px`;
      }
    };
    help.addEventListener('pointerenter', () => { hovered = true; dismissed = false; update(); });
    help.addEventListener('pointerleave', () => { hovered = false; update(); });
    help.addEventListener('focusin', () => { focused = true; dismissed = false; update(); });
    help.addEventListener('focusout', () => { focused = false; update(); });
    trigger.addEventListener('click', () => {
      pinned = !pinned;
      dismissed = !pinned;
      update();
    });
    dismissHelp.push(() => { pinned = false; dismissed = true; update(); });
    positionHelp.push(update);
  }
  window.addEventListener('resize', () => positionHelp.forEach(update => update()));
  container.addEventListener('keydown', event => {
    if (event.key === 'Escape') dismissHelp.forEach(dismiss => dismiss());
  });
  return { render, reset, refreshActivities };
}
