# 케셰브 학생 실행 설명서 · 21단계

**대상:** 이 저장소의 `on-client/` (앱 코드 `alekov-client-starter` v0.2.11). 제공 `README.md`/기존 1~12단계 작업/스타터 manifest를 수정하지 않는 학생 작성 문서입니다.

**증거 구분:** (A) GitHub 원문 코드·스크립트에서 확인, (B) 앞선 사용자 화면·요청에서 관측, (C) 모의 입력으로 학생 표시만 점검, (UNV) 새 환경·실운영에서 미확인. **이 문서를 작성하며 학생 Windows PC에서 설치·실행·AI 조회·OSV 조회를 새로 수행하지 않았습니다.** 문서 명령은 제공된 `tools/start-alekov.ps1`와 `on-client/package.json`에서 대조한 절차입니다.

관련 문서: [학생 README](../STUDENT_README.md) · [텍스트 시스템 구성도](STUDENT_ARCHITECTURE.md) · [제공 시작 안내](STUDENT_LAUNCH_GUIDE.md) · [오류 코드 가이드](CONNECTION_TROUBLESHOOT.md).

## 1. 무엇을 실행하나

- **제품:** 케셰브(KESHEV) — 내 로그인·기기·세션, 업무 앱 접속 판정, 내 접속 기록과 XDR 경보, AI 사건 설명, 조치 상태, 승인된 패키지의 OSV 조회를 나타내는 개인용 보안 Agent.
- **화면 메뉴:** `보호 현황` / `업무 앱` / `보안 기록` (`public/index.html` 원문).
- **배포 방식:** PC의 Node.js가 `127.0.0.1:5189`에 HTTP 서버를 띄우며 같은 PC의 브라우저에서 엽니다(`src/server.mjs`). 이 주소는 인터넷에 공개되는 서비스가 아닙니다.
- **기본 모드:** `disconnected` / "연결 없음". 기존 SDP 서버 인증·실제 AI 앱 승인은 기본값으로 연결되지 않습니다. `demo`는 예제 화면이며 실제 서버 응답이 아닙니다.
- **버전:** `on-client/package.json`의 시작 틀 `0.2.11`. `v1.0` 완성 버전이 아니며 22단계 실제 누적 재현·공식 수용이 아직 남았습니다.

## 2. 준비 환경·파일 위치

| 항목 | 원문 확인(A) | 직접 확인 여부 |
|---|---|---|
| Node.js | `tools/start-alekov.ps1`는 22~24를 허용, 24.19.0 권장. `package.json`의 `engines.node`도 `24.19.0` | 사용자 PC의 정확한 `node --version` 출력 미확인(UNV) |
| Windows/PowerShell | `powershell -NoProfile -ExecutionPolicy Bypass`로 **현재 프로세스에서만** 실행 정책을 지정 | 사용자는 Windows에서 로컬 화면을 열었으나 이 커밋의 새 실행 재현은 안 함 |
| npm 의존성 | `on-client/package.json`에는 외부 `dependencies`가 없음 | 여기서는 설치 명령을 새로 실행하지 않음 |
| Git | Git 최상위 프로젝트 폴더는 `on-client`보다 **한 단계 위** | 저장소 구조(A). 현재 학생 PC의 `git status`는 미확인 |
| 설정 | `.env.example`은 비밀 없는 값의 예시, `-NativeHostConfig`와 `-SdpHostConfig`는 별도 | 현재 개인 파일·실제 신원/권한 상태는 미확인(UNV) |
| 설치 버전 정보 | 저장소 **최상위** `package-lock.json`은 v3, `on-client`에는 별도 lock 파일 없음 | 이것만으로 20단계 운영 OSV 조회 대상이라고 가정하지 않음 |

작업 폴더를 혼동하지 마세요.

