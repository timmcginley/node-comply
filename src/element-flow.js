import { escapeHtml as html } from './workshop-data.js';
import { isCapture } from './speckle-client.js';
import {
  isPropertyLoader, isIfcFilter, isElementCapture, isElementCount, isValueDisplay, inputNode, referenceKey, filterKey, classificationPaths,
  currentPropertyLoad, elementInput,
  captureElements, countElements, elementStatus
} from './element-data.js';

export function mountElementFlow({ getRecords, canEdit, readProperties, persist, feedback, selectNode }) {
  let generation = 0, active = null;
  const drafts = new Map();
  function sourceKey(node) {
    const source = inputNode(node, getRecords(), isCapture);
    return JSON.stringify([source.id, referenceKey(source.capture)]);
  }
  function loadedProperties(loader) {
    const result = currentPropertyLoad(loader, getRecords()), draft = drafts.get(loader.id);
    if (!draft?.data || draft.busy || draft.sourceKey !== sourceKey(loader) || draft.runId !== result.runId) {
      throw new Error('Read model properties in the upstream loader in this browser session. Its data is shared by all connected IFC filters.');
    }
    return draft.data;
  }
  function captureForm(node, data, editable, busy, label) {
    const paths = data ? classificationPaths(data) : node.classificationPath ? [node.classificationPath] : [];
    return `<form id="elementCaptureForm">
      <label>Exact IFC class<input name="ifcClass" required value="${html(node.ifcClass || 'IfcWindow')}" ${!editable || busy ? 'disabled' : ''}></label>
      <label>Instance-class property<select name="classificationPath" ${!editable || busy || !data ? 'disabled' : ''}>
        <option value="">Choose the actual property path</option>
        ${paths.map(path => `<option value="${html(path)}" ${node.classificationPath === path ? 'selected' : ''}>${html(path)}</option>`).join('')}
      </select></label>
      <p>Use the path corresponding to <strong>Attributes &gt; type</strong>, not Element Type Attributes. Changes apply when you submit.</p>
      <button class="button primary" ${!editable || busy || !data || node.functionVersion !== 1 ? 'disabled' : ''}>${label}</button>
    </form>`;
  }
  function saveElements(node, form, data) {
    if (!canEdit() || !getRecords().toolbenchNodes.includes(node) || node.functionVersion !== 1) throw new Error('This block is no longer editable or supported.');
    const ifcClass = form.elements.ifcClass.value.trim(), classificationPath = form.elements.classificationPath.value;
    const result = captureElements(data, ifcClass, classificationPath);
    const source = elementInput(node, getRecords()).reference;
    Object.assign(node, {
      ifcClass, classificationPath,
      elementResult: {
        ...result, inputKey: filterKey({ ...node, ifcClass, classificationPath }, getRecords()),
        source: structuredClone(source), runId: crypto.randomUUID(), capturedAt: new Date().toISOString()
      }
    });
    persist();
    feedback('Matching unique element IDs captured. Calculate count downstream, then Save shared workspace to retain the results.');
  }
  function renderInspector(inspector, node) {
    active = { inspector, node };
    const editable = canEdit(), status = elementStatus(node, getRecords());
    if (isValueDisplay(node)) {
      let source = null;
      try { source = inputNode(node, getRecords(), isElementCount); }
      catch (error) { status.text = error.message; }
      inspector.innerHTML = `<h3>Communicate: Display value</h3>
        <p>Wire a Calculate: Count elements output here. This read-only text box updates after a successful calculation; it does not trigger one.</p>
        <label>${html(node.displayLabel || 'Count')}<textarea class="tb-display-value ${status.current ? '' : 'pending'}" readonly aria-live="polite">${html(status.current ? String(status.value) : status.text)}</textarea></label>
        ${source && selectNode ? '<button id="displaySource" class="button">Go to Calculate</button>' : ''}
        <form id="displayLabelForm"><label>Result label<input name="displayLabel" required value="${html(node.displayLabel || 'Count')}" ${!editable ? 'disabled' : ''}></label>
          <button class="button" ${!editable ? 'disabled' : ''}>Save label</button></form>
        <p role="status">${html(status.current ? 'Current result for the pinned input. Source changes replace the value with a warning.' : status.text)}</p>
        <button class="button" data-tb-remove-node ${!editable ? 'disabled' : ''}>Remove display block</button>`;
      inspector.querySelector('#displaySource')?.addEventListener('click', () => selectNode(source.id));
      inspector.querySelector('#displayLabelForm').addEventListener('submit', event => {
        event.preventDefault();
        event.stopPropagation();
        try {
          if (!canEdit() || !getRecords().toolbenchNodes.includes(node)) throw new Error('This block is no longer editable.');
          const label = event.target.elements.displayLabel.value.trim();
          if (!label) throw new Error('Enter a result label.');
          node.displayLabel = label;
          persist();
          feedback('Display label updated. Save shared workspace to retain it.');
        } catch (error) {
          inspector.querySelector('[role="status"]').textContent = error.message;
          feedback(error.message);
        }
      });
      return;
    }
    if (isIfcFilter(node)) {
      let loader = null, data = null, message = '';
      try {
        loader = inputNode(node, getRecords(), isPropertyLoader);
        data = loadedProperties(loader);
      } catch (error) { message = error.message; }
      inspector.innerHTML = `<h3>Capture: IFC filter</h3>
        <p>Filter the properties already read by the upstream loader. Several filters can share its output; applying a filter makes no Speckle request.</p>
        ${message ? `<p class="tb-warning">${html(message)}</p>` : `<p>${data.objects.length} source objects available in this browser session.</p>`}
        ${loader && selectNode ? '<button id="filterSource" class="button">Go to property loader</button>' : ''}
        ${captureForm(node, data, editable, false, 'Apply IFC filter')}
        <p role="status">${html(status.text)}</p>
        <button class="button" data-tb-remove-node ${!editable ? 'disabled' : ''}>Remove IFC filter block</button>`;
      inspector.querySelector('#filterSource')?.addEventListener('click', () => selectNode(loader.id));
      inspector.querySelector('#elementCaptureForm').addEventListener('submit', event => {
        event.preventDefault();
        event.stopPropagation();
        try {
          const currentLoader = inputNode(node, getRecords(), isPropertyLoader);
          saveElements(node, event.target, loadedProperties(currentLoader));
        } catch (error) {
          inspector.querySelector('[role="status"]').textContent = error.message;
          feedback(error.message);
        }
      });
      return;
    }
    if (!isElementCapture(node) && !isPropertyLoader(node)) {
      let source = null, ready = false, inputMessage = '';
      try {
        source = inputNode(node, getRecords(), isElementCapture);
        countElements(node, getRecords());
        ready = true;
      } catch (error) { inputMessage = error.message; }
      inspector.innerHTML = `<h3>Calculate: Count elements</h3>
        <p>Wire an IFC filter or existing IFC Capture output here, then calculate the number of unique element IDs.</p>
        <p id="elementCountStatus" role="status" class="${status.current ? '' : 'tb-warning'}">${html(ready ? status.text : inputMessage)}</p>
        ${!ready && source ? `<p>In the upstream IFC block: ${isIfcFilter(source) ? 'read properties once in its loader, then <strong>Apply IFC filter</strong>' : '<strong>Read model properties</strong>, choose the instance-class path, then <strong>Capture matching elements</strong>'}. Return here to calculate.</p>` : ''}
        ${source && selectNode ? `<button id="elementCountSource" class="button">Go to IFC ${isIfcFilter(source) ? 'filter' : 'Capture'}</button>` : ''}
        ${status.current ? `<p>${html(node.countResult.ifcClass)} / version ${html(node.countResult.source.versionId)}<br>
          Calculated: ${html(node.countResult.calculatedAt)}</p>` : ''}
        <button id="elementCount" class="button primary" ${!editable || !ready ? 'disabled' : ''}>Calculate count</button>
        <button class="button" data-tb-remove-node ${!editable ? 'disabled' : ''}>Remove count block</button>`;
      inspector.querySelector('#elementCountSource')?.addEventListener('click', () => selectNode(source.id));
      inspector.querySelector('#elementCount').addEventListener('click', () => {
        try {
          if (!canEdit() || !getRecords().toolbenchNodes.includes(node)) throw new Error('This block is no longer editable.');
          node.countResult = { ...countElements(node, getRecords()), calculatedAt: new Date().toISOString() };
          persist();
          feedback('Count calculated in this browser. Save shared workspace to retain it; this is not published to Speckle.');
        } catch (error) {
          const message = inspector.querySelector('#elementCountStatus');
          if (message) { message.textContent = error.message; message.classList.add('tb-warning'); }
          feedback(error.message);
        }
      });
      return;
    }
    if (!drafts.has(node.id)) drafts.set(node.id, { data: null, sourceKey: '', busy: false, message: '' });
    const draft = drafts.get(node.id), loader = isPropertyLoader(node);
    let key = '', sourceError = '';
    try { key = sourceKey(node); } catch (error) { sourceError = error.message; }
    if (draft.sourceKey !== key) draft.data = null;
    inspector.innerHTML = `<h3>Capture: ${loader ? 'Load model properties' : 'IFC elements'}</h3>
      <p>${loader ? 'Wire a pinned Speckle model here and read its properties once. Wire this output to any number of IFC filters; they reuse the same data without downloading again.' : 'Wire a pinned Speckle model here. Read properties only, then select its instance-class field and an exact IFC class. No subclass inference or geometry counting.'}</p>
      ${loader ? `<p>Properties stay in browser-session memory, not shared storage. ${draft.data ? 'Data is available in this tab.' : 'Read once again after a page refresh to use the filters. Saved results are retained.'}</p>` : ''}
      ${sourceError ? `<p class="tb-warning">${html(sourceError)}</p>` : ''}
      <button id="elementRead" class="button" ${!editable || draft.busy || !key || node.functionVersion !== 1 ? 'disabled' : ''}>Read model properties</button>
      ${loader ? '' : captureForm(node, draft.data, editable, draft.busy, 'Capture matching elements')}
      <p role="status">${html(draft.busy ? draft.message || 'Reading model properties...' : draft.message || status.text)}</p>
      ${!loader && status.current ? `<p>Version ${html(node.elementResult.source.versionId)}<br>
        Captured: ${html(node.elementResult.capturedAt)}<br>
        ${node.elementResult.classifiedObjects}/${node.elementResult.totalObjects} unique source objects have this IFC-class property. Unclassified objects are not counted.</p>
        <details><summary>Sample matching element IDs</summary><ul>${node.elementResult.elementIds.slice(0, 10).map(id => `<li>${html(id)}</li>`).join('')}</ul></details>` : ''}
      <button class="button" data-tb-remove-node ${!editable || draft.busy ? 'disabled' : ''}>Remove ${loader ? 'property loader' : 'IFC Capture'} block</button>`;
    const startedGeneration = generation;
    const valid = () => generation === startedGeneration && drafts.get(node.id) === draft &&
      getRecords().toolbenchNodes.includes(node) && canEdit() && sourceKey(node) === key;
    const readDetails = {
      nodeId: node.id, editable, hasPinnedInput: !!key,
      functionVersion: node.functionVersion, sourceError: sourceError || null
    };
    if (!draft.busy && (!editable || !key || node.functionVersion !== 1)) {
      console.warn('[MasterBPMN Speckle] property read unavailable', readDetails);
    }
    inspector.querySelector('#elementRead').addEventListener('click', async () => {
      if (!editable || draft.busy || !key || node.functionVersion !== 1) {
        console.warn('[MasterBPMN Speckle] property read ignored', { ...readDetails, busy: draft.busy });
        return;
      }
      const startedAt = performance.now();
      let details = readDetails;
      console.info('[MasterBPMN Speckle] property read clicked', details);
      draft.busy = true;
      draft.message = '';
      draft.data = null;
      renderInspector(inspector, node);
      try {
        const source = inputNode(node, getRecords(), isCapture);
        details = {
          ...readDetails, projectId: source.capture.projectId,
          modelId: source.capture.modelId, versionId: source.capture.versionId
        };
        console.info('[MasterBPMN Speckle] property read started', details);
        const data = await readProperties(structuredClone(source.capture), message => {
          if (generation !== startedGeneration || drafts.get(node.id) !== draft) return;
          draft.message = message;
          if (active?.node === node) {
            const status = active.inspector.querySelector('[role="status"]');
            if (status) status.textContent = message;
          }
        });
        if (!valid()) throw new Error('The input or workspace changed. Read model properties again.');
        const pathCount = classificationPaths(data).length;
        draft.data = data;
        draft.sourceKey = key;
        draft.message = loader ? `${data.objects.length} property objects loaded. Connect IFC filters to reuse this data without another read.` : pathCount ?
          'Properties loaded. Choose the instance-class path and capture the matching elements.' :
          'No object-level IFC-class values were found. This is not a zero count.';
        console.info('[MasterBPMN Speckle] property read completed', {
          ...details, elapsedMs: Math.round(performance.now() - startedAt),
          objects: data.objects.length, paths: data.paths.length,
          values: data.eav.length, classificationPaths: pathCount
        });
        if (loader) {
          draft.runId = crypto.randomUUID();
          node.propertyResult = {
            source: structuredClone(source.capture), inputNodeId: source.id,
            runId: draft.runId, objectCount: data.objects.length, loadedAt: new Date().toISOString()
          };
          draft.busy = false;
          persist();
          feedback('Model properties loaded once in this browser session. Apply the connected IFC filters, then calculate their counts.');
        }
      } catch (error) {
        console.error('[MasterBPMN Speckle] property read failed', {
          ...details, elapsedMs: Math.round(performance.now() - startedAt), message: error.message
        });
        draft.message = error.message;
        feedback(error.message);
      } finally {
        draft.busy = false;
        if (active?.node === node && generation === startedGeneration && drafts.get(node.id) === draft) renderInspector(active.inspector, node);
      }
    });
    inspector.querySelector('#elementCaptureForm')?.addEventListener('submit', event => {
      event.preventDefault();
      event.stopPropagation();
      try {
        if (!valid() || draft.busy || !draft.data || draft.sourceKey !== key || node.functionVersion !== 1) throw new Error('The input changed or is not editable. Read model properties again.');
        draft.message = '';
        saveElements(node, event.target, draft.data);
      } catch (error) {
        draft.message = error.message;
        inspector.querySelector('[role="status"]').textContent = error.message;
        feedback(error.message);
      }
    });
  }
  return {
    renderInspector,
    clearInspector() { active = null; },
    reset() { ++generation; drafts.clear(); active = null; }
  };
}
