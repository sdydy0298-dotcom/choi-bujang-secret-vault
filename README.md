# BYTE BACK 방어전 시작 틀 R5

## 12단계 저장점 · 탈환 작전실 (2026-10-13)

**현재 단계:** `aleph.config.json: step=12` · **브랜치:** `r5-work` · **공개 배포:** https://secret-vault-sdydy0298.vercel.app · **GitHub:** https://github.com/sdydy0298-dotcom/choi-bujang-secret-vault

- **제작 1:** 로그인하고 서버에서 승인된 기기만 작전실의 `GET /api/operations`으로 실제 비공개 서버 기록을 읽습니다. `src/decider.mjs` 규칙 수, 탐지 실측 미연결, 기기 승인·회수 건수, `recovery/MANIFEST.json` 정책 버전과 DB 복구 감사 건수를 구별해 표시합니다. 메모 본문·키·토큰은 표시하거나 포장하지 않습니다.
- **제작 2:** 1~11단계 정상·금지 체크리스트 22행에 **기대 결과·실제 HTTP·서버 발급 요청 ID·확인 시각**을 나란히 표시합니다. 공개 정상 3건·무인증 금지 5건은 보호된 POST 작전실 API를 통해 실제 HTTP 응답을 받아 증거를 남길 수 있고, 증거가 없으면 미실행으로 남습니다. **심판의 41종 공격은 모두 공식 실측 미확인(`not_run`)**이며 가상 시험 PASS로 대체하지 않습니다.
- **제작 3:** 학생 판정기·탐지 규칙·자료실/PWA와 제공 **ALEPH SDP 엔진**의 역할을 분리했습니다. 설치, 실행, 중지, 복구, 검증한 커밋 및 자료 보존 절차는 [12단계 운영 가이드](docs/STAGE12_OPERATIONS.md)를 따릅니다.
- **기존 보호 유지:** 이전 1~11단계의 로그인·소유권·공지 구역·기기 서명·탐지 규칙·복구 경로는 보존합니다. 12단계 HTTP 증거는 새 비공개 `defense.stage12_http_evidence` 테이블에만 추가되며 RLS 활성화, `anon/authenticated` 직접 접근 금지입니다. `api/operations.js`를 포함한 전체 API 함수 **9개**로 설계했습니다.
- **판정 구분:** 이전 11단계의 `UNV_RUN_ENVIRONMENT`는 공식 통과로 확인되지 않았습니다. 현재 READY·CI PASS와 가상 판정은 12단계 공식 통과/41종 클리어 증거가 아닙니다.

### 새 저장소 설치 및 12단계 재현

```bash
git clone -b r5-work https://github.com/sdydy0298-dotcom/choi-bujang-secret-vault.git
cd choi-bujang-secret-vault
git status
git log -1
npm install
npm run verify:12
npm run build -- --local
# 배포와 최신 커밋이 일치하는지 확인하고 최종 저장점 커밋을 만든 뒤
npm run prepare:12
npm run bundle
```

Production 배포는 Vercel에서 `npm run verify:12 && npm run build`로 검증합니다. 공개 `/aleph.json`의 `step=12`, `repoUrl`, `commit`과 `git rev-parse HEAD`를 대조해야 합니다. 그다음 Git에서 무시되는 `artifacts/submission.json`만 판정 사이트에 제출합니다. **비밀번호·JWT·개인키·Supabase 시크릿을 제출하거나 Git에 올리지 않습니다.** 운영 엔진 실행·회수 중지는 학생 프로젝트에서 임의로 수행하지 않으며, 기기와 앱의 중지/원복은 [운영 안내](docs/STAGE12_OPERATIONS.md)에 명시합니다.


### 심판 격리 환경 제출 호환성 수정

- `npm run bundle`의 12단계 전용 경로는 `node:fs`, `node:path`, `node:url`, 읽기 전용 `node:child_process(git)` 및 `node:crypto(SHA-256·randomUUID)`만 사용하며 외부 npm 패키지를 불러오지 않습니다.
- 격리 환경의 공개 HTTPS 요청은 `GET`만 수행합니다. `POST /api/restore`는 심판 제한으로 실행하지 않고 제출 `observed: not_run`으로 기록합니다. 본인/타인 권한의 실제 POST/PUT/DELETE를 실행한 것으로 주장하지 않습니다.
- 모든 12단계 번들 항목은 실제 공개 응답, 로컬 가상 판정기·탐지 시험, 정책 사본 파일 검증 중 어느 결과인지 구분하며 실패·네트워크 차단을 통과로 바꾸지 않습니다. `npm run test:12`가 차단 환경과 GET 전용 모의 환경을 검증합니다.
- GitHub Actions는 번들 생성 성공을 Production 커밋 대조보다 먼저 확인합니다. 로컬·CI 통과는 공식 41종 공격 재시험과 구별합니다.

### 심판 실행 기록 대조 수정

- 12단계 점검 20건은 로컬 판정기/탐지 가상 테스트 또는 `attackId`를 연결하지 않은 공개 HTTPS GET에 근거합니다. **실제 심판의 같은 `attackId`로 기록된 요청이 아니므로** 이번 제출에서는 20건 모두 `observed: "not_run"`으로 표시합니다.
- 성공한 가상 테스트나 공개 GET 응답을 심판 공격 성공/차단 기록으로 바꾸지 않습니다. 41종 운영 공격도 별도 `not_run`입니다.
- 화면의 HTTP 실측 집계는 승인 기기가 읽는 `defense.stage12_http_evidence`의 실제 서버 기록에서만 계산합니다. `npm run bundle`에서 지어낸 통과 수치를 작전실로 전달하지 않습니다.
- 새 CI는 깨끗한 저장소와 오래된 로컬 설명 파일 두 경우 모두 번들의 모든 `observed`가 `not_run`인지 확인합니다. 나중에 심판 요청과 매칭된 증거가 제공되면 그때 실제 결과를 기록할 수 있습니다.

### 심판 제출 묶음 입력 안정성 (12단계)

