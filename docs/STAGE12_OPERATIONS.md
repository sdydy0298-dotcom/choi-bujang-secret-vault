# 12단계 · 탈환 작전실 운영·증거 검증 가이드

## 확인한 요구사항과 출처

- **학생 구현:** `src/decider.mjs`(접근 판정 규칙), `src/detect.mjs`(가상 사건 탐지), 자료실/기기 승인/소유권 API, `api/operations.js`(작전실의 비공개 실측 요약), `src/stage12-matrix.mjs`(대조표), `api/restore.js`(검증 후 단건 복구).
- **제공 엔진:** ALEPH SDP 엔진. 엔진의 신원 확인, 기기 확인, 전송, 접속 회수 집행, 41종 실제 공격 수행은 **학생이 설치·실행한 것으로 기록하지 않습니다**.
- **추측 금지:** 로컬 `decider:test`, `detect:test`, `verify:12` PASS는 ALEPH SDP 운영 통과나 심판 41종 클리어가 아닙니다. 11단계는 이전 판정에서 `UNV_RUN_ENVIRONMENT`가 발생했으며 정식 통과 확인은 없습니다.

## 제작 1 · 실제 데이터 출처와 화면 일치

자료실에 로그인해 서버에서 승인된 기기일 때만 「탈환 작전실」의 「서버 기록 다시 읽기」를 누를 수 있습니다. 모든 값은 **기기 서명 + JWT를 검증한** `GET /api/operations`의 응답을 렌더링하며 클라이언트가 임의로 성공을 선언하지 않습니다.

| 항목 | 실제 출처 | 보이는 값 | 실측 한계 |
| --- | --- | --- | --- |
| 판정기 | `src/decider.mjs` `RULE_IDS` | 실제 구현된 규칙 수와 이름 | ALEPH SDP 운영 판정 요청 결과는 미실행 |
| 탐지 | `src/detect.mjs`, 계약 `docs/DETECT_EVENTS.md` | 운영 엔진 데이터 미연결·미실행 | 가상 `detect:test` 성공은 운영 사건이 아님 |
| 회수 | 비공개 `defense.device_approvals`의 현재 소유자 행 | 승인·대기·취소 건수 | 앱의 승인 취소와 ALEPH SDP 신원 회수는 별개 |
| 복구 | 불변 `recovery/MANIFEST.json`, `defense.note_restore_audit`, `defense.note_restore_retests` | 봉인된 정책 버전, 실제 감사 및 복구 뒤 시험 건수 | 감사 0건은 복구 성공을 의미하지 않음 |
| 기록 | 비공개 `defense.stage11_diagnostic_events` | 고정 사건명·시각·HTTP 상태 | 내용, 토큰, 메모 ID·본문, IP 등은 표시하지 않음 |
| HTTP 증거 | 비공개 `defense.stage12_http_evidence` | 요청 ID·기대/실제 HTTP·확인 시각·실측 PASS/FAIL | 익명 공개·금지 검사는 A/B 정상/교차 소유 시험을 대체하지 않음 |

서버 응답의 `checkedAt`, `evidence.cases`, `redactedServerRecords`와 화면의 해당 값이 일치하는지 대조합니다. 승인 전에는 어떤 비공개 기록도 공개하지 않습니다.

## 제작 2 · 1~11단계 대조표와 41종 구분

`src/stage12-matrix.mjs`의 `STAGE_CASES`는 단계당 정상 1건과 금지 1건, **총 22건**을 정의합니다. 41종 공격은 운영 측 개별 상세 계약을 확인하지 못했으므로 `ATTACK-01..41`을 **모두 `not_run`으로 초기화**합니다. 공개된 세 괴물의 연속 공격을 표기하되 나머지 세부 공격을 만들거나 임의 점수를 부여하지 않습니다.

「정상·금지 HTTP 실측」 버튼은 다음 **8건의 안전한 요청만** 실제 배포 주소로 보냅니다. HTTP 응답을 못 받으면 `not_run`으로 처리하고, 본문은 기록하지 않습니다.

- 공개 정상: `GET /` 200, `GET /data.json` 200, `GET /api/auth-config` 200
- 금지: 익명 `GET /api/notes` 401, `GET /api/my/notes` 401, `GET /api/notices` 401, `POST /api/restore` 401, `POST /api/device` 401

**서버가 직접 관측한 상태만** `live_http`로 저장합니다. 요청마다 `crypto.randomUUID()`로 만든 요청 ID와 관측 시각을 남깁니다. 요청 ID는 학생 서버가 발급한 추적 ID이며 심판 서명 증명은 아닙니다. 개인정보·로그인 토큰·메모 ID·본문은 감사 데이터에 기록하지 않습니다. 탐지·회수·타인 메모·승인 후 정상 메모·복구 뒤 무서명 변경의 운영 실측은 여전히 `not_run`입니다.

