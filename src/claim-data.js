export const evidenceKinds = {
  execution: { label: 'Tool execution', outcomes: ['Not run', 'Succeeded', 'Failed'] },
  interface: { label: 'Interface check', outcomes: ['Not assessed', 'Pass', 'Fail', 'Inconclusive'] },
  behaviour: { label: 'Unit / behaviour test', outcomes: ['Not assessed', 'Pass', 'Fail', 'Inconclusive'] },
  integration: { label: 'Provider-to-consumer test', outcomes: ['Not assessed', 'Pass', 'Fail', 'Inconclusive'] },
  intention: { label: 'Human intention review', outcomes: ['Not assessed', 'Supported', 'Not supported', 'Inconclusive'] },
  assessment: { label: 'Design claim assessment', outcomes: ['Not assessed', 'Supported', 'Not supported', 'Provisional', 'Inconclusive'] }
};

export function requestPlan(request, records) {
  const offer = records.offers.find(item => item.id === request.selectedOfferId && item.requestId === request.id);
  const assumptions = records.assumptions.filter(item => item.requestId === request.id);
  if (request.selectedOfferId && !offer) {
    return { label: 'Missing provider link', offer: null, assumptions };
  }
  if (assumptions.length) {
    const approved = request.allowAssumption && assumptions.every(item => item.acceptedBy?.trim());
    return {
      label: approved ? 'Provisional plan — assumptions apply' : 'Blocked — assumption not permitted or not approved',
      offer, assumptions
    };
  }
  return { label: offer ? 'Provider selected — not verified' : 'Unmatched — development opportunity', offer, assumptions };
}

export function claimGaps(claimId, records) {
  const requests = records.requests.filter(item => item.claimId === claimId);
  const assumptions = records.assumptions.filter(item => requests.some(request => request.id === item.requestId));
  return {
    requests,
    assumptions,
    unmatched: requests.filter(request => !requestPlan(request, records).offer).length
  };
}

export function evidenceContext(claimId, records) {
  return {
    claim: { ...records.claims.find(item => item.id === claimId) },
    requests: records.requests.filter(item => item.claimId === claimId).map(request => {
      const offer = records.offers.find(item => item.id === request.selectedOfferId && item.requestId === request.id);
      return {
        ...request,
        selectedOffer: offer ? { ...offer } : null,
        assumptions: records.assumptions.filter(item => item.requestId === request.id).map(item => ({ ...item }))
      };
    })
  };
}

export function validatePlanningRecord(type, record, records, activities, teams) {
  if (type === 'claims' && record.scopedElementId && !activities.some(item => item.id === record.scopedElementId)) {
    return 'Choose an existing scoped activity or clear the activity link.';
  }
  if (['requests', 'evidence'].includes(type) && !records.claims.some(item => item.id === record.claimId)) {
    return 'Choose an existing claim.';
  }
  if (['offers', 'assumptions'].includes(type) && !records.requests.some(item => item.id === record.requestId)) {
    return 'Choose an existing capability request.';
  }
  if (type === 'offers' && !teams.some(item => item.id === record.providerTeamId)) {
    return 'Choose a team from the registry.';
  }
  if (type === 'assumptions' && !records.requests.find(item => item.id === record.requestId)?.allowAssumption) {
    return 'This request does not permit provisional substitution. Change the request only after agreeing that it is appropriate.';
  }
  if (type === 'evidence' && !evidenceKinds[record.kind]?.outcomes.includes(record.outcome)) {
    return 'Choose an outcome appropriate to this evidence category.';
  }
  if (type === 'evidence' && record.outcome !== evidenceKinds[record.kind].outcomes[0] &&
      (!record.reference?.trim() || !record.reviewer?.trim() || !record.details?.trim())) {
    return 'An assessed outcome needs evidence, an author/reviewer and an explanation. These remain manually recorded, not automatically verified.';
  }
  if (type === 'evidence' && record.kind === 'assessment' && record.outcome === 'Supported') {
    const gaps = claimGaps(record.claimId, records);
    if (!gaps.requests.length || gaps.unmatched || gaps.assumptions.length || gaps.requests.some(request => request.draft)) {
      return 'A supported assessment cannot be recorded while requests are undefined, unmatched, draft contracts or use assumptions. Record a provisional or inconclusive assessment instead.';
    }
  }
  return '';
}