~~~text
<본인이 사용 중인 Git 프로젝트의 최상위 폴더>/
├─ README.md                         # 기존 1~12단계, 보존
├─ package.json / package-lock.json  # 기존 프로젝트의 의존성
└─ on-client/                        # 여기가 새 PowerShell 실행 위치
   ├─ README.md                      # 제공 시작 틀, 보존
   ├─ STUDENT_README.md              # 이번 학생 설명
   ├─ package.json                   # name/alekov-client-starter, scripts, Node 기준
   ├─ .env.example                   # 비밀 없는 설명용 예시
   ├─ .on-starter-manifest.json       # 제공 파일·초기 기준 해시
   ├─ tools/start-alekov.ps1         # 로컬 실행 도구
   ├─ src/server.mjs                 # HTTP 서버(5189)
   ├─ src/engine/sdp-host.mjs        # 조건부 SDP 호스트 연동
   ├─ src/ai/service.mjs             # 조건부 AI 서비스
   ├─ src/vulnerabilities/           # 승인된 공개 패키지·OSV 읽기 전용 조회
   ├─ public/index.html, app.js      # 화면/제공 요청 흐름
   ├─ student/extension.mjs          # 13~20단계 학생 화면 표시
   ├─ student/engine-adapter.mjs     # 학생 어댑터(제공 시작 틀)
   └─ docs/STUDENT_RUNBOOK.md        # 이 문서
~~~

**기존 로컬 폴더·기존 Git 수정·개인 호스트 설정은 지우거나 새로 만들지 않습니다.** 22단계의 새 폴더에서 전 과정을 재현하는 작업도 이번 단계에서는 아직 실행하지 않았습니다.

## 3. 새 PowerShell 창에서 실행 · 확인 1

**작업 위치를 먼저 확인:** Windows 파일 탐색기에서 현재 프로젝트의 **`on-client` 폴더**를 열고 주소 표시줄에 `powershell`을 입력합니다. 주소가 `...\on-client`로 끝나는지 확인합니다. 저장소 루트에서 아래 명령을 실행하면 경로를 찾지 못합니다.

~~~powershell
node --version
powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\start-alekov.ps1
~~~

1. `node --version`이 출력을 내는지 확인합니다. 기준은 `24.19.0`이지만 실제 출력은 **사용자가 직접 기록하기 전까지 미확인**입니다.
2. 제공 실행 도구는 `on-client/src/server.mjs`와 `on-client/package.json`을 확인하고 Node 버전(22~24) 및 기본 포트 `5189`의 사용 여부를 점검합니다. 다른 프로그램을 설치하거나 해당 포트 사용자를 종료하지 않습니다.
3. 다음 메시지는 **도구 소스에 적힌 예상 정상 시작 신호**입니다. 이 문서 작성 시점에 재실행하여 관측한 로그가 아닙니다.

~~~text
케셰브가 켜졌습니다. 브라우저에서 http://127.0.0.1:5189/ 을 여세요.
서버가 응답한 것만 확인했습니다. AI 연결 상태는 화면에서 따로 확인해 주세요.
~~~

4. Chrome 등 PC 브라우저에서 **http://127.0.0.1:5189/** 를 열고, 상단 `보호 현황` / `업무 앱` / `보안 기록` 세 메뉴가 보이는지 확인합니다. UI가 떠도 SDP·AI 승인이 완료됐다는 뜻은 아닙니다.
5. 이 폴더에는 외부 npm 패키지 설치가 기본 필수 절차가 아닙니다. 패키지 설치를 임의로 수행하거나 `package-lock.json`을 변경하지 않습니다.
6. 현재 설치 상태에서 문법만 점검하고 싶다면 `on-client/package.json`에 정의된 아래 명령을 사용할 수 있습니다. **명령의 소스 선언만 확인했고 이 문서 작성 중 새 PC에서 실행하지 않았습니다.**

~~~powershell
npm.cmd run check
~~~

이는 `node --check student/extension.mjs`만 실행합니다. 화면 동작·AI 승인·OSV 조회·공식 통과는 검사하지 않습니다.

### 종료·재실행

실행했던 PowerShell 창에서 `Ctrl+C`를 눌러 종료합니다. 브라우저 접속이 끊겼는지 확인합니다. 다시 **같은 `on-client` 폴더**에서 위 실행 명령을 사용합니다. 5189 포트가 다른 프로세스에 점유되어 있다면 **다른 프로그램을 종료하거나 강제로 포트를 해제하지 말고** 아래 공식 스크립트 옵션을 사용합니다.

