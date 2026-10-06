// The student changes this check as each stage adds an attack to the same app.
// Never return tokens, private keys, real names, or note bodies.
export async function runAttackChecks(config) {
  if (![1, 2, 3].includes(config.step)) throw new Error('이 단계의 공격 점검을 src/attack-check.mjs에 구현해 주세요.');
  let app;
  try {
    app = new URL(config.publicAppUrl);
  } catch {
    throw new Error('aleph.config.json의 실제 배포 주소를 먼저 넣어 주세요.');
  }
  if (app.protocol !== 'https:' || app.username || app.password || app.search || app.hash
      || app.pathname !== '/' || app.hostname.endsWith('.example')) {
    throw new Error('aleph.config.json의 실제 배포 주소를 먼저 넣어 주세요.');
  }
  if (typeof config.sampleMarker !== 'string' || !config.sampleMarker) throw new Error('가상 메모의 확인 표시를 넣어 주세요.');

  if (config.step === 1) {
    const response = await fetch(new URL('/data.json', app), {
      redirect: 'error', signal: AbortSignal.timeout(10000),
    });
    let visible = false;
    if (response.ok) {
      try {
        const data = await response.json();
        visible = data?.sampleMarker === config.sampleMarker && Array.isArray(data.notes)
          && data.notes.length > 0;
      } catch {}
    }
    return [{
      attackId: 'anonymous_note_read',
      expected: '비로그인 화면에서 가상 메모를 확인',
      observed: visible ? '비로그인 요청에서 공개 가상 메모 확인 표시가 보임'
        : `비로그인 요청에서 확인 표시가 보이지 않음 (HTTP ${response.status})`,
    }];
  }

  if (config.step === 2) {
    const pageResponse = await fetch(new URL('/', app), {
      redirect: 'error', signal: AbortSignal.timeout(10000),
    });
    const staticResponse = await fetch(new URL('/data.json', app), {
      redirect: 'error', signal: AbortSignal.timeout(10000),
    });
    let staticProtected = false;
    if (staticResponse.ok) {
      try {
        const data = await staticResponse.json();
        staticProtected = Array.isArray(data?.notes) && data.notes.length === 0
          && !Object.prototype.hasOwnProperty.call(data, 'sampleMarker');
      } catch {}
    }

    const apiResponse = await fetch(new URL('/api/notes', app), {
      redirect: 'error', signal: AbortSignal.timeout(10000),
    });
    let anonymousApiVisible = false;
    if (apiResponse.ok) {
      try {
        const data = await apiResponse.json();
        anonymousApiVisible = Array.isArray(data.notes) && data.notes.length === 4;
      } catch {}
    }

    return [
      {
        attackId: 'main_page_available',
        expected: '비로그인 GET / 요청에서 자료실 화면 진입점이 정상 응답함',
        observed: pageResponse.ok ? '메인 화면 진입점이 HTTP 200대로 응답함'
          : `메인 화면 진입점 응답을 확인하지 못함 (HTTP ${pageResponse.status})`,
      },
      {
        attackId: 'static_note_seed_removed',
        expected: '비로그인 /data.json에는 가상 메모가 남지 않음',
        observed: staticProtected ? '공개 data.json의 notes가 빈 배열임'
          : `공개 data.json 보호 상태를 확인하지 못함 (HTTP ${staticResponse.status})`,
      },
      {
        attackId: 'anonymous_api_read',
        expected: '2단계에서는 공개 API가 남은 약점으로 관찰됨',
        observed: anonymousApiVisible ? '비로그인 /api/notes가 가상 메모 네 건을 반환함'
          : `비로그인 API에서 가상 메모 네 건을 확인하지 못함 (HTTP ${apiResponse.status})`,
      },
    ];
  }

  const pageResponse = await fetch(new URL('/', app), {
    redirect: 'error', signal: AbortSignal.timeout(10000),
  });
  const securityHeader = pageResponse.headers.get('x-content-type-options') === 'nosniff'
    || Boolean(pageResponse.headers.get('content-security-policy'));

  const staticResponse = await fetch(new URL('/data.json', app), {
    redirect: 'error', signal: AbortSignal.timeout(10000),
  });
  let staticProtected = false;
  if (staticResponse.ok) {
    try {
      const data = await staticResponse.json();
      staticProtected = Array.isArray(data?.notes) && data.notes.length === 0
        && !Object.prototype.hasOwnProperty.call(data, 'sampleMarker');
    } catch {}
  }

  const apiResponse = await fetch(new URL('/api/notes', app), {
    redirect: 'error', signal: AbortSignal.timeout(10000),
  });
  let anonymousRejectedWithJson = false;
  try {
    const data = await apiResponse.json();
    anonymousRejectedWithJson = [401, 403].includes(apiResponse.status)
      && typeof data?.error === 'string' && data.error.length > 0;
  } catch {}

  const identityResponse = await fetch(new URL('/aleph.json', app), {
    redirect: 'error', signal: AbortSignal.timeout(10000),
  });
  let deploymentIdentityOk = false;
  if (identityResponse.ok) {
    try {
      const data = await identityResponse.json();
      deploymentIdentityOk = data?.step === 3;
    } catch {}
  }

  return [
    {
      attackId: 'anonymous_notes_rejected',
      expected: '비로그인 메모 목록 요청은 401 또는 403 JSON 오류로 거부됨',
      observed: anonymousRejectedWithJson
        ? `비로그인 /api/notes가 HTTP ${apiResponse.status} JSON 오류로 거부됨`
        : `비로그인 API 거부 형식을 확인하지 못함 (HTTP ${apiResponse.status})`,
    },
    {
      attackId: 'static_notes_empty',
      expected: '공개 /data.json에는 메모가 남지 않음',
      observed: staticProtected ? '공개 data.json의 notes가 빈 배열임'
        : `공개 data.json 보호 상태를 확인하지 못함 (HTTP ${staticResponse.status})`,
    },
    {
      attackId: 'deployment_identity_available',
      expected: '배포 /aleph.json이 열리고 3단계 식별 정보가 있음',
      observed: deploymentIdentityOk ? '배포 aleph.json의 step이 3임'
        : `배포 식별 정보를 확인하지 못함 (HTTP ${identityResponse.status})`,
    },
    {
      attackId: 'main_security_header',
      expected: '첫 화면 응답에 nosniff 또는 Content-Security-Policy가 있음',
      observed: securityHeader ? '첫 화면 응답에서 보안 헤더를 확인함'
        : `첫 화면 보안 헤더를 확인하지 못함 (HTTP ${pageResponse.status})`,
    },
  ];
}
