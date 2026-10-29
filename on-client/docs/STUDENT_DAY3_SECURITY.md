# 케셰브 마지막 총공세 · 3일차 — 로컬 네트워크·방화벽·Windows 기록

## 변경 내역 (학생 코드만)
- `student/extension.mjs`: 기존 2일차의 상단 CPU·메모리·디스크·SDP 카드 네 개와 하단 그래프/기록을 유지하면서, **네트워크 구성 / Windows 방화벽 / Windows 이벤트** 읽기 전용 카드 세 개와 직전 실측 대비 변화 영역을 추가했습니다.
- `docs/STUDENT_DAY3_SECURITY.md`: 새 기능의 데이터 출처·제한·검증·실행 순서를 기록합니다.
- `src/`, `public/`, `tools/`, `.on-starter-manifest.json`, `student/appearance.json`, 이전 제출 커밋은 이번 GitHub 커밋에서 수정하지 않았습니다. **포장 명령도 실행하지 않았습니다.**

## 데이터 출처 및 정확한 의미
공식 시작 틀 0.2.21의 읽기 전용 `GET /api/pc/status` 단일 호출을 사용합니다. 호출은 사용자가 대시보드의 `내 PC 조회/다시 조회` 버튼을 클릭할 때만 발생하며 자동 폴링·재시도가 없습니다.

| 항목 | 원본 필드 | 화면에서 의미하는 것 | 의미하지 않는 것 |
|---|---|---|---|
| CPU | `metrics.cpu.usagePercent` | 해당 PC에서 200ms 동안 얻은 CPU 사용률 표본 | 서버 상태, 누적 평균 |
| 메모리 | `metrics.memory.usedBytes/totalBytes` | PC의 사용 메모리와 전체 메모리 | 보안 양호 판정 |
| 디스크 | `metrics.disk.freeBytes/totalBytes` | 프로젝트가 저장된 파일시스템의 여유/전체 공간 | 모든 드라이브의 상태 |
| 네트워크 | `metrics.network.interfaceCount/ipv4Count` | 루프백을 제외하고 주소가 있는 네트워크 인터페이스 개수 및 IPv4 구성 개수 | WAN/인터넷 접속 성공, 접속 경로 확인 |
| 방화벽 | `metrics.firewall.profiles` | Windows Domain·Private·Public 프로필의 Enabled 값 | 켜져 있으면 안전하다는 판정, 방화벽 차단 효과 검증 |
| Windows 기록 | `metrics.events.warningCount/errorCount` | Windows System·Application 로그의 최근 24시간 경고(Level 3)·오류(Level 2) 건수 | **침해 또는 공격 탐지 건수** |
| SDP 연결 | 제공 UI가 전달한 `mode` | `disconnected`일 때 **SDP 미연결**, `demo`일 때 예제, `unknown`일 때 확인 불가 | PC 실측 API 성공이 곧 SDP 연결이라는 뜻 |

> **이벤트의 경고·오류 건수는 침해나 공격 탐지 결과가 아닙니다.** Windows System/Application 이벤트 본문, 개인 식별자, 실제 IP, 네트워크 주소 목록은 학생 대시보드에 옮기지 않습니다.

`metrics.events`는 최근 24시간 범위의 이벤트를 최대 5,000건 표본으로 집계합니다. `truncated=true`이면 화면에 **최대 5,000건 일부 집계**라고 표시하므로 이를 24시간 전체 건수라고 주장하지 않습니다. 직전 측정 대비 기록 개수 변화는 시간 구간이 움직이는 집계 차이일 뿐 신규 공격 수가 아닙니다.

## 안전성 / 권한
- 방화벽 프로필은 제공 시작 틀의 `Get-NetFirewallProfile`로 **조회만** 합니다. `Set-NetFirewallProfile`을 실행하지 않습니다.
- Windows 경고·오류는 제공 시작 틀의 `Get-WinEvent`로 읽기만 합니다. 로그·정책·설정을 수정하지 않습니다.
- 관리자 권한 상승/요청, 설정 변경, 공격·침투 재현, 외부 서버로 데이터 전송을 하지 않습니다.
- 항목별로 `permission_denied`, `timeout`, `unsupported`, `query_failed`, `invalid_response` 등을 받으면 **확인 불가 + 이유**로 표시합니다. 거짓 0 또는 예제값으로 대체하지 않습니다.
- SDP 모드가 `disconnected`이면 PC 실측 6/6에 성공해도 **SDP 미연결**이 따로 남습니다. `demo`의 SDP 데이터는 예제이며 PC의 로컬 측정값과 분리 표시합니다.
- 최근 16회 측정은 브라우저 메모리에만 보관됩니다. 새로고침하면 지워지며, 이전 데이터를 최신 측정값으로 재사용하지 않습니다.

