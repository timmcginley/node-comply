import { escapeHtml as html } from './workshop-data.js';
import { SIX_CATEGORIES, suggestionDetails, captureDesignClaim, makeBlock, projectBpmn, wireError, saveWireHandoff, removeWire, removeBlock, blockWarnings } from './toolbench-data.js';
import { isCapture } from './speckle-client.js';
import { mountSpeckle } from './speckle.js';
import { mountElementFlow } from './element-flow.js';
import { isPropertyLoader, isElementFunction, isElementCapture, isElementCount, isValueDisplay, elementStatus } from './element-data.js';
import { selectionBounds, blocksInSelection, blockSummary, canvasShortcut, copyPatch, pastePatch } from './toolbench-edit.js';
import './toolbench.css';

const width = 232;
const rowHeight = 30;
const number = value => Number.isFinite(value) ? value : 30;
const functionCategory = node => isCapture(node) || isPropertyLoader(node) || isElementCapture(node) ? 'Capture' : isElementCount(node) ? 'Calculate' :
  isValueDisplay(node) ? 'Communicate' : SIX_CATEGORIES.includes(node.category) ? node.category : '';
const option = (value, title, selected) => `<option value="${html(value)}" ${selected === value ? 'selected' : ''}>${html(title)}</option>`;

export function mountToolbench({ container, getRecords, getTeam, getTeams, getOwnTeam = () => '', modelers, isSourceReady, canEdit, getUserId, prepareLeave, persist, revealSource }) {
  container.innerHTML = `<div class="tb-page">
    <div class="tb-toolbar"><div><h2>Toolbench <small>experimental</small></h2><p>Load a model's properties once, share them across IFC filters, calculate and display counts. No Python runs here.</p></div>
      <button class="button" id="tbDelete" disabled>Delete selected</button>
      <button class="button" id="tbCopy" disabled>Copy selected</button>
      <button class="button" id="tbPaste" disabled>Paste</button>
      <small id="tbClipboard" role="status" hidden></small>
      <button class="button" id="tbFit">Fit patch</button>
      <label>Zoom<select id="tbZoom"><option value="0.5">50%</option><option value="0.75">75%</option><option value="1" selected>100%</option></select></label>
    </div>
    <div id="tbSpeckle"></div>
    <div class="tb-layout">
      <aside class="tb-tray" aria-label="Function palette"><h3>Suggestions</h3>
        <label>Six-C category<select id="tbSuggestionCategory">${SIX_CATEGORIES.map(category => option(category, category, 'Capture')).join('')}</select></label>
        <button class="button" id="tbAddSuggestion">+ Suggestion</button>
        <button class="button" data-tb-add="data">+ Information input</button>
        <small>Propose a tool; assign any team in its details. Not executable.</small><h3>Functions</h3>
        <details open data-tb-category="Capture"><summary>Capture</summary><button class="tb-tray-item" id="tbAddCapture">Speckle model<small>Project / model / exact version</small></button>
          <button class="tb-tray-item" id="tbAddProperties">Load model properties<small>Read once, share with several filters</small></button>
          <button class="tb-tray-item" id="tbAddElements">IFC filter<small>Subset by exact class, e.g. IfcWindow</small></button></details>
        <details open data-tb-category="Calculate"><summary>Calculate</summary><button class="tb-tray-item" id="tbAddCount">Count elements<small>Count unique captured element IDs</small></button></details>
        <details open data-tb-category="Communicate"><summary>Communicate</summary><button class="tb-tray-item" id="tbAddDisplay">Display value<small>Read-only text box for the count output</small></button></details>
        ${['Connect', 'Check', 'Compare'].map(category => `<details data-tb-category="${category}"><summary>${category}</summary><small>No functions added yet.</small></details>`).join('')}
        <details><summary>Earlier planning blocks</summary><p>Existing patches remain editable. These are sketches, not executable functions.</p>
        <button class="button" data-tb-add="activity">+ Tool / activity</button>
        <button class="button" data-tb-add="assumption">+ Provisional input</button>
        <details open><summary>Your claims &amp; plans</summary><div id="tbPlans"></div></details>
        <small>Solid wires: proposed information.<br>Dashed grey: process order, not data.<br>Dotted blue: BPMN data associations.</small>
        </details>
      </aside>
      <div class="tb-stage" id="tbStage" aria-label="Visual tool planning canvas" tabindex="0">
        <div id="tbSizer"><div id="tbWorld"><svg id="tbWires" aria-label="Connections"></svg><div id="tbBlocks"></div></div></div>
        <div id="tbEmpty">Add a six-C suggestion to propose a tool,<br>or start with Capture: Speckle model to work with model data.</div>
      </div>
      <aside class="tb-inspector" id="tbInspector" aria-label="Selected block or connection"></aside>
    </div>
    <p id="tbFeedback" role="status">Drag on empty canvas to select blocks; Shift/Ctrl/Cmd adds to the selection. Copy, choose another subject with Canvas, then Paste to transfer the group and its internal wires. Delete/Backspace removes selected items. Text editing keeps its normal shortcuts.</p>
  </div>`;
  const $ = id => container.querySelector(`#${id}`);
  let selected = null, pending = null, gesture = null, zoom = 1;
  const selection = new Map();
  let clipboard = null, clipboardSource = null, pasteCount = 0, skipCanvasClick = false, userId = getUserId();
  const records = () => getRecords();
  const nodes = () => records().toolbenchNodes;
  const wires = () => records().toolbenchWires;
  const findNode = id => nodes().find(node => node.id === id);
  const height = node => {
    const summaryRows = blockSummary(node, records()).length;
    return 97 + Math.max(node.inputs.length, node.outputs.length) * rowHeight +
      (isValueDisplay(node) ? 90 : 0) + (summaryRows ? summaryRows * 42 + 8 : 0);
  };
  const selectionKey = item => `${item.type}:${item.id}`;
  const selectedNodes = () => [...selection.values()].filter(item => item.type === 'node').map(item => item.id);
  function choose(item, additive = false) {
    const key = selectionKey(item);
    if (!additive) selection.clear();
    if (additive && selection.has(key)) selection.delete(key);
    else selection.set(key, item);
    selected = selection.get(key) || [...selection.values()].at(-1) || null;
  }
  function focusSelection() {
    if (!selected) { $('tbStage').focus(); return; }
    const controls = container.querySelectorAll('[data-tb-select], [data-tb-wire]');
    [...controls].find(control => (selected?.type === 'node' ? control.dataset.tbSelect : control.dataset.tbWire) === selected?.id)?.focus();
  }
  const source = () => isSourceReady() ? projectBpmn(modelers.general) : { nodes: [], wires: [] };
  const feedback = text => { $('tbFeedback').textContent = text; };
  let elementFlow = null;
  const speckle = mountSpeckle({ container: $('tbSpeckle'), getUserId, canEdit, getRecords, persist, prepareLeave, feedback,
    onConnectionChange: () => { elementFlow?.reset(); render(); } });
  elementFlow = mountElementFlow({ getRecords, canEdit, readProperties: (reference, onProgress) => speckle.readProperties(reference, onProgress), persist, feedback,
    selectNode: id => { choose({ type: 'node', id }); render(); focusSelection(); } });
  const save = () => persist();
  const escapeSelection = () => { pending = null; gesture = null; $('tbPreview')?.remove(); $('tbMarquee')?.remove(); };
  function restoreMove() {
    if (gesture?.type !== 'node') return;
    for (const original of gesture.positions) {
      const node = findNode(original.id);
      if (node) Object.assign(node, { x: original.x, y: original.y });
    }
  }

  function deleteSelected() {
    if (!canEdit()) return feedback('This workspace is read-only. Resolve access or the browser recovery choice before editing.');
    if (!selection.size) return feedback('Select blocks or wires to delete.');
    const blockIds = selectedNodes();
    for (const id of blockIds) if (findNode(id)) removeBlock(id, records());
    for (const item of selection.values()) if (item.type === 'wire') removeWire(item.id, records());
    escapeSelection();
    selection.clear();
    selected = null;
    save();
    $('tbStage').focus();
    feedback('Selected items and attached wires deleted from the draft. BPMNs and archived records are unchanged. Save this canvas to commit.');
  }
  $('tbDelete').addEventListener('click', deleteSelected);
  function copySelected() {
    try {
      clipboard = copyPatch(records(), selectedNodes());
      clipboardSource = records();
      pasteCount = 0;
      render();
      focusSelection();
      feedback(`Copied ${clipboard.nodes.length} block(s) and ${clipboard.wires.length} internal wire(s). Choose another subject with Canvas, then Paste. Results are not copied.`);
    } catch (error) { feedback(error.message); }
  }
  function pasteSelected() {
    if (!canEdit()) return feedback('This canvas is read-only. You can paste only into an editable canvas.');
    try {
      const pasted = pastePatch(clipboard, records(), {
        x: $('tbStage').scrollLeft / zoom + 60 + pasteCount * 24,
        y: $('tbStage').scrollTop / zoom + 60 + pasteCount * 24,
        teamId: getTeam().id, keepSourceLinks: clipboardSource === records()
      });
      ++pasteCount;
      escapeSelection();
      selection.clear();
      for (const node of pasted.nodes) selection.set(`node:${node.id}`, { type: 'node', id: node.id });
      for (const wire of pasted.wires) selection.set(`wire:${wire.id}`, { type: 'wire', id: wire.id });
      selected = { type: 'node', id: pasted.nodes[0].id };
      save();
      focusSelection();
      feedback(`Pasted ${pasted.nodes.length} block(s) and ${pasted.wires.length} internal wire(s). Settings retained; results cleared. Save this canvas to commit.`);
    } catch (error) { feedback(error.message); }
  }
  $('tbCopy').addEventListener('click', copySelected);
  $('tbPaste').addEventListener('click', pasteSelected);

  function point(nodeId, portId, direction) {
    const node = findNode(nodeId);
    if (!node) return null;
    const ports = direction === 'out' ? node.outputs : node.inputs;
    const index = ports.findIndex(port => port.id === portId);
    return { x: number(node.x) + (direction === 'out' ? width : 0), y: number(node.y) + (index < 0 ? height(node) / 2 : 99 + index * rowHeight) };
  }
  const path = (from, to) => {
    const bend = Math.max(50, Math.abs(to.x - from.x) / 2);
    return `M ${from.x} ${from.y} C ${from.x + bend} ${from.y}, ${to.x - bend} ${to.y}, ${to.x} ${to.y}`;
  };
  function drawWires() {
    $('tbWires').innerHTML = `<defs><marker id="tbArrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8" fill="#8b99a8"/></marker></defs>` +
      wires().map(wire => {
        const from = point(wire.from, wire.fromPort, 'out');
        const to = point(wire.to, wire.toPort, 'in');
        if (!from || !to) return '';
        const name = wire.label || (wire.kind === 'sequence' ? 'Process order (not data)' : 'Information ?');
        return `<g class="tb-wire ${html(wire.kind)} ${selection.has(`wire:${wire.id}`) ? 'selected' : ''}" data-tb-wire="${html(wire.id)}" tabindex="0" role="button" aria-label="${html(name)}" aria-pressed="${selection.has(`wire:${wire.id}`)}">
          <title>${html(name)}</title><path class="tb-wire-hit" d="${path(from, to)}"/><path class="tb-wire-line" d="${path(from, to)}" ${wire.kind === 'sequence' ? 'marker-end="url(#tbArrow)"' : ''}/>
          <text x="${(from.x + to.x) / 2}" y="${(from.y + to.y) / 2 - 8}" text-anchor="middle">${html(name.length > 34 ? `${name.slice(0, 31)}...` : name)}</text></g>`;
      }).join('');
  }

  function renderInspector(projection) {
    const inspector = $('tbInspector');
    speckle.clearInspector();
    elementFlow.clearInspector();
    if (selection.size > 1) {
      inspector.innerHTML = `<h3>${selection.size} items selected</h3><p>${selectedNodes().length} blocks and ${selection.size - selectedNodes().length} wires.</p><p>Drag on empty canvas to select blocks; hold Shift/Ctrl/Cmd to add. Copy includes every wire between selected blocks, not wires to other blocks. Choose another subject with Canvas, then Paste to copy across subjects without calculated results. Delete removes selected items and wires attached to deleted blocks.</p>`;
      return;
    }
    if (!selected) {
      inspector.innerHTML = '<h3>Plan a suggestion or add a function</h3><p>Choose a six-C category and add a suggestion. Give it a name, describe the information it needs/produces, and assign a responsible team in its details. Suggestions are plans, not implemented tools.</p><p>For model counts, pin a Speckle model version, wire it to Load model properties, then fan out to IFC filters (for example IfcWindow and IfcSlab). Read properties once in the loader, apply each filter, then wire each result to Calculate: Count elements and Communicate: Display value. Existing combined IFC Capture blocks remain usable.</p><p>Earlier planning blocks remain sketches. These named functions do not execute student Python or publish results to Speckle.</p>';
      return;
    }
    if (selected.type === 'wire') {
      const wire = wires().find(item => item.id === selected.id);
      if (!wire) { selected = null; return renderInspector(projection); }
      const missing = wireError(wire, records());
      const origin = projection.wires.find(item => item.sourceId === wire.sourceId);
      const changed = origin && (origin.from !== wire.from || origin.to !== wire.to);
      inspector.innerHTML = `<h3>${wire.kind === 'sequence' ? 'Process-order guide' : 'Information connection'}</h3>
        <p>${html(findNode(wire.from)?.title || 'Missing block')} → ${html(findNode(wire.to)?.title || 'Missing block')}</p>
        ${missing ? `<p class="tb-warning">${html(missing)}</p>` : ''}
        ${wire.sourceId && isSourceReady() && !origin ? '<p class="tb-warning">BPMN connection missing. This canvas link is retained for review.</p>' : ''}
        ${changed ? '<p class="tb-warning">BPMN endpoints changed. Review this canvas handoff.</p>' : ''}
        ${wire.kind === 'data' ? `<form id="tbWireForm"><label>What information passes here?<input name="label" required value="${html(wire.label)}"></label><label>Format, units, model revision or acceptance note<textarea name="note">${html(wire.note || '')}</textarea></label><button class="button primary">Save handoff</button></form>
          <p>Declared proposal only. This handoff is saved with the workspace and included in its export.</p>
          ${!records().dependencies.some(item => item.toolbenchWireId === wire.id) ? '<p class="tb-warning">Linked handoff missing; save to recreate it deliberately.</p>' : ''}` :
          `<p>${wire.kind === 'sequence' ? 'Order does not mean information transfer. Gateways and human tasks retain their BPMN meaning; no execution is inferred.' : 'An explicit BPMN association is a candidate information handoff, not an agreed contract.'}</p>
          ${wire.kind === 'association' ? '<button class="button" data-tb-confirm>Use as proposed handoff</button>' : ''}`}
        <button class="button" data-tb-remove-wire>Remove canvas link${wire.kind === 'data' ? ' and its handoff' : ''}</button>`;
      return;
    }
    const node = findNode(selected.id);
    if (!node) { selected = null; return renderInspector(projection); }
    if (isCapture(node)) return speckle.renderCapture(inspector, node);
    if (isElementFunction(node)) return elementFlow.renderInspector(inspector, node);
    const sourceIds = isSourceReady() ? new Set(projection.nodes.map(item => item.sourceId)) : null;
    const warnings = blockWarnings(node.id, records(), sourceIds);
    if (node.sourceId && !isSourceReady()) warnings.unshift('BPMN source unavailable');
    const sourceNode = projection.nodes.find(item => item.sourceId === node.sourceId);
    const mappings = node.sourceId ? records().mappings.filter(item => item.generalId === node.sourceId) : [];
    const linked = node.kind === 'request' ? records().requests.find(item => item.id === node.recordId)
      : node.kind === 'provider' ? records().offers.find(item => item.id === node.recordId)
        : node.kind === 'assumption' ? records().assumptions.find(item => item.id === node.recordId)
          : node.kind === 'claim' ? records().claims.find(item => item.id === node.recordId) : null;
    const linkedFields = {
      request: [['Outputs needed', 'outputs'], ['Available inputs', 'inputs'], ['Acceptance example', 'acceptance']],
      provider: [['Version', 'version'], ['Tool reference', 'reference'], ['Declared contract', 'contract']],
      assumption: [['Value / dataset', 'value'], ['Source', 'source'], ['Limitations', 'limitations'], ['Accepted by', 'acceptedBy'], ['Replacement needed', 'replacement']],
      claim: [['Claim', 'statement'], ['Scope', 'scope'], ['Acceptance example', 'acceptance']]
    }[node.kind] || [];
    inspector.innerHTML = `<h3>${html(node.kind === 'activity' ? 'Tool / activity' : node.kind)}</h3>
      ${warnings.map(text => `<p class="tb-warning">${html(text)}</p>`).join('')}
      ${node.sourceId && !isSourceReady() ? '<p class="tb-warning">BPMN source is unavailable or still loading; deletion cannot be assessed.</p>' : ''}
      <form id="tbNodeForm"><label>Name<input name="title" required value="${html(node.title)}"></label>
        ${node.kind === 'suggestion' ? `<p>A suggestion is a proposal, not an implemented or verified function.</p><label>Six-C category<select name="category">${SIX_CATEGORIES.map(category => option(category, category, node.category)).join('')}</select></label>` : ''}
        ${node.kind === 'data' ? `<p>Planning information input only. This does not load data or configure executable Capture functions.</p>
          <label>Value / description<textarea name="informationValue">${html(node.informationValue ?? '')}</textarea></label>
          <label>Units (optional)<input name="informationUnits" value="${html(node.informationUnits || '')}"></label>
          <label>Source / reference (optional)<input name="informationReference" value="${html(node.informationReference || '')}"></label>` : ''}
        <label>Responsible team<select name="owner">${option('', 'Not assigned', node.owner)}${getTeams().map(team => option(team.id, team.id, node.owner)).join('')}</select></label>
        ${node.kind === 'suggestion' ? `<button type="button" class="button" data-tb-assign-self ${!getOwnTeam() ? 'disabled' : ''}>Assign my team${getOwnTeam() ? ` (${html(getOwnTeam())})` : ' (join a team first)'}</button>` : ''}
        <label>Claim this helps investigate<select name="claimId">${option('', 'Sketch without a claim link', node.claimId)}${records().claims.map(claim => option(claim.id, claim.title, node.claimId)).join('')}${node.claimId && !records().claims.some(claim => claim.id === node.claimId) ? option(node.claimId, 'Missing claim — relink', node.claimId) : ''}</select></label>
        ${['inputs', 'outputs'].map(direction => `<h4>${direction === 'inputs' ? 'Needs' : 'Produces'}</h4>${node[direction].map(port => `<div class="tb-port-editor"><label>Socket name<input name="port:${html(port.id)}" value="${html(port.label)}" placeholder="Unnamed — define when needed"></label><button type="button" class="button" data-tb-remove-port="${html(port.id)}" data-direction="${direction}" aria-label="Remove socket">×</button></div>`).join('')}`).join('')}
        <label>Notes (optional)<textarea name="note">${html(node.note || '')}</textarea></label><button class="button primary">Save block</button></form>
      ${!['event', 'gateway'].includes(node.kind) ? '<div class="tb-small-actions"><button class="button" data-tb-port="inputs">+ Input</button><button class="button" data-tb-port="outputs">+ Output</button></div>' : ''}
      ${node.inputs.filter(port => !wires().some(wire => wire.kind !== 'sequence' && wire.to === node.id && wire.toPort === port.id)).map(port => `<button class="button tb-request" data-tb-request="${html(port.id)}">Request ${html(port.label || 'this input')}</button>`).join('')}
      ${node.sourceId ? `<details><summary>BPMN source &amp; scoped implementation</summary><p>${html(node.sourceId)} · ${html(node.sourceType)}</p>
        ${sourceNode && sourceNode.title !== node.title ? `<p>Current BPMN name: ${html(sourceNode.title)}. Your canvas name is retained.</p>` : ''}
        <button class="button" data-tb-source="${html(node.sourceId)}" ${!sourceNode ? 'disabled' : ''}>Select in Team diagrams</button>
        ${mappings.map(mapping => `<p>${html(mapping.relationship)}: ${html(modelers.scoped.get('elementRegistry').get(mapping.scopedId)?.businessObject?.name || mapping.scopedName || mapping.scopedId)}${!modelers.scoped.get('elementRegistry').get(mapping.scopedId) ? ' (scoped source missing or unavailable)' : ''}</p>`).join('') || '<p>No scoped mapping yet.</p>'}</details>` : ''}
      ${linked ? `<details><summary>Linked planning record</summary>${linkedFields.map(([label, key]) => `<p><strong>${label}:</strong> ${html(linked[key] || 'Not recorded')}</p>`).join('')}</details>` : ''}
      ${node.kind === 'request' && linked ? `<label>Proposed provider<select id="tbProvider">${option('', 'No provider selected', linked.selectedOfferId)}${records().offers.filter(offer => offer.requestId === linked.id).map(offer => option(offer.id, `${offer.providerTeamId}: ${offer.title} @ ${offer.version}`, linked.selectedOfferId)).join('')}${linked.selectedOfferId && !records().offers.some(offer => offer.id === linked.selectedOfferId && offer.requestId === linked.id) ? option(linked.selectedOfferId, 'Missing provider — relink', linked.selectedOfferId) : ''}</select></label><p>Provider selection does not test or accept the tool.</p>` : ''}
      ${node.kind === 'assumption' ? `<p class="tb-warning">${linked ? 'Previously recorded assumption provenance is retained. It never becomes verified input.' : 'Unapproved sketch only. Use notes for provisional values and provenance; this canvas does not approve assumptions.'}</p>` : ''}
      ${node.kind === 'request' && linked?.draft ? '<p class="tb-warning">Draft capability request only. Notes can describe the contract discussion; the canvas does not record formal acceptance.</p>' : ''}
      ${node.kind === 'claim' && !linked ? '<p class="tb-warning">Claim record missing.</p>' : ''}
      <button class="button tb-delete" data-tb-remove-node>Remove block &amp; its patch wires</button>`;
  }

  function render() {
    for (const [key, item] of selection) {
      if (item.type === 'node' ? !findNode(item.id) : !wires().some(wire => wire.id === item.id)) selection.delete(key);
    }
    if (selected && !selection.has(selectionKey(selected))) selected = [...selection.values()].at(-1) || null;
    if (!canEdit()) {
      restoreMove();
      escapeSelection();
    }
    const projection = source();
    $('tbPlans').innerHTML = [['claims', 'claim'], ['requests', 'request'], ['offers', 'provider'], ['assumptions', 'assumption']].map(([collection, kind]) =>
      records()[collection].map(item => `<button class="tb-tray-item" data-tb-linked="${kind}" data-record="${html(item.id)}">${html(item.title || item.value || item.statement)} <small>${kind}</small></button>`).join('')
    ).join('') || '<p>No claim plans yet. You can still sketch with tool and information blocks.</p>';
    const sourceIds = isSourceReady() ? new Set(projection.nodes.map(node => node.sourceId)) : null;
    $('tbBlocks').innerHTML = nodes().map(node => {
      const category = functionCategory(node);
      const warnings = blockWarnings(node.id, records(), sourceIds);
      const execution = isElementFunction(node) ? elementStatus(node, records()) : null;
      if (execution && !execution.current && !warnings.includes(execution.text)) warnings.unshift(execution.text);
      const status = isCapture(node) ? (node.capture ? `Pinned version ${node.capture.versionId}` : 'Set project URL in details') :
        execution?.text || (node.kind === 'suggestion' ? 'Suggestion - not implemented' : warnings[0]) || (node.kind === 'provider' ? 'Proposed — unverified' : node.kind === 'claim' ? (records().evidence.some(item => item.claimId === node.recordId) ? 'Evidence recorded (manual)' : 'Claim to investigate') : ['event', 'gateway'].includes(node.kind) ? 'BPMN context — not executable' : 'Planned — not verified');
      const ports = Array.from({ length: Math.max(node.inputs.length, node.outputs.length) }, (_, index) =>
        `<div class="tb-port-row">${['in', 'out'].map(direction => {
          const port = (direction === 'in' ? node.inputs : node.outputs)[index];
          return port ? `<button class="tb-socket ${direction} ${pending?.nodeId === node.id && pending.portId === port.id ? 'pending' : ''}" data-tb-node="${html(node.id)}" data-tb-port-id="${html(port.id)}" data-tb-direction="${direction}" aria-label="${direction === 'in' ? 'Input' : 'Output'}: ${html(port.label || 'unnamed')} on ${html(node.title)}" title="${html(port.label || 'Unnamed socket')}"><i></i><span>${html(port.label || (direction === 'in' ? 'Input ?' : 'Output ?'))}</span></button>` : '<span></span>';
        }).join('')}</div>`
      ).join('');
      const display = isValueDisplay(node) ? `<div class="tb-display-box"><label>${html(node.displayLabel || 'Count')}
        <textarea class="tb-display-value ${execution.current ? '' : 'pending'}" readonly aria-live="polite">${html(execution.current ? String(execution.value) : execution.text)}</textarea></label></div>` : '';
      const summary = blockSummary(node, records());
      const values = summary.length ? `<div class="tb-block-summary">${summary.map(([label, value]) => `<div class="tb-summary-row"><small>${html(label)}</small><span title="${html(value)}">${html(value)}</span></div>`).join('')}</div>` : '';
      return `<article class="tb-block ${html(node.kind)} ${selection.has(`node:${node.id}`) ? 'selected' : ''}" data-block="${html(node.id)}" data-tb-category="${category}" style="left:${number(node.x)}px;top:${number(node.y)}px;width:${width}px">
        <button class="tb-block-head" data-tb-select="${html(node.id)}" aria-pressed="${selection.has(`node:${node.id}`)}" title="${html(node.title)} — drag to move; arrow keys also move selected blocks"><small>${html(node.owner || (node.kind === 'suggestion' ? 'Unassigned' : getTeam()?.id || ''))} · ${category ? `<span class="tb-category">${category}</span>` : html(['bpmn:UserTask', 'bpmn:ManualTask'].includes(node.sourceType) ? 'human activity' : node.kind === 'data' ? 'information' : node.kind)}</small><strong>${html(node.title)}</strong></button>
        <div class="tb-badge ${warnings.length ? 'warning' : ''}" title="${html(warnings.join('; '))}">${html(status)}${warnings.length > 1 ? ` +${warnings.length - 1}` : ''}</div>${ports}${values}${display}</article>`;
    }).join('');
    const worldWidth = Math.max(1200, ...nodes().map(node => number(node.x) + width + 100));
    const worldHeight = Math.max(750, ...nodes().map(node => number(node.y) + height(node) + 100));
    $('tbWorld').style.cssText = `width:${worldWidth}px;height:${worldHeight}px;transform:scale(${zoom});`;
    $('tbSizer').style.cssText = `width:${worldWidth * zoom}px;height:${worldHeight * zoom}px;`;
    $('tbWires').setAttribute('width', worldWidth);
    $('tbWires').setAttribute('height', worldHeight);
    $('tbEmpty').hidden = nodes().length > 0;
    drawWires();
    renderInspector(projection);
    $('tbClipboard').hidden = !clipboard;
    $('tbClipboard').textContent = clipboard ? `${clipboard.nodes.length} block(s) copied in this tab. Choose a subject with Canvas, then Paste.` : '';
    for (const control of container.querySelectorAll('button, input, textarea, select')) {
      if (control.closest('#tbSpeckle') || control.closest('#tbInspector') && (isCapture(findNode(selected?.id)) || isElementFunction(findNode(selected?.id)))) continue;
      if (control.matches('#tbFit, #tbZoom, [data-tb-select], [data-tb-wire], [data-tb-source], .tb-display-value')) continue;
      if (control.id === 'tbCopy') { control.disabled = !selectedNodes().length; continue; }
      control.disabled = !canEdit() || (control.id === 'tbDelete' && !selected);
      if (control.id === 'tbPaste' && !clipboard) control.disabled = true;
      if (control.hasAttribute('data-tb-assign-self') && !getOwnTeam()) control.disabled = true;
    }
  }

  function position() {
    return { x: $('tbStage').scrollLeft / zoom + 50 + nodes().length % 4 * 25, y: $('tbStage').scrollTop / zoom + 60 + nodes().length % 4 * 35 };
  }
  function addBlock(kind, title, extra = {}) {
    const pos = position();
    const node = { ...makeBlock(crypto.randomUUID(), kind, title, pos.x, pos.y), ...(kind === 'data' ? { inputs: [] } : {}), ...extra };
    nodes().push(node);
    choose({ type: 'node', id: node.id });
    save();
    return node;
  }
  function addLinked(kind, id) {
    const collection = { claim: 'claims', request: 'requests', provider: 'offers', assumption: 'assumptions' }[kind];
    const item = records()[collection].find(record => record.id === id);
    if (!item) return feedback('This planning record is missing. Refresh the selection.');
    const existing = nodes().find(node => node.kind === kind && node.recordId === id);
    if (existing) {
      choose({ type: 'node', id: existing.id });
      render();
      $('tbStage').scrollTo({ left: Math.max(0, existing.x * zoom - 50), top: Math.max(0, existing.y * zoom - 50) });
      return existing;
    }
    return addBlock(kind, item.title || item.value || item.statement, { recordId: id, claimId: item.claimId || (kind === 'claim' ? id : ''), owner: item.providerTeamId || '' });
  }
  function connect(toNodeId, toPortId) {
    if (!pending) return feedback('Choose an output socket first, then an input.');
    const wire = { id: crypto.randomUUID(), kind: 'data', from: pending.nodeId, fromPort: pending.portId, to: toNodeId, toPort: toPortId, label: '', handoffId: crypto.randomUUID() };
    const error = wireError(wire, records());
    if (error) return feedback(error);
    const from = findNode(wire.from).outputs.find(port => port.id === wire.fromPort);
    const to = findNode(wire.to).inputs.find(port => port.id === wire.toPort);
    wire.label = from.label || to.label || '';
    wires().push(wire);
    saveWireHandoff(wire, records(), getTeam().id);
    choose({ type: 'wire', id: wire.id });
    escapeSelection();
    save();
    feedback(isElementFunction(findNode(wire.to)) ? 'Function input connected. Select the downstream block to read/capture or calculate; wiring alone does not run it.' :
      'Proposed handoff added. Name the information; compatibility is not verified.');
  }

  $('tbAddSuggestion').addEventListener('click', () => {
    if (!canEdit()) return;
    addBlock('suggestion', 'New suggestion', {
      category: $('tbSuggestionCategory').value, createdBy: getUserId(), createdAt: new Date().toISOString()
    });
    feedback('Suggestion added. Name it, describe its inputs/outputs and assign a responsible team in details. This does not implement a function.');
  });
  $('tbAddCapture').addEventListener('click', () => {
    if (!canEdit()) return;
    addBlock('capture', 'Capture: Speckle model', {
      category: 'Capture', functionId: 'speckle.capture-model', functionVersion: 1,
      inputs: [], outputs: [{ id: crypto.randomUUID(), label: 'Model version (not selected)' }]
    });
    feedback('Capture block added. Connect Speckle and choose its project, model and exact version.');
  });
  $('tbAddProperties').addEventListener('click', () => {
    if (!canEdit()) return;
    addBlock('capture', 'Capture: Load model properties', {
      category: 'Capture', functionId: 'speckle.read-properties', functionVersion: 1,
      inputs: [{ id: crypto.randomUUID(), label: 'Pinned model version' }],
      outputs: [{ id: crypto.randomUUID(), label: 'Model properties' }]
    });
    feedback('Property loader added. Wire a Speckle model here, read once, then connect its output to several IFC filters.');
  });
  $('tbAddElements').addEventListener('click', () => {
    if (!canEdit()) return;
    addBlock('capture', 'Capture: IFC filter', {
      category: 'Capture', functionId: 'ifc.filter-elements', functionVersion: 1, ifcClass: 'IfcWindow', classificationPath: '',
      inputs: [{ id: crypto.randomUUID(), label: 'Model properties' }],
      outputs: [{ id: crypto.randomUUID(), label: 'Unique element IDs' }]
    });
    feedback('IFC filter added. Wire Load model properties here, choose its instance-class path and apply an exact IFC class. No new download is needed.');
  });
  $('tbAddCount').addEventListener('click', () => {
    if (!canEdit()) return;
    addBlock('calculate', 'Calculate: Count elements', {
      category: 'Calculate', functionId: 'elements.count', functionVersion: 1,
      inputs: [{ id: crypto.randomUUID(), label: 'Unique element IDs' }],
      outputs: [{ id: crypto.randomUUID(), label: 'Count' }]
    });
    feedback('Count added. Wire the IFC elements output here, then choose Calculate count.');
  });
  $('tbAddDisplay').addEventListener('click', () => {
    if (!canEdit()) return;
    addBlock('communicate', 'Communicate: Display value', {
      category: 'Communicate', functionId: 'communicate.display-value', functionVersion: 1, displayLabel: 'Count',
      inputs: [{ id: crypto.randomUUID(), label: 'Count' }], outputs: []
    });
    feedback('Display added. Wire Count to its input. The read-only text box follows the current calculation; it does not run it.');
  });
  $('tbZoom').addEventListener('change', event => { zoom = Number(event.target.value); render(); });
  $('tbFit').addEventListener('click', () => {
    const patchWidth = Math.max(600, ...nodes().map(node => number(node.x) + width + 60));
    const patchHeight = Math.max(400, ...nodes().map(node => number(node.y) + height(node) + 60));
    zoom = Math.min(1, $('tbStage').clientWidth / patchWidth, $('tbStage').clientHeight / patchHeight);
    const select = $('tbZoom');
    select.querySelector('[data-fit]')?.remove();
    const fit = new Option(`Fit (${Math.round(zoom * 100)}%)`, String(zoom));
    fit.dataset.fit = 'true';
    select.add(fit);
    select.value = String(zoom);
    render();
    $('tbStage').scrollTo(0, 0);
  });
  container.addEventListener('submit', event => {
    event.preventDefault();
    if (!canEdit()) return;
    if (event.target.id === 'tbWireForm') {
      const wire = wires().find(item => item.id === selected?.id);
      const label = event.target.elements.label.value.trim();
      if (!label) return feedback('Name the information being handed over.');
      const updated = { ...wire, label, note: event.target.elements.note.value.trim() };
      const error = wireError(updated, records());
      if (error) return feedback(error);
      Object.assign(wire, updated);
      saveWireHandoff(wire, records(), getTeam().id);
      const handoff = records().dependencies.find(item => item.toolbenchWireId === wire.id);
      handoff.note = wire.note;
    } else if (event.target.id === 'tbNodeForm') {
      const node = findNode(selected?.id);
      const form = event.target;
      const title = form.elements.title.value.trim();
      if (!title) return feedback('Give this block a name.');
      if (node.kind === 'suggestion') {
        try {
          Object.assign(node, suggestionDetails(title, form.elements.category.value, form.elements.owner.value, getTeams().map(team => team.id)));
        } catch (error) { return feedback(error.message); }
      }
      node.title = title;
      node.owner = form.elements.owner.value;
      node.claimId = form.elements.claimId.value;
      node.note = form.elements.note.value.trim();
      if (node.kind === 'data') {
        node.informationValue = form.elements.informationValue.value.trim();
        node.informationUnits = form.elements.informationUnits.value.trim();
        node.informationReference = form.elements.informationReference.value.trim();
      }
      for (const port of [...node.inputs, ...node.outputs]) port.label = form.elements.namedItem(`port:${port.id}`).value.trim();
      for (const wire of wires().filter(item => item.kind === 'data' && (item.from === node.id || item.to === node.id))) saveWireHandoff(wire, records(), getTeam().id);
    } else return;
    save();
    feedback('Canvas plan changed. Browser recovery is updated; save this canvas to commit it. Nothing has been executed or accepted.');
  });
  container.addEventListener('change', event => {
    if (!canEdit()) return;
    if (event.target.id !== 'tbProvider') return;
    const node = findNode(selected?.id);
    const request = records().requests.find(item => item.id === node?.recordId);
    if (!request) return feedback('The request is missing.');
    request.selectedOfferId = event.target.value;
    save();
    feedback('Proposed provider selected, not tested or accepted.');
  });
  container.addEventListener('click', event => {
    if (skipCanvasClick) {
      skipCanvasClick = false;
      if (event.target.closest('#tbStage')) return;
    }
    const button = event.target.closest('button,[data-tb-wire]');
    if (!button) {
      if (event.target.closest('#tbStage') && !event.target.closest('.tb-block')) {
        escapeSelection();
        selection.clear();
        selected = null;
        render();
        $('tbStage').focus();
      }
      return;
    }
    if (button.dataset.tbSource) return revealSource(button.dataset.tbSource);
    if (button.dataset.tbSelect || button.dataset.tbWire) {
      choose({ type: button.dataset.tbSelect ? 'node' : 'wire', id: button.dataset.tbSelect || button.dataset.tbWire }, event.shiftKey || event.ctrlKey || event.metaKey);
      render();
      focusSelection();
      return;
    }
    if (!canEdit()) return;
    if (button.dataset.tbAdd) return addBlock(button.dataset.tbAdd, { activity: 'New tool', data: 'Information', assumption: 'Provisional input — unapproved' }[button.dataset.tbAdd]);
    if (button.dataset.tbLinked) return addLinked(button.dataset.tbLinked, button.dataset.record);
    if (button.dataset.tbPortId) {
      if (button.dataset.tbDirection === 'out') {
        pending = { nodeId: button.dataset.tbNode, portId: button.dataset.tbPortId };
        feedback('Now choose an input socket. Escape cancels.');
      } else connect(button.dataset.tbNode, button.dataset.tbPortId);
      return;
    }
    const node = findNode(selected?.id);
    const wire = wires().find(item => item.id === selected?.id);
    if (button.hasAttribute('data-tb-confirm') && wire) {
      wire.kind = 'data';
      wire.confirmedFromBpmn = true;
      wire.handoffId = crypto.randomUUID();
      saveWireHandoff(wire, records(), getTeam().id);
      save();
      return;
    }
    if (button.hasAttribute('data-tb-remove-wire') && wire) {
      deleteSelected();
      return;
    }
    if (!node) return;
    if (button.hasAttribute('data-tb-assign-self')) {
      const owner = getOwnTeam();
      if (!owner) return feedback('Join a team before assigning your team.');
      const form = $('tbNodeForm');
      form.elements.owner.value = owner;
      form.requestSubmit();
      return;
    }
    if (button.dataset.tbPort) {
      node[button.dataset.tbPort].push({ id: crypto.randomUUID(), label: '' });
      save();
    }
    if (button.dataset.tbRemovePort) {
      const id = button.dataset.tbRemovePort;
      if (wires().some(item => item.fromPort === id || item.toPort === id)) return feedback('Remove this socket’s wires before removing the socket.');
      node[button.dataset.direction] = node[button.dataset.direction].filter(port => port.id !== id);
      save();
    }
    if (button.dataset.tbRequest) {
      const port = node.inputs.find(item => item.id === button.dataset.tbRequest);
      if (!port?.label.trim()) return feedback('Name and save this input socket first.');
      if (!records().claims.some(item => item.id === node.claimId)) return feedback('Choose and save the consumer claim in this block’s details first. Bring a claim into Toolbench from Design.');
      const request = {
        id: crypto.randomUUID(), teamId: getTeam().id, claimId: node.claimId,
        title: port.label, purpose: `Needed by ${node.title}`, inputs: '', outputs: port.label,
        acceptance: '', allowAssumption: false, draft: true, toolbenchNodeId: node.id, toolbenchPortId: port.id
      };
      records().requests.push(request);
      const requestNode = addLinked('request', request.id);
      requestNode.x = Math.max(20, node.x - 300);
      requestNode.y = node.y + height(node) + 35;
      pending = { nodeId: requestNode.id, portId: requestNode.outputs[0].id };
      connect(node.id, port.id);
      feedback('Open draft request added, not supplied information. Use block notes to discuss what is needed; no contract acceptance is implied.');
    }
    if (button.hasAttribute('data-tb-remove-node')) {
      deleteSelected();
    }
  });

  const coordinates = event => {
    const rect = $('tbWorld').getBoundingClientRect();
    return { x: (event.clientX - rect.left) / zoom, y: (event.clientY - rect.top) / zoom };
  };
  $('tbStage').addEventListener('pointerdown', event => {
    skipCanvasClick = false;
    if (event.button !== 0) return;
    const output = event.target.closest('[data-tb-direction="out"]');
    const heading = event.target.closest('[data-tb-select]');
    if (!event.target.closest('.tb-block, [data-tb-wire]')) {
      if (event.pointerType === 'touch') return;
      const stage = $('tbStage'), rect = stage.getBoundingClientRect();
      if (event.clientX >= rect.left + stage.clientWidth || event.clientY >= rect.top + stage.clientHeight) return;
      escapeSelection();
      gesture = { type: 'selection', start: coordinates(event), moved: false,
        additive: event.shiftKey || event.ctrlKey || event.metaKey, pointerId: event.pointerId };
      stage.focus({ preventScroll: true });
      stage.setPointerCapture(event.pointerId);
      event.preventDefault();
      return;
    }
    if (!canEdit()) return;
    if (output) {
      pending = { nodeId: output.dataset.tbNode, portId: output.dataset.tbPortId };
      gesture = { type: 'wire', pointerId: event.pointerId };
    } else if (heading) {
      if (event.shiftKey || event.ctrlKey || event.metaKey) return;
      const node = findNode(heading.dataset.tbSelect);
      const moving = selection.has(`node:${node.id}`) ? nodes().filter(item => selection.has(`node:${item.id}`)) : [node];
      gesture = { type: 'node', id: node.id, positions: moving.map(item => ({ id: item.id, x: number(item.x), y: number(item.y) })),
        start: coordinates(event), moved: false, pointerId: event.pointerId };
    } else return;
    $('tbStage').setPointerCapture(event.pointerId);
  });
  $('tbStage').addEventListener('pointermove', event => {
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    const pos = coordinates(event);
    if (gesture.type === 'selection') {
      const bounds = selectionBounds(gesture.start, pos);
      if ((bounds.width + bounds.height) * zoom < 3 && !gesture.moved) return;
      gesture.moved = true;
      if (!$('tbMarquee')) $('tbWorld').insertAdjacentHTML('beforeend', '<div id="tbMarquee" aria-hidden="true"></div>');
      $('tbMarquee').style.cssText = `left:${bounds.x}px;top:${bounds.y}px;width:${bounds.width}px;height:${bounds.height}px;`;
      return;
    }
    if (!canEdit()) return;
    if (gesture.type === 'node') {
      const dx = pos.x - gesture.start.x, dy = pos.y - gesture.start.y;
      if (Math.abs(dx) + Math.abs(dy) < 3 && !gesture.moved) return;
      if (!selection.has(`node:${gesture.id}`)) choose({ type: 'node', id: gesture.id });
      gesture.moved = true;
      const moveX = Math.max(dx, 16 - Math.min(...gesture.positions.map(item => item.x)));
      const moveY = Math.max(dy, 16 - Math.min(...gesture.positions.map(item => item.y)));
      for (const original of gesture.positions) {
        const node = findNode(original.id);
        node.x = original.x + moveX;
        node.y = original.y + moveY;
        const block = [...$('tbBlocks').children].find(item => item.dataset.block === node.id);
        block.style.left = `${node.x}px`;
        block.style.top = `${node.y}px`;
      }
      for (const block of $('tbBlocks').children) block.classList.toggle('selected', selection.has(`node:${block.dataset.block}`));
      drawWires();
    } else if (pending) {
      const from = point(pending.nodeId, pending.portId, 'out');
      if (!from) return;
      $('tbPreview')?.remove();
      $('tbWires').insertAdjacentHTML('beforeend', `<path id="tbPreview" d="${path(from, pos)}"/>`);
    }
  });
  $('tbStage').addEventListener('pointerup', event => {
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    $('tbStage').releasePointerCapture(event.pointerId);
    skipCanvasClick = true;
    setTimeout(() => { skipCanvasClick = false; }, 0);
    if (gesture.type === 'selection') {
      if (gesture.moved) {
        const bounds = selectionBounds(gesture.start, coordinates(event));
        const blocks = [...$('tbBlocks').children].map(block => {
          const rect = block.getBoundingClientRect();
          return { id: block.dataset.block, ...coordinates({ clientX: rect.left, clientY: rect.top }),
            width: rect.width / zoom, height: rect.height / zoom };
        });
        if (!gesture.additive) selection.clear();
        for (const id of blocksInSelection(bounds, blocks)) selection.set(`node:${id}`, { type: 'node', id });
        selected = [...selection.values()].at(-1) || null;
      } else {
        if (!gesture.additive) { selection.clear(); selected = null; }
      }
      escapeSelection();
      render();
      focusSelection();
      feedback(`${selectedNodes().length} block(s) selected. Copy, choose another subject with Canvas, then Paste to copy across subjects.`);
      return;
    }
    if (!canEdit()) { restoreMove(); escapeSelection(); render(); return; }
    if (gesture.type === 'wire') {
      const input = document.elementFromPoint(event.clientX, event.clientY)?.closest('[data-tb-direction="in"]');
      if (input) connect(input.dataset.tbNode, input.dataset.tbPortId);
      else feedback('Choose an input socket to finish this wire. Escape cancels.');
      $('tbPreview')?.remove();
    } else {
      if (gesture.moved) {
        selected = selection.get(`node:${gesture.id}`);
        save();
        focusSelection();
      } else {
        choose({ type: 'node', id: gesture.id });
        render();
        focusSelection();
      }
    }
    gesture = null;
  });
  $('tbStage').addEventListener('pointercancel', () => {
    if (gesture?.type === 'selection') skipCanvasClick = true;
    restoreMove();
    escapeSelection();
    render();
  });
  container.addEventListener('keydown', event => {
    if (event.isComposing || event.altKey || event.target.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="textbox"]')) return;
    if (event.key === 'Escape') {
      if (gesture?.type === 'selection') skipCanvasClick = true;
      restoreMove();
      escapeSelection(); render(); focusSelection(); feedback('Connection, move or selection cancelled.'); return;
    }
    const shortcut = canvasShortcut(event);
    if (shortcut) {
      event.preventDefault();
      if (shortcut === 'copy') copySelected();
      else if (shortcut === 'paste') pasteSelected();
      else if (shortcut === 'delete') deleteSelected();
      else {
        selection.clear();
        for (const node of nodes()) selection.set(`node:${node.id}`, { type: 'node', id: node.id });
        for (const wire of wires()) selection.set(`wire:${wire.id}`, { type: 'wire', id: wire.id });
        selected = [...selection.values()][0] || null;
        render();
        focusSelection();
      }
      return;
    }
    const heading = event.target.closest('[data-tb-select]');
    const wire = event.target.closest('[data-tb-wire]');
    if (wire && ['Enter', ' '].includes(event.key)) {
      event.preventDefault();
      choose({ type: 'wire', id: wire.dataset.tbWire }, event.shiftKey || event.ctrlKey || event.metaKey);
      render();
      focusSelection();
      return;
    }
    if (!canEdit()) return;
    if (!heading || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
    event.preventDefault();
    const id = heading.dataset.tbSelect, step = event.shiftKey ? 60 : 20;
    if (!selection.has(`node:${id}`)) choose({ type: 'node', id });
    const moving = nodes().filter(node => selection.has(`node:${node.id}`));
    const dx = Math.max(event.key === 'ArrowRight' ? step : event.key === 'ArrowLeft' ? -step : 0, 16 - Math.min(...moving.map(node => number(node.x))));
    const dy = Math.max(event.key === 'ArrowDown' ? step : event.key === 'ArrowUp' ? -step : 0, 16 - Math.min(...moving.map(node => number(node.y))));
    for (const node of moving) { node.x = number(node.x) + dx; node.y = number(node.y) + dy; }
    save();
    focusSelection();
  });
  return {
    render,
    initSpeckle: () => speckle.init(),
    setUser: id => {
      if (id !== userId) { clipboard = null; clipboardSource = null; pasteCount = 0; }
      userId = id;
      speckle.setUser(id);
    },
    startClaim({ text, sourceUrl }) {
      if (!canEdit()) return;
      escapeSelection();
      const claim = captureDesignClaim(records(), {
        id: crypto.randomUUID(), teamId: getTeam().id, text, sourceUrl, capturedAt: new Date().toISOString()
      });
      addLinked('claim', claim.id);
      feedback('Source claim captured as a read-only planning record. Rename or annotate its canvas block; the original excerpt is preserved.');
    },
    reset() { speckle.reset(); elementFlow.reset(); escapeSelection(); selection.clear(); selected = null; zoom = 1; $('tbZoom').value = '1'; $('tbStage').scrollTo(0, 0); feedback('Drag on empty canvas to select blocks. Copy, switch subjects with Canvas, then Paste to copy the group with internal wires. The clipboard stays available in this tab.'); }
  };
}
