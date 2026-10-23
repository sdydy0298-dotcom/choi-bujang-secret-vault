# 케셰브(KESHEV) — 학생 작성 README · 21단계

> 범위: `on-client/` 로컬 보안 Agent. 이 문서는 학생 작업물이며, 제공된 [시작 틀 README](README.md)와 저장소 최상위의 1~12단계 README를 변경하지 않습니다.
> 작성 근거: `keshev-20-work` 의 소스·설정·제공 안내, 기존 학습 중 로컬 화면 관측. **새 Windows 환경의 실재현, 공식 통과, 실사용 연결은 미확인**입니다.

## 목적과 기능

케셰브는 개인이 **자기 로그인·기기·세션, 업무 앱 접근 판정, 접속 기록·XDR 경보**를 확인하는 로컬 보안 Agent입니다. AI는 선택 사건의 기존 근거와 규칙을 **참고용으로 설명**하며, 실제 접근 판정과 조치 집행은 AI 설명과 별도입니다. 설치 패키지의 **승인된 공개 npm 패키지**에 대해 정확한 버전별 OSV 조회 결과를 표시하도록 학생 화면을 구성했습니다.

| 메뉴 | 기능과 범위 | 주 화면 원본 |
|---|---|---|
| 보호 현황 | 사용자·기기·세션, 계정 연결/AI 승인·모델 점검, 도움정보, 설치 패키지 조회 | `public/index.html`, `public/app.js` |
| 업무 앱 | 접근 허용·거부·추가 확인·확인 불가 및 서버 오류 구분 | `public/app.js`, `student/extension.mjs` |
| 보안 기록 | 내 접속 기록·기존 XDR 경보, 근거 연결 AI 설명, 조치 상태·원천 효과의 구분 | `public/app.js`, `student/extension.mjs` |

기본 실행은 기존 회사/SDP 시스템에 **연결되지 않은 상태**입니다. `demo`는 예제이고 실제 연결 성취가 아닙니다. 19단계의 실제 조치 집행 연결과 실제 학생 계정의 AI 권한, OSV 실조회는 별도로 검증해야 합니다.

## 지원 환경·버전 (소스 선언 / 실측 구분)

| 항목 | 소스에서 확인한 값 | 실제 학생 PC 실측 |
|---|---|---|
| 운영 환경 | Windows용 `tools/start-alekov.ps1` | 사용자는 Windows에서 로컬 화면을 열었음. **새 환경 재현 미확인** |
| Node.js | `package.json`의 `engines.node: 24.19.0`; 스크립트는 22~24 허용 | 현재 설치된 `node --version` 출력 **미확인** |
| 앱 시작 틀 버전 | `on-client/package.json`의 `0.2.11` | 코드 메타데이터이며 완성 릴리스 v1.0 아님 |
| npm 패키지 | `on-client/package.json`에 외부 dependencies 없음 | 현재 PC에 설치된 `node_modules` 상태 **미확인** |
| 잠금 파일 | 저장소 **최상위** `package-lock.json`(lockfileVersion 3) | `on-client` 자체의 lock 파일이 아님. OSV 조회 대상은 운영자가 지정하므로 **미확인** |

### 켜기 · 종료 · 문법 확인

**Git 저장소 최상위 폴더가 아니라 `on-client` 안에서** 새 PowerShell을 열어 실행합니다.

~~~powershell
node --version
powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\start-alekov.ps1
~~~

예상 안내(제공 스크립트 원문 기준): `케셰브가 켜졌습니다. 브라우저에서 http://127.0.0.1:5189/ 을 여세요.` / `서버가 응답한 것만 확인했습니다. AI 연결 상태는 화면에서 따로 확인해 주세요.` 브라우저에서 **http://127.0.0.1:5189/** 를 엽니다. 실행 중인 PowerShell에서 **Ctrl+C**로 종료하고 동일 명령으로 재실행합니다. 이 세부 절차는 [실행 설명서](docs/STUDENT_RUNBOOK.md)를 확인합니다.

~~~powershell
npm.cmd run check
~~~

위 `check`는 `student/extension.mjs`의 **문법만 검사**합니다. 실행·연동·공식 판정 통과를 보장하지 않습니다. 스크립트·경로는 제공 소스와 대조했지만, **이 문서를 만든 시점에 새 PowerShell 실재현을 수행하지 않았습니다.**

