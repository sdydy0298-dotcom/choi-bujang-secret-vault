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

- 2단계 저장점 후보의 현재 작업 파일과 `public`/`api`를 검사했을 때 가상 메모 본문 4개는 **0건 검색**되었습니다. 공개 `data.json`에는 1단계 확인 표시 `sampleMarker`도 없고 `notes`는 빈 배열입니다.
- 이 README를 작성하는 시점에는 아직 2단계 저장점을 GitHub에 push하고 새 Production 배포를 만든 뒤의 원격/실배포 검증을 완료하지 않았습니다. 따라서 기존 1단계 Git 커밋과 기존 Vercel 배포에 남은 과거 노출이 해소됐다고 기록하지 않습니다.
- `/api/notes`에는 아직 인증이나 사용자 확인이 없습니다. 2단계 배포 후 비로그인 `GET /api/notes`가 가상 메모 네 건을 반환하는 것은 현재 단계의 의도된 동작인 동시에 **남아 있는 공개 API 약점**입니다. 3단계 전까지 실제 개인정보나 실제 학생 자료를 저장하지 않습니다.