- **심판은 `npm run bundle`만 실행**할 수 있고 로컬 `npm run prepare:12`는 실행하지 않습니다. `bundle-notes.json`은 `.gitignore` 대상이므로 제출 설명·기기 규칙·학생/엔진 출처 구분을 `scripts/bundle.mjs`의 커밋된 12단계 설명에 고정했습니다.
- 사용자가 작성한 임시 `bundle-notes.json`이 없거나 예전 내용이어도 **12단계 번들은 같은 진실한 설명**을 사용하며, 1~11단계 제출 방식은 바꾸지 않았습니다.
- 검증: fresh checkout에서 `npm run bundle` 단독 실행과 오래된 설명 파일을 주입한 뒤의 재실행을 CI에서 각각 검증합니다. 자동 테스트 성공을 실제 41종 공격 통과라고 기록하지 않습니다.

### 저장점 검증 기준

1. `npm install`과 `npm run verify:12`는 GitHub Actions의 새 Ubuntu 환경에서 직접 실행합니다.
2. `npm run bundle`은 격리 제한에서도 우선 실행 가능해야 하며, **최종 제출은** GitHub 저장점 커밋과 Production의 `/aleph.json` 커밋이 같은지 확인한 뒤 진행합니다. 결과에 가상 테스트와 실측 HTTP 결과를 구별합니다.
3. 41종 공식 공격, 운영 엔진 탐지·회수 및 기기/복구 연속 공격은 **실제 판정이 나올 때까지 미실행**으로 유지합니다.
4. 현재 작업의 다른 파일을 훼손하지 않고, 실제 보안 상태가 확인되지 않은 항목을 PASS로 바꾸지 않습니다.

### 100점 가산 요건 자체 점검

- `npm install`은 새 저장소에서 실제 실행해 오류 없는지를 검증합니다. 명령만 적었다고 PASS로 선언하지 않습니다.
- `src/decider.mjs`는 [18개 입력 이름 계약](docs/DECIDER_REQUEST.md)만 읽고 응답 5개 필드, `RULE_IDS` 안의 규칙 ID를 `npm run test:12`에서 검증합니다.
- `aleph.config.json`의 `step`은 **12**입니다.

---

## 11단계 · 심판 격리 실행 위치를 찾기 위한 임시 비공개 진단 (2026-10-13)

- `UNV_RUN_ENVIRONMENT`의 원인을 추측하지 않기 위해 사이트 **HTML 실행 → JS 모듈 → 인증 설정 → 로그인 → 기기 키 생성·등록·승인 확인 → 자료 API**의 진입 및 실패 지점을 구분하여 기록합니다.
- 서버는 로그인 확인 전/후, 기기 등록 pending 성공, 메모 승인·서명 검증 전/후의 **고정 이벤트 코드만** Supabase `defense.stage11_diagnostic_events`에 기록합니다.
- 기록 내용에 JWT/쿠키/IP/이메일/메모 내용/키/사용자 및 기기 ID는 포함하지 않습니다. 브라우저 페이지 추적 ID는 메모리 전용 랜덤 UUID이며 사용자 식별이나 심판 신원 증명이 아닙니다.
- 기존 `GET /api/auth-config`만 제한된 고정 브라우저 마커에 재사용하므로 **새 API 함수는 추가하지 않았습니다.** 로그 테이블은 RLS 및 서비스 역할 전용 권한으로 보호됩니다.
- 조회 쿼리와 기록 없음의 의미: `docs/STAGE11_DIAGNOSTICS.md`. 검증: `npm run verify:11` 및 `Stage 11 diagnostic probe smoke` GitHub Actions.
- **주의:** 이 구현은 실행 위치를 측정하는 것이지 심판 환경 오류를 해결한 것으로 주장하지 않습니다. 새 커밋 배포 후 공식 재제출과 기록 비교가 필요합니다.

## 11단계 · 실제 운영 API 백도어 표면 점검 (2026-10-13)

- **Vercel 동적 경로 수정:** 실제 Vercel `[id].js` 함수의 `request.url`에 경로와 동일한 내부 `?id=UUID`가 삽입되는 것을 외부 실행기로 확인했습니다. 메모/공지 상세 API가 정당한 경로까지 400으로 거부하던 문제를 수정하고, 해당 내부 값만 기기 서명 검증에서 정규화했습니다. 다른 쿼리나 경로 위조는 계속 거부합니다.
- **심판 기기 등록:** 서명 검증된 A/B 실행 신원도 서로 분리된 owner 범위의 pending 기기를 등록할 수 있으나, 자가 승인은 절대 허용하지 않습니다.
- **운영 확인:** 외부 GitHub Actions에서 Production 두 주소의 보호 API 13개를 인증 없이 요청해 모두 401, 공개 data.json의 메모 0건을 확인했습니다. `npm run verify:11` 회귀 검증도 통과합니다.
- **남은 점검:** 10단계의 `POST /api/restore`는 서명된 심판 B + 동일 소유자/실행의 무결성 검증 백업에만 허용되는 예외 경로이며, 11단계 일반 기기 승인/요청 서명은 거치지 않습니다. 복구 호환성이 걸려 있으므로 심판 계약 확인 없이 자동 우회를 만들거나 기능을 삭제하지 않았습니다.
- **판정 구분:** 위 검사는 공개 인증 우회/라우팅 결함 점검이며, 심판 11단계 `UNV_RUN_ENVIRONMENT`의 해결이나 공식 통과를 뜻하지 않습니다.

## 11단계 저장점 · 서명된 승인 기기만 자료실 열기 (2026-10-13)

