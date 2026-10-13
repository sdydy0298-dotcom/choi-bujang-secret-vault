# 11단계 · 실제 심판 실행 경로 기록 확인

## 목적
반복되는 `UNV_RUN_ENVIRONMENT`의 원인이 학생 사이트의 어느 실행 단계인지 확인하기 위한 **임시 진단**입니다. 기록이 없다는 사실만으로 심판 서버 장애라고 결론 내리지 않습니다. 심판이 정적 페이지만 요청하거나 실행 자체가 시작되지 않은 경우는 사이트 DB에 기록이 남지 않을 수 있습니다.

## 기록 경로
- 브라우저 HTML 파싱: `html_loaded`
- JS 모듈 로딩: `module_started`
- 인증 설정 다운로드 및 초기화: `auth_config_loaded`, `auth_ready`
- 로그인 동작: `login_attempt`, `login_succeeded`, `login_failed`
- 기기 키쌍 생성 및 등록 요청: `device_keygen_started`, `device_request_started`, `device_request_succeeded` 또는 `device_request_failed`
- 서버의 기기 API 도착: `device_enter` → `device_identity_verified` 또는 `device_auth_rejected`
- 서버 기기 등록 완료: `device_pending_created` (**승인 완료가 아니라 pending**)
- 승인 상태 확인: `device_status_requested`, `device_status_served`, `device_approved` / `device_pending`
- 자료 API 도착: `notes_enter` → `notes_identity_verified` → `notes_device_verified` 또는 `notes_device_rejected`

브라우저 이벤트는 **자기 보고**라서 정상적인 심판 신원의 증명이 아닙니다. `judge_a`, `judge_b` 서버 이벤트는 별도로 JWT가 검증된 API에 한해서만 부여됩니다.

## 조회 (Supabase SQL Editor)
심판에 제출한 뒤 그 시각을 기준으로 아래 쿼리를 실행합니다.

```sql
SELECT occurred_at AT TIME ZONE 'Asia/Seoul' AS time_kst,
       source, route, event, actor, status_code,
       left(trace_id::text, 8) AS page_trace
FROM defense.stage11_diagnostic_events
WHERE occurred_at >= now() - interval '20 minutes'
ORDER BY occurred_at ASC, event_id ASC;
```

- 로그가 없다면 **기록 가능한 경로로 요청이 도착했다는 증거가 없는 것**입니다. 정적 HTML 요청만 했거나 심판 실행기가 시작 전 실패했을 수도 있습니다.
- `auth_config_enter`만 있다면 서버로 인증 설정 요청이 왔지만 그 뒤 단계는 관측되지 않은 것입니다.
- `device_enter`만 있으면 기기 API 호출은 도달했고 그 뒤 오류나 종료를 추가 확인해야 합니다.
- `device_auth_rejected`는 **서버가 인증을 거부**한 경우입니다.
- `device_pending_created`는 **등록만 성공**했다는 뜻입니다. 기기 승인은 DB 운영자에 의해서만 진행됩니다.
- `notes_device_rejected`는 승인/서명/재전송 등에서 **기기 서명 관문을 통과하지 못한 경우**입니다.
- `notes_device_verified`는 기기 서명이 통과했다는 뜻이며, DB 메모 접근 성공을 의미하지는 않습니다.

## 안전성과 제약
- `defense.stage11_diagnostic_events`는 RLS가 활성화된 비공개 테이블입니다. anon/authenticated에는 SELECT·INSERT·UPDATE 권한이 없습니다.
- 기록에는 **토큰, 이메일, 이름, 메모 ID·내용, IP, User-Agent, 공개키, 개인키, 기기 ID, 요청 본문**을 넣지 않습니다.
- 브라우저 추적 ID는 새 페이지마다 발급한 임의 UUID이며 쿠키·localStorage 등에 저장되지 않습니다. 저장된 브라우저 이벤트는 **심판과 학생의 신원을 구분하지 않습니다**.
- 정적 HTML의 HTTP 요청 자체는 관측하지 못하고 **자바스크립트가 실행된 이후**의 첫 신호부터 기록됩니다.
- 기존 `GET /api/auth-config`의 고정 값 두 쿼리 파라미터를 임시 관측에 재사용하므로 추가 서버리스 API 함수는 없습니다.
- 로그 저장 실패는 정상 로그인·메모 처리 성공/실패를 바꾸지 않습니다. 운영 로그는 임시 진단이므로 단계 문제를 해결한 후 정리할 예정입니다.

**실행 검증:** `npm run verify:11` + GitHub Actions `Stage 11 diagnostic probe smoke` 실행. 공식 판정 성공을 의미하지 않습니다.