~~~powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\start-alekov.ps1 -Port 5190
~~~

이 경우 브라우저는 **http://127.0.0.1:5190/** 로 엽니다. 포트 변경 옵션은 **스크립트 원문에 존재하지만 이 문서 작성 중 실사용 재검증은 미실행**입니다. `-Background` 실행에서는 프로세스 번호를 출력하며, 종료는 해당 프로세스만 작업 관리자에서 확인 후 수행해야 합니다.

### 운영자 호스트 설정이 이미 준비된 경우(선택 사항, 필수 아님)

- **Native Host**: `-NativeHostConfig`는 ALEPH 계정 연결 확인·앱 승인 경로입니다. 앞선 사용자 작업에서 `tools/prepare-native-host.ps1`로 준비해 로컬 앱에서 6자리 계정 확인 화면까지 도달한 사실(B)이 있습니다. **그 계정의 실제 승인 성공은 미확인**입니다.
- **SDP Host**: `-SdpHostConfig`는 본인 접근 판정·기기·접속/XDR 사건의 기존 원천을 연결하는 별도 옵션입니다. 두 설정 파일은 서로 대신할 수 없습니다.
- **필수 제한:** 각 옵션은 담당자가 승인한 **현재 프로젝트에 맞는 기존 개인 설정 파일**이 실제 존재할 때에만 실행 도구에 지정합니다. 파일 경로·내용은 Git과 제출물 밖에 두고, 예시 `C:\AlekovPrivate\...`를 실제 존재하는 경로로 간주하지 않습니다. 설정값을 만들어 내거나 다른 사람의 자격을 복사하지 않습니다.
- 정확한 옵션·승인 버튼: [AI_SETUP_GUIDE.md](AI_SETUP_GUIDE.md), [SDP_HOST_CONNECTION.md](SDP_HOST_CONNECTION.md). 연결 확인 전에는 `connected` 성공으로 쓰지 않습니다.
- **`npm.cmd run demo`** 는 제공 npm 스크립트 `node src/server.mjs --demo`를 수행합니다. 예제 화면만 확인하는 기능으로 **실연동 검사가 아닙니다**. `-Demo`와 `-SdpHostConfig`는 함께 사용하지 않습니다.

## 4. 시스템 구성 · 확인 2

글로 된 **브라우저 / 로컬 앱 서버 / 기존 접근제어·XDR / CLCO AI 게이트** 네 상자, Mermaid, 각 상자별 실제 코드와 공개 주소, 운영자 설정 경계는 [STUDENT_ARCHITECTURE.md](STUDENT_ARCHITECTURE.md)를 봅니다.

| 요청 출발 지점 | 제공 코드(수정하지 않음) | 학생에게 전달되는 것 |
|---|---|---|
| 브라우저 메뉴·GET API | `public/index.html`, `public/app.js`, `src/server.mjs` | 본인 정보·접근 판정·기기·세션·사건 목록 |
| 기존 SDP 시스템 | `src/engine/sdp-host.mjs`, `student/engine-adapter.mjs` | **연결 설정·사용자 권한 확인 후에만** 본인 범위 데이터 |
| CLCO AI 게이트 | `src/connection/native-login.mjs`, `src/ai/service.mjs`, `vendor/clco-http.mjs` | 별도 계정/앱 승인 및 권한 확인 뒤 모델 목록·사건 설명 |
| 공개 패키지 OSV | `src/vulnerabilities/project-scan.mjs`, `src/vulnerabilities/osv.mjs` | 운영자가 승인한 공개 이름/설치 버전이 있을 때만 조회 결과 |

이 경계는 제공 `.on-starter-manifest.json`, `public/app.js`, `src/server.mjs`와 대조했습니다. manifest의 제공 기준 해시는 **학생 수정본의 최종 해시를 뜻하지 않습니다.**

## 5. 학생 작성 vs 제공 영역