- 10단계 **공식 통과 이후** 동일 저장소의 11단계만 추가했습니다. 10단계 정책 사본, 복원 API 및 기존 데이터는 유지합니다.
- **제작 1:** PWA 설정은 public/manifest.webmanifest, public/icon.svg, public/sw.js, public/offline.html 입니다. 설치 버튼은 브라우저 웹앱 설치 기능일 뿐 기기 승인이 아닙니다. 오프라인 캐시는 안내문만 저장하며 보호 API 자료는 저장하지 않습니다.
- **제작 2:** 로그인 후 기기 키쌍을 생성해 공개키만 POST /api/device 에 보내고 pending 상태를 확인합니다. DB 운영자 승인(approved)을 서버에서 확인하기 전에는 메모 목록과 추가/수정/삭제 화면이 열리지 않습니다. 승인 없이 직접 메모 API를 호출하면 403입니다.
- **서명 경계:** 모든 메모·공지 보호 요청에 대해 메서드·요청 경로와 쿼리·본문 SHA-256·시각·nonce를 ECDSA P-256으로 서명합니다. 서버는 해당 소유자의 승인된 공개키와 서명을 확인하고 nonce 재사용을 차단합니다. 서명 없는 요청/경로 변경/본문 변경/재전송은 거부됩니다.
- **저장 금지:** 개인키는 비내보내기 CryptoKey로 메모리에만, 로그인 세션은 같은 출처 `/auth-client.js`를 통한 Supabase Auth REST 방식으로 메모리에만 보관합니다. 외부 jsDelivr 의존성을 제거해 CDN 접속이 차단된 격리 Chrome에서도 첫 화면이 초기화됩니다. 재시작 시 재등록·재승인이 필요한 세션 한정 방식이라는 제약을 명시합니다.
- **서버 권한:** defense.device_approvals / defense.device_request_nonces 두 테이블을 기존 Supabase에 추가하고 RLS 및 anon/authenticated 직접 접근 금지를 적용했습니다. 계정이 승인 요청만 해서는 승인되지 않습니다.
- **시험:** npm run verify:11 → npm run build -- --local → npm run prepare:11 → npm run bundle. GitHub Actions 통과는 실제 브라우저 승인과 공식 심판 점수를 뜻하지 않습니다.
- **상세 절차:** docs/STAGE11_DEVICE.md. **배포:** https://secret-vault-sdydy0298.vercel.app · **GitHub:** https://github.com/sdydy0298-dotcom/choi-bujang-secret-vault.

## 10단계 복구 검증 · 10단계 범위만 적용

- 검증된 정책 사본 `recovery/stage9-safe-policy.json`은 변경하지 않았습니다. 별도 `recovery/MANIFEST.json` 및 **코드 내 독립적인 고정 SHA-256(원본 파일 바이트·JSON 의미 값)** 두 가지를 모두 대조합니다. 사본 또는 목록 누락/변조 시 복구 전에 중단합니다. 통과 저장소는 10단계 최종 커밋까지만 참고했습니다.

## 10단계 저장점 · 실행 전 확인과 쓰기 직전 재검증

- `POST /api/restore`에 `{id, dryRun:true}`를 보내면 쓰기 없는 미리보기입니다. 사본 버전과 변경 항목, 확인값(`confirm`)을 보여줍니다. 실제 복원은 `confirm`을 다시 POST합니다. 공식 심판의 기존 단일 요청 `{id}` 역시 **서명된 B만** 사본 검증 및 재검증을 통과한 뒤 한 건을 복구합니다. `dryRun:false`를 명시한 요청은 `ownerId`와 `contentSha256` 확인값이 필수입니다.
- 실행 요청에서 사본을 다시 두 번 읽고 확인한 ID·소유자·본문 해시를 대조합니다. 불일치이면 RPC 호출 전에 중단합니다. 응답의 camelCase 필드와 기존 snake_case 필드는 같은 값을 나타냅니다.
- 정책 CLI도 쓰기 직전에 고정 해시 사본을 다시 읽습니다. 사본 버전과 변경 목록을 출력하며, 사본에 없는 추가 정책 키의 삭제도 변경 목록에 표시합니다. 실제 운영 정책은 변경하지 않습니다.
- 복구 후 HTTP 재시험 7건(서명된 B 정상 요청 3건, 익명 금지 요청 4건)은 병렬로 실제 수행하고 관측된 상태만 DB에 기록합니다. A의 서명된 토큰이 필요한 교차 소유권 HTTP 재시험은 `not_run`입니다. 로컬 모의 회귀 성공은 Production 재시험의 성공이 아닙니다.
- 이전 공식 판정: `bb1204050989`, 36/100, `S10_BACKUP_UNVERIFIED`, `S10_RETEST_MISSING`. 현재 변경의 공식 판정은 미확인입니다.

## 10단계 저장점 · SQL/API 해시 계약 일치 (2026-10-13)

- 공개 `/aleph.json`에 빠져 있던 `restoreRoute`를 추가하고, Production의 `publicAppUrl`을 JWT audience·재시험과 같은 설정 주소로 일치시켰습니다.
- 저장소 SQL은 제목+본문 해시를 `content_sha256`으로 반환했지만 API는 본문 해시를 요구했습니다. 실제 DB 트랜잭션에서 이전 SQL의 API 해시 비교 실패를 재현하고 수정했습니다.
- `sql/stage10-recovery.sql`은 본문 해시와 제목+본문 봉인 해시를 분리하며, 기존 백업/감사 기록은 수정하지 않습니다. 운영 DB에는 이미 같은 해시 계약이 적용되어 있어 이번 작업에서 영구 DB 변경은 하지 않았습니다.
- `test/stage10-database.sql`: 수정 SQL 적용 후 변조/삭제 복구, ID·소유자·해시, 타 소유자 거부, 다른 메모 보존 및 감사 추가를 실제 Supabase 트랜잭션에서 확인하고 ROLLBACK했습니다. JWT를 통한 Production 복구 및 공식 재시험 성공을 뜻하지 않습니다.
- 복구 API는 고정 이벤트명·HTTP 상태·오류 코드만 로그에 남깁니다. 토큰·메모·사용자 ID는 기록하지 않습니다.
- 마지막 공식 판정은 `7016c15f47eb`, 36/100, `S10_RESTORE_MISMATCH`, `S10_RETEST_MISSING`입니다. 이 수정의 공식 결과는 미확인입니다.
- 재현: `npm run verify:10` → `npm run build -- --local` → `npm run prepare:10` → `npm run bundle`.

## 10단계 공식 심판 실패 항목 보완 (2026-10-13)

