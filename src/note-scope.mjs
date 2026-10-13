import { createHash } from 'node:crypto';

// Derive a resource scope exclusively from verified login claims. A browser
// role, owner_id, judge_run_id or judge_identity must never supply this value.
const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;

export function getNoteScope(identity) {
  if (!identity || !UUID.test(identity.userId)) return null;
  if (identity.kind === 'student') {
    return Object.freeze({ owner_id: identity.userId.toLowerCase(), judge_run_id: null, judge_identity: null });
  }
  if (identity.kind === 'judge' && UUID_V4.test(identity.runId)
    && (identity.identity === 'a' || identity.identity === 'b')) {
    // An attested judge run can use the same JWT sub for A and B. Derive a
    // stable, UUIDv4-shaped owner per signed run/sub/actor, as in the proven
    // stage-8 implementation. Do not create or assign any fake Auth users.
    const digest = createHash('sha256')
      .update(['aleph.stage8.judge.notes.v1', identity.runId.toLowerCase(),
        identity.userId.toLowerCase(), identity.identity].join(':')).digest();
    digest[6] = (digest[6] & 0x0f) | 0x40;
    digest[8] = (digest[8] & 0x3f) | 0x80;
    const hex = digest.toString('hex');
    const owner = [hex.slice(0, 8), hex.slice(8, 12), hex.slice(12, 16),
      hex.slice(16, 20), hex.slice(20, 32)].join('-');
    return Object.freeze({ owner_id: owner, judge_run_id: identity.runId.toLowerCase(),
      judge_identity: identity.identity });
  }
  return null;
}

export function scopedNoteQuery(query, identity) {
  const scope = getNoteScope(identity);
  if (!scope) throw new TypeError('invalid_note_scope');
  const ownerQuery = query.eq('owner_id', scope.owner_id);
  if (scope.judge_run_id === null) {
    return ownerQuery.is('judge_run_id', null).is('judge_identity', null);
  }
  return ownerQuery.eq('judge_run_id', scope.judge_run_id)
    .eq('judge_identity', scope.judge_identity);
}

export function noteOwnerColumns(identity) {
  const scope = getNoteScope(identity);
  if (!scope) throw new TypeError('invalid_note_scope');
  return { ...scope };
}

export function noteOwnerMatches(record, identity) {
  const scope = getNoteScope(identity);
  return scope !== null && record != null
    && record.owner_id === scope.owner_id
    && record.judge_run_id === scope.judge_run_id
    && record.judge_identity === scope.judge_identity;
}
