// Stage 12 judge-isolated submission checks.
// Reachable imports use only allowed built-ins: fs and crypto(sha256/randomUUID).
// Public HTTP probes use GET exclusively. Never emulate POST/PUT/DELETE over GET.
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { checkDecider } from '../scripts/decider-test.mjs';
import { decide, RULE_IDS } from './decider.mjs';
import { detect } from './detect.mjs';

const digest = bytes => createHash('sha256').update(bytes).digest('hex');
// The judge requires a network request recorded under exactly this attackId.
// These local fixtures and untagged public GETs have NO such matching log.
// Report "not_run" until a genuine matching execution trace is available.
const check = (attackId, expected, _passed, _detail) => ({
  attackId, expected, observed: 'not_run'
});
const unreadable = { status: null, body: null, securityHeader: null };
async function publicGet(base, path) {
  try {
    const response = await fetch(new URL(path, base), {
      method: 'GET', redirect: 'error', cache: 'no-store'
    });
    let body = null;
    try {
      body = path === '/' ? await response.text() : await response.json();
    } catch { /* A malformed/non-JSON response is a failed observation. */ }
    return {
      status: response.status,
      body,
      securityHeader: response.headers?.get('x-content-type-options') ?? null
    };
  } catch {
    // A failed request has no actual HTTP status; never invent a response.
    return unreadable;
  }
}
function httpCheck(attackId, expected, response, passed, detail) {
  return check(attackId, expected, passed,
    response.status === null ? '공개 HTTPS GET 응답을 받지 못함' : 'GET HTTP ' + response.status + ', ' + detail);
}
function verifiedPolicySnapshot() {
  // Immutable independently pinned SHA-256 values from the approved stage-9 baseline.
  // Do not accept a forged backup merely because its manifest was changed too.
  const rawSha = '9f9d8cda19f2ec116176007b72c552488db6b789491c224c3cdfa3b1c7c69646';
  const canonicalSha = '6afb1c0d5a6be13f35ea1ec60817169253141815b84d5543469882244c527769';
  const safeCommit = 'd1004397ac47317cfdedddb483a652c1c300f8e2';
  try {
    const raw = readFileSync(new URL('../recovery/stage9-safe-policy.json', import.meta.url));
    const manifest = JSON.parse(readFileSync(new URL('../recovery/MANIFEST.json', import.meta.url), 'utf8'));
    const policy = JSON.parse(raw.toString('utf8'));
    const entry = manifest?.files?.['stage9-safe-policy.json'];
    return digest(raw) === rawSha
      && digest(JSON.stringify(policy)) === canonicalSha
      && manifest?.schema === 'aleph.stage10.policy.manifest.v1'
      && entry?.rawSha256 === rawSha && entry?.sha256 === canonicalSha
      && entry?.version === policy.version && entry?.baseCommit === policy.baseCommit
      && policy.baseCommit === safeCommit && policy.schema === 'aleph.stage10.safe-policy.v1'
      && !policy.services?.notes?.allowedRoutes?.includes('GET /api/notes')
      && !policy.services?.notes?.protectedReadRoutes?.includes('GET /notes');
  } catch {
    return false;
  }
}
function reads(count, opts = {}) {
  const first = Date.UTC(2026, 9, 1);
  const interval = opts.interval ?? 2000;
  const subject = opts.subject ?? 'learner_fixture';
  return Array.from({ length: count }, (_, index) => ({
    at: new Date(first + index * interval).toISOString(),
    method: 'GET',
    identity: { sub: subject }
  }));
}
async function virtualDecisionChecks() {
  const checks = await checkDecider({ decide, ruleIds: RULE_IDS });
  const names = [
    ['stage7_normal_allow', '등록 기기의 정상 가상 접속 허용'],
    ['stage7_unregistered_deny', '미등록 기기 가상 요청 거부'],
    ['stage7_composite_step_up', '복합 이상 가상 요청 추가 확인'],
    ['stage7_reverified_allow', '재확인된 복합 이상 가상 요청 허용']
  ];
  return names.map(([id, expected], index) =>
    check(id, expected, checks[index]?.passed === true, '로컬 가상 판정기: ' + (checks[index]?.name ?? '실행 누락')));
}
async function zoneChecks(noticeResponse) {
  const req = {
    schema: 'aleph.decision.v1', requestId: 'stage8-practice',
    classId: 'class_fixture', projectId: 'project_fixture',
    subjectId: 'learner_fixture', deviceId: 'aaaaaaaaaaaaaaaa',
    deviceRegistered: true, service: 'notes',
    method: 'GET', route: 'GET /notes/:id',
    path: '/notes/demo', queryLength: 0,
    signals: { source: 'none' }, recentEvents: []
  };
  const decision = async fields => (await decide({ ...req, ...fields })).decision;
  const [own, ownUpdate, cross, crossUpdate, allNotes, personalList] = await Promise.all([
    decision({}),
    decision({ method: 'PUT', route: 'PUT /notes/:id' }),
    decision({ subjectId: 'other_student' }),
    decision({ subjectId: 'other_student', method: 'PUT', route: 'PUT /notes/:id' }),
    decision({ route: 'GET /api/notes', path: '/api/notes' }),
    decision({ route: 'GET /api/my/notes', path: '/api/my/notes' })
  ]);
  return [
    check('stage8_known_zone_allow', '가상 본인 메모 조회 허용', own === 'allow', '로컬 판정: ' + own),
    httpCheck('stage8_unauthorized_notices', '무인증 공지 목록 거부', noticeResponse,
      [401, 403].includes(noticeResponse.status) && !!noticeResponse.body?.error, 'JSON 거부 확인'),
    check('stage8_global_notes_list_denied', '전역 메모 목록 차단', allNotes === 'deny', '로컬 판정: ' + allNotes),
    check('stage8_notes_write_denied', '가상 타인 메모 변경 차단', crossUpdate === 'deny', '로컬 판정: ' + crossUpdate),
    check('stage8_own_note_update_allow', '가상 본인 메모 변경 허용', ownUpdate === 'allow', '로컬 판정: ' + ownUpdate),
    check('stage8_cross_owner_read_denied', '가상 타인 메모 조회 차단', cross === 'deny', '로컬 판정: ' + cross),
    check('stage8_my_list_route_allowed', '개인 메모 목록 경로 허용', personalList === 'allow', '로컬 판정: ' + personalList)
  ];
}
function detectionChecks() {
  const burst = [121, 200].every(n => {
    const result = detect(reads(n));
    return result.action === 'propose_revocation'
      && result.reasonCode === 'burst_read' && result.subject === 'learner_fixture';
  });
  const normal = [30, 120].every(n => detect(reads(n)).action === 'observe')
    && detect([...reads(100), ...reads(100, { subject: 'other_fixture' })]).action === 'observe'
    && detect(reads(200, { interval: 7000 })).action === 'observe';
  return [
    check('stage9_burst_revocation_proposed',
      '121회 이상 GET 가상 사건에만 회수 제안', burst, '로컬 detect 가상 사건'),
    check('stage9_normal_requests_preserved',
      '정상·경계·다른 사용자·분산된 사건 유지', normal, '로컬 detect 가상 사건')
  ];
}
export async function runAttackChecks(config) {
  const origin = new URL(config.publicAppUrl);
  if (origin.protocol !== 'https:' || origin.username || origin.password ||
      origin.search || origin.hash || origin.pathname !== '/') {
    throw new Error('STAGE12_HTTPS_ORIGIN_INVALID');
  }
  const paths = ['/', '/api/notes', '/data.json', '/aleph.json', '/api/auth-config', '/api/notices'];
  const responses = await Promise.all(paths.map(path => publicGet(origin, path)));
  const [page, notes, data, identity, auth, notices] = responses;
  const deniedNotes = [401, 403].includes(notes.status) && typeof notes.body?.error === 'string';
  const emptyStatic = data.status === 200 && Array.isArray(data.body?.notes) && data.body.notes.length === 0;
  const routesMatch = Array.isArray(identity.body?.allowedRoutes)
    && identity.body.allowedRoutes.length === config.allowedRoutes.length
    && identity.body.allowedRoutes.every((route, index) => route === config.allowedRoutes[index]);
  const deploymentMatches = identity.status === 200 && identity.body?.step === 12
    && identity.body?.repoUrl === config.repoUrl
    && /^[a-f0-9]{40}$/u.test(identity.body?.commit ?? '')
    && identity.body?.originalApiUrl === config.originalApiUrl && routesMatch;
  const firstPage = page.status === 200 && typeof page.body === 'string'
    && page.body.includes('<title>BYTE BACK | 인증된 자료실</title>')
    && (page.securityHeader === 'nosniff' || page.body.includes('Content-Security-Policy'));
  const authAvailable = auth.status === 200 && typeof auth.body?.url === 'string'
    && auth.body.url.startsWith('https://')
    && typeof auth.body?.publishableKey === 'string' && auth.body.publishableKey.length > 0;
  const http = [
    httpCheck('anonymous_notes_rejected', '무인증 메모 GET 거부', notes, deniedNotes, 'JSON 오류 확인'),
    httpCheck('static_notes_empty', '공개 정적 파일의 메모 0건', data, emptyStatic, '메모 0건 확인'),
    httpCheck('deployment_identity_available', '12단계 저장소 및 배포 식별 확인', identity,
      deploymentMatches, '배포 식별 정보 대조'),
    httpCheck('main_security_header', '자료실 첫 화면 및 보안 헤더 확인', page, firstPage, 'HTML 보안 헤더'),
    httpCheck('auth_config_available', '공개 인증 설정 GET 확인', auth, authAvailable, '인증 설정 응답')
  ];
  const checkedPolicy = verifiedPolicySnapshot();
  const records = [
    ...http,
    ...(await virtualDecisionChecks()),
    ...(await zoneChecks(notices)),
    ...detectionChecks(),
    check('stage10_verified_policy_snapshot',
      '9단계 고정 정책 파일을 독립 SHA-256으로 검증', checkedPolicy,
      checkedPolicy ? '고정 정책 원본 바이트 및 의미 해시 일치' : '고정 정책 사본 검증 실패'),
    {
      attackId: 'stage10_unauthorized_restore_rejected',
      expected: '무인증 POST /api/restore 거부',
      observed: 'not_run'
    }
  ];
  if (records.length !== 20 || new Set(records.map(row => row.attackId)).size !== 20)
    throw new Error('STAGE12_EVIDENCE_COUNT_INVALID');
  return records;
}