## 사용자의 로컬 0.2.21 시작 틀을 보존하면서 학생 파일만 가져오기
현재 로컬에 공식 0.2.21 업데이트가 적용된 상태입니다. GitHub 작업 브랜치의 제공 파일은 **이전 0.2.11**이므로 `git pull`, 전체 `git switch`, `git reset --hard`, `git clean` 등으로 되돌리지 않습니다. **학생 파일 1개와 새 문서 1개만** 가져옵니다.

`on-client` 폴더의 PowerShell(일반 권한)에서:
```powershell
# 케셰브 서버 창에서 Ctrl+C로 서버를 먼저 종료합니다.
# 원래 학생 파일의 로컬 수정 유무를 확인합니다. 수정 표시가 있으면 덮어쓰지 말고 내용을 비교합니다.
git status --short -- student/extension.mjs

git fetch origin refs/heads/keshev-final-assault:refs/remotes/origin/keshev-final-assault
# 이 명령은 지정한 두 경로의 작업 트리만 변경하며 공식 제공 0.2.21 파일에는 손대지 않습니다.
git restore --source=origin/keshev-final-assault --worktree -- student/extension.mjs docs/STUDENT_DAY3_SECURITY.md

(Get-Content .\package.json -Raw | ConvertFrom-Json).version
npm.cmd run check
powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\start-alekov.ps1
```
버전은 `0.2.21`이어야 합니다. 실제 PC에서 실행한 모습은 아래 순서로 확인합니다.

## PC에서 검증할 순서 (5189 포트 하나)
1. 브라우저 `http://127.0.0.1:5189/` → `Ctrl+Shift+R` → 보호 현황 → 학생 상태·알림 표시 → **내 PC 관제 대시보드**.
2. 상단 카드 네 개(CPU·메모리·디스크·SDP) 및 아래 네트워크/Windows 보안 카드 세 개가 있는지 확인.
3. `내 PC 조회`를 클릭해 `실측 6/6` 또는 일부 `확인 불가` + 이유가 보이는지 확인. 6개 중 일부를 못 읽어도 성공인 척하지 않아야 합니다.
4. 네트워크: 외부 인터페이스 개수와 IPv4 구성 개수 표시 확인. 네트워크 연결 성공으로 오해할 문구가 없어야 합니다.
5. 방화벽: 도메인·개인·공용 상태가 각각 켜짐/꺼짐인지 확인. Windows 보안 → 방화벽 및 네트워크 보호의 값과 대조(보기만 함).
6. Windows 기록: 최근 24시간 경고·오류 건수 및 **침해·공격 탐지가 아님** 문구 확인. 이벤트 뷰어 → Windows 로그 → System/Application → 최근 24시간의 경고·오류로 범위를 좁혀 건수와 대조(조회 시각 차이로 오차 가능).
7. SDP가 설정되지 않았다면 `SDP 미연결(disconnected)`을 PC 성공과 별도로 표시하는지 확인.
8. 10초쯤 뒤 `다시 조회`를 한 번 더 누르고 CPU·메모리 그래프 및 네트워크/방화벽/이벤트의 **직전 실측 대비 변화**를 확인. 변화 없음도 정상입니다.
9. 서버를 `Ctrl+C`로 종료하고 화면에서 다시 조회했을 때 오류와 `확인 불가`가 표시되는지 확인. 기존 값은 최근 측정 기록 영역에만 남고 최신 실측으로 취급하지 않습니다.
10. `npm.cmd run check`를 다시 실행해 문법 오류가 없음을 확인하고 결과 화면을 캡처합니다.

PowerShell에서 API 원본을 읽기 전용으로 확인할 수도 있습니다:
```powershell
$r = Invoke-RestMethod "http://127.0.0.1:5189/api/pc/status"
$r.data.metrics.network
$r.data.metrics.firewall | ConvertTo-Json -Depth 4
$r.data.metrics.events
```

## 실행 환경과 검증 범위
- 로컬 프로그램: Windows · Node.js v24.x · 공식 시작 틀 0.2.21.
- 외부 SDP/AI/XDR 엔진의 실제 연동은 이 기능으로 검증되지 않습니다.
- 학생 확장 소스의 문법 및 **모의 입력을 사용한 UI 출력 검증**(전체 6개 성공, 일부 권한 부족, 이벤트 5,000건 일부 집계, 비교 변화, 네트워크 API 오류, SDP 예제 모드)은 수행했습니다. 모의 입력은 실제 Windows 측정값이 아닙니다.
- 사용자 Windows PC의 3일차 화면 값과 실제 이벤트 뷰어·방화벽 상태 일치 여부는 사용자가 위 절차로 검증해야 합니다.
