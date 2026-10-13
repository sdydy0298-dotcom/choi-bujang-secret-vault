import { createHash, timingSafeEqual } from 'node:crypto';
import { readFileSync, appendFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';

export const STAGE9_SAFE_COMMIT = 'd1004397ac47317cfdedddb483a652c1c300f8e2';
export const VERIFIED_POLICY_DIGEST = '6afb1c0d5a6be13f35ea1ec60817169253141815b84d5543469882244c527769';
// Independent, code-pinned SHA-256 of the original JSON file bytes, not its manifest.
export const VERIFIED_POLICY_RAW_DIGEST = '9f9d8cda19f2ec116176007b72c552488db6b789491c224c3cdfa3b1c7c69646';
export const RESTORE_PATH = '/api/restore';
const SEP = '\n--ALEPH-STAGE10--\n';
export function noteContentHash(title, content) {
  if (typeof title !== 'string' || typeof content !== 'string') throw new TypeError('invalid_note_content');
  return createHash('sha256').update(title + SEP + content, 'utf8').digest('hex');
}
export function equalHash(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' ||
      !/^[0-9a-f]{64}$/.test(a) || !/^[0-9a-f]{64}$/.test(b)) return false;
  return timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'));
}
export function loadVerifiedPolicy(
  file = new URL('../recovery/stage9-safe-policy.json', import.meta.url),
  manifestFile = new URL('../recovery/MANIFEST.json', import.meta.url)
) {
  let policy, manifest, raw;
  try {
    // Hash original bytes before parsing; do not trust a manifest edited with the backup.
    raw = readFileSync(file);
    manifest = JSON.parse(readFileSync(manifestFile, 'utf8'));
    policy = JSON.parse(raw.toString('utf8'));
  } catch {
    throw new Error('VERIFIED_POLICY_MISSING_OR_INVALID');
  }
  const entry = manifest?.files?.['stage9-safe-policy.json'];
  const rawDigest = createHash('sha256').update(raw).digest('hex');
  const canonicalDigest = createHash('sha256').update(JSON.stringify(policy)).digest('hex');
  if (manifest?.schema !== 'aleph.stage10.policy.manifest.v1' ||
      entry?.version !== policy.version ||
      entry?.baseCommit !== policy.baseCommit ||
      !equalHash(entry?.sha256, VERIFIED_POLICY_DIGEST) ||
      !equalHash(entry?.rawSha256, VERIFIED_POLICY_RAW_DIGEST) ||
      !equalHash(rawDigest, VERIFIED_POLICY_RAW_DIGEST) ||
      !equalHash(canonicalDigest, VERIFIED_POLICY_DIGEST) ||
      policy.baseCommit !== STAGE9_SAFE_COMMIT || policy.schema !== 'aleph.stage10.safe-policy.v1' ||
      policy.services?.notes?.allowedRoutes?.includes('GET /api/notes') ||
      policy.services?.notes?.protectedReadRoutes?.includes('GET /notes')) {
    throw new Error('VERIFIED_POLICY_MISSING_OR_INVALID');
  }
  return policy;
}
export function reloadVerifiedPolicy(first, loader = loadVerifiedPolicy) {
  const second = loader();
  if (JSON.stringify(first) !== JSON.stringify(second))
    throw new Error('VERIFIED_POLICY_CHANGED_BEFORE_WRITE');
  return second;
}
export function policyDiff(current, policy) {
  if (!current || typeof current !== 'object' || !current.services ||
      !current.services.notes || !policy?.services?.notes) throw new TypeError('invalid_test_policy');
  const before = current.services.notes, after = policy.services.notes;
  return [...new Set([...Object.keys(before), ...Object.keys(after)])].filter(k => JSON.stringify(before[k]) !== JSON.stringify(after[k]))
    .map(k => ({ field: 'services.notes.'+k, from: before[k] ?? null, to: after[k] }));
}
export function restoreTestPolicy(current, verifiedPolicy) {
  const changed = policyDiff(current, verifiedPolicy);
  return { changed, restored: {
    ...current,
    services: { ...current.services, notes: structuredClone(verifiedPolicy.services.notes) },
    auditEvents: structuredClone(current.auditEvents ?? []),
  } };
}
export function writeTestPolicy(file, policy) {
  const p = resolve(file);
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, JSON.stringify(policy, null, 2) + '\n', { flag: 'w', mode: 0o600 });
}
export function writePolicyAudit(file, changed, version) {
  const p = resolve(file);
  mkdirSync(dirname(p), { recursive: true });
  appendFileSync(p, JSON.stringify({ at: new Date().toISOString(), action: 'test_policy_restore',
    safeVersion: version, changedFields: changed.map(x => x.field) }) + '\n', { mode: 0o600 });
}
export function verifiedBackup(backup, identity, id) {
  if (!backup || typeof backup !== 'object' || identity?.kind !== 'judge' ||
      identity.identity !== 'b' || !identity.userId || !id ||
      backup.note_id !== id || backup.owner_id !== identity.ownerId ||
      backup.judge_run_id !== identity.runId || backup.judge_identity !== 'b' ||
      !backup.verified_at || !backup.captured_at ||
      !(backup.sealed_backup_sha256
        ? equalHash(noteContentHash(backup.title, backup.content), backup.sealed_backup_sha256) &&
          equalHash(createHash('sha256').update(backup.content, 'utf8').digest('hex'), backup.content_sha256)
        : equalHash(noteContentHash(backup.title, backup.content), backup.content_sha256))) return false;
  return true;
}