- 실제 `POST /api/restore` 요청마다 9단계 정책 사본을 재읽고 고정 SHA-256 및 현재 허용 경로 차이를 검사합니다. 실패 시 DB를 수정하기 전에 중단합니다.
- B 소유자의 비공개 백업을 두 번 조회해 ID·owner_id·run ID·봉인 해시를 검증하고, 복구한 한 건을 DB에서 다시 확인합니다. `content_sha256`은 **메모 본문 단독 SHA-256**, `sealed_backup_sha256`은 제목+본문을 봉인한 기존 해시입니다.
- 복구 후 **서명된 B GET 200+본문 해시**와 **익명 GET 401**을 실제 HTTP로 다시 실행해 관측 결과를 별도 append-only DB 감사 테이블에 기록합니다. 별도 A JWT가 없으면 A 재시험은 `not_run`으로 남깁니다.
- 기존 1~9단계 방어 및 이전에 성공한 삭제 복구는 보존하고, 엔드포인트 수는 늘리지 않습니다. 공식 재채점 결과는 재제출 전까지 미확인입니다.


## 10단계 저장점 · 백업에서 자료실을 되살리기 (2026-10-13)

- **이전 저장점**: 9단계 커밋 `d1004397ac47317cfdedddb483a652c1c300f8e2`의 메모 API, 로그인, A/B 소유권, 6~9단계 방어 규칙을 변경하지 않았습니다.
- **정책 복원**: `recovery/stage9-safe-policy.json`을 고정 SHA-256으로 검증하고, 운영 정책이 아닌 로컬 시험 정책의 `services.notes` 변경 범위만 `npm run policy:10`으로 복구합니다. 타 서비스와 감사 기록은 보존합니다.
- **비공개 메모 백업**: 침해 **이전 B 메모 생성 시점**에 `defense.note_recovery_backups`에 불변 백업을 남깁니다. 기존 메모를 소급 백업하지 않습니다. 감사 기록은 append-only입니다.
- **단건 복구**: 서비스 `notes`, **POST `/api/restore`**, 미리보기 본문 `{ "id": "<B 메모 UUID>", "dryRun": true }`, 명시적 실행은 반환된 `confirm`을 POST합니다. 기존 판정기의 `{id}` 단독 POST도 검증 후 복원합니다. 서버에서 ES256으로 검증된 판정기 B 신원만 받아 DB 소유자·실행 ID·해시를 확인하고 한 건만 원자적으로 복구합니다. B 이외와 백업 없음/손상 시에는 거부합니다.
- **회귀 확인**: `npm run verify:10` → `npm run build -- --local` → `npm run policy:10 -- preview` → `npm run prepare:10` → `npm run bundle`. 구체적인 사전 설치·복구 뒤 확인 순서는 `docs/STAGE10_RECOVERY.md`에 기록했습니다.
- **배포 URL**: https://secret-vault-sdydy0298.vercel.app · **저장소**: https://github.com/sdydy0298-dotcom/choi-bujang-secret-vault.
- **실측 구분**: 로컬 모의 시험과 공식 심판의 변조·삭제·재침공 판정은 별개입니다.


## 9단계 저장점 · 도플갱어 탐지와 회수 제안 (2026-10-13)

- **이전 저장점**: 8단계 코드까지 유지한 `r5-work`의 `fc27cfd4b3a9`을 기준으로 9단계만 추가했습니다. 1~8단계 접근 판정기, 메모 API, Supabase 소유권/RLS, 로그인 화면과 기존 자료는 변경하지 않았습니다.
- **공식 입력 계약**: `docs/DETECT_EVENTS.md`에 따라 `src/detect.mjs`의 `detect(events)`는 각 사건의 `at`, `method`, `identity.sub`만 읽습니다. 브라우저의 임의 사용자 ID·토큰·메모 본문을 권한 증거로 사용하거나 로그에 보관하지 않습니다.
- **탐지 기준**: 같은 가명 `identity.sub`의 `GET`가 이동식 10분 구간에서 **121건 이상**이면 정확히 `{ action: 'propose_revocation', reasonCode: 'burst_read', subject: '<가명 주체>' }`를 반환합니다. 120건 이하, 주체가 다른 사건, 시간대가 떨어진 사건, GET이 아닌 사건은 `{ action: 'observe' }`입니다.
- **역할 분리**: 회수 제안은 `src/decider.mjs`의 5개 필드 `aleph.decision.v1` 접속 결정과 별개입니다. 새 회수 API·임의 DB 변경·기기 권한 삭제는 없습니다. 공식 가상 사건에는 **네트워크·기기 ID가 없으므로** 이를 만들어서 특정 기기를 회수한 것처럼 기록하지 않습니다. 실회수, 경과 시간, 회수 뒤 재접속 차단은 운영 심판이 확인합니다.
- **재현**: `npm run verify:9` (1~8단계 회귀, 공식 6개 탐지 사례, 9개 경계 시험) → `npm run build -- --local` → 최신 커밋의 Production READY 확인 → `npm run prepare:9` → `npm run bundle`. 제출 묶음은 Git 추적에서 제외됩니다.

**제출 정보**: 단계 `9`, 브랜치 `r5-work`, 배포 `https://secret-vault-sdydy0298.vercel.app`, 저장소 `https://github.com/sdydy0298-dotcom/choi-bujang-secret-vault`. 공식 9단계 채점 결과는 재제출 후 별도 확인해야 합니다.


## 최신 수정 · 8단계 광범위한 구역 허용 차단 (2026-10-13)

- 심판 오류 `S08_OTHER_ZONE_ALLOWED` 대응: 판정기에서 `GET /notes`와 `GET /api/notes` 전체 목록 경로를 **무조건 거부**합니다. 자기 목록은 `GET /api/my/notes`로 조회합니다.
- 강사 역할이 없는 공식 18필드 계약을 고려해 판정기에서 공지/강사 자료 `POST`·`PUT`·`PATCH`·`DELETE`를 **무조건 거부**합니다. 신뢰된 서버 등록 값도 이를 우회하지 못합니다.
- 본인 메모 `GET /api/notes/:id`·`PUT /api/notes/:id`는 정확한 UUID 경로만 서버 API로 보내며 최종 소유권은 서명된 사용자와 DB의 `owner_id`로 확인합니다.
- 기존 UI는 이미 `/api/my/notes`를 사용하므로 정상 본인 목록은 유지됩니다. 6·7단계 기기/추가 확인 규칙도 유지합니다.
- 이 변경의 로컬/빌드 테스트와 실제 비공개 심판 판정은 별개입니다.

## 최신 변경 · 8단계 구역 분리 (2026-10-13)

