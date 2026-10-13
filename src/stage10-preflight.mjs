import { createHash } from 'node:crypto';
import { loadVerifiedPolicy, policyDiff, STAGE9_SAFE_COMMIT } from './stage10-recovery.mjs';

// Re-read the sealed baseline for each POST, rather than relying on the
// policy:10 offline rehearsal. A mismatch fails before any DB write.
export function verifyRecoveryPreflight(config, loader = loadVerifiedPolicy) {
  const first = loader();
  const firstHash = createHash('sha256').update(JSON.stringify(first)).digest('hex');
  const safe = loader();
  const secondHash = createHash('sha256').update(JSON.stringify(safe)).digest('hex');
  if (firstHash !== secondHash || safe.baseCommit !== STAGE9_SAFE_COMMIT)
    throw new Error('BACKUP_VERIFICATION_FAILED');

  if (!Array.isArray(config?.allowedRoutes) || !Array.isArray(config?.protectedReadRoutes))
    throw new Error('TEST_POLICY_UNAVAILABLE');
  const noteRoutes = config.allowedRoutes.filter(route =>
    /\s\/api\/(?:my\/)?notes(?:\/|$)/u.test(route));
  const current = { services: { notes: {
    ...safe.services.notes,
    allowedRoutes: noteRoutes,
    protectedReadRoutes: config.protectedReadRoutes,
  } } };
  const changed = policyDiff(current, safe);
  if (changed.length) {
    const error = new Error('CURRENT_POLICY_DIFFERS_FROM_VERIFIED_BACKUP');
    error.fields = changed.map(item => item.field);
    throw error;
  }
  return Object.freeze({ verified: true, version: safe.version,
    baseCommit: safe.baseCommit, digest: firstHash, changedFields: [] });
}
