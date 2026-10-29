# KESHEV · 마지막 총공세 5일차 실행·재현 가이드

**대상:** 처음 케셰브를 실행하는 사람 · 22단계 이후 총공세 2~4일차 기능 포함  
**실행 방식:** Windows 프로젝트 폴더에서 직접 실행 (설치/포장 명령 사용하지 않음)  
**주소:** http://127.0.0.1:5189/ · 같은 PC에서만 접속  
**범위:** 제공 코드와 기존 제출물은 보존하고, 공식 시작 틀 업데이트만 허용된 도구로 수행

> **실제 다른 사람의 오류 메시지는 아직 전달받지 않았습니다.** 특정 오류의 원인은 확정하지 않습니다. 하지만 GitHub 브랜치에 남은 시작 틀 `0.2.11`과 PC 실측 기능에 필요한 `0.2.21` 사이의 차이는 확인했습니다. 이 문서는 그 차이 때문에 재현이 막히지 않도록 작성했습니다.

## 1. 실행 전 준비

| 구분 | 기준 / 설명 |
|---|---|
| OS | Windows 10/11, 일반 사용자 PowerShell |
| Git | `git --version`으로 확인 |
| Node.js | 제공 실행 스크립트는 22~24 지원, 수업 기준 24.19.0 |
| 작업 브랜치 | `keshev-final-assault` (기존 `keshev-22-work` 제출 브랜치는 보존) |
| 실행 위치 | 프로젝트 루트 아래의 `on-client/` |
| PC 조회 지원 | 공식 시작 틀 `0.2.21`의 `GET /api/pc/status` |
| 포트 | 5189만 사용; Demo 및 5190은 이 가이드 범위 밖 |
| 보안 | 관리자 권한 상승, 방화벽 설정 변경, 공격·침투 시험 금지 |

기존 작업 폴더를 **지우거나 옮기지 않습니다.** `git reset --hard`, `git clean`, 기존 폴더에 중복 클론을 사용하지 않습니다.

## 2. 처음 실행하는 사람: 새 폴더 클론

**기존 `keshev-final` 폴더가 있는 경우에는 클론을 생략하고 3장으로 이동합니다.**

PowerShell에서 새 프로젝트를 놓을 상위 폴더로 이동한 다음 실행:

~~~powershell
git --version
node --version
$dest = Join-Path (Get-Location) "keshev-repro-day5"
if (Test-Path -LiteralPath $dest) { throw "기존 재현 폴더를 덮어쓸 수 없습니다. 다른 이름을 지정하세요." }
git clone -b keshev-final-assault --single-branch https://github.com/sdydy0298-dotcom/choi-bujang-secret-vault.git $dest
if ($LASTEXITCODE -ne 0) { throw "Git 클론에 실패했습니다. 오류 원문을 확인하세요." }
Set-Location (Join-Path $dest "on-client")
git branch --show-current
git rev-parse HEAD
(Get-Content .\package.json -Raw | ConvertFrom-Json).version
~~~

**기대:** 브랜치는 `keshev-final-assault`, 저장소에 들어 있는 시작 틀 버전은 `0.2.11`입니다. 정상적으로 클론해도 PC 측정 API가 없으므로 다음 단계가 필요합니다.

## 3. 공식 시작 틀 0.2.21을 보존 업데이트

안내: https://aleph-workbench-downloads.vercel.app/alekov-connect-0.2.21.html

공식 파일 두 개를 Windows 다운로드 폴더에 준비합니다.

- `alekov-starter-0.2.21.zip` (압축은 풀지 않음)
- `update-alekov-0.2.21.ps1`

실행 중인 케셰브 서버가 있다면 해당 PowerShell 창에서 **Ctrl+C**로 종료합니다. **현재 위치는 `on-client` 폴더**여야 합니다.

~~~powershell
Get-Location
(Get-Content .\package.json -Raw | ConvertFrom-Json).version
Test-Path "$HOME\Downloads\update-alekov-0.2.21.ps1"
Test-Path "$HOME\Downloads\alekov-starter-0.2.21.zip"
~~~

현재 버전이 이미 `0.2.21`이고 `Test-Path .\src\pc-status.mjs`가 `True`이면 **재업데이트하지 않고 4장으로** 갑니다.

버전 `0.2.11`이고 두 공식 파일이 실제로 있다면, 학생 파일 보존 기준 해시를 저장합니다.

