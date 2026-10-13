# 10단계 · 안전 정책과 B 메모 한 건 복구

## 적용 범위와 선행 조건
- 9단계 정상 저장점: `d1004397ac47317cfdedddb483a652c1c300f8e2`.
- 공개 자료실: `https://secret-vault-sdydy0298.vercel.app`.
- 복구 서비스: `notes`, 경로: **POST `/api/restore`**.
- DB 사전 설치: `sql/stage10-recovery.sql` (Supabase migration `stage10_verified_b_note_recovery`). 이 변경은 사전 백업이 없는 기존 메모를 소급 복원하지 않습니다.
- 1~9단계 인증/권한/탐지 규칙, 메모 6건, 기존 감사 기록은 별도 보존합니다.

## 1. 정책 복원은 운영 정책이 아닌 시험 정책만
먼저 `recovery/stage9-safe-policy.json`의 고정 SHA-256을 검증합니다. 검증이 실패하면 내용을 표시만 하더라도 변경을 적용하지 않습니다.

```bash
npm run policy:10 -- init-test
npm run policy:10 -- preview
npm run policy:10 -- restore-test --confirm
npm run policy:10 -- preview
```

첫 preview에서 `services.notes.allowedRoutes`, `services.notes.blockedGlobalReads` 차이가 보여야 합니다.
마지막 preview에서는 `changed: []`여야 합니다. 타 서비스(notices), 원래 auditEvents는 보존되며 시험 정책 복구 기록은 별도 append-only JSONL로 남습니다. 운영 엔진 정책·`src/decider.mjs`은 변경하지 않습니다.

## 2. 비공개 사전 백업 및 B 메모 복구
**주의: 정상 B 메모를 만들기 전에 DB 트리거가 설치되어 있어야 합니다.** 심판 B가 메모를 처음 INSERT할 때 `defense.note_recovery_backups`에 소유자·실행 ID·가상 메모 내용 해시가 고정됩니다. 사본의 변경/삭제가 차단됩니다.

서명 검증된 심판 계정 B만 아래 POST를 호출할 수 있습니다.

```http
POST /api/restore
Authorization: Bearer <서명된 시험 B JWT>
Content-Type: application/json

{"id":"<시험 B 메모 UUID>"}
```

- 인증 실패: 401; 다른 계정 또는 A: 403; 백업 없음: 404; 무결성/소유자 불일치: 409.
- 성공: 200, `restored: true`, `id`, `owner_id`, `content_sha256`, `operation`.
- DB 함수는 한 트랜잭션 안에서 backup/owner/run/B/해시를 재검사하고 **해당 메모 한 건만** 수정하거나 재삽입한 뒤 감사 로그에 행을 추가합니다.
- 기존 다른 메모·규칙·감사 로그는 삭제하지 않습니다. `anon`과 `authenticated`에는 backup 열람/RPC 실행 권한을 부여하지 않습니다.

### 설치 여부 읽기 전용 확인
```sql
SELECT table_name FROM information_schema.tables
 WHERE table_schema='defense' AND table_name IN ('note_recovery_backups','note_restore_audit');
SELECT tgname FROM pg_trigger WHERE tgname LIKE 'trg_stage10_%' AND NOT tgisinternal;
SELECT count(*) AS original_notes FROM defense.notes;
```

## 3. 복원 후 1~9단계 회귀 순서
1. 1~5단계: 정적 메모 비노출, 미인증 401, A 자기 CRUD 허용, B의 A 데이터 거부, 서버 API 경유.
2. 6~7단계: 등록 기기 정상 허용, 미등록 거부, 복합 이상 시 추가 확인.
3. 8단계: 전체 목록 거부, 강사 공지 쓰기 거부, 본인 UUID 단건 GET 허용, 타인 단건 GET 404.
4. 9단계: 10분 120건은 observe, 121건은 propose_revocation / burst_read, 정상 주체는 observe.
5. 10단계: 안전 사본 SHA 재검증, 시험 정책 notes만 복원, B 메모 한 건 복원 후 ID/owner/해시 대조, 다른 자원 및 감사 기록 유지.

```bash
npm run verify:10
npm run build -- --local
npm run prepare:10
npm run bundle
```