## 시스템 구성

글로 된 네 구역 구성도, 조건부 데이터 흐름, 사용 중인 실제 파일과 공개 URL은 [학생 구성도](docs/STUDENT_ARCHITECTURE.md)에 있습니다. 브라우저 → 로컬 Node 앱 서버는 루프백 접속입니다. 그 서버에서 기존 SDP 접근제어·XDR 시스템 또는 CLCO AI 게이트로 나가는 경로는 **각기 별도의 운영자 설정·권한 검증이 있는 경우에만** 사용합니다. CLCO와 ALEPH 공식 제출 포털은 다른 역할입니다.

## 제공 코드와 학생 작성 범위

- **학생 표시 함수:** `student/extension.mjs` 안의 `renderIdentity`, `renderDecision`, `renderEvents`, `renderStatus`, `renderAiConnection`, `renderExplanation`, `renderAction`, `renderVulnerabilities`. 각 단계에서 받은 데이터를 DOM의 안전한 텍스트로 표현하며 실제 네트워크 조치를 시작하지 않습니다.
- **학생 어댑터 영역:** `student/engine-adapter.mjs`는 제공된 연동 틀을 이어 쓰는 파일입니다. 운영자 인증서나 토큰을 임의로 주입하지 않습니다.
- **제공·보호 영역:** `public/app.js`(요청/취소/갱신), `src/server.mjs`(로컬 HTTP), `src/engine/`, `src/connection/`, `src/ai/`, `src/actions/`, `src/vulnerabilities/`, `tools/`. 제공 파일 목록과 기준 해시는 `.on-starter-manifest.json`에 있으며, 이 manifest의 학생 파일 해시는 시작 틀 기준선이지 학생 수정 이후의 현재 해시가 아닙니다.

## 문제 해결·미확인·제출

- **오류·화면 상태:** [학생 실행 설명서](docs/STUDENT_RUNBOOK.md)의 장애 표와 제공된 [연결 문제 해결 문서](docs/CONNECTION_TROUBLESHOOT.md)를 참고합니다.
- **미확인(UNV):** 새 Windows 환경 재실행, 실제 SDP 접근 판정·XDR 연결, 실제 계정의 CLCO 승인 및 유료 모델 추론, 조치 집행·효과 확인, 실제 OSV 패키지 조회. 기본/예제 화면이나 코드 모의 검사로 대체하지 않습니다.
- **제출:** 21·22단계는 ALEPH 과제 화면에 **GitHub 저장소 주소와 40자리 커밋**을 직접 입력합니다. 이 문서 제작 중에는 공식 제출을 실행하지 않았습니다. 비공개 저장소 원문 JSON은 포털의 공식 절차를 따릅니다.
- **비밀 보관:** `.env`, 개인 설정 파일, API 키·토큰·비밀번호·인증서는 프로젝트/커밋/문서 밖에 두고 내용을 붙여 넣지 않습니다. 과거 기록을 지우거나 소스 제공 부분을 덮어쓰지 않습니다.

## 22단계 최종 인수인계 (검증 중)

21단계 기존 설명서·구성도는 유지합니다. 동일 커밋으로 재현할 절차와 관측 상태, 누적 버전 이력, 외부 데이터 보존 경계는 아래 **학생 추가 문서**를 함께 읽습니다. 현재 on-client/package.json은 0.2.11이며 실제 Windows 새 환경·원천 집행·운영 승인 확인 전까지 v1.0을 선언하지 않습니다.

- [새 폴더 재현 절차 및 관측 기록](docs/STUDENT_STAGE22_REPRODUCTION.md)
- [13~21단계 누적·릴리스/버전 기록](docs/STUDENT_STAGE22_RELEASE.md)
- [데이터 백업·복원 계획과 권한 경계](docs/STUDENT_STAGE22_DATA_PLAN.md)

22단계에 제출할 정확한 40자리 커밋은 사용자가 GitHub HEAD와 제출 화면에서 확인합니다. 서버 AI의 커밋 원문 판정은 실제 새 환경 실행 검증을 대신하지 않습니다.