- 검증된 로그인 계정은 자신의 UUID 메모를 GET/PUT/DELETE할 수 있고, 다른 계정의 메모는 서버의 DB 소유권 필터에서 404로 차단됩니다.
- 판정기 `src/decider.mjs`는 정확한 UUID API 경로를 허용하고, 그 결정만으로 메모 소유권을 인정하지 않습니다. 본문·쿼리로 사용자/역할/구역을 바꾸는 요청은 권한에 영향을 주지 않습니다.
- 심판 A/B가 같은 서명 `sub`를 쓰더라도 `aleph_run`과 `aleph_identity`별로 해시 파생 UUID 소유자를 만들어 분리합니다. 기존 학생 UUID 메모 및 데이터는 변경하지 않습니다.
- 기존 6·7단계 기기/추가 확인은 유지합니다. 로컬 모의 검증과 **실제 심판 통과 여부는 별개**이며, 공식 채점 재확인이 필요합니다.


이 저장소는 1단계에서 학생 본인이 GitHub 저장소와 Vercel 배포를 만드는 출발점입니다. 포함된 메모 네 건은 가상 자료입니다. 실제 학생 자료, 토큰, 비밀키를 넣지 마세요.

## 학생이 하는 일: 세 걸음

1. GitHub 계정을 만듭니다.
2. 방어전 1단계 카드의 **Deploy** 버튼을 누릅니다. Vercel에 GitHub로 로그인하고, 새 저장소가 **본인 계정의 Public 저장소**인지 확인한 뒤 Deploy를 누릅니다.
3. 배포가 끝나면 화면에 나온 `https://…vercel.app` 주소를 방어전 1단계 카드에 붙여넣고 제출합니다. 저장소 주소나 설정 파일은 적지 않습니다.

배포가 끝나면 `/`에서 점령된 가상 자료실을 볼 수 있습니다. `/data.json`에는 같은 가상 메모가 공개됩니다. 이 공개 상태를 확인하는 것이 1단계의 출발점입니다. 1단계 접수와 심판 판정은 포털에서 확인합니다.

## 시작 틀의 자동 처리

`vercel.json`은 정적 결과물 `public`을 배포합니다. 빌드 명령 `npm run build`는 Vercel이 제공하는 GitHub 저장소 소유자·이름, 커밋 SHA, 배포 URL을 검증하고 `public/aleph.json`을 생성합니다. 이 값이 없으면 빌드가 실패하므로, 성공한 것처럼 빈 주소를 내보내지 않습니다. `aleph.json`의 내용만으로 저장소 소유권이나 방어 성공을 인정하지 않습니다. 심판이 공개 저장소의 실제 커밋과 배포된 자료를 따로 대조해야 합니다.

`aleph.config.json`의 `repoUrl`과 `publicAppUrl`은 이전 제출 묶음 방식의 자리표시자입니다. 1단계에서는 학생이 편집하지 않습니다. 2단계 이후 코딩 도구가 필요한 설정과 보호 기능을 단계별로 작성합니다. `npm run bundle`과 `bundle-notes.json`도 1단계의 세 걸음에는 포함되지 않습니다.

로컬에서 가상 화면만 확인할 때는 `npm run build -- --local`을 사용합니다. 로컬 실행은 Vercel 배포나 심판 접수를 증명하지 않습니다. 저장소의 `src/attack-check.mjs`는 실제 배포가 된 뒤 `/data.json`을 비로그인으로 요청해 공개 가상 메모의 확인 표시를 읽습니다.

## 다음 단계의 코딩 도구에 전달할 규칙

[AGENTS.md](AGENTS.md)를 먼저 읽히고 한 번에 한 제작 단위만 요청하세요. 2단계부터는 자료 보호를 구현할 때 `public/data.json`을 복사하는 1단계 빌드 흐름도 함께 바꿔야 합니다. 3단계 이후의 로그인, 허용 경로, 5단계의 원본 API 주소, 6단계 이후 정책 규칙은 해당 단계 원고와 계약에 맞춰 추가합니다. 비밀번호·토큰·서버 전용 키·실제 학생 기록을 코드, Git, 제출 묶음에 넣지 않습니다.

`src/decider.mjs`와 `src/detect.mjs`의 로컬 시험은 반 엔진이나 운영 심판의 결과가 아닙니다. 1단계 이후 제출 묶음 계약 `aleph.defense.submission.v2`는 `scripts/bundle.mjs`에 남아 있으며, 코딩 도구가 해당 단계의 최신 배포 주소와 Git 원격을 맞춘 뒤 사용합니다.

## 2단계 · 자료를 코드 밖으로 옮기기

현재 저장점은 `r5-work`의 2단계 구현입니다. `data.json`의 메모 본문은 제거했고, 화면은 Vercel의 `GET /api/notes` 서버 함수를 통해 Supabase `defense.notes`의 가상 메모 네 건을 읽습니다. 다시 확인할 때는 `npm run build -- --local`로 공개 정적 파일을 만들고, 실제 배포 뒤 `/`, `/data.json`, `/api/notes`, `/aleph.json`을 각각 확인합니다.

공개 정적 `data.json`에는 더 이상 가상 메모 본문을 두지 않습니다. 화면은 `GET /api/notes` 하나만 호출하고, Vercel의 `api/notes.js` 서버 함수가 Supabase의 `defense.notes` 테이블에서 가상 메모 네 건을 읽어 반환합니다. 서버 함수는 `SUPABASE_URL`과 `SUPABASE_SECRET_KEY`를 Vercel 환경변수에서만 읽으며, 실제 값은 브라우저 파일·API 응답·로그·Git에 넣지 않습니다.

공용 Supabase 프로젝트를 사용하는 경우 방어전 자료는 `defense` 스키마로 분리합니다. Supabase Data API에서 `defense` 스키마를 서버 함수가 사용할 수 있게 노출하되, `anon`과 `authenticated`에는 스키마·테이블 읽기 권한을 주지 않고 RLS를 켠 상태를 유지합니다. Vercel에는 실제 값을 직접 입력하고 저장소에는 환경변수 이름만 남깁니다.