`npm run bundle`은 **커밋 이후 깨끗한 Git 트리, 올바른 origin, 배포 READY와 단계/커밋 대조가 된 뒤에** 실행하세요. 실제 심판의 변조·삭제·재침공 3건은 로컬 모의 테스트만으로 통과를 주장하지 않습니다.

## 공식 24점 판정 이후 재검증 절차

사본 검증 실패 `S10_BACKUP_UNVERIFIED`, 한 건 복원 불일치 `S10_RESTORE_MISMATCH`, 재시험 누락 `S10_RETEST_MISSING`을 분리하여 확인합니다.

- `POST /api/restore`는 실제 요청 직전에 서명된 9단계 안전 정책을 두 번 검증하고 변경 범위를 확인합니다. 차이가 있으면 409 및 차이 필드를 반환하며 DB 복원은 실행하지 않습니다.
- 심판 B 소유자·실행 ID로 비공개 원본을 다시 조회해 변경 여부를 확인한 뒤 SQL 원자 복구를 수행하고, 복구 결과를 재조회해 ID·owner ID·실행 ID·본문 SHA-256을 확인합니다.
- 실제 HTTP 재시험은 서명된 B 단건 GET 및 익명 단건 GET 결과만 저장합니다. 다른 사용자 A의 서명 토큰이 없으므로 A의 교차 조회 재시험은 `not_run`으로 명시합니다. `defense.note_restore_retests`에는 토큰/본문을 남기지 않습니다.
- 운영 정책·과거 메모·과거 백업·기존 감사 내역은 수정하지 않습니다. DB 신규 테이블은 `sql/stage10-retests.sql`입니다.

### SQL/API 계약 회귀 (2026-10-13)

`sql/stage10-recovery.sql`과 `sql/stage10-retests.sql`을 순서대로 설치합니다. 전자는 기존 봉인 사본을 갱신하지 않고 새 봉인 해시 열을 추가합니다. RPC의 `content_sha256`과 감사의 `restored_hash`는 본문 단독 SHA-256입니다. 봉인 해시는 제목+구분자+본문입니다.

DB 검증은 하나의 트랜잭션에서 `BEGIN`, 복구 SQL, `test/stage10-database.sql`, `ROLLBACK` 순서로 실행합니다. 시험 실패 시에도 반드시 ROLLBACK합니다. 이 시험은 실제 HTTP 재시험을 대체하지 않습니다.

실제 복구 요청의 서버 로그 이벤트는 `stage10_restore_result`입니다. `code`로 인증/백업/복원/재시험 중 중단 지점을 확인합니다. `RECOVERY_REJECTED`이면 재시험은 아직 실행되지 않았으며, `POST_RESTORE_RETEST_INCOMPLETE`이면 HTTP 관측 또는 기록 저장이 실패했습니다.

### 실행 전 미리보기와 확인 (현재 API)

1. 서명된 B로 **미리보기** `POST /api/restore`, `{ "id": "<B 메모 UUID>", "dryRun": true }`를 보냅니다.
2. `applied:false`와 `backup.version`, `changes`를 확인합니다. 이 요청은 복원이나 재시험을 실행하지 않습니다.
3. 응답의 `confirm` 객체를 동일 경로에 POST합니다. 소유자/해시가 사본과 다르면 중단합니다.
4. 실제 복원 후 단건 B GET(200 및 해시), 익명 단건 GET(401), B 목록 GET(200), 익명 목록 GET(401), 익명 전체 GET(401)을 순서대로 실행하고 DB에 기록합니다. 응답의 `postRestoreRetests`를 확인합니다.
5. A 서명 토큰이 없는 교차 소유권 검사는 `not_run`으로 남깁니다. 6~9단계 판정기 회귀는 `npm run verify:10`의 로컬 시험이며 실제 배포 요청의 기록으로 혼동하지 않습니다.

명시적인 미리보기에는 `dryRun:true`가 필요합니다. 기존 공식 판정기의 `{id}` 단독 POST는 서명된 B의 사본을 검증한 뒤 자동 복원 및 HTTP 재시험을 수행합니다. `dryRun:false`를 직접 명시할 때는 미리보기의 소유자·본문 해시 확인값도 함께 보내야 합니다. 정책 원본 파일은 변경하지 않고 별도 `recovery/MANIFEST.json`과 코드 내 독립적인 원본 파일 SHA-256으로 검증합니다.
