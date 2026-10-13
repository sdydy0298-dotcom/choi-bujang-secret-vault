import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const root = resolve(import.meta.dirname, '..');
const git = (...args) => execFileSync('git', ['-C', root, ...args], {
  encoding: 'utf8', timeout: 5000, maxBuffer: 512 * 1024, windowsHide: true,
  env: { ...process.env, GIT_TERMINAL_PROMPT: '0', GIT_OPTIONAL_LOCKS: '0' },
}).trim();
const fromCommit = (path) => JSON.parse(git('show', `HEAD:${path}`));
const fail = (message) => { throw new Error(message); };
const secretPattern = /-----BEGIN [A-Z ]*PRIVATE KEY-----|\bBearer\s+[A-Za-z0-9._~+/-]{16,}|\bsb_secret_[A-Za-z0-9_-]{12,}|\bsk-[A-Za-z0-9_-]{20,}|\beyJ[A-Za-z0-9_-]{12,}\.eyJ[A-Za-z0-9_-]{12,}\.[A-Za-z0-9_-]{8,}|[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/iu;
const repository = /^https:\/\/github\.com\/([A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?)\/([A-Za-z0-9._-]{1,100})\/?$/iu;
const normalizedRepo = value => {
  const match = typeof value === 'string' && value.length <= 250 && repository.exec(value);
  if (!match) fail('GitHub HTTPS 저장소 주소를 origin으로 등록해 주세요.');
  const repo = match[2].toLowerCase().replace(/\.git$/u, '');
  if (repo === '.' || repo === '..' || repo === '.git' || repo.endsWith('.git')) {
    fail('GitHub HTTPS 저장소 주소를 origin으로 등록해 주세요.');
  }
  return `https://github.com/${match[1].toLowerCase()}/${repo}`;
};

try {
  const dirty = git('status', '--porcelain', '--untracked-files=all');
  if (dirty) fail(`커밋되지 않은 파일이 있습니다. 먼저 확인해 주세요:\n${dirty}`);
  const commit = git('rev-parse', '--verify', 'HEAD');
  let repoUrl;
  try {
    const raw = git('config', '--local', '--no-includes', '--get', 'remote.origin.url');
    const effective = git('remote', 'get-url', 'origin');
    repoUrl = normalizedRepo(raw);
    if (normalizedRepo(effective) !== repoUrl) fail('origin 주소가 Git 설정에서 바뀌었습니다. 저장소 설정을 확인해 주세요.');
  } catch (error) {
    if (error.message?.startsWith('origin 주소가') || error.message?.startsWith('GitHub HTTPS')) throw error;
    fail('GitHub HTTPS 저장소 주소를 origin으로 등록해 주세요.');
  }
  const changedFiles = git('diff-tree', '--root', '--no-commit-id', '--name-only', '--no-renames', '-r', commit)
    .split(/\r?\n/u).filter(Boolean).sort();
  if (!changedFiles.length) fail('마지막 커밋에 바뀐 파일이 없습니다.');
  const config = fromCommit('aleph.config.json');
  if (normalizedRepo(config.repoUrl) !== repoUrl) {
    fail('aleph.config.json의 repoUrl이 Git origin 주소와 다릅니다. 같은 저장소 주소로 맞춰 주세요.');
  }
  const notes = JSON.parse(readFileSync(join(root, 'bundle-notes.json'), 'utf8'));
  if (!Number.isInteger(config.step) || config.step < 1 || config.step > 12) fail('aleph.config.json의 step을 확인해 주세요.');
  if (config.step >= 3 && (!config.identityProvider || typeof config.identityProvider !== 'object'
      || ['issuer', 'audience', 'jwksUrl'].some((key) => typeof config.identityProvider[key] !== 'string'
        || !config.identityProvider[key].trim()))) {
    fail('3단계부터 aleph.config.json의 identityProvider에 발급자·대상·공개키 주소가 필요합니다. 3단계 제작 2를 다시 확인해 주세요.');
  }
  if (config.step >= 5 && (typeof config.originalApiUrl !== 'string'
      || !config.originalApiUrl.startsWith('https://'))) {
    fail('5단계부터 aleph.config.json의 originalApiUrl에 원본 자료 API의 HTTPS 주소가 필요합니다. 5단계 제작 2를 다시 확인해 주세요.');
  }
  if (config.step >= 3 && (!Array.isArray(config.allowedRoutes) || !config.allowedRoutes.length)) {
    fail('3단계부터 aleph.config.json의 allowedRoutes에 자료 API 경로가 필요합니다. 3단계 제작 3을 다시 확인해 주세요.');
  }
  const deciderUrl = pathToFileURL(join(root, 'src', 'decider.mjs'));
  const { RULE_IDS } = await import(deciderUrl.href);
  if (!Array.isArray(RULE_IDS)) fail('src/decider.mjs의 RULE_IDS는 규칙 이름 배열이어야 합니다.');
  const policyRules = [...RULE_IDS];
  if (policyRules.length > 80 || policyRules.some(item => typeof item !== 'string'
      || !/^[a-z][a-z0-9_.-]{0,79}$/iu.test(item)) || new Set(policyRules).size !== policyRules.length) {
    fail('src/decider.mjs의 RULE_IDS 이름과 중복을 확인해 주세요.');
  }
  if (typeof notes.explanation !== 'string' || notes.explanation.trim().length < 10) {
    fail('bundle-notes.json의 explanation에 이번 단계에서 한 일을 세 줄로 적어 주세요.');
  }
  const checkerUrl = pathToFileURL(join(root, 'src', 'attack-check.mjs'));
  const { runAttackChecks } = await import(checkerUrl.href);
  if (typeof runAttackChecks !== 'function') fail('src/attack-check.mjs가 runAttackChecks를 내보내야 합니다.');
  const attackAttempts = await runAttackChecks(config);
  if (!Array.isArray(attackAttempts) || !attackAttempts.length || attackAttempts.length > 20) {
    fail('직접 실행한 공격 점검 결과 1~20개가 필요합니다.');
  }
  for (const attempt of attackAttempts) {
    if (!attempt || typeof attempt !== 'object' || Array.isArray(attempt)
        || Object.keys(attempt).sort().join(',') !== 'attackId,expected,observed'
        || typeof attempt.attackId !== 'string' || !/^[a-z0-9][a-z0-9_.-]{0,79}$/iu.test(attempt.attackId)
        || typeof attempt.expected !== 'string' || !attempt.expected.trim() || attempt.expected.length > 300
        || typeof attempt.observed !== 'string' || !attempt.observed.trim() || attempt.observed.length > 300) {
      fail('공격 점검 결과에는 attackId·expected·observed만 넣어 주세요.');
    }
  }
  if (new Set(attackAttempts.map(item => item.attackId)).size !== attackAttempts.length) {
    fail('공격 점검 ID가 중복되었습니다.');
  }
  if ([6, 7, 8, 9, 10, 11].includes(config.step)) {
    const required = ['anonymous_notes_rejected', 'static_notes_empty',
      'deployment_identity_available', 'main_security_header', 'auth_config_available'];
    for (const id of required) {
      const attempt = attackAttempts.find(item => item.attackId === id);
      if (!attempt || !attempt.observed.startsWith('통과:')) {
        fail(config.step + '단계 공개 배포 자기점검 실패: ' + id
          + (attempt ? ' (' + attempt.observed + ')' : ' (미실행)'));
      }
    }
    if (!/(기기|등록|device)/iu.test(notes.explanation)) {
      fail('bundle-notes.json의 explanation에 기기 규칙 설명을 작성해 주세요.');
    }
    if ([7, 8, 9, 10, 11].includes(config.step)) {
      const fixtureIds = ['stage7_normal_allow', 'stage7_unregistered_deny',
        'stage7_composite_step_up', 'stage7_reverified_allow'];
      for (const id of fixtureIds) {
        const record = attackAttempts.find(item => item.attackId === id);
        if (!record || !record.observed.startsWith('통과:')) {
          fail('7단계 가상 판정 확인 실패: ' + id);
        }
      }
      const live = attackAttempts.find(item => item.attackId === 'stage7_live_relogin');
      if (config.step === 7 && (!live || !live.observed.startsWith('미실행:'))) {
        fail('운영 엔진의 실측 여부를 사실대로 기록해 주세요.');
      }
      if (!/(7단계|추가 확인|복합 이상)/iu.test(notes.explanation)) {
        fail('bundle-notes.json에 이번 7단계 구현·확인 내용을 적어 주세요.');
      }
    }
    if(config.step>=8){
      const stage8Required = ['stage8_known_zone_allow','stage8_unknown_route_deny','stage8_unauthorized_notices',
        'stage8_global_notes_list_denied','stage8_notes_write_denied','stage8_student_notice_write_denied',
        'stage8_own_note_update_allow','stage8_cross_owner_read_denied','stage8_my_list_route_allowed',
        ...(config.step===8 ? ['stage8_scoped_list_unauthorized'] : [])];
      for(const id of stage8Required){
        // All stage-8 regression tests still run under verify:10. The <=20
        // submission summary omits two redundant stage-8 evidence entries.
        if (config.step >= 10 && ['stage8_unknown_route_deny',
          'stage8_student_notice_write_denied'].includes(id)) continue;
        const c=attackAttempts.find(x=>x.attackId===id);
        if(!c||!c.observed.startsWith('통과:'))fail('8단계 자원 구역 검사 실패: '+id);
      }
      if(config.step===8){
        const live=attackAttempts.find(x=>x.attackId==='stage8_live_cross_owner');
        if(!live||!live.observed.startsWith('미실행:'))fail('운영 A/B 계정 직접 API 시험은 미실행으로 기록해 주세요.');
      }
    }
    if(config.step>=9){
      for(const id of ['stage9_burst_revocation_proposed','stage9_normal_requests_preserved']){
        const check=attackAttempts.find(x=>x.attackId===id);
        if(!check||!check.observed.startsWith('통과:'))fail('9단계 가상 탐지 검사 실패: '+id);
      }
    }
  }
  if (config.step >= 10) {
    if (config.restoreRoute !== '/api/restore') fail('10단계 복원 경로 설정 오류');
    for (const id of ['stage10_verified_policy_snapshot','stage10_unauthorized_restore_rejected']) {
      const item = attackAttempts.find(x => x.attackId === id);
      if (!item || !item.observed.startsWith('통과:')) fail('10단계 점검 실패: '+id);
    }
  }
  const bundle = {
    schema: 'aleph.defense.submission.v2', step: config.step, commit, repoUrl,
    changedFiles, policyRules,
    attackAttempts, explanation: notes.explanation.trim(), blockedAt: notes.blockedAt ?? null,
    identityProvider: config.identityProvider ?? null, allowedRoutes: config.allowedRoutes ?? [],
    originalApiUrl: config.originalApiUrl ?? null, restoreRoute: config.restoreRoute ?? null,
  };
  if (secretPattern.test(JSON.stringify(bundle))) fail('제출 묶음에 비밀값 또는 연락처로 보이는 내용이 있습니다.');
  mkdirSync(join(root, 'artifacts'), { recursive: true });
  const output = join(root, 'artifacts', 'submission.json');
  writeFileSync(output, `${JSON.stringify(bundle, null, 2)}\n`, { encoding: 'utf8', flag: 'w' });
  process.stdout.write(`제출 묶음 JSON 생성: ${output}\n단계 ${bundle.step} · 커밋 ${commit.slice(0, 12)} · 바뀐 파일 ${changedFiles.length}개 · 규칙 ${policyRules.length}개 · 직접 점검 ${attackAttempts.length}개\n`);
} catch (error) {
  process.stderr.write(`제출 묶음 생성 중 첫 오류: ${error.message}\n`);
  process.exitCode = 1;
}
