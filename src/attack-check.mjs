import { checkDecider } from '../scripts/decider-test.mjs';
import { decide, RULE_IDS } from './decider.mjs';
import { detect } from './detect.mjs';
import { checkDetection } from '../scripts/detect-test.mjs';

const readJson = async response => {
  try { return await response.json(); } catch { return null; }
};
const check = (attackId, expected, passed, detail) => ({
  attackId, expected, observed: (passed ? '통과' : '확인 실패') + ': ' + detail,
});

export async function runAttackChecks(config) {
  const app = new URL(config.publicAppUrl);
  const options = { cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(10000) };

  // Preserve the starter's original stage-1 test for test:r5 compatibility.
  if (config.step === 1) {
    const response = await fetch(new URL('/data.json', app), options);
    const data = await readJson(response);
    const exposed = response.ok && data?.sampleMarker === config.sampleMarker
      && Array.isArray(data?.notes) && data.notes.length > 0;
    return [{ attackId: 'public_sample_marker',
      expected: '1단계 공개 가상 메모의 확인 표시가 보임',
      observed: exposed ? '확인 표시가 보임' : '확인 표시가 보이지 않음' }];
  }

  if (![6, 7, 8, 9].includes(config.step)) throw new Error('현재 운영 자기점검은 6~9단계 저장점을 지원합니다.');

  const [page, notes, data, identity, authConfig] = await Promise.all([
    '/', '/api/notes', '/data.json', '/aleph.json', '/api/auth-config',
  ].map(path => fetch(new URL(path, app), options)));
  const [pageHtml, notesJson, dataJson, identityJson, authJson] = await Promise.all([
    page.text(), readJson(notes), readJson(data), readJson(identity), readJson(authConfig),
  ]);

  const jsonRejected = [401, 403].includes(notes.status)
    && typeof notesJson?.error === 'string' && notesJson.error.length > 0;
  const staticEmpty = data.ok && Array.isArray(dataJson?.notes) && dataJson.notes.length === 0;
  const routesMatch = Array.isArray(identityJson?.allowedRoutes)
    && identityJson.allowedRoutes.length === config.allowedRoutes.length
    && identityJson.allowedRoutes.every((route, i) => route === config.allowedRoutes[i]);
  const identityOk = identity.ok && identityJson?.step === config.step
    && identityJson?.repoUrl === config.repoUrl
    && /^[a-f0-9]{40}$/u.test(identityJson?.commit ?? '')
    && routesMatch && identityJson?.originalApiUrl === config.originalApiUrl;
  const pageOk = page.ok && pageHtml.includes('<title>BYTE BACK | 인증된 자료실</title>')
    && (page.headers.get('x-content-type-options') === 'nosniff'
      || Boolean(page.headers.get('content-security-policy')));
  const authConfigOk = authConfig.ok && typeof authJson?.url === 'string'
    && authJson.url.startsWith('https://')
    && typeof authJson?.publishableKey === 'string' && authJson.publishableKey.length > 0;

  const httpChecks = [
    check('anonymous_notes_rejected', '비로그인 메모 API는 JSON 오류로 거부됨',
      jsonRejected, 'HTTP ' + notes.status + ', JSON 오류 ' + (jsonRejected ? '확인' : '없음')),
    check('static_notes_empty', '공개 data.json의 메모는 0건임',
      staticEmpty, 'HTTP ' + data.status + ', 메모 ' + (staticEmpty ? '0건' : '확인 불가')),
    check('deployment_identity_available', `${config.step}단계·저장소·커밋·허용 경로·원본 API가 배포 식별 정보와 일치`,
      identityOk, 'HTTP ' + identity.status + ', ' + config.step + '단계 배포 식별 ' + (identityOk ? '일치' : '불일치')),
    check('main_security_header', '자료실 첫 화면이 정상 HTML과 보안 헤더를 반환함',
      pageOk, 'HTTP ' + page.status + ', 실제 자료실/보안 헤더 ' + (pageOk ? '확인' : '확인 불가')),
    check('auth_config_available', '기존 브라우저 인증 설정 API가 정상 응답함',
      authConfigOk, 'HTTP ' + authConfig.status + ', 브라우저 인증 설정 ' + (authConfigOk ? '정상' : '확인 불가')),
  ];
  if (config.step === 6) return httpChecks;

  // These are actual executed local fixture calls, not a live identity or mTLS test.
  const virtualChecks = await checkDecider({ decide, ruleIds: RULE_IDS });
  const cases = [
    ['stage7_normal_allow', '등록 기기의 정상 가상 접속 허용'],
    ['stage7_unregistered_deny', '미등록 기기 가상 요청 거부'],
    ['stage7_composite_step_up', '복합 이상 가상 요청 추가 확인'],
    ['stage7_reverified_allow', '엔진 재확인 표시가 있는 가상 요청 허용'],
  ];
  const fixtures = cases.map(([attackId,expected],i) =>
    check(attackId,expected,virtualChecks[i]?.passed === true,
      '로컬 판정기 실행: ' + (virtualChecks[i]?.name || '실행 누락')));
  const live = {
    attackId:'stage7_live_relogin',
    expected:'실제 운영 엔진에서 인증 전 메모 거부와 재로그인 뒤 새 요청 허용',
    observed:'미실행: 학생 서버에서는 엔진 재로그인 세션·시각을 실측할 수 없어 심판에 위임',
  };
  if(config.step>=8){
    const req={schema:'aleph.decision.v1',requestId:'stage8-practice',
      classId:'class_fixture',projectId:'project_fixture',
      subjectId:'learner_fixture',deviceId:'aaaaaaaaaaaaaaaa',
      deviceRegistered:true,service:'notes',method:'GET',
      route:'GET /notes/:id',path:'/notes/demo',queryLength:0,
      signals:{source:'none'},recentEvents:[]};
    const test=async changes=>(await decide({...req,...changes})).decision;
    const own=await test({});
    const ownUpdate=await test({method:'PUT',route:'PUT /notes/:id'});
    const cross=await test({subjectId:'other_student'});
    const crossUpdate=await test({subjectId:'other_student',method:'PUT',route:'PUT /notes/:id'});
    const allNotes=await test({route:'GET /api/notes',path:'/api/notes'});
    const unboundList=await test({route:'GET /api/my/notes',path:'/api/my/notes'});
    const unknown=await test({path:'/notes/export'});
    const noticeWrite=await test({method:'PUT',route:'PUT /api/notices/:id',
      path:'/api/notices/11111111-1111-4111-8111-111111111111'});
    const [notice,scopedList]=await Promise.all([
      fetch(new URL('/api/notices',app),options),
      fetch(new URL('/api/my/notes',app),options)
    ]);
    const [noticeBody,scopedBody]=await Promise.all([readJson(notice),readJson(scopedList)]);
    const stage8Checks = [...httpChecks,...fixtures,
      check('stage8_known_zone_allow','공식 가상 자기 메모 GET 허용',own==='allow',own),
      check('stage8_unknown_route_deny','export 기능 경로 거부',unknown==='deny',unknown),
      check('stage8_unauthorized_notices','비로그인 공지 API 거부',
        [401,403].includes(notice.status)&&!!noticeBody?.error,'HTTP '+notice.status),
      check('stage8_global_notes_list_denied','전체 메모 목록 경로는 판정기에서 거부',allNotes==='deny',allNotes),
      check('stage8_notes_write_denied','타인 메모 수정 거부',crossUpdate==='deny',crossUpdate),
      check('stage8_student_notice_write_denied','학생 공지 수정 거부',noticeWrite==='deny',noticeWrite),
      check('stage8_own_note_update_allow','공식 가상 본인 PUT 허용',ownUpdate==='allow',ownUpdate),
      check('stage8_cross_owner_read_denied','타인 단건 GET 거부',cross==='deny',cross),
      check('stage8_my_list_route_allowed','본인 메모 목록 경로 허용',unboundList==='allow',unboundList),
      check('stage8_scoped_list_unauthorized','비로그인 본인 목록 API 거부',
        [401,403].includes(scopedList.status)&&!!scopedBody?.error,'HTTP '+scopedList.status),
      {attackId:'stage8_live_cross_owner',expected:'실제 A/B 사용자 간 메모 API 요청 확인',
       observed:'미실행: 심판 비공개 요청과 실제 운영 사용자 소유 관계 확인이 필요'}
    ];
    if(config.step===8) return stage8Checks;

    // The submission contract permits at most 20 attackAttempts. Keep the
    // previous stage's executed checks and make room for the two actual
    // stage-9 detector fixture checks. Do not mislabel local fixtures as a
    // completed engine revocation or re-login trial.
    const detectionResults=await checkDetection(detect);
    const proposed=[2,3].every(i=>detectionResults[i]?.passed===true);
    const normal=[0,1,4,5].every(i=>detectionResults[i]?.passed===true);
    const compactPrior=stage8Checks.filter(({attackId})=>
      attackId!=='stage8_live_cross_owner' &&
      attackId!=='stage8_scoped_list_unauthorized');
    return [
      ...compactPrior,
      check('stage9_burst_revocation_proposed',
        '10분 120건 초과 GET 가상 사건만 대상 subject와 burst_read 제안',
        proposed,'공식 detect:test 중 121/200건 가상 사례'),
      check('stage9_normal_requests_preserved',
        '정상·120건 경계·타인 합산·시간 분산 사건은 observe',
        normal,'공식 detect:test 중 정상·경계·혼합·분산 사례')
    ];
  }
  return [...httpChecks, ...fixtures, live];
}