~~~powershell
$extensionBefore = (Get-FileHash .\student\extension.mjs -Algorithm SHA256).Hash
$appearanceBefore = (Get-FileHash .\student\appearance.json -Algorithm SHA256).Hash

# Dry-run: 변경 예정 목록 확인, 아직 실제 변경 없음
powershell -NoProfile -ExecutionPolicy Bypass -File "$HOME\Downloads\update-alekov-0.2.21.ps1" -Project "$PWD" -ZipPath "$HOME\Downloads\alekov-starter-0.2.21.zip" -Json
~~~

`DRY_RUN_READY`와 `touched:false`를 확인하고, `changed` 목록에 학생 파일이 있거나 충돌이 발생했다면 **적용하지 않습니다**.

정상 미리보기일 때만 아래 명령을 실행합니다.

~~~powershell
powershell -NoProfile -ExecutionPolicy Bypass -File "$HOME\Downloads\update-alekov-0.2.21.ps1" -Project "$PWD" -ZipPath "$HOME\Downloads\alekov-starter-0.2.21.zip" -Json -Apply

(Get-Content .\package.json -Raw | ConvertFrom-Json).version
Test-Path .\src\pc-status.mjs
(Get-FileHash .\student\extension.mjs -Algorithm SHA256).Hash -eq $extensionBefore
(Get-FileHash .\student\appearance.json -Algorithm SHA256).Hash -eq $appearanceBefore
~~~

**기대:** `UPDATED`, `touched:true`, 백업 ID, 버전 `0.2.21`, 조회 파일 `True`, 학생 파일의 해시 비교가 모두 `True`. 업데이트에 실패하거나 해시가 달라지면 파일을 임의 복원하거나 강제 덮어쓰지 말고 오류를 보존합니다.

참고: 2026-10-29 **사용자 Windows PC**에서는 공식 업데이트가 실제 성공했지만 이는 다른 PC의 성공을 보장하지 않습니다.

## 4. 앱 실행

같은 `on-client` 폴더에서 순서대로 실행합니다.

~~~powershell
node --version
(Get-Content .\package.json -Raw | ConvertFrom-Json).version
npm.cmd run check
powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\start-alekov.ps1
~~~

- 버전은 `0.2.21`이어야 합니다.
- `npm.cmd run check`는 **문법 검사**이지 화면·SDP·XDR 작동 판정이 아닙니다.
- `케셰브가 켜졌습니다` 메시지가 나오면 브라우저에서 **http://127.0.0.1:5189/**를 엽니다.
- 실행 스크립트가 프롬프트를 반환해도 즉시 종료로 단정하지 않고 HTTP 응답을 확인합니다.

다른 PowerShell 창에서 **읽기 전용 확인**:

~~~powershell
(Invoke-WebRequest -UseBasicParsing "http://127.0.0.1:5189/" -TimeoutSec 10).StatusCode
(Invoke-RestMethod "http://127.0.0.1:5189/api/pc/status").data.schema
~~~

정상 기준: `200`, `aleph.on.pc-status.v1`. 이는 PC 조회 API 확인이며 **SDP·AI·XDR 실제 연동 확인이 아닙니다**.

## 5. 브라우저 검증 순서

1. `http://127.0.0.1:5189/` → `Ctrl+Shift+R` → **보호 현황**.
2. 공식 제공 **내 PC 상태**와 학생 **내 PC 관제 대시보드**가 별도 영역인지 확인합니다. 제공 화면을 삭제·수정하지 않았으므로 두 영역이 나타날 수 있습니다.
3. 학생 대시보드의 **핵심 기능 3가지**(시스템 자원/네트워크 보안/시스템 기록)를 확인합니다.
4. **상단 상태 카드 4개**(CPU, 메모리, 디스크, SDP)와 아래 추이·기록을 확인합니다.
5. Tab → **조회** → Enter. `새로 읽는 중…`을 거쳐 CPU·메모리·디스크·네트워크·방화벽·Windows 기록 항목 각각의 **실측** 또는 **확인 불가**를 확인합니다.
6. **10초 정도 후 다시 조회**해 그래프의 측정점과 최근 기록이 누적되는지 확인합니다.
7. Windows 방화벽 **Domain/Private/Public**의 활성 상태를 읽기만 합니다. System·Application **최근 24시간 경고·오류 건수는 침해/공격 탐지 결과가 아닙니다**. 최대 5,000건 일부 집계면 표시합니다.
8. **SDP 미연결**은 PC 실측 성공과 별개입니다. Demo 모드의 사용자/접속 기록은 **예제 데이터**이며 실제 결과가 아닙니다.
9. 업무 앱·보안 기록 메뉴가 보존되는지 확인합니다. 원천 미연결이라면 실제 접근 판정/원천 기록은 확인되지 않을 수 있습니다.
10. 실행한 서버 창에서 **Ctrl+C**로 종료하고, 같은 명령으로 다시 실행해 재현성을 점검합니다.

