// Stage 9: read only the event fields supplied by the official detection
// exercise. The real engine is responsible for verifying their origin.
// Do not log event bodies or attempt to revoke any real account/device here.
const WINDOW_MS = 10 * 60 * 1000;
const BURST_LIMIT = 120;

export function detect(events) {
  if (!Array.isArray(events)) throw new TypeError('invalid_detection_events');

  // Group by the attested pseudonymous identity. A busy user cannot cause
  // another user's normal reads to be counted toward their threshold.
  const readsBySubject = new Map();
  for (const event of events) {
    if (!event || typeof event !== 'object' || event.method !== 'GET') continue;
    const subject = event.identity?.sub;
    if (typeof subject !== 'string' || subject.length === 0) continue;
    if (typeof event.at !== 'string') continue;
    const at = Date.parse(event.at);
    if (!Number.isFinite(at)) continue;

    const reads = readsBySubject.get(subject);
    if (reads) reads.push(at);
    else readsBySubject.set(subject, [at]);
  }

  // Use a rolling, half-open ten-minute window, not fixed clock buckets.
  // The first subject to exceed 120 reads is the single proposed target.
  let firstIncident = null;
  for (const [subject, timestamps] of readsBySubject) {
    if (timestamps.length <= BURST_LIMIT) continue;
    timestamps.sort((left, right) => left - right);
    let windowStart = 0;
    for (let index = 0; index < timestamps.length; index += 1) {
      while (timestamps[index] - timestamps[windowStart] >= WINDOW_MS) {
        windowStart += 1;
      }
      if (index - windowStart + 1 > BURST_LIMIT) {
        const at = timestamps[index];
        if (firstIncident === null || at < firstIncident.at ||
            (at === firstIncident.at && subject < firstIncident.subject)) {
          firstIncident = { subject, at };
        }
        break;
      }
    }
  }

  return firstIncident === null
    ? { action: 'observe' }
    : { action: 'propose_revocation', reasonCode: 'burst_read', subject: firstIncident.subject };
}
