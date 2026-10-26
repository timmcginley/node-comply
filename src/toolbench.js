import { escapeHtml as html } from './workshop-data.js';
import { captureDesignClaim, makeBlock, projectBpmn, mergeProjection, wireError, saveWireHandoff, removeWire, blockWarnings } from './toolbench-data.js';
import './toolbench.css';

const width = 232;
const rowHeight = 30;
const height = node => 97 + Math.max(node.inputs.length, node.outputs.length) * rowHeight;
const number = value => Number.isFinite(value) ? value : 30;
const option = (value, title, selected) => `<option value="${html(value)}" ${selected === value ? 'selected' : ''}>${html(title)}</option>`;

export function mountToolbench({ container, getRecords, getTeam, getTeams, modelers, isSourceReady, canEdit, persist, revealSource }) {
  container.innerHTML = `<div class="tb-page">
    <div class="tb-toolbar"><div><h2>Toolbench <small>experimental</small></h2><p>Patch your tools together. Planning only — nothing runs here.</p></div>
      <button class="button primary" id="tbGenerate">Generate from BPMN</button>
      <button class="button" id="tbFit">Fit patch</button>
      <label>Zoom<select id="tbZoom"><option value="0.5">50%</option><option value="0.75">75%</option><option value="1" selected>100%</option></select></label>
    </div>
    <div class="tb-layout">
      <aside class="tb-tray" aria-label="Block tray"><h3>Add a block</h3>
        <button class="button" data-tb-add="activity">+ Tool / activity</button><button class="button" data-tb-add="data">+ Information</button>
        <button class="button" data-tb-add="assumption">+ Provisional input</button>
        <details><summary>General BPMN</summary><div id="tbSources"></div></details>
        <details open><summary>Your claims &amp; plans</summary><div id="tbPlans"></div></details>
        <small>Solid wires: proposed information.<br>Dashed grey: process order, not data.<br>Dotted blue: BPMN data associations.</small>
      </aside>
      <div class="tb-stage" id="tbStage" aria-label="Visual tool planning canvas" tabindex="0">
        <div id="tbSizer"><div id="tbWorld"><svg id="tbWires" aria-label="Connections"></svg><div id="tbBlocks"></div></div></div>
        <div id="tbEmpty">Start with your existing BPMN.<br>Generate a draft, or add one block from the tray.</div>
      </div>
      <aside class="tb-inspector" id="tbInspector" aria-label="Selected block or connection"></aside>
    </div>
    <p id="tbFeedback" role="status">Drag a block by its heading. Drag output to input, or click the two sockets. Select a block or wire for details.</p>
  </div>`;
  const $ = id => container.querySelector(`#${id}`);
  let selected = null, pending = null, gesture = null, zoom = 1;
  const records = () => getRecords();
  const nodes = () => records().toolbenchNodes;
  const wires = () => records().toolbenchWires;
  const findNode = id => nodes().find(node => node.id === id);
  const source = () => isSourceReady() ? projectBpmn(modelers.general) : { nodes: [], wires: [] };
  const feedback = text => { $('tbFeedback').textContent = text; };
  const save = () => persist();
  const escapeSelection = () => { pending = null; gesture = null; $('tbPreview')?.remove(); };

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
        return `<g class="tb-wire ${html(wire.kind)} ${selected?.id === wire.id ? 'selected' : ''}" data-tb-wire="${html(wire.id)}" tabindex="0" role="button" aria-label="${html(name)}">
          <title>${html(name)}</title><path class="tb-wire-hit" d="${path(from, to)}"/><path class="tb-wire-line" d="${path(from, to)}" ${wire.kind === 'sequence' ? 'marker-end="url(#tbArrow)"' : ''}/>
          <text x="${(from.x + to.x) / 2}" y="${(from.y + to.y) / 2 - 8}" text-anchor="middle">${html(name.length > 34 ? `${name.slice(0, 31)}...` : name)}</text></g>`;
      }).join('');
  }

  function renderInspector(projection) {
    const inspector = $('tbInspector');
    if (!selected) {
      inspector.innerHTML = '<h3>Less paperwork, more patching</h3><p>Select a block to name its inputs and outputs. An open input is a visible gap.</p><p>Use a request for missing expertise, or a clearly marked provisional input. No wire proves compatibility or engineering validity.</p>';
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
        <label>Responsible team<select name="owner">${option('', 'Not assigned', node.owner)}${getTeams().map(team => option(team.id, team.id, node.owner)).join('')}</select></label>
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
    if (!canEdit()) {
      if (gesture?.type === 'node') {
        const node = findNode(gesture.id);
        if (node) { node.x = gesture.x; node.y = gesture.y; }
      }
      escapeSelection();
    }
    const projection = source();
    $('tbGenerate').disabled = !canEdit() || !isSourceReady();
    $('tbSources').innerHTML = projection.nodes.map(node => `<button class="tb-tray-item" data-tb-source-add="${html(node.id)}">${html(node.title)} <small>${html(node.kind)}</small></button>`).join('') || '<p>No general BPMN available yet. Load or upload it in Team diagrams.</p>';
    $('tbPlans').innerHTML = [['claims', 'claim'], ['requests', 'request'], ['offers', 'provider'], ['assumptions', 'assumption']].map(([collection, kind]) =>
      records()[collection].map(item => `<button class="tb-tray-item" data-tb-linked="${kind}" data-record="${html(item.id)}">${html(item.title || item.value || item.statement)} <small>${kind}</small></button>`).join('')
    ).join('') || '<p>No claim plans yet. You can still sketch with tool and information blocks.</p>';
    const sourceIds = isSourceReady() ? new Set(projection.nodes.map(node => node.sourceId)) : null;
    $('tbBlocks').innerHTML = nodes().map(node => {
      const warnings = blockWarnings(node.id, records(), sourceIds);
      const status = warnings[0] || (node.kind === 'provider' ? 'Proposed — unverified' : node.kind === 'claim' ? (records().evidence.some(item => item.claimId === node.recordId) ? 'Evidence recorded (manual)' : 'Claim to investigate') : ['event', 'gateway'].includes(node.kind) ? 'BPMN context — not executable' : 'Planned — not verified');
      const ports = Array.from({ length: Math.max(node.inputs.length, node.outputs.length) }, (_, index) =>
        `<div class="tb-port-row">${['in', 'out'].map(direction => {
          const port = (direction === 'in' ? node.inputs : node.outputs)[index];
          return port ? `<button class="tb-socket ${direction} ${pending?.nodeId === node.id && pending.portId === port.id ? 'pending' : ''}" data-tb-node="${html(node.id)}" data-tb-port-id="${html(port.id)}" data-tb-direction="${direction}" aria-label="${direction === 'in' ? 'Input' : 'Output'}: ${html(port.label || 'unnamed')} on ${html(node.title)}" title="${html(port.label || 'Unnamed socket')}"><i></i><span>${html(port.label || (direction === 'in' ? 'Input ?' : 'Output ?'))}</span></button>` : '<span></span>';
        }).join('')}</div>`
      ).join('');
      return `<article class="tb-block ${html(node.kind)} ${selected?.id === node.id ? 'selected' : ''}" data-block="${html(node.id)}" style="left:${number(node.x)}px;top:${number(node.y)}px;width:${width}px">
        <button class="tb-block-head" data-tb-select="${html(node.id)}" title="${html(node.title)} — drag to move; arrow keys also move this block"><small>${html(node.owner || getTeam()?.id || '')} · ${html(['bpmn:UserTask', 'bpmn:ManualTask'].includes(node.sourceType) ? 'human activity' : node.kind)}</small><strong>${html(node.title)}</strong></button>
        <div class="tb-badge ${warnings.length ? 'warning' : ''}" title="${html(warnings.join('; '))}">${html(status)}${warnings.length > 1 ? ` +${warnings.length - 1}` : ''}</div>${ports}</article>`;
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
    for (const control of container.querySelectorAll('button, input, textarea, select')) {
      if (control.matches('#tbFit, #tbZoom, [data-tb-select], [data-tb-wire], [data-tb-source]')) continue;
      control.disabled = !canEdit() || (control.id === 'tbGenerate' && !isSourceReady());
    }
  }

  function position() {
    return { x: $('tbStage').scrollLeft / zoom + 50 + nodes().length % 4 * 25, y: $('tbStage').scrollTop / zoom + 60 + nodes().length % 4 * 35 };
  }
  function addBlock(kind, title, extra = {}) {
    const pos = position();
    const node = { ...makeBlock(crypto.randomUUID(), kind, title, pos.x, pos.y), ...(kind === 'data' ? { inputs: [] } : {}), ...extra };
    nodes().push(node);
    selected = { type: 'node', id: node.id };
    save();
    return node;
  }
  function addLinked(kind, id) {
    const collection = { claim: 'claims', request: 'requests', provider: 'offers', assumption: 'assumptions' }[kind];
    const item = records()[collection].find(record => record.id === id);
    if (!item) return feedback('This planning record is missing. Refresh the selection.');
    const existing = nodes().find(node => node.kind === kind && node.recordId === id);
    if (existing) {
      selected = { type: 'node', id: existing.id };
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
    selected = { type: 'wire', id: wire.id };
    escapeSelection();
    save();
    feedback('Proposed handoff added. Name the information; compatibility is not verified.');
  }

  $('tbGenerate').addEventListener('click', () => {
    if (!canEdit()) return;
    const projection = source();
    if (!projection.nodes.length) return feedback('The general BPMN has no supported top-level activities, data objects, events or gateways.');
    mergeProjection(records(), projection);
    save();
    feedback('BPMN draft refreshed. Existing positions, names and annotations were retained. Process order is not a data connection.');
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
      node.title = title;
      node.owner = form.elements.owner.value;
      node.claimId = form.elements.claimId.value;
      node.note = form.elements.note.value.trim();
      for (const port of [...node.inputs, ...node.outputs]) port.label = form.elements.namedItem(`port:${port.id}`).value.trim();
      for (const wire of wires().filter(item => item.kind === 'data' && (item.from === node.id || item.to === node.id))) saveWireHandoff(wire, records(), getTeam().id);
    } else return;
    save();
    feedback('Canvas plan changed. Browser recovery is updated; use Save shared workspace to commit it. Nothing has been executed or accepted.');
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
    const button = event.target.closest('button,[data-tb-wire]');
    if (!button) return;
    if (button.dataset.tbSource) return revealSource(button.dataset.tbSource);
    if (button.dataset.tbSelect) { selected = { type: 'node', id: button.dataset.tbSelect }; render(); return; }
    if (button.dataset.tbWire) { selected = { type: 'wire', id: button.dataset.tbWire }; render(); return; }
    if (!canEdit()) return;
    if (button.dataset.tbAdd) return addBlock(button.dataset.tbAdd, { activity: 'New tool', data: 'Information', assumption: 'Provisional input — unapproved' }[button.dataset.tbAdd]);
    if (button.dataset.tbLinked) return addLinked(button.dataset.tbLinked, button.dataset.record);
    if (button.dataset.tbSourceAdd) {
      const projection = source();
      const node = projection.nodes.find(item => item.id === button.dataset.tbSourceAdd);
      if (!node) return feedback('BPMN source unavailable. Load it in Team diagrams.');
      mergeProjection(records(), { nodes: [node], wires: projection.wires });
      selected = { type: 'node', id: node.id };
      save();
      return;
    }
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
      removeWire(wire.id, records());
      selected = null;
      save();
      feedback('Canvas link and any Toolbench-owned handoff removed. BPMN is unchanged.');
      return;
    }
    if (!node) return;
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
      for (const item of [...wires()].filter(item => item.from === node.id || item.to === node.id)) removeWire(item.id, records());
      records().toolbenchNodes = nodes().filter(item => item.id !== node.id);
      selected = null;
      save();
      feedback('Block, canvas wires and their Toolbench-owned handoffs removed. BPMNs and linked claim/request/assumption records are unchanged.');
    }
  });

  const coordinates = event => {
    const rect = $('tbWorld').getBoundingClientRect();
    return { x: (event.clientX - rect.left) / zoom, y: (event.clientY - rect.top) / zoom };
  };
  $('tbStage').addEventListener('pointerdown', event => {
    if (!canEdit()) return;
    if (event.button !== 0) return;
    const output = event.target.closest('[data-tb-direction="out"]');
    const heading = event.target.closest('[data-tb-select]');
    if (output) {
      pending = { nodeId: output.dataset.tbNode, portId: output.dataset.tbPortId };
      gesture = { type: 'wire', pointerId: event.pointerId };
    } else if (heading) {
      const node = findNode(heading.dataset.tbSelect);
      gesture = { type: 'node', id: node.id, x: node.x, y: node.y, start: coordinates(event), moved: false, pointerId: event.pointerId };
    } else return;
    $('tbStage').setPointerCapture(event.pointerId);
  });
  $('tbStage').addEventListener('pointermove', event => {
    if (!canEdit()) return;
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    const pos = coordinates(event);
    if (gesture.type === 'node') {
      const node = findNode(gesture.id);
      const dx = pos.x - gesture.start.x, dy = pos.y - gesture.start.y;
      if (Math.abs(dx) + Math.abs(dy) < 3 && !gesture.moved) return;
      gesture.moved = true;
      node.x = Math.max(16, gesture.x + dx);
      node.y = Math.max(16, gesture.y + dy);
      const block = [...$('tbBlocks').children].find(item => item.dataset.block === node.id);
      block.style.left = `${node.x}px`;
      block.style.top = `${node.y}px`;
      drawWires();
    } else if (pending) {
      const from = point(pending.nodeId, pending.portId, 'out');
      if (!from) return;
      $('tbPreview')?.remove();
      $('tbWires').insertAdjacentHTML('beforeend', `<path id="tbPreview" d="${path(from, pos)}"/>`);
    }
  });
  $('tbStage').addEventListener('pointerup', event => {
    if (!canEdit()) { escapeSelection(); return; }
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    $('tbStage').releasePointerCapture(event.pointerId);
    if (gesture.type === 'wire') {
      const input = document.elementFromPoint(event.clientX, event.clientY)?.closest('[data-tb-direction="in"]');
      if (input) connect(input.dataset.tbNode, input.dataset.tbPortId);
      else feedback('Choose an input socket to finish this wire. Escape cancels.');
      $('tbPreview')?.remove();
    } else {
      selected = { type: 'node', id: gesture.id };
      if (gesture.moved) save();
      else render();
    }
    gesture = null;
  });
  $('tbStage').addEventListener('pointercancel', () => {
    if (gesture?.type === 'node') {
      const node = findNode(gesture.id);
      if (node) { node.x = gesture.x; node.y = gesture.y; }
    }
    escapeSelection();
    render();
  });
  container.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      if (gesture?.type === 'node') {
        const node = findNode(gesture.id);
        if (node) { node.x = gesture.x; node.y = gesture.y; }
      }
      escapeSelection(); render(); feedback('Connection or move cancelled.'); return;
    }
    const heading = event.target.closest('[data-tb-select]');
    const wire = event.target.closest('[data-tb-wire]');
    if (wire && ['Enter', ' '].includes(event.key)) { event.preventDefault(); selected = { type: 'wire', id: wire.dataset.tbWire }; render(); }
    if (!canEdit()) return;
    if (!heading || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
    event.preventDefault();
    const node = findNode(heading.dataset.tbSelect), step = event.shiftKey ? 60 : 20;
    node.x = Math.max(16, node.x + (event.key === 'ArrowRight' ? step : event.key === 'ArrowLeft' ? -step : 0));
    node.y = Math.max(16, node.y + (event.key === 'ArrowDown' ? step : event.key === 'ArrowUp' ? -step : 0));
    save();
    [...$('tbBlocks').querySelectorAll('[data-tb-select]')].find(item => item.dataset.tbSelect === node.id)?.focus();
  });
  return {
    render,
    startClaim({ text, sourceUrl }) {
      if (!canEdit()) return;
      escapeSelection();
      const claim = captureDesignClaim(records(), {
        id: crypto.randomUUID(), teamId: getTeam().id, text, sourceUrl, capturedAt: new Date().toISOString()
      });
      addLinked('claim', claim.id);
      feedback('Source claim captured as a read-only planning record. Rename or annotate its canvas block; the original excerpt is preserved.');
    },
    reset() { escapeSelection(); selected = null; zoom = 1; $('tbZoom').value = '1'; $('tbStage').scrollTo(0, 0); feedback('Drag blocks, connect sockets, and keep gaps visible. Planning only.'); }
  };
}
