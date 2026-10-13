# 11단계 · 설치형 자료실과 승인 기기 서명

## 기능과 제약

- 1~10단계의 자료·정책 파일은 유지하고 기존 화면에 웹앱 manifest, 아이콘, 오프라인 안내를 추가합니다.
- 웹앱 설치 표시는 기기 승인 증거가 아니며, Service Worker는 오프라인 안내문만 캐시합니다.
- 브라우저의 Supabase Auth REST 로그인은 같은 출처 `/auth-client.js`가 처리하며 세션은 JavaScript 메모리에만 보관합니다. JWT와 개인키를 localStorage, sessionStorage, IndexedDB 등에 넣지 않습니다. 외부 jsDelivr CDN 없이도 초기화됩니다.
- ECDSA P-256 비내보내기 CryptoKey 개인키는 페이지 메모리에서만 유지됩니다. **새로고침이나 창 닫기 후에는 재등록·재승인이 필요한 실습 제한**이 있습니다.

## 기기 승인 흐름

1. 정상 로그인 -> 화면에는 보호 자료 없음.
2. '기기 승인 요청' -> 브라우저에서 ECDSA P-256 키 쌍 생성. 서버에는 공개키·별칭만 전송. 비공개 방어 DB에 pending으로 기록. 서명 검증된 심판 A/B도 서로 구분된 실행 범위에서 pending 요청은 가능하지만 자동 승인되지 않습니다.
3. 독립적으로 요청자를 확인한 권한 있는 운영자만 DB에서 approved로 변경. 화면 버튼이나 본문 상태로 승인 불가.
4. '승인 상태 새로 확인' -> 서버 DB가 approved일 때만 목록과 추가/수정/삭제 열림.
5. 승인 대기, 거절, 취소 시 자료는 숨김.

## 보호 API 서명

대상: GET/POST /api/notes, GET /api/my/notes, GET/PUT/DELETE /api/notes/:id, GET /api/notices, GET/PUT /api/notices/:id.

요청 헤더: Authorization(Bearer), X-Aleph-Device-Id, X-Aleph-Timestamp(밀리초), X-Aleph-Nonce(16바이트 hex), X-Aleph-Signature(ECDSA SHA256 P1363, base64url).

서명 입력 (항목은 줄바꿈 LF로 연결):
- HTTP 메서드의 대문자
- URL pathname + search
- SHA-256(JSON 요청 본문 UTF-8; GET 및 본문 없는 경우 빈 문자열)
- Unix milliseconds timestamp
- 16바이트 난수 nonce

서버는 로그인·소유자, 해당 소유자의 승인된 공개키, 90초 유효기간, 메서드/경로/본문 서명과 nonce 중복 여부를 모두 검증합니다.

- 서명 없음: 403 DEVICE_SIGNATURE_REQUIRED
- 미승인 기기: 403 DEVICE_NOT_APPROVED
- 본문·경로 변경 등 서명 불일치: 403 DEVICE_SIGNATURE_INVALID
- 재전송: 409 DEVICE_SIGNATURE_REPLAYED
- 익명: 401 UNAUTHORIZED

## DB

배포 DB: defense.device_approvals, defense.device_request_nonces. SQL 파일: sql/stage11-devices.sql.
두 표 모두 RLS ON이며 anon/authenticated 직접 권한은 없습니다. 서비스 역할만 필요한 최소 권한을 부여합니다.

관리자는 요청자의 신원과 기기를 별도 확인하고, 검증한 ID와 소유자 UUID를 사용해 다음 SQL로 승인할 수 있습니다.

UPDATE defense.device_approvals
SET status = 'approved', approved_at = now()
WHERE id = '<검증한 기기 UUID>'::uuid
AND owner_id = '<검증한 소유자 UUID>'::uuid
AND status = 'pending';

실제 사용자가 승인 요청을 했다는 별도 확인 없이 자동 승인하지 마세요.

## 확인 순서

1. npm run verify:11 (학생 로그인뿐 아니라 서명된 심판 A/B의 pending 기기 등록 및 서로 다른 소유자 범위 검사)
2. npm run build -- --local
3. npm run prepare:11
4. npm run bundle (Git 클린 상태의 커밋에서)
5. 배포에서 로그인 후 승인 전 자료 비노출과 보호 API 403 확인
6. 운영자 승인 후 정상 메모 200, 업데이트와 삭제, 공지 조회 확인
7. 서명 누락·경로 변조·본문 변조·재전송이 모두 거부되는지 확인
8. 인터넷이 없을 때 보호 자료 대신 오프라인 안내 화면 표시 확인

CI 합성 시험은 실제 브라우저 승인 확인이나 공식 심판 판정을 대체하지 않습니다.
