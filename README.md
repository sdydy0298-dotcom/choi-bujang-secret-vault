# BYTE BACK 방어전 시작 틀 R5

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

## 8단계 저장점 · 자료별 자원 구역 분리

- 기존 1~7단계 메모·로그인·소유권 검사·UI는 보존했습니다. `defense.notes`와 강사 공지 `defense.notices`는 별도의 테이블이며, 공개 정적 메모에는 실제 자료가 없습니다.
- 자원 ID: `note:<uuid>`, `notice:<uuid>`. 동작은 API 메서드와 정확한 경로로 결정하고 `?action=` 같은 쿼리로 고르지 않습니다. `export` 같은 기능 경로는 메모/:id 형식의 UUID와 구분해 거부합니다.
- 판정기: `resource_zone`/ `route_not_allowed`/ `write_not_allowed`를 추가합니다. 미등록 기기는 6단계대로 거부하고 복합 위험은 7단계대로 재확인합니다. `aleph.decision.v1`에 사용자별 소유권 또는 강사 역할 필드가 없어서 이를 가짜 입력으로 만들지 않습니다.
- API: 기존 `/api/notes`, `/api/notes/:id`는 서버가 검증한 `userId`로 `owner_id`를 필터링합니다. `/api/notices`와 `/api/notices/:id`는 별도 자원이며, 쓰기는 Supabase Auth Admin에서 조회한 `app_metadata.aleph_role === 'instructor'`인 인증 학생에게만 허용합니다. 기존 사용자 메타데이터/HTTP 헤더/요청 본문의 `role`은 권한이 아닙니다.
- DB: `defense.notices`는 RLS ON, `anon`/`authenticated` 테이블 권한 없음, 서버 `service_role`만 읽기·생성·수정합니다. 강사 권한이 지정된 계정은 현재 없어, 역할을 임의로 부여하지 않았습니다.
- 검증: `npm run test:r5`, `npm run test:6`, `npm run test:7`, `npm run test:8`, `npm run decider:test`, `npm run fixture:7`, `npm run build -- --local` 순으로 확인합니다. 빌드 후 `git status --short`에서 `public/data.json`만 수정됐으면 `git restore -- public/data.json` 한 뒤 `npm run prepare:8 && npm run bundle`을 수행합니다.
- 미실행: 실제 A/B 교차 계정의 메모 API 직접 호출과 강사 권한 계정으로 공지 쓰기/수정은 인증정보를 공유하지 않으므로 심판 및 실제 테스트에서 별도 확인해야 합니다.

### 8단계 심판 재시험 보정 - S08_OTHER_ZONE_ALLOWED

이전 커밋의 판정기는 소유자/강사 역할을 검증할 수 없는 v1 요청에서도 `GET /api/notes` 전체 목록과 메모 쓰기를 `allow`로 판정했습니다. 통과 목표 표본의 `s08-all-notes` 및 `s08-write-notice` 검사와 대조하여 해당 경로를 fail-closed로 변경했습니다.

- 판정기에서 허용하는 읽기는 `GET /notes`, `GET /notes/:id`, `GET /api/my/notes`, `GET /api/notes/:id`, `GET /api/notices`로 제한합니다. `GET /api/notes` 및 모르는 경로는 `route_not_allowed`로 거부합니다.
- 엔진 요청 v1에는 행 소유자/강사 역할 필드가 없으므로 `POST`/`PUT`/`DELETE` 쓰기는 판정기에서 `write_not_allowed`로 거부합니다. 브라우저가 기존 `/api/notes`에서 자기 메모를 수정하는 기능과 서버 `owner_id` 검사는 그대로 유지됩니다. 운영 엔진을 실제로 연결할 때는 양쪽 정책을 별도로 일치시켜야 합니다.
- `GET /api/my/notes`는 기존 메모 API의 소유자 필터를 재사용하는 읽기 전용 별칭입니다. 기존 화면/URL은 변경하지 않습니다. HTTP/가상 판정 추가 점검은 `npm run bundle`에 기록합니다.
- `npm run test:r5`, `npm run test:6`, `npm run test:7`, `npm run test:8`, `npm run decider:test`, `npm run fixture:7`를 실행하고 최신 Production 배포 후 `npm run prepare:8 && npm run bundle`로 확인합니다. 실제 A/B 교차 계정 시험은 수행하지 않았다고 기록합니다.

