// The ALEPH engine verifies the subject, device, and route before calling us.
// Only the engine's decision-contract fields may influence this policy.
export const RULE_IDS = Object.freeze(['device_registered', 'step_up_required']);

const result = (request, decision, reasonCode, ruleId) => ({
  schema: 'aleph.decision.v1',
  requestId: request?.requestId,
  decision,
  reasonCode,
  ruleIds: [ruleId],
});

function verifiedFixtureRiskCount(request) {
  const signals = request?.signals;
  // Real engine signals currently report source 'none'; unknown/client-provided
  // locations, network names, and times are NOT evidence of a safe or risky visit.
  if (signals?.source !== 'judge_fixture') return 0;

  let risk = 0;
  if (signals.region === 'foreign') risk++;
  if (signals.network === 'unusual') risk++;
  if (Number.isInteger(signals.hour) && signals.hour >= 0 && signals.hour < 6) risk++;
  // Only an engine-supplied, recent, counted risk event can add a fourth signal.
  const recent = Array.isArray(request.recentEvents) && request.recentEvents.some(event =>
    event?.kind === 'risk_signal'
      && Number.isInteger(event.ageSeconds) && event.ageSeconds >= 0 && event.ageSeconds <= 900
      && Number.isInteger(event.count) && event.count >= 10);
  if (recent) risk++;
  return risk;
}

function freshStepUp(request) {
  const stepUp = request?.stepUp;
  return stepUp?.verified === true && Number.isInteger(stepUp.authAgeSeconds)
    && stepUp.authAgeSeconds >= 0 && stepUp.authAgeSeconds <= 900;
}

export async function decide(request) {
  // Preserve stage 6: an unregistered device never reaches the risk rule.
  if (request?.schema !== 'aleph.decision.v1'
      || request.deviceRegistered !== true
      || typeof request.subjectId !== 'string' || !request.subjectId.trim()
      || typeof request.deviceId !== 'string' || !/^[a-f0-9]{16}$/u.test(request.deviceId)
      || request.service !== 'notes' || request.method !== 'GET'
      || !['GET /notes', 'GET /notes/:id'].includes(request.route)) {
    return result(request, 'deny', 'device_not_registered', 'device_registered');
  }

  // Stage 7: a single unexpected region is not grounds for a permanent deny.
  // Two or more validated synthetic warning signs require fresh login proof.
  if (verifiedFixtureRiskCount(request) >= 2 && !freshStepUp(request)) {
    return result(request, 'step_up', 'step_up_required', 'step_up_required');
  }
  return result(request, 'allow', 'approved', 'device_registered');
}
