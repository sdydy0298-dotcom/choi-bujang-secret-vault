export async function runAttackChecks(config) {
  if (config.step !== 5) throw new Error('현재 자기점검은 5단계 저장점 기준입니다.');

  const app = new URL(config.publicAppUrl);
  const options = { redirect: 'error', signal: AbortSignal.timeout(10000) };

  const page = await fetch(new URL('/', app), options);
  const notes = await fetch(new URL('/api/notes', app), options);
  const data = await fetch(new URL('/data.json', app), options);
  const identity = await fetch(new URL('/aleph.json', app), options);

  let notesJson = null;
  let dataJson = null;
  let identityJson = null;
  try { notesJson = await notes.json(); } catch {}
  try { dataJson = await data.json(); } catch {}
  try { identityJson = await identity.json(); } catch {}

  const jsonRejected = [401, 403].includes(notes.status)
    && typeof notesJson?.error === 'string' && notesJson.error.length > 0;
  const staticEmpty = data.ok && Array.isArray(dataJson?.notes) && dataJson.notes.length === 0;
  const identityOk = identity.ok && identityJson?.step === 5
    && Array.isArray(identityJson?.allowedRoutes) && identityJson.allowedRoutes.length > 0
    && typeof identityJson?.originalApiUrl === 'string'
    && identityJson.originalApiUrl.startsWith('https://');
  const securityHeader = page.headers.get('x-content-type-options') === 'nosniff'
    || Boolean(page.headers.get('content-security-policy'));

  return [
    {
      attackId: 'anonymous_notes_rejected',
      expected: '비로그인 메모 요청은 JSON 오류로 거부됨',
      observed: jsonRejected ? `HTTP ${notes.status} JSON 오류 확인`
        : `거부 형식 확인 실패 (HTTP ${notes.status})`,
    },
    {
      attackId: 'static_notes_empty',
      expected: '공개 data.json의 메모는 0건임',
      observed: staticEmpty ? '공개 data.json의 notes가 빈 배열임'
        : `정적 자료 확인 실패 (HTTP ${data.status})`,
    },
    {
      attackId: 'deployment_identity_available',
      expected: 'aleph.json에 5단계·허용 경로·원본 HTTPS 주소가 기록됨',
      observed: identityOk ? '5단계·허용 경로·원본 HTTPS 주소 확인'
        : `배포 식별 정보 확인 실패 (HTTP ${identity.status})`,
    },
    {
      attackId: 'main_security_header',
      expected: '첫 화면에 보안 응답 헤더가 있음',
      observed: securityHeader ? '보안 응답 헤더 확인'
        : `보안 응답 헤더 확인 실패 (HTTP ${page.status})`,
    },
  ];
}