**실행·검토 절차**

1. 현재 커밋과 Production의 `/aleph.json`의 `step:12` 및 `commit`을 대조합니다.
2. 비로그인 `GET /api/operations`은 401로 거부되는지 확인합니다.
3. 본인 계정에서 기기 승인을 거친 뒤 작전실을 열어 「서버 기록 다시 읽기」를 누릅니다.
4. 8건의 익명/공개 HTTP 시험을 **사용자가 직접** 실행합니다. 다른 자료를 변경하거나 지우지 않습니다.
5. 실측 대조표의 `requestId`, `checkedAt`, `expectedStatus`, `actualStatus`, `outcome`과 `defense.stage12_http_evidence`의 최신 행을 대조합니다.
6. 예상과 다른 HTTP 결과는 **FAIL (실측)**로 남깁니다. 요청 실패로 응답 자체가 없을 땐 미실행 처리합니다.
7. 운영 엔진/심판이 별도로 반환한 41종 공식 결과를 받기 전에는 임의로 해당 슬롯을 통과 처리하지 않습니다.

## 제작 3 · 설치·실행·중지·복구

검사할 커밋은 **`r5-work`의 `git rev-parse HEAD`**로 확정하며 배포의 `/aleph.json`의 `commit`과 대조합니다. README에도 같은 순서를 사용합니다.

| 구성 요소 | 설치·실행 | 중지·복구 |
| --- | --- | --- |
| 학생 판정기 | `npm install` 뒤 `npm run decider:test`. `src/decider.mjs`는 ALEPH SDP 엔진이 계약에 맞춰 호출 | 별도 상주 학생 판정기 프로세스 없음. 로컬 테스트는 완료 시 종료. 코드 복구는 확인한 커밋의 해당 파일만 되돌림 |
| 탐지 규칙 | `npm run detect:test` (가상 사건). 실제 사건의 검증 및 회수 적용은 ALEPH SDP 엔진의 역할 | 학생은 제공 엔진을 직접 중지/재시작하지 않음. 탐지 구현 파일만 안전하게 되돌림 |
| 접속 앱 | PWA `public/manifest.webmanifest` 및 `public/sw.js`는 Vercel HTTPS 사이트에서 설치. 로그인/기기 승인 필요 | 브라우저의 앱 창을 닫으면 메모리 토큰/키 소멸. 오프라인 안내문은 메모를 저장하지 않음 |
| 자료실·작전실 | Vercel 배포: `npm run verify:12 && npm run build`. 로컬 정적 미리보기만 `npm run build -- --local` | 운영 중단/이전 배포 복구는 Vercel 관리자 설정·롤백 사용. `/api/restore`는 **심판 B의 단건 메모만** 무결성 검증 후 복원 |

**운영 환경 변수** `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `SUPABASE_PUBLISHABLE_KEY`는 Vercel의 비밀 설정에만 있고 저장소/제출 묶음에는 비밀값을 넣지 않습니다. 원본 DB와 제출 사본·감사 기록을 지우지 않습니다.

**단계 재현 및 제출**

```bash
git clone -b r5-work https://github.com/sdydy0298-dotcom/choi-bujang-secret-vault.git
cd choi-bujang-secret-vault
npm install
npm run verify:12
npm run build -- --local
# 코드 검증/README 갱신 후 '12단계 저장점'으로 먼저 커밋한다.
npm run bundle  # 12단계는 prepare:12 없이 심판 격리 환경에서 실행

```

`npm run bundle`의 12단계 20건 `attackAttempts`는 심판의 `attackId`별 실행 기록과 직접 매칭되지 않는 로컬 진단/공개 GET이므로 **모두 `observed: "not_run"`**으로 제출합니다. 이 값은 실제 판정기 가상 테스트나 공개 GET이 실패했다는 뜻이 아니라 공식 공격 실행 로그가 없다는 뜻입니다. `npm run bundle`은 운영 Production 준비 완료, Git 작업 트리 정리, `/aleph.json`의 12단계 배포 확인 후 실행합니다. `bundle-notes.json` 및 `artifacts/submission.json`은 Git에 올리지 않습니다. 12단계 제출 설명은 심판이 독립 실행 가능하도록 커밋된 `scripts/bundle.mjs`에 있으며, `prepare:12`는 선택적 로컬 설명 편집 도구로만 남깁니다. 실제 운영 심판 제출은 사용자가 ALEPH 방어전 판정 사이트에서 진행합니다.

**되돌리기:** 먼저 `git status`, `git diff`, `git log -1`로 12단계 변경 파일을 구분하고, 제거될 내용을 승인받은 다음 해당 파일만 역패치하거나 역커밋합니다. **`git reset --hard`를 사용하지 않고**, 기존 Supabase 테이블·학생 메모·보안 정책을 삭제하지 않습니다.
