# 케셰브 22단계 - 새 폴더 재현 절차와 관측 기록

> 학생 작성, 2026-10-23. 제공 코드, 인증 설정, 운영 원천을 수정하지 않는 실행 및 관측 문서입니다. 소스 검토와 실제 실행을 구분합니다.

## 1. 재현 범위와 기준 소스

| 항목 | 확인 결과 |
|---|---|
| 저장소 | https://github.com/sdydy0298-dotcom/choi-bujang-secret-vault |
| 제출 브랜치 | keshev-22-work |
| 21단계 기반 부모 커밋 | f89612c2f1c2ccab1c647108ed351d76ff71b132 (22단계 최종 커밋 아님) |
| 정확한 **최종 제출 커밋** | 제출란에 입력할 40자리 Git HEAD. 아래에서 직접 읽어 확인. 자기 자신을 포함하는 커밋의 고정 해시는 문서에 미리 적을 수 없으므로 만들지 않음 |
| 시작 틀 버전 | on-client/package.json: 0.2.11 |
| 제품 상태 | 최종 검증 중. v1.0 선언 없음 |
| 실행 경로 | on-client/tools/start-alekov.ps1 -> on-client/src/server.mjs |
| 화면/학생 경계 | on-client/public/index.html 및 public/app.js (제공), student/extension.mjs (학생 표시) |

**동일 최종 소스 조건:** 제출란의 40자리 커밋, 새 폴더에서 출력한 git rev-parse HEAD, 재현 기록에 적힌 대상 커밋이 같아야 합니다. 과거 서로 다른 커밋의 모의 테스트나 공식 피드백을 합쳐 최종 소스의 실행 성공으로 표시하지 않습니다. 문서 수정으로 커밋이 달라졌으면 새 HEAD도 다시 확인해야 합니다.

## 2. 원본 작업 보존 - Windows PowerShell 직접 확인 1

기존 작업 폴더의 **Git 최상위 폴더**에서 다음 명령으로 원본 위치와 변경 상태를 먼저 확인합니다.

~~~powershell
git rev-parse --show-toplevel
git rev-parse HEAD
git status --short
~~~

출력에 변경 파일이 있더라도 원본을 지우거나 덮어쓰지 않습니다. 여기서 git reset --hard, git clean 또는 파일 삭제를 하지 않습니다. **작성 시점에 사용자의 Windows PC에서 위 명령을 실행한 결과는 미확인(UNV)**입니다.

## 3. 새 빈 폴더로 해당 제출 커밋 내려받기

원본 폴더 바깥의 새 PowerShell에서 실행합니다. 아래 기대 커밋 문자열은 **제출란에 실제로 사용하는 40자리 값으로 바꿔야 합니다.**

~~~powershell
$repo = 'https://github.com/sdydy0298-dotcom/choi-bujang-secret-vault'
$expectedCommit = 'PASTE_EXACT_40_CHARACTER_SUBMISSION_COMMIT'
$dest = Join-Path $HOME 'KESHEV-22-repro'

if ($expectedCommit -notmatch '^[0-9a-f]{40}$') {
    throw '제출에 사용할 40자리 커밋을 넣으세요.'
}
if (Test-Path -LiteralPath $dest) {
    throw '재현 폴더가 이미 있습니다. 기존 폴더는 보존하고 다른 새 이름을 선택하세요.'
}
git clone --branch keshev-22-work --single-branch $repo $dest
if ($LASTEXITCODE -ne 0) { throw '복제 실패: 연결 또는 저장소 접근을 확인하세요.' }
git -C $dest checkout --detach $expectedCommit
if ($LASTEXITCODE -ne 0) { throw '대상 커밋으로 전환하지 못했습니다.' }
$actualCommit = (git -C $dest rev-parse HEAD).Trim()
if ($actualCommit -ne $expectedCommit) { throw '제출한 커밋과 실제 체크아웃 버전이 다릅니다.' }
git -C $dest status --short
$actualCommit
~~~

기존 Windows PC의 별도 호스트 설정 파일·개인 보관함·인증 자료를 새 Git 폴더에 복사하지 않습니다. 새 디렉터리의 git status --short가 비었는지 확인합니다. 비공개 저장소는 사용자가 자신에게 허용된 Git 로그인으로 복제합니다.

## 4. Node.js 확인, 실행, 브라우저, 종료, 재실행

on-client/package.json은 Node.js 24.19.0을 선언하고, Windows 제공 시작 스크립트는 22~24를 허용합니다. on-client에는 별도 외부 dependencies가 없으므로 npm install로 다른 패키지나 루트 package-lock.json을 임의로 변경하지 않습니다. 아래 검사는 실제 Windows PowerShell에서 수행하기 전까지 미확인입니다.

~~~powershell
Set-Location (Join-Path $dest 'on-client')
node --version
npm.cmd run check
powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\start-alekov.ps1 -Port 5190
~~~

원본 앱이 기본 포트 5189에서 실행 중일 수 있으므로 별도 포트 5190을 사용합니다. 이미 사용 중인 포트라면 다른 프로그램을 종료하지 않고 빈 포트를 택해 주소도 함께 기록합니다. 이 스크립트의 **예상 문구(소스상 정의, 새 PC의 실행 관측 아님)**:

