import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { loadVerifiedPolicy, policyDiff, restoreTestPolicy, writePolicyAudit, writeTestPolicy }
  from '../src/stage10-recovery.mjs';
const root = fileURLToPath(new URL('../', import.meta.url));
const testFile = resolve(root, 'artifacts/stage10-test-policy.json');
const auditFile = resolve(root, 'artifacts/stage10-policy-audit.jsonl');
const command = process.argv[2];
try {
  const safe = loadVerifiedPolicy();
  if (command === 'init-test') {
    if (existsSync(testFile)) throw new Error('TEST_POLICY_ALREADY_EXISTS');
    const syntheticUnsafeNotes = structuredClone(safe.services.notes);
    syntheticUnsafeNotes.allowedRoutes.push('GET /api/notes');
    syntheticUnsafeNotes.blockedGlobalReads = [];
    writeTestPolicy(testFile, { schema: 'aleph.stage10.test-policy.v1',
      services: { notes: syntheticUnsafeNotes, notices: { remainsUntouched: true } },
      auditEvents: [] });
    console.log('합성 시험 정책 생성. 운영 정책은 변경하지 않았습니다.');
  } else if (command === 'preview' || command === 'restore-test') {
    if (!existsSync(testFile)) throw new Error('TEST_POLICY_NOT_FOUND');
    const current = JSON.parse(readFileSync(testFile, 'utf8'));
    const changed = policyDiff(current, safe);
    console.log(JSON.stringify({ verifiedBaseline: safe.baseCommit,
      target: 'test-policy/services.notes', changed }, null, 2));
    if (command === 'restore-test') {
      if (process.argv[3] !== '--confirm') throw new Error('CONFIRMATION_REQUIRED');
      const { restored } = restoreTestPolicy(current, safe);
      writeTestPolicy(testFile, restored);
      writePolicyAudit(auditFile, changed, safe.version);
      console.log('시험 정책 notes만 복구. 다른 서비스/감사 기록 보존.');
    }
  } else {
    console.log('사용법: node scripts/stage10-policy.mjs init-test | preview | restore-test --confirm');
    process.exitCode = 1;
  }
} catch(error) {
  console.error('중단: ' + error.message);
  process.exitCode = 1;
}
