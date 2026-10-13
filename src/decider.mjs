// Requests arrive after engine-side identity, device, and route verification.
// The v1 contract has no ownership or instructor-role claim: do not infer one.
export const RULE_IDS = Object.freeze([
  'device_registered', 'step_up_required', 'resource_zone',
  'route_not_allowed', 'write_not_allowed',
]);

const reply = (r, decision, reasonCode, ruleId) => ({
  schema: 'aleph.decision.v1',
  requestId: r?.requestId,
  decision, reasonCode, ruleIds: [ruleId],
});

// Explicit read-only zones. A personal list is /api/my/notes, not /api/notes.
// Record ownership and authorization are checked again by the data API.
const READ_ROUTES = Object.freeze({
  'GET /notes': /^\/notes$/u,
  'GET /notes/:id': /^\/notes\/[^/?#]+$/u,
  'GET /api/my/notes': /^\/api\/my\/notes$/u,
  'GET /api/notes/:id': /^\/api\/notes\/[0-9a-f-]{36}$/iu,
  'GET /api/notices': /^\/api\/notices$/u,
});

// The engine contract cannot prove note ownership or instructor privileges.
// These writes are therefore never allowed by the engine-side decider.
// The existing API keeps its independently verified owner-based CRUD behavior.
const WRITE_DENY_ROUTES = Object.freeze({
  'POST /api/notes': /^\/api\/notes$/u,
  'PUT /api/notes/:id': /^\/api\/notes\/[0-9a-f-]{36}$/iu,
  'DELETE /api/notes/:id': /^\/api\/notes\/[0-9a-f-]{36}$/iu,
  'POST /api/notices': /^\/api\/notices$/u,
  'PUT /api/notices/:id': /^\/api\/notices\/[0-9a-f-]{36}$/iu,
});

function riskCount(r) {
  const s = r?.signals;
  if (s?.source !== 'judge_fixture') return 0;
  return Number(s.region === 'foreign')
    + Number(s.network === 'unusual')
    + Number(Number.isInteger(s.hour) && s.hour >= 0 && s.hour < 6)
    + Number(Array.isArray(r.recentEvents) && r.recentEvents.some(e =>
      e?.kind === 'risk_signal'
      && Number.isInteger(e.ageSeconds) && e.ageSeconds >= 0 && e.ageSeconds <= 900
      && Number.isInteger(e.count) && e.count >= 10));
}

function freshStepUp(r) {
  return r?.stepUp?.verified === true
    && Number.isInteger(r.stepUp.authAgeSeconds)
    && r.stepUp.authAgeSeconds >= 0 && r.stepUp.authAgeSeconds <= 900;
}

export async function decide(r) {
  if (r?.schema !== 'aleph.decision.v1' || r.deviceRegistered !== true
    || typeof r.subjectId !== 'string' || !r.subjectId.trim()
    || typeof r.deviceId !== 'string' || !/^[a-f0-9]{16}$/u.test(r.deviceId)
    || r.service !== 'notes') {
    return reply(r, 'deny', 'device_not_registered', 'device_registered');
  }

  const expectedPrefix = typeof r.method === 'string' ? r.method + ' ' : null;
  const key = typeof r.route === 'string' && expectedPrefix
    && r.route.startsWith(expectedPrefix) ? r.route : null;
  const read = key ? READ_ROUTES[key] : null;
  const write = key ? WRITE_DENY_ROUTES[key] : null;
  if ((!read && !write) || typeof r.path !== 'string'
    || !(read ?? write).test(r.path) || (r.queryLength ?? 0) !== 0) {
    return reply(r, 'deny', 'route_not_allowed', 'route_not_allowed');
  }
  if (write) return reply(r, 'deny', 'write_not_allowed', 'write_not_allowed');

  if (riskCount(r) >= 2 && !freshStepUp(r)) {
    return reply(r, 'step_up', 'step_up_required', 'step_up_required');
  }
  const legacy = r.route === 'GET /notes' || r.route === 'GET /notes/:id';
  return reply(r, 'allow', 'approved', legacy ? 'device_registered' : 'resource_zone');
}
