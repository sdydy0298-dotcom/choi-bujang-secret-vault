// Only consume the class engine's validated aleph.decision.v1 input.
// Registration and subject/device binding are established upstream by the engine.
// This function does not accept browser-controlled identity or certificate values.
export const RULE_IDS = Object.freeze(['device_registered']);

export async function decide(request) {
  const base = {
    schema: 'aleph.decision.v1',
    requestId: request?.requestId,
    decision: 'deny',
    reasonCode: 'device_not_registered',
    ruleIds: [RULE_IDS[0]],
  };

  // The engine, not this function, verifies that subject and device belong together.
  // Fail closed for an absent/invalid registration assertion.
  if (request?.schema !== 'aleph.decision.v1'
      || request.deviceRegistered !== true
      || typeof request.subjectId !== 'string' || !request.subjectId.trim()
      || typeof request.deviceId !== 'string'
      || !/^[a-f0-9]{16}$/u.test(request.deviceId)
      || request.service !== 'notes'
      || request.method !== 'GET'
      || !['GET /notes', 'GET /notes/:id'].includes(request.route)) {
    return base;
  }

  return { ...base, decision: 'allow', reasonCode: 'approved' };
}