**학생 UI 코드는 `on-client/student/extension.mjs`의 `createStudentView()`가 반환하는 표시 함수**입니다. `document.createElement`와 `textContent`로 현재 입력만 렌더링하며, 제공 `public/app.js`가 조회·취소·요청 및 이전 DOM 교체를 담당합니다.

| 단계 | 학생 표시 함수 | 학생 코드에서 구현한 표시 기능 |
|---|---|---|
| 13 | `renderIdentity` | 로그인 사용자·기기·세션의 이름과 상태, `unknown` 확인 불가, 응답 실패 구분 |
| 14 | `renderDecision` | `allow`·`deny`·`challenge`·`unknown`, 요청 실패와 접속 판정 구분 |
| 15 | `renderEvents` | 접속/XDR 사건 종류·시각·근거/규칙·필터 및 빈 목록/오류 구분 |
| 16 | `renderStatus` | 기기/세션 주의 상태, 연결 실패·진단 도움정보, 미지원 조치 안내 |
| 17 | `renderAiConnection` | 앱 AI 점검의 `idle/loading/ok/error`, 모델 수·권한/사용량 오류, 실제 사건 설명 미실행 표시 |
| 18 | `renderExplanation` | 사건 ID의 근거 ID·문장, 규칙 ID·문장, `unknown`과 사람 확인/미실행 제안 |
| 19 | `renderAction` | 준비·집행 전송·ACK·원천 효과를 분리하고, 현재 사건/요청 ID를 유효한 상태별 식별 속성에 결속 |
| 20 | `renderVulnerabilities` | exact 설치 버전·OSV 출처/수정 시각, `none_found`와 미조회·부분 실패 및 기존 취약점 ID 보존 |

| 소유 구분 | 파일 | 변경 원칙 |
|---|---|---|
| 학생 작성 | `student/extension.mjs`와 이번 `STUDENT_README.md`, `docs/STUDENT_RUNBOOK.md`, `docs/STUDENT_ARCHITECTURE.md` | 기존 함수·기록을 보존하면서 학생 표시·설명만 추가 |
| 학생 연동 틀 | `student/engine-adapter.mjs` | 기본은 미연결. 개인 자격을 코드에 입력하지 않음 |
| 제공 | `public/index.html`, `public/app.js`, `public/vulnerabilities-view.mjs`, `src/server.mjs`, `src/engine/`, `src/ai/`, `src/actions/`, `src/vulnerabilities/`, `tools/`, `README.md`, `docs/STUDENT_PROMPTS.md`, `.on-starter-manifest.json` | 수정·교체·재설정하지 않음 |

## 6. 실제 상태·장애 발생 시 순서

아래는 실제 코드·제공 오류 안내에 있는 **메시지/코드 → 의미 → 직접 확인**입니다. `unknown`·오류·미조회는 성공 또는 안전함이 아닙니다.

