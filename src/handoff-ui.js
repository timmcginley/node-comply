import { escapeHtml as html } from './workshop-data.js';
import { REVIEW_STATES, USE_STATES } from './handoff-data.js';

const option = (value, label, selected) => `<option value="${html(value)}" ${value === selected ? 'selected' : ''}>${html(label)}</option>`;
const link = (url, label) => `<a href="${html(url)}" target="_blank" rel="noopener noreferrer">${html(label)}</a>`;

function resultDescription(result) {
  return `<p><strong>${html(result.title)}</strong> - ${html(result.providerTeamId)}<br>
    ${link(result.url, 'Open exact result')}<br>
    Model/version: ${html(result.model)}<br>Code revision: ${html(result.codeRevision)}<br>
    Settings: ${html(result.settings)}</p><p>${html(result.description)}</p>
    <p>${result.readyForReview ? 'Ready for review' : 'Not ready for review'} - recorded ${html(result.createdAt)}</p>`;
}

export function sharedResultDetails(node, { canEdit, providerTeamId }) {
  const results = node.sharedResults || [];
  return `<details data-tb-handoff><summary>Shared results (${results.length})</summary>
    <p>Share one identified output, not every test run. Keep approved data in your repository.
    Use a commit-specific link for reviewed or used data: branch links can change.
    The app stores references, not file copies. Sharing does not execute or verify code.</p>
    ${results.length ? `<label>Selected result<select id="tbSharedSelection" ${canEdit ? '' : 'disabled'}>
      ${option('', 'Choose a result', node.selectedSharedResultId || '')}
      ${results.map(result => option(result.id, `${result.title}${result.readyForReview ? ' - ready for review' : ' - draft'}`, node.selectedSharedResultId)).join('')}
    </select></label>` : '<p>No result shared yet.</p>'}
    ${results.map(result => `<details><summary>${html(result.title)}${result.id === node.selectedSharedResultId ? ' (selected)' : ''}</summary>${resultDescription(result)}</details>`).join('')}
    <details><summary>Add an identified result</summary>
      <form id="tbResultForm"><fieldset ${canEdit ? '' : 'disabled'}>
        <p>Providing team: ${html(providerTeamId || 'Assign and save a responsible team first')}.</p>
        <label>Result name<input name="title" required></label>
        <label>Exact result link<input name="url" type="url" required placeholder="https://github.com/.../blob/COMMIT/.../result.json"></label>
        <label>Model and version<input name="model" required></label>
        <label>Code revision / commit reference<input name="codeRevision" required></label>
        <label>Settings (or None)<textarea name="settings" required></textarea></label>
        <label>Output meaning, units and limitations<textarea name="description" required></textarea></label>
        <label><input name="readyForReview" type="checkbox" checked> Ready for review</label>
        <button class="button primary">Add result and select it</button>
      </fieldset></form>
      <p>Saved entries are retained. For a corrected delivery, add another identified result; previous reviews and uses keep their exact result.</p>
    </details>
  </details>`;
}

export function exchangeDetails(wire, records, { canEdit, teams, ownTeam }) {
  const source = records.toolbenchNodes.find(node => node.id === wire.from);
  const target = records.toolbenchNodes.find(node => node.id === wire.to);
  const results = (source?.sharedResults || []).filter(result => result.readyForReview);
  const exchanges = wire.exchanges || [];
  return `<details data-tb-handoff open><summary>Receiver review and use (${exchanges.length})</summary>
    <p>Review and actual use are different. Record the receiving team's response
    against one exact result. These are workshop declarations, not authenticated approvals.</p>
    ${results.length ? `<form id="tbExchangeForm"><fieldset ${canEdit ? '' : 'disabled'}>
      <label>Result from provider<select name="resultId" required>
        ${option('', 'Choose an identified result', source.selectedSharedResultId || '')}
        ${results.map(result => option(result.id, `${result.title}${source.selectedSharedResultId === result.id ? ' (selected)' : ''}`, source.selectedSharedResultId)).join('')}
      </select></label>
      <label>Receiving team<select name="receiverTeamId" required>
        ${option('', 'Choose a team', target?.owner || ownTeam)}
        ${teams.map(team => option(team.id, team.id, target?.owner || ownTeam)).join('')}
      </select></label>
      <h4>12.2 Review</h4>
      <label>Review outcome<select name="reviewStatus">${REVIEW_STATES.map(state => option(state, state, 'Not reviewed')).join('')}</select></label>
      <label>Review explanation / smallest change<textarea name="reviewNote"></textarea></label>
      <h4>12.3-12.4 Use in the receiving tool</h4>
      <label>Use outcome<select name="useStatus">${USE_STATES.map(state => option(state, state, 'Not tried')).join('')}</select></label>
      <label>Receiving function code link<input name="functionUrl" type="url"></label>
      <label>What it enabled, transformations, assumptions or blocker<textarea name="useNote"></textarea></label>
      <button class="button primary">Record response against this result</button>
    </fieldset></form>` : '<p>The providing block needs a result marked ready for review. Select it and open Shared results first.</p>'}
    <p>New responses are added below; changing the provider's selected result does not replace earlier responses. Save the course canvas to share changes.</p>
    ${[...exchanges].reverse().map(exchange => `<details><summary>${html(exchange.receiverTeamId)}: ${html(exchange.reviewStatus)} / ${html(exchange.useStatus)}</summary>
      ${resultDescription(exchange.result)}
      <p>Receiver: ${html(exchange.receiverTeamId)}<br>Response recorded: ${html(exchange.createdAt)}</p>
      <p><strong>Review: ${html(exchange.reviewStatus)}</strong><br>${html(exchange.reviewNote)}</p>
      <p><strong>Use: ${html(exchange.useStatus)}</strong><br>${html(exchange.useNote)}</p>
      ${exchange.functionUrl ? `<p>${link(exchange.functionUrl, 'Receiving function')}</p>` : ''}
    </details>`).join('')}
  </details>`;
}