### 8단계 재보정 - 타인 소유 자원에 대한 무조건 허용 제거

기존 판정기는 subjectId가 존재하는지만 확인했으며 누구 소유인지 비교하지 않았습니다. 8단계 보정은 엔진 검증 classId/projectId/subjectId/deviceId/service와 method, 정확한 path를 서버의 자원 소유 허용표와 함께 비교합니다. 다른 등록 기기와 사용자로 같은 메모를 요청하면 거부하고, 본인 자기 메모는 읽기/수정이 허용됩니다. 없는 바인딩은 fail-closed 처리합니다.

class_fixture/project_fixture 예시는 이전 단계에서 제공된 **가상 테스트 전용** 자원입니다. 실제 사용자·메모 연결표는 공식 엔진 또는 운영자가 확인한 값만 서버의 ALEPH_RESOURCE_BINDINGS에 등록해야 하며 Git·브라우저 요청·user_metadata를 출처로 삼지 않습니다. 실제 운영 자원 바인딩과 A/B 시험 토큰이 없으므로 운영 계정 교차 조회 실측은 미실행입니다. 기존 Supabase notes.owner_id 검사와 강사 role 검증 API는 보존합니다. S08_OTHER_ZONE_ALLOWED로 심판이 사용한 비공개 요청은 별도로 확인이 필요하며 가상 테스트 PASS를 심판 판정으로 대체하지 않습니다.

### 8단계 4차 점검 - 공식 계약과 운영 허용표 정리

이전 정책에 직접 작성한 student_A/student_B/student_subject 및 가상 UUID는 실제 엔진이 증명한 소유 관계가 아니었습니다. 운영 판정 기본 허용표에서 모두 제거하고 공식 scripts/fixture-7.mjs의 learner_fixture /notes/demo 한 건만 연습 자원으로 남겼습니다. 엔진 v1에는 Supabase 소유자·강사 역할이 없으므로 다른 운영 사용자는 서버 전용 ALEPH_RESOURCE_BINDINGS에 확인된 classId/projectId/subjectId/deviceId/path/resourceId/ownerSubjectId/methods를 명시적으로 등록해야 허용됩니다. 미등록 자원은 거부합니다.

실제 자료 조회 API는 검증된 Supabase 사용자 ID와 defense.notes.owner_id를 비교하며 강사 공지 수정은 검증된 관리자 메타데이터를 요구합니다. 데이터베이스나 기존 URL은 변경하지 않았습니다. 기존 자료실 목록의 내부 GET 요청은 개인 전용 /api/my/notes로 조정했고 aleph.config.json의 읽기 허용 경로도 동일하게 변경했습니다. 기존 /api/notes API는 소유자 필터를 유지한 채 남겼습니다.

이 수정은 가상 사용자에 실제 권한을 준 명백한 결함을 제거한 것이며, 비공개 S08 심판 판정을 재현했다는 뜻은 아닙니다. 로컬 테스트 통과와 배포 READY만으로 심판 통과를 보장하지 않습니다. 실제 Vercel 요청 로그는 연결 권한 403으로 확인하지 못했습니다.

8단계 운영 자기점검에는 비로그인 GET /api/my/notes 요청을 직접 전송해 401 또는 403과 JSON 오류가 확인됐는지를 추가했습니다. 점검 20개 중 실제 계정 교차 요청은 여전히 미실행이며, 20개 전체가 차단 성공을 뜻하지 않습니다.