~~~text
케셰브가 켜졌습니다. 브라우저에서 http://127.0.0.1:5190/ 을 여세요.
서버가 응답한 것만 확인했습니다. AI 연결 상태는 화면에서 따로 확인해 주세요.
~~~

두 번째 PowerShell 창에서 HTTP 상태만 조회할 수 있습니다.

~~~powershell
(Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:5190/' -TimeoutSec 5).StatusCode
~~~

200을 받더라도 이는 **로컬 웹 응답만** 확인한 것입니다. 브라우저에서 http://127.0.0.1:5190/ 를 열어 **보호 현황 / 업무 앱 / 보안 기록**이 실제 보이는지 확인합니다. disconnected·unknown을 실제 원천 연결로, demo를 운영 자료로 기록하지 않습니다.

**종료:** 서버를 실행한 첫 번째 창에서 Ctrl+C. 종료 뒤 HTTP 접속이 끊기는지 확인합니다. **재실행:** 동일한 제출 커밋과 새 폴더에서 같은 시작 명령을 다시 사용합니다. 원본 서버·다른 애플리케이션은 종료하지 않습니다.

## 5. 실제 관측과 미확인 사항을 섞지 않은 재현 기록

| 절차 | 근거 구분 | 시각 | 수행/관측 | 결과 |
|---|---|---|---|---|
| 제공 시작 스크립트와 지원 버전 검사 | SRC(원문 읽기) | 2026-10-23 | Node 범위 22~24, 24.19.0 권장, 루프백 기본 포트와 시작 메시지 확인 | 원문 정합성만 확인 |
| 격리 Linux 작업공간의 기반 커밋 복제 시도 | RUN-FAILED | 2026-10-23 UTC (환경 점검 07:38:06Z) | 별도 폴더에서 21단계 부모 커밋 f89612c... 복제를 시도했으나 github.com DNS 조회에 실패함. 감지한 도구는 Node v22.16.0, Git 2.47.3, Windows PowerShell은 없음 | **체크아웃·서버 실행 실패. 최종 커밋 재현 아님** |
| 과거 사용자 로컬 UI/인증 화면 | SCREEN(이전 화면 보고) | 2026-10-23 이전 | 로컬 접속 및 계정 확인 화면, 승인 경로의 401/409 오류 관측 | 해당 과거 화면을 현재 제출 커밋의 새 환경 성공으로 사용하지 않음 |
| 사용자 원본 폴더 보존, 현재 HEAD | UNV | 미확인 | 직접 git rev-parse 및 status 확인 필요 | **미확인** |
| 사용자 새 폴더의 제출 SHA 일치 | UNV | 미확인 | 실제 clone / checkout / git status 기록 필요 | **미확인** |
| 사용자 새 폴더 Node 버전/문법 검사 | UNV | 미확인 | node --version, npm.cmd run check 출력 필요 | **미확인** |
| 사용자 새 폴더 로컬 HTTP/브라우저 | UNV | 미확인 | HTTP 상태와 3개 메뉴, 직접 관찰 시각 필요 | **미확인** |
| 사용자 새 폴더 종료 및 동일 HEAD 재실행 | UNV | 미확인 | Ctrl+C 및 재기동 기록 필요 | **미확인** |
| SDP/XDR/CLCO/OSV 실제 연동, 조치 효과 | UNV | 미확인 | 승인된 운영 시스템 결과는 따로 검증 필요 | **미확인, 임의 집행·유료 요청 금지** |

**RUN-FAILED는 코드 실행 실패 판정이 아니라 외부 네트워크 실패**입니다. 원본 폴더가 보존되어 있는지와 새 Windows 환경 결과는 사용자가 확인하기 전에는 성공이라고 쓰지 않습니다. 확인 결과를 추가하면 그 문서가 속한 새 커밋을 기준으로 HEAD를 다시 맞춥니다.

## 6. 오류·범위와 인수인계

- Git 복제 실패: 접속·접근 범위 확인. 이전 폴더로 바꿔 성공으로 기록하지 않음.
- Node 실행 실패: 버전과 오류 출력을 기록하고 21단계 학생 설명서 확인. 임의 종속성 업데이트 금지.
- 포트 점유: 원본 프로세스 강제 종료 금지, 다른 빈 포트를 사용하고 기록.
- ENGINE_NOT_CONNECTED: 기존 원천 미연결이지 성공 또는 보안 정상 증명이 아님.
- 계정 확인 401 또는 ON_AI_PROVISIONING_PENDING: 앱 전용 권한·승인 미확인. 비용 발생 AI 요청 반복 금지.
- pending 및 unknown: 서버 접수 또는 결과 불명. 효과 성공과 구분하며 실제 보안 집행 시험 금지.
- not_configured, not_checked, partial: 운영자 설정/조회 상태. none_found 또는 안전 판정으로 바꾸지 않음.

관련 실제 학생 자료: [21단계 실행 설명서](STUDENT_RUNBOOK.md), [시스템 구성도](STUDENT_ARCHITECTURE.md), [22단계 단계별 릴리스 기록](STUDENT_STAGE22_RELEASE.md), [데이터 보존 계획](STUDENT_STAGE22_DATA_PLAN.md).

**현재 판정: 최종 버전 검증 중(UNV).** 이 문서만으로 실제 운영 인수 승인 또는 v1.0을 선언하지 않습니다.