| 화면/오류 | 의미 | 안전한 확인·조치 |
|---|---|---|
| `Node.js 가 없습니다` / `지금 Node.js 는 vXX 입니다` | Node 미설치 또는 버전 부적합 | Node 22~24, 검수 기준 24.19.0 확인 → 새 PowerShell → 같은 명령 |
| `포트 5189 를 다른 프로그램이 쓰고 있습니다` | 5189 사용 중 | 다른 프로그램을 강제 종료하지 않고 `-Port 5190` 선택 |
| `앱 폴더가 아닙니다` | 잘못된 실행 위치 | 실제 `on-client`에서 실행. 경로를 추측해 만들거나 덮어쓰지 않음 |
| `ENGINE_NOT_CONNECTED`, `연결 없음(disconnected)` | SDP 호스트 미설정/본인 원천 연결 없음 | 제공 기본 모드에서는 정상적인 미연결 안내. 운영자 `SdpHostConfig` 발급 여부 확인 |
| `SUBJECT_SCOPE_UNVERIFIED`, `ENGINE_RESULT_UNVERIFIED`, `CONTRACT_MISMATCH` | 사용 권한/본인 범위 또는 응답 계약 미확인 | 본인 정보·도움정보 확인 → `다시 불러오기` 1회 → 계속되면 담당자 확인 |
| `NATIVE_HOST_DISABLED` | 현재 실행에 Native Host 설정 없음 | 실제 승인된 `-NativeHostConfig` 사용 여부 확인. 임의로 설정 파일을 채우지 않음 |
| `NATIVE_LOGIN_PENDING`, `NATIVE_LOGIN_STATUS_ONLY` | 포털 계정 확인 후 로컬 결과 교환 전 | 같은 계정·번호 확인 → `로그인 확인 완료` → `현재 로그인 확인` |
| `NATIVE_HOST_BUSY` | 이전 계정 연결 요청 남음 | `현재 로그인 확인` 또는 `계정 연결 취소`로 **확인된 결과**를 확인. 반복 신규 발급하지 않음 |
| `NATIVE_HOST_UNVERIFIED`, `NATIVE_HOST_OUTCOME_UNKNOWN` | 계정 확인/취소 결과 불명 | 성공·취소로 단정하지 않음. `현재 로그인 확인` 1회, 계속되면 안전한 도움정보를 담당자에게 전달 |
| 승인 화면의 HTTP `401 Unauthorized` | 포털→게이트 요청이 인증 거절됨(이전 사용자 화면에서 관측) | Workbench의 정상 AI 사용 가능 여부와는 분리. **원인(세션·계정·권한·게이트 설정)은 미확정**. 재발 시 응답의 안전한 오류 코드로 운영 측 확인 |
| `ON_AI_PROVISIONING_PENDING` | 앱 AI 권한 준비 중/확인 불가 | 담당자에게 앱 승인·권한 발급·게이트 반영 확인 |
| `WB_CLCO_AUTH_REQUIRED`, `WB_CLCO_ACCESS_BLOCKED` | 앱 전용 인증·이용 권한 미확인 | 계정 확인/앱 승인 순서 점검, 계속되면 담당자에게. 키 복사 금지 |
| `WB_CLCO_RATE_LIMITED`, `WB_CLCO_TIMEOUT`, `WB_CLCO_NETWORK_ERROR` | 사용 제한/기한/통신 문제 | 모델 호출 반복하지 말고 현재 상태 확인 후 필요할 때 사용자 직접 재시도 |
| 설치 패키지 `not_configured` | 조회 프로젝트 설정 없음 | 담당자가 허용 경로·공개 패키지 목록 설정. 학생이 임의 확대하지 않음 |
| `not_checked`, `NO_APPROVED_PACKAGES` | 승인된 공개 패키지 조회 대상 0건 | 취약점 없음이 아닌 **미조회**. 운영자 허용 목록 확인 |
| `partial`, `unverifiable` | 일부 OSV 조회 실패 또는 잠금 파일/설치 메타데이터 미검증 | 이미 받은 취약점 ID만 유지. 확인 불가를 `none_found`로 바꾸지 않음 |
| `none_found` | 조회한 공개 버전 범위에서 알려진 취약점 목록 0건 | 앱 전체 안전·침해 없음으로 확대 해석 금지 |
| `CANCELLED`, `TIMEOUT`, `SERVICE_UNAVAILABLE`(패키지 조회) | 취소·지연·서비스 일시 불가 | 이전 표를 현재 결과로 남기지 않음. 필요 시 `설치 패키지 조회`를 직접 재실행 |
| 조치 `pending` / `unknown` | 서버 ACK 또는 원천 효과 결과 불명 | ACK는 효과가 아님. `원천 결과만 재조회` 안내. `조치 화면 취소`는 실행된 원천 효과를 되돌리지 않음 |

**장애를 보았을 때의 순서**: (1) 화면의 상태/오류 코드 읽기 → (2) 실행 창과 현재 계정·프로젝트·포트 확인 → (3) 제공 화면의 수동 상태 확인 또는 직접 조회 **한 번** → (4) 계속 미확인이면 `도움정보 불러오기` 또는 `연결 도움정보 보기`에서 비밀 없는 필드만 확인해 담당자에게 전달. `registry`, `vault`, 개인 `.json`, 기존 Git 기록을 임의로 삭제하지 않습니다.