**CPU 정확도 제한:** 공식 0.2.21은 Node.js 시스템 CPU 사용시간을 **200ms 표본**으로 계산합니다. 실제 사용자 PC에서 작업 관리자 3% 대비 케셰브 12~19%의 차이가 관측됐습니다. 샘플 시각·방식·조회 부하가 다르며 일치 여부는 **미검증**입니다. 수치를 임의로 보정하지 말고 측정 표본임을 안내합니다.

## 6. 막혔을 때 (원인 분류)

| 증상 | 원인 후보 | 확인·조치 |
|---|---|---|
| `node` 명령 없음 | Node.js 미설치 또는 PATH | Node 22~24 설치 상태 확인, 새 PowerShell 창 실행 |
| `git clone` 실패 | 네트워크/저장소 접근 | Git 오류 원문 확인, 기존 폴더 삭제 금지 |
| 실행 스크립트 파일 없음 | 잘못된 폴더 | `Get-Location`, `Test-Path .\tools\start-alekov.ps1` |
| `DRY_RUN_READY`만 표시 | 미리보기만 실행 | 변경 목록 점검 후 승인된 경우에만 `-Apply` |
| `NOT_ALLOWED` / PC 조회 미지원 | 구버전 시작 틀 | `package.json` 버전과 `src\pc-status.mjs` 존재 확인, 공식 업데이트 |
| 5189 포트 사용 중 | 기존 서버 실행 중/다른 앱 | `netstat -ano`로 점유 확인. 강제 종료하지 않음 |
| `npm.cmd run check` 실패 | 학생 코드 문법 | 오류 줄·원문 보관, 무조건 교체하지 않음 |
| 이벤트·방화벽 `확인 불가` | 권한 부족/시간 초과 | 이유 확인, 관리자 권한 강제 요청·설정 변경 금지 |
| 화면은 표시, SDP 미연결 | 원천 설정 없음 | 기본 모드 예상 상태, 실측 성공과 별도 |
| CPU 수치가 작업 관리자와 다름 | 200ms 표본과 산정 방식 차이 가능 | 측정 시각·한계 기록, 임의 수치 보정 금지 |
| Demo 예제만 보임 | 서버가 예제 모드 | 예제를 실측·실제 SDP 연결로 기록하지 않음 |

**실제 막힌 단계/오류 원문을 받기 전까지 특정 원인을 확정하지 않습니다.**

## 7. 타인이 작성자에게 보낼 재현 기록

~~~text
[환경] Windows 버전 / Node.js 버전:
[Git] 브랜치 / 40자리 커밋:
[폴더] Get-Location 출력:
[시작 틀] package.json 버전:
[업데이트] DRY_RUN_READY / UPDATED / 미실행:
[실행] HTTP 200 여부 / pc-status 스키마:
[화면] PC 실측 성공 항목 수 / SDP 연결 상태:
[막힌 단계] 번호:
[실제 실행/클릭]:
[오류 문구 원문]:
[시도한 해결 행동]:
[재실행 결과]:
~~~

**비밀번호·토큰·API 키·개인 인증서·기기 식별값은 첨부하지 않습니다.** 보고서의 미실행은 미실행, 조회 실패는 확인 불가로 기록하며 예제값으로 대체하지 않습니다.

## 8. 보존·검증 상태

- 이번 5일차에는 제공 UI/서버 코드와 학생 화면 코드 변경 없이 **문서만** 정리합니다.
- 기존 22단계 제출 브랜치와 제출 자료는 보존합니다.
- 사용자 Windows PC에서 **0.2.21 업데이트, PC 실측 6/6, SDP 미연결, 학생 UI 표시**는 이전 화면으로 확인됐습니다.
- **타인 PC의 새 환경 재현 및 특정 장애 해결은 아직 직접 검증되지 않았습니다.**
- 기존 수행 이력: [학생 README](../STUDENT_README.md), [22단계 재현 기록](STUDENT_STAGE22_REPRODUCTION.md).
