# 케셰브 마지막 총공세 · 2일차 관제 대시보드

## 구현 범위
- 제공 파일(src/, public/, tools/) 변경 없음.
- 학생 `student/extension.mjs` 의 기존 13~22단계 함수 유지.
- 추가 학생 구현: `createKeshevDay2`, `renderStatus` 안의 관제 대시보드.
- `student/appearance.json` 으로 앱 테마와 학생 카드 우선 배치. 공식 시작 틀 0.2.21에서 지원.
- 설치 프로그램 및 패키징 명령 실행하지 않음.

## 실측 API 필수
이 구현은 **공식 시작 틀 0.2.21 이상**의 `GET /api/pc/status`가 있어야 실측 값을 표시한다.
기존 22단계 Git 브랜치의 시작 틀 0.2.11에는 해당 API가 없으므로, 0.2.11에서 조회하면 `NOT_ALLOWED` 또는 조회 실패가 나오는 것이 정상이다.
공식 제공 업데이트만 사용하고 src/server.mjs, public/app.js 등 제공 파일을 직접 수정하지 않는다.

### 기존 작업 폴더 유지하며 업데이트
1. 실행 중인 케셰브 서버 종료(Ctrl+C). 다른 프로세스는 종료하지 않는다.
2. `on-client` 폴더에서 공식 자료 `alekov-starter-0.2.21.zip`과 `update-alekov-0.2.21.ps1`를 다운로드 폴더에 준비한다.
3. 미리보기:
```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File "$HOME\Downloads\update-alekov-0.2.21.ps1" -Project "$PWD" -ZipPath "$HOME\Downloads\alekov-starter-0.2.21.zip" -Json
```
4. 출력에 `DRY_RUN_READY`가 나오고 학생 파일 보존이 확인될 때만 **동일 명령 끝에 `-Apply`** 를 붙여 실행한다.
5. 거부·충돌·실패 출력은 그대로 보존하고 강제로 재실행하거나 폴더를 지우지 않는다.

## 프로젝트 작업 버전 적용
GitHub 작업 브랜치 `keshev-final-assault`를 사용한다. 기존 `keshev-22-work`나 제출물은 건드리지 않는다.
```powershell
# 저장소 최상위에서(중요: 미커밋 변경이 있으면 먼저 확인)
git status --short
git fetch origin
git switch keshev-final-assault
cd on-client
node --version
npm.cmd run check
powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\start-alekov.ps1
```
위 변경이 충돌하면 기존 변경을 삭제/초기화하지 말고 멈춘다.

## 조회 / 검증
1. 브라우저에서 `http://127.0.0.1:5189/` 접속.
2. 보호 현황 → 학생 상태·알림 표시의 **내 PC 관제 대시보드** 확인.
3. 상단 상태 카드 4개(CPU, 메모리, 디스크 여유, SDP 연결). 조회 전에는 숫자 대신 `조회 전`.
4. `내 PC 조회` 한 번 클릭. CPU %, 메모리 사용률/사용량(GiB), 디스크 여유(GiB), `실측 · 이 PC · 시각` 확인.
5. 10초 이상 뒤 `다시 조회` 클릭. CPU/메모리 그래프와 최근 기록 두 건 확인.
6. Windows 작업 관리자 CPU·메모리와 같은 시각 비교. CPU 표본 200ms 등 차이가 날 수 있음. 디스크는 프로젝트가 있는 볼륨의 여유를 측정함.
7. 측정 실패/권한 부족/응답 미지원은 `확인 불가`로 표시한다. 예제값으로 대신하지 않는다.
8. `-Demo -Port 5190` 로 켠 경우에도 SDP 데이터는 예제, PC 조회값은 실제 PC 데이터로 서로 구별한다.
9. PowerShell에서 Ctrl+C로 앱을 끄고 다시 조회하면 실패 메시지가 나와야 한다. 복구 후 재조회.
10. 재실행이나 페이지 새로고침 시 추이 기록은 초기화된다. 브라우저 로컬에만 기록하며 외부 전송이나 CSV 파일 자동 생성은 하지 않는다.

## 미검증 사항
- GitHub 파일 문법 구조는 검토했지만 사용자 Windows PC의 실제 CPU/메모리/디스크 수치는 이 작업 환경에서 재지 않았다.
- 설치형 setup.exe는 범위 밖이다.
- SDP 원천 연결·AI 승인·실제 XDR 결과는 이번 2일차의 변경 범위가 아니다.
- 제공 시작 틀 0.2.21 업데이트의 학생 원본 보존 결과 및 실측 API 동작은 사용자 PC에서 확인해야 한다.
