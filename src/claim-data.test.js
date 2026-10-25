import test from 'node:test';
import assert from 'node:assert/strict';
import { restoreWorkshop } from './workshop-data.js';
import { requestPlan, claimGaps, evidenceContext, validatePlanningRecord } from './claim-data.js';

const records = () => restoreWorkshop({
  claims: [{ id: 'claim-1', title: 'Retain columns' }],
  requests: [{ id: 'request-1', claimId: 'claim-1', title: 'Column quantities', allowAssumption: false }]
});

test('claim-led records survive local storage and workspace export with legacy records', () => {
  const saved = records();
  saved.dependencies.push({ from: 'STR-23', to: 'BLD-41', object: 'Column schedule', type: 'Data dependency' });
  saved.offers.push({ id: 'offer-1', requestId: 'request-1', providerTeamId: 'STR-23', version: 'abc123' });
  saved.assumptions.push({ id: 'assumption-1', requestId: 'request-1', value: 'Preliminary schedule', acceptedBy: 'Workshop reviewer' });
  saved.evidence.push({ id: 'evidence-1', claimId: 'claim-1', kind: 'execution', outcome: 'Failed' });
  assert.deepEqual(restoreWorkshop(JSON.parse(JSON.stringify(saved))), saved);
});

test('a provider declaration or selection never becomes verified availability', () => {
  const saved = records();
  const request = saved.requests[0];
  assert.match(requestPlan(request, saved).label, /Unmatched/);
  saved.offers.push({ id: 'offer-1', requestId: request.id });
  assert.match(requestPlan(request, saved).label, /Unmatched/);
  request.selectedOfferId = 'offer-1';
  assert.match(requestPlan(request, saved).label, /not verified/);
  saved.offers[0].requestId = 'another-request';
  assert.match(requestPlan(request, saved).label, /Missing provider/);
  assert.equal(evidenceContext('claim-1', saved).requests[0].selectedOffer, null);
});

test('assumptions require permission and approval and remain provisional after selecting a provider', () => {
  const saved = records();
  const request = saved.requests[0];
  saved.assumptions.push({ id: 'assumption-1', requestId: request.id, acceptedBy: '' });
  assert.match(requestPlan(request, saved).label, /Blocked/);
  request.allowAssumption = true;
  assert.match(requestPlan(request, saved).label, /Blocked/);
  saved.assumptions[0].acceptedBy = 'Reviewer';
  assert.match(requestPlan(request, saved).label, /Provisional/);
  saved.offers.push({ id: 'offer-1', requestId: request.id });
  request.selectedOfferId = 'offer-1';
  assert.match(requestPlan(request, saved).label, /Provisional/);
  assert.equal(claimGaps('claim-1', saved).assumptions.length, 1);
});

test('missing claims, requests, teams and activities are rejected explicitly', () => {
  const saved = records();
  assert.match(validatePlanningRecord('requests', { claimId: 'deleted' }, saved, [], []), /existing claim/);
  assert.match(validatePlanningRecord('offers', { requestId: 'deleted' }, saved, [], []), /existing capability/);
  assert.match(validatePlanningRecord('offers', { requestId: 'request-1', providerTeamId: 'unknown' }, saved, [], []), /registry/);
  assert.match(validatePlanningRecord('claims', { scopedElementId: 'deleted' }, saved, [], []), /existing scoped/);
  assert.match(validatePlanningRecord('assumptions', { requestId: 'request-1' }, saved, [], []), /does not permit/);
});

test('evidence keeps the claim, selected provider and assumption provenance as historical snapshots', () => {
  const saved = records();
  saved.requests[0].selectedOfferId = 'offer-1';
  saved.offers.push({ id: 'offer-1', requestId: 'request-1', version: 'abc123' });
  saved.assumptions.push({ id: 'assumption-1', requestId: 'request-1', value: '100 m2', acceptedBy: 'Reviewer' });
  const context = evidenceContext('claim-1', saved);
  saved.claims[0].title = 'Changed claim';
  saved.offers[0].version = 'def456';
  saved.assumptions[0].acceptedBy = '';
  saved.requests.splice(0, 1);
  assert.equal(context.claim.title, 'Retain columns');
  assert.equal(context.requests[0].selectedOffer.version, 'abc123');
  assert.equal(context.requests[0].assumptions[0].acceptedBy, 'Reviewer');
  assert.deepEqual(JSON.parse(JSON.stringify(context)), context);
});

test('execution, tests and design assessment have distinct outcomes and require evidence', () => {
  const saved = records();
  const evidence = { claimId: 'claim-1', kind: 'execution', outcome: 'Pass' };
  assert.match(validatePlanningRecord('evidence', evidence, saved, [], []), /appropriate/);
  evidence.outcome = 'Succeeded';
  assert.match(validatePlanningRecord('evidence', evidence, saved, [], []), /needs evidence/);
  Object.assign(evidence, { reference: 'CI run 123', reviewer: 'Student', details: 'Ran revision abc against model xyz' });
  assert.equal(validatePlanningRecord('evidence', evidence, saved, [], []), '');
  Object.assign(evidence, { kind: 'assessment', outcome: 'Supported' });
  assert.match(validatePlanningRecord('evidence', evidence, saved, [], []), /unmatched/);
  evidence.outcome = 'Provisional';
  assert.equal(validatePlanningRecord('evidence', evidence, saved, [], []), '');
  evidence.outcome = 'Supported';
  saved.requests[0].selectedOfferId = 'offer-1';
  saved.offers.push({ id: 'offer-1', requestId: 'request-1' });
  assert.equal(validatePlanningRecord('evidence', evidence, saved, [], []), '');
  saved.requests[0].draft = true;
  assert.match(validatePlanningRecord('evidence', evidence, saved, [], []), /draft contracts/);
  saved.requests[0].draft = false;
  saved.assumptions.push({ id: 'assumption-1', requestId: 'request-1', acceptedBy: 'Reviewer' });
  assert.match(validatePlanningRecord('evidence', evidence, saved, [], []), /assumptions/);
  saved.requests = [];
  assert.match(validatePlanningRecord('evidence', evidence, saved, [], []), /undefined/);
});