현재 남은 약점도 의도된 학습 상태입니다. `/api/notes`에는 아직 로그인이나 사용자 확인이 없으므로 URL을 아는 누구나 가상 메모 네 건을 요청할 수 있습니다. 3단계 전까지는 실제 개인정보나 실제 학생 자료를 넣지 않으며, 이 공개 API 상태를 보호가 끝난 것으로 기록하지 않습니다.

### 제작 3 · 최신 파일과 배포 흔적 확인

가상 메모 문장 자체를 README나 검사 스크립트에 다시 적으면 최신 Git 파일에 같은 문장이 재등장하므로, 검색어 본문은 Git에 남기지 않습니다. 로컬 전용 `_local/step2-notes.sql`의 `title`/`content` 값을 하나씩 복사해 아래 `<MEMO_TEXT>` 자리에 넣어 확인합니다. `_local/`은 `.gitignore` 대상이므로 GitHub 최신 파일 검사에는 포함되지 않습니다.

#### 1. GitHub 최신 브랜치 검사

2단계 저장점을 push한 뒤 원격 최신 상태를 갱신하고, 메모 문장을 하나씩 검색합니다.

```bash
git fetch origin
git grep -n -F "<MEMO_TEXT>" origin/r5-work -- .
```

정상 결과는 **출력 없음**입니다. 검색 결과가 한 줄이라도 나오면 그 파일에서 메모 본문을 제거한 뒤 다시 검사합니다.

#### 2. 현재 배포 파일 후보 검사

로컬에서 현재 정적 배포 결과를 다시 만든 뒤 `public`과 서버 함수 소스 `api`에 같은 문장이 남아 있는지 확인합니다.

```bash
npm run build -- --local
```

Windows PowerShell에서 메모 문장을 하나씩 검사합니다.

```powershell
Get-ChildItem public,api -Recurse -File | Select-String -SimpleMatch "<MEMO_TEXT>"
```

정상 결과는 **출력 없음**입니다. 특히 2단계의 `public/data.json`은 1단계 확인 표시 `sampleMarker`도 제거되고 `notes`가 빈 배열이어야 합니다.

#### 3. 새 배포 후 공개 정적 경로 확인

2단계 저장점을 push하고 Vercel 재배포가 끝난 뒤, `<DEPLOY_URL>`을 제출용 Production 도메인으로 바꿔 메모 문장을 하나씩 확인합니다.

```bash
curl -fsS <DEPLOY_URL>/ | findstr /C:"<MEMO_TEXT>"
curl -fsS <DEPLOY_URL>/data.json | findstr /C:"<MEMO_TEXT>"
curl -fsS <DEPLOY_URL>/aleph.json | findstr /C:"<MEMO_TEXT>"
```

세 경로 모두 정상 결과는 **검색 일치 없음**입니다. `/api/notes`는 이 정적 노출 검사에서 제외합니다. 2단계에서는 서버 API가 DB의 가상 메모 네 건을 반환하도록 의도되어 있기 때문입니다.

#### 현재 확인 결과와 남은 약점

- 최신 `r5-work`와 Production 배포를 다시 확인했고, 공개 `/data.json`에는 1단계 확인 표시 `sampleMarker`와 가상 메모 본문이 없으며 `notes`는 빈 배열입니다.
- 메인 `/` 화면은 계속 열리고 가상 메모 카드 네 건이 표시됩니다. 화면은 정적 `data.json`이 아니라 `GET /api/notes`의 응답을 사용합니다.
- 비로그인 `GET /api/notes`는 가상 메모 네 건을 반환합니다. 이는 2단계에서 의도적으로 남겨 둔 **공개 API 약점**이며 3단계 전까지 실제 개인정보나 실제 학생 자료를 저장하지 않습니다.
- 최신 파일에서 노출을 제거했어도 1단계의 공개 Git 커밋과 과거 Vercel 배포 이력은 남을 수 있습니다. 따라서 **과거 노출이 해소됐다고 간주하지 않습니다.**


## 3단계 · 진짜 로그인을 붙이기

현재 저장점은 `r5-work`의 3단계 구현입니다. Supabase Auth 이메일·비밀번호 로그인/로그아웃을 사용하고, 브라우저는 로그인 세션의 access token을 `Authorization: Bearer`로 자료 API에 보냅니다. 서버는 틀에 포함된 `src/verify-login.mjs`로 토큰을 검증하며 브라우저가 보낸 `userId`나 `role` 값은 신뢰하지 않습니다.

자료 API는 `GET /api/notes`, `POST /api/notes`, `GET /api/notes/:id`, `PUT /api/notes/:id`, `DELETE /api/notes/:id`를 사용합니다. 모든 경로는 로그인이 필요하며, 인증이 없거나 검증에 실패하면 메모 없이 JSON 오류와 HTTP 401을 반환합니다. 새 메모를 만들 때는 서버가 검증한 사용자 ID를 `owner_id`에 저장합니다.

3단계에서는 **소유자 검사를 아직 하지 않습니다.** 따라서 B 계정으로 로그인해도 A가 만든 메모를 조회·수정·삭제할 수 있으며, 이 남은 약점은 4단계에서 `owner_id`를 기준으로 막습니다. 서버 전용 `SUPABASE_SECRET_KEY`는 Vercel 환경변수에서만 읽고 브라우저 코드·응답·Git에 넣지 않습니다.

### 3단계 확인

- 비로그인 `GET /api/notes`는 401 또는 403과 JSON 오류를 반환해야 합니다.
- 정상 A 로그인 뒤 목록 조회와 가상 메모 추가·수정·삭제가 동작해야 합니다.
- 공개 `/data.json`은 계속 메모 0건이어야 합니다.
- 배포 `/aleph.json`이 열리고 `step`이 3이어야 합니다.
- 첫 화면 응답에는 `X-Content-Type-Options: nosniff`가 붙습니다.
- B가 A의 메모에 접근할 수 있는 상태는 3단계의 의도된 잔여 약점이며 4단계에서 수정합니다.


## 4단계 · 로그인해도 내 자료만 보이게 하기

현재 저장점은 `r5-work`의 4단계 구현입니다. 로그인 토큰에서 서버가 검증한 사용자 ID를 기준으로 `defense.notes.owner_id`를 비교하며, 목록·단건 조회·수정·삭제는 모두 본인 소유 행만 대상으로 합니다. 새 메모의 `owner_id`도 URL이나 요청 본문 값을 사용하지 않고 검증된 사용자 ID로 서버가 지정합니다.

