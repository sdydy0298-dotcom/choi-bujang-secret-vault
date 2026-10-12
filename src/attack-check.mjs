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

  if (config.step !== 6) throw new Error('현재 운영 자기점검은 6단계 저장점 기준입니다.');

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
  const identityOk = identity.ok && identityJson?.step === 6
    && identityJson?.repoUrl === config.repoUrl
    && /^[a-f0-9]{40}$/u.test(identityJson?.commit ?? '')
    && routesMatch && identityJson?.originalApiUrl === config.originalApiUrl;
  const pageOk = page.ok && pageHtml.includes('<title>BYTE BACK | 인증된 자료실</title>')
    && (page.headers.get('x-content-type-options') === 'nosniff'
      || Boolean(page.headers.get('content-security-policy')));
  const authConfigOk = authConfig.ok && typeof authJson?.url === 'string'
    && authJson.url.startsWith('https://')
    && typeof authJson?.publishableKey === 'string' && authJson.publishableKey.length > 0;

  return [
    check('anonymous_notes_rejected', '비로그인 메모 API는 JSON 오류로 거부됨',
      jsonRejected, 'HTTP ' + notes.status + ', JSON 오류 ' + (jsonRejected ? '확인' : '없음')),
    check('static_notes_empty', '공개 data.json의 메모는 0건임',
      staticEmpty, 'HTTP ' + data.status + ', 메모 ' + (staticEmpty ? '0건' : '확인 불가')),
    check('deployment_identity_available', '6단계·저장소·커밋·허용 경로·원본 API가 배포 식별 정보와 일치',
      identityOk, 'HTTP ' + identity.status + ', 6단계 배포 식별 ' + (identityOk ? '일치' : '불일치')),
    check('main_security_header', '자료실 첫 화면이 정상 HTML과 보안 헤더를 반환함',
      pageOk, 'HTTP ' + page.status + ', 실제 자료실/보안 헤더 ' + (pageOk ? '확인' : '확인 불가')),
    check('auth_config_available', '기존 브라우저 인증 설정 API가 정상 응답함',
      authConfigOk, 'HTTP ' + authConfig.status + ', 브라우저 인증 설정 ' + (authConfigOk ? '정상' : '확인 불가')),
  ];
}