## 7. 무엇을 검증했고 무엇은 기다림(UNV)인가

| 확인 내용 | 근거 종류 | 결과 |
|---|---|---|
| `on-client` 스크립트·포트·Node 범위, 3개 메뉴와 학생 함수 경계 | **(A) GitHub 소스 정적 대조** | 코드에 존재함. 이번 단계 실실행은 하지 않음 |
| 사용자 PC에서 `http://127.0.0.1:5189/` 로컬 화면 및 계정 확인 번호 화면에 도달 | **(B) 이전 사용자 화면 관측** | 해당 화면 도달. 연결 승인/모델 추론 성공은 아님 |
| Native 승인 오류(409 `NATIVE_HOST_UNVERIFIED`)와 포털 게이트 401 | **(B) 이전 사용자 응답·스크린샷 관측** | 오류 관측. **해결 여부 미확인** |
| 18단계 학생 설명, 19단계 조치 표시, 20단계 패키지 표시 | **(C) 이전 단계 모의 DOM 및 코드 검사** | 18단계 25/25, 19단계 보완 후 45/45, 20단계 46/46 모의 검사. **공식 통과 증거 아님** |
| 문서의 새 Windows PowerShell 실행·중지·재기동·다른 PC 재현 | **(UNV)** | 아직 직접 확인하지 않음 — 21단계 첫 실습과 22단계에서 확인 |
| 실제 SDP 본인 데이터·XDR 기록과 권한 판정 | **(UNV)** | 운영자 호스트 연결/자격 별도 필요 |
| 실제 학생 계정 AI 앱 승인·모델 추론·사건 설명 | **(UNV)** | 운영 신원 매핑·권한·게이트 연결 확인 전. 모델 목록 성공도 실제 생성과 다름 |
| 19단계 조치 집행/서버 효과·사람 확인/기한 | **(UNV)** | 기본 `supportedActions` 비어 있음. 실제 원천 집행·효과 관측 미완료 |
| 20단계 외부 OSV 대조·실제 설치 버전 | **(UNV)** | 운영자 프로젝트 경로/공개 허용 목록 및 현 PC 설치 메타데이터 확인 필요 |
| 21단계 공식 AI 판정·22단계 같은 최종 소스의 새 환경 누적 재현 | **(UNV)** | 아직 수행/수용 기록 없음. 버전 `v1.0`을 선언하지 않음 |

## 8. 21단계 제출 순서(사용자가 직접)

1. 변경 파일을 보존하고 **Git 최상위**에서 이번 학생 문서가 포함된 40자리 커밋을 확인합니다. 저장하지 않은 변경은 제출 원문에 들어가지 않습니다.
2. **21·22단계는 Workbench 「포털 제출 준비」 지원 범위(13~20단계) 밖**이므로 ALEPH 해당 단계에 **저장소 URL과 40자리 커밋**을 직접 입력합니다.
3. 공개 GitHub에서 해당 커밋 원문을 볼 수 있으면 포털이 소스를 읽도록 직접 제출합니다. 비공개 저장소라면 공식 「비공개 저장소 원문 준비 방법」의 도구/JSON 절차를 사용합니다. 비공개 저장소를 공개로 바꾸지 않습니다.
4. **실제 제출은 이 문서를 작성한 AI가 실행하지 않았습니다.** 제출 이후 서버가 소스를 **읽고 판정**할 뿐 문서 명령을 실행하거나 새 Windows 환경을 자동으로 재현하지 않습니다. 판정 실패/확인 불가 시 해당 항목과 커밋을 대조합니다.

**첫 직접 확인 과제는 하나**: 기존 작업을 보존한 채 현재 `on-client` 폴더에서 **새 PowerShell 실행 명령 → 안내 문구 → 브라우저 3개 메뉴**를 확인하고, 실제 Node 버전·확인 시각·오류 유무를 기록합니다. 그 전까지는 이 표의 새 환경 항목은 (UNV)로 남겨 둡니다.