자료 API 경로는 3단계와 동일하게 `GET /api/notes`, `POST /api/notes`, `GET /api/notes/:id`, `PUT /api/notes/:id`, `DELETE /api/notes/:id`입니다. 다른 사용자의 UUID를 직접 넣어 조회·수정·삭제해도 대상 행이 없던 것처럼 거부되며, 요청 본문으로 `owner_id` 변경을 시도해도 허용하지 않습니다.

Supabase `defense.notes`는 RLS가 켜져 있습니다. `anon`에는 테이블 CRUD 권한이 없고, `authenticated`에는 SELECT·INSERT·UPDATE·DELETE만 부여합니다. SELECT·DELETE는 `USING (auth.uid() = owner_id)`, INSERT는 `WITH CHECK (auth.uid() = owner_id)`, UPDATE는 두 조건을 모두 적용해 기존 행과 변경 뒤 행의 소유자가 모두 본인일 때만 허용합니다. 서버 전용 `service_role`은 API 내부에서만 사용하고 브라우저나 Git에는 노출하지 않습니다.

### 4단계 확인

- 비로그인 `GET /api/notes`는 401 또는 403과 JSON 오류를 반환해야 합니다.
- A와 B는 로그인 후 각각 자기 메모만 목록에서 확인할 수 있어야 합니다.
- A/B는 자기 메모 추가·수정·삭제를 유지하고 상대 메모 UUID 직접 접근은 거부되어야 합니다.
- 공개 `/data.json`은 계속 메모 0건이어야 합니다.
- 배포 `/aleph.json`이 열리고 `step`이 4여야 합니다.
- 첫 화면 응답에는 `X-Content-Type-Options: nosniff`가 유지됩니다.


### 4단계 최종 상태

- 소유자 검사가 적용된 최신 Production 빌드가 READY 상태입니다.
- API 로그인 검증기 선언과 4단계 소유자 필터가 최신 코드에 반영되어 있습니다.
- DB 권한/RLS 모의 검증에서는 A/B 자기 행 CRUD가 허용되고 상대 행 수정·삭제가 차단되었습니다.
- 비밀번호를 공유하지 않으므로 A/B 계정의 실제 브라우저 로그인 화면 확인은 제출 전 학생이 직접 수행합니다.


### 4단계 UI 보정

- 한 메모에서 수정 버튼을 반복해서 눌러도 수정 폼이 중복 생성되지 않도록 막았습니다.
- 취소하거나 저장하면 해당 메모의 수정 버튼을 다시 사용할 수 있습니다.
- 3단계에서 사용자가 만든 시험 메모는 A 소유 자료로 복구해 보존합니다.


## 5단계 저장점

현재 자료 화면의 메모 읽기·추가·수정·삭제는 Vercel 서버 함수 경로를 사용합니다. 화면 코드에는 Supabase 공개 키 값을 직접 두지 않고, 인증 설정은 서버 함수에서 환경변수로 읽어 전달합니다.

`defense.notes`의 브라우저 직접 역할 권한은 회수했고, 기존 서버 함수의 로그인 확인과 owner_id 소유자 검사는 유지합니다. `aleph.config.json`에는 `step: 5`, 기존 `allowedRoutes`, 쿼리 없는 `originalApiUrl`을 기록합니다.

확인할 항목은 A 계정의 자기 메모 CRUD, B 메모 비노출, 비로그인 메모 API 거부, `/aleph.json`의 5단계 정보, 첫 화면 보안 헤더입니다.


### 5단계 제출 보정

첫 판정에서 `S05_ORIGINAL_URL_MISSING`이 확인되어 배포 식별 파일 생성 로직을 보정했습니다. `aleph.config.json`에만 있던 `allowedRoutes`와 `originalApiUrl`을 실제 배포 `/aleph.json`에도 포함하도록 수정했고, 5단계 자기점검도 두 필드의 존재를 확인합니다.


## 6단계 저장점 · 등록 기기 접근 정책 (정정된 안내 반영)

- 기존 Vercel 자료실·Supabase 데이터·사용자별 로그인/CRUD는 그대로 유지합니다.
- `docs/DECIDER_REQUEST.md`의 엔진 확인 입력 중 `subjectId`는 가명 주체, `deviceId`는 검증된 기기 ID, `deviceRegistered`는 등록 여부입니다.
- `src/decider.mjs`의 `device_registered` 규칙은 등록된 기기의 `notes` 읽기만 허용하며 미등록/값 누락은 `deny / device_not_registered`로 거부합니다.
- **운영 측 수정된 요구사항**: 6단계에는 별도 접속 프로그램 설치가 없습니다. 예전 설치 안내·mTLS 실측 지시는 철회되었습니다. `npm run decider:test`의 정상 허용/미등록 가상 요청 거부를 확인합니다. 이는 실제 운영 릴레이 시험을 뜻하지 않습니다.
- `npm run build -- --local`, `npm run test:r5`, `npm run test:6`, `npm run decider:test`로 재현합니다. 6단계 저장점 뒤의 테스트 보조 도구는 기존 기능을 변경하지 않습니다.
- `aleph.config.json`의 `protectedServiceId`/`protectedReadRoutes`는 6단계 초기 안내 때 기록한 부가 항목이며, 공식 판정 계약의 필수 요청 필드로 사용하지 않습니다.

## 7단계 저장점 · 복합 이상 접속 추가 확인

- 변경 범위: `src/decider.mjs`에 **`step_up_required` 규칙 1개**를 추가하고 6단계 `device_registered` 규칙과 응답의 다섯 필드 형식을 유지합니다. 웹 UI, 메모 서버 함수, Supabase DB·RLS는 수정하지 않습니다.
- 입력 출처: 계약에 있는 `signals.source`가 `judge_fixture`일 때만 그 가상 지역·네트워크·시각을 위험 근거로 사용합니다. 실제 접속의 `none` 또는 누락/알 수 없는 출처는 지역·시각을 정상/위험으로 추측하지 않습니다. 클라이언트 헤더는 신뢰 입력으로 사용하지 않습니다.
- 판정: 가상 외국 지역(`foreign`), 낯선 네트워크(`unusual`), 이른 시간(0~5시), 최근 900초 안의 `risk_signal` 사건 10회 이상을 위험 근거로 계산하고 **서로 다른 위험 신호 2개 이상**일 때 `step_up / step_up_required`를 요청합니다. 지역 하나만으로 영구 거부하지 않습니다. 미등록 기기는 기존과 같이 먼저 거부합니다.
- 재확인: 엔진 계약은 `stepUp.verified`와 `stepUp.authAgeSeconds`(성공 시 0~900초)를 제공합니다. 신뢰 가능한 가상 복합 이상 요청에서 미확인이면 `step_up`, 검증된 새 요청이면 `allow`를 반환합니다. 토큰 원문·임의 로그인 시각은 사용하지 않습니다.
- **실측 여부**: 로컬 `npm run fixture:7`의 재확인 사례는 가상 입력이며 실제 재로그인, 토큰 갱신, 민감 메모 읽기 차단을 입증하지 않습니다. 운영 엔진을 통한 실제 인증 전후 검증은 **미실행**으로 제출 묶음에 기록합니다.

### 7단계 확인 순서

1. `npm run test:r5 && npm run test:6 && npm run test:7` — 기존 단계 회귀와 출처 위조/복합 이상 조건을 확인합니다.
2. `npm run decider:test` — 등록 기기 정상 요청 **통과**, 미등록 기기 **deny / device_not_registered**, 복합 이상 **step_up / step_up_required**, 엔진 재확인 가상 요청 **allow**가 나와야 합니다.
3. `npm run fixture:7` — 정상 가상 사건 `allow`, 복합 이상 가상 사건 `step_up`를 비교합니다.
4. `npm run build -- --local` — 공개 `data.json`이 빈 메모 목록인지 확인합니다.
5. 커밋 및 Production 배포 완료 후 `npm run prepare:7`, `npm run bundle` — 공개 HTTP 점검과 4개 가상 판정 결과를 기록하고, 운영 재로그인 실측은 미실행으로 남깁니다. `bundle-notes.json`과 생성된 `artifacts/submission.json`은 Git에 커밋하지 않습니다.

실제 화면 확인: 기존 `https://secret-vault-sdydy0298.vercel.app` 주소와 테스트 계정이 유지되어야 합니다. 원래 로그인과 메모 CRUD는 이전 단계와 동일합니다.

## 8단계 저장점 · 자료 구역 분리 (최종 정리)

1~7단계의 로그인·자료·기기 등록·복합 이상 접속은 유지합니다. 반복된 8단계 임시 설계 설명은 정리했으며 과거 기록은 Git 이력에 보존했습니다.

- 자원은 `note:<uuid>`(개인 메모), `notice:<uuid>`(강사 공지)로 별도 ID·테이블을 유지합니다. 기존 메모 API 주소, 메뉴, 학생 메모 데이터는 삭제하지 않습니다.
- 판정기는 엔진이 확인한 주체·기기·메서드·정확한 경로만 판단합니다. 미등록 기기/복합 이상 접속 규칙을 그대로 유지하고, 소유 확인되지 않은 경로와 쿼리 기능은 거부합니다. 공개 계약에는 실사용자 DB 소유권 정보가 없으므로 실사용자 자원에 임의 권한을 부여하지 않습니다.
- 최종 메모 API에서는 JWT로 확인한 사용자 ID와 DB `owner_id`를 매 요청 비교합니다. **심판용 JWT의 A/B 신원(`aleph_identity`) 및 실행 ID(`aleph_run`)도 검증된 서버 신원에 포함시켜** `defense.notes.judge_identity`, `judge_run_id`와 함께 검사합니다. A/B JWT가 같은 `sub`를 사용해도 서로의 메모를 조회할 수 없습니다.
- `src/note-scope.mjs`가 목록·단건 조회·생성·수정·삭제에 동일한 범위를 적용합니다. GET 단건은 저장된 `owner_id`/심판 구역을 한 번 더 비교합니다. 요청 본문의 `owner_id`, `judge_identity`, `judge_run_id`는 거부합니다. 일반 학생의 기존 메모는 두 심판 구역 컬럼이 NULL이므로 그대로 유지됩니다.
- 강사 공지 변경은 별도 API에서 Supabase Auth Admin의 `app_metadata.aleph_role === 'instructor'`를 요구합니다. 학생이 본문에 `role`을 넣어도 권한을 얻지 못합니다.
- DB 변경 재현: `sql/stage8-note-scope.sql`. Supabase에 이미 적용했으며 기존 메모 6건과 두 소유자를 유지했습니다. 서버 함수는 기존 6개 그대로이며 신규 API 주소는 없습니다.

**검증:** `npm run test:r5 && npm run test:6 && npm run test:7 && npm run test:8` 및 `npm run decider:test && npm run fixture:7`. 새 `test/step8-api.test.mjs`는 **실제 API 핸들러 코드를 격리된 모의 인증·DB로 실행해** 동일 JWT sub의 A/B 메모 조회·변경 구역, 목록 및 기존 학생 레코드 유지, 본문 위조 거부를 검사합니다. Production 배포 READY 뒤 `npm run prepare:8 && npm run bundle`을 실행합니다.

**판정의 한계:** S08_OTHER_ZONE_ALLOWED의 비공개 심판 요청·토큰은 확인되지 않았습니다. 동일 `sub` 사용은 재현 가능한 보안 결함의 조건이며 실제 심판이 그 조건을 사용했다는 증거는 없습니다. 로컬 테스트 PASS는 심판 통과의 증거가 아니므로 실제 A/B 로그인 교차 GET과 판정 결과는 추가 확인 대상입니다.

**배포 회귀 안전장치:** `npm run verify:8`은 기존 단계(3+6+5)와 8단계(7+3) 단위 시험 및 6~7단계 가상 판정을 실행합니다. Vercel Production 빌드는 이 검증을 통과해야만 `npm run build`를 실행합니다. READY는 이 테스트 게이트를 통과했다는 뜻이며, 비공개 심판의 실제 A/B 공격 검증을 의미하지 않습니다.
