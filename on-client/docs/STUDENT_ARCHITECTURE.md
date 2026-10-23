# 케셰브 시스템 구성도 — 학생 작성(21단계)

> 원문 대조 기준: `keshev-20-work`의 `on-client` 제공 서버/브라우저/어댑터 파일, `tools/prepare-native-host.ps1`의 공개 게이트 주소. **아래 점선은 구조상 조건부 연결이지 현재 사용자 계정의 실제 연결 성공이 아닙니다.**

## 네 구성요소

~~~mermaid
flowchart LR
    B["1. PC 브라우저<br/>http://127.0.0.1:5189/<br/>public/index.html · public/app.js"]
    L["2. 케셰브 로컬 앱 서버<br/>src/server.mjs<br/>127.0.0.1:5189"]
    S["3. 기존 접근 제어·XDR(SDP)<br/>로컬 연결 코드: src/engine/sdp-host.mjs<br/>외부 원천 주소: 운영자 설정 / 미확인"]
    G["4. CLCO AI 게이트<br/>로컬 호출부: src/ai/service.mjs<br/>https://ai-classroom-gateway-production.up.railway.app"]
    B <-->|"HTTP: 화면·API"| L
    L -.->|"SdpHostConfig 및 본인 권한 필요"| S
    L -.->|"NativeHostConfig, 계정 연결, AI 앱 승인 필요"| G
~~~

Mermaid가 보이지 않을 때의 **동일한 텍스트 구성도**:

~~~text
[PC 브라우저: http://127.0.0.1:5189/ · public/index.html · public/app.js]
   <--- 로컬 HTTP/JSON --->
[케셰브 Node 서버: 127.0.0.1:5189 · src/server.mjs]
   |-- (조건부: SDP 설정·권한) --> [기존 접근제어·XDR 시스템]
   |                              연결 모듈 src/engine/sdp-host.mjs
   |                              실제 외부 주소는 개인 설정에 있고 문서에서는 미확인
   |
   '-- (조건부: 계정 연결·앱 승인) --> [CLCO AI 게이트]
                                   호출 모듈 src/ai/service.mjs
                                   공개 게이트 출처:
                                   https://ai-classroom-gateway-production.up.railway.app
~~~

## 원문에 결속한 경로·역할

| 구역 | 실제 경로·공개 가능한 주소 | 하는 일 | 현재 확인 범위 |
|---|---|---|---|
| 브라우저 | `on-client/public/index.html`, `public/app.js`, `http://127.0.0.1:5189/` | 세 메뉴·버튼·학생 표시 호출, JSON API 요청 | 과거 사용자 PC 화면에서 로컬 접속과 계정 연결 화면 관측. 신규 환경 미재현 |
| 로컬 앱 서버 | `on-client/src/server.mjs`, `tools/start-alekov.ps1` | `127.0.0.1`에서 정적 리소스·`/api/me`, `/api/access`, `/api/events`, `/api/ai/*` 제공 | 소스의 경로와 바인딩 확인. 이 문서 작성 중 HTTP 실행 미실시 |
| 접근제어·XDR | `on-client/src/engine/sdp-host.mjs`, `student/engine-adapter.mjs` | 실제 연결 시 본인 범위 신원·앱 접속 판정·기록 조회; 외부 서버는 운영자 별도 설정 | **기본 미연결**. 운영 접속·XDR 연동 성공 미확인 |
| AI 게이트 | `on-client/src/ai/service.mjs`, `vendor/clco-http.mjs`, `src/connection/native-login.mjs` 및 위 공개 게이트 URL | 승인된 앱 권한 하에서 모델 목록 점검·선택 사건 설명 | 포털 승인 과정에서 401 응답 관측. 실제 앱 인증·모델 추론 성공 미확인 |

- **SDP 경로의 실제 주소를 이 문서에 만들지 않았습니다.** `-SdpHostConfig`로 운영자가 제공한 별도 개인 설정 파일에 의해 결정됩니다. 설정 파일 내용·경로의 개인 식별 부분은 공개하지 않습니다.
- **CLCO 게이트 주소는 코드에 있는 공개 출처**이고, 그 주소가 공개돼 있어도 현재 사용자의 AI 앱 권한이 발급됐다는 뜻은 아닙니다. `NativeHostConfig` 역시 로컬 서버의 명시적 설정이며 실제 승인과는 별도입니다.
- **ALEPH 포털:** `https://aleph-omega.vercel.app/defense`는 단계 안내·커밋 제출·공식 판정에 쓰는 별도 사이트입니다. 브라우저→로컬 서버→원천/AI의 런타임 네 상자 구성에 포함하지 않았습니다.
- **20단계 OSV:** 네 상자의 접근제어·AI와 다른 별도의 조건부 읽기 전용 조회입니다. `src/vulnerabilities/project-scan.mjs`가 운영자가 정한 프로젝트의 lock 및 설치 메타데이터를 확인한 후, 허용된 공개 npm 이름만 `src/vulnerabilities/osv.mjs`를 통해 `https://api.osv.dev/v1/querybatch`에 질의합니다. 기본 승인 목록이 비어 있으면 조회하지 않습니다.

## 실제 데이터 흐름

1. 브라우저 `public/app.js` → 로컬 `src/server.mjs`: 화면·사용자 정보·업무 앱 판정·기록 API를 호출합니다. 학생 표시만 `student/extension.mjs`로 전달합니다. `student/extension.mjs`는 새 인증 API나 서버·원천 조치 요청을 만들지 않습니다.
2. SDP 설정이 있을 때만 `src/engine/sdp-host.mjs` / `student/engine-adapter.mjs`가 현재 본인 범위 기존 엔진의 응답을 전달합니다. AI의 설명이 접근 허용이나 차단을 결정하지 않습니다.
3. AI 권한이 준비된 경우 `src/ai/service.mjs`가 연결·모델 목록을 확인하고, 본인 사건의 근거를 서버에서 검사한 뒤 설명을 요청합니다. `renderAiConnection`은 모델 목록 점검과 실제 생성 결과를 구분하고, `renderExplanation`은 근거 ID·규칙을 원본 사건과 연결합니다.
4. 조치 제안은 `renderAction`에서 prepared/executing/pending/succeeded 등 별도로 표시됩니다. 접수(ACK)는 효과가 아니며, 실제 관측(`effectApplied:true`)과 영수증의 사건·요청 결속을 함께 확인해야 성공으로 표시합니다. 현재 기본 원천은 실제 집행 미지원입니다.

## 테스트·운영 경계

- **소스에서 확인**: 경로와 역할, loopback 바인딩, 별도 native/SDP 설정, 조건부 OSV 조회.
- **과거 화면에서 관측**: 사용자가 로컬 UI를 열고 인증 확인 화면에 도달했고, 포털→AI 게이트 인증 단계의 오류(401) 및 native 확인 불가를 제시했습니다. 문제를 해결했다고 기록하지 않습니다.
- **미확인(UNV)**: 외부 SDP 서버 응답, 실제 학생 AI 앱 승인, 유료 모델 생성, 실제 원천 집행/효과, OSV 외부 응답, 다른 PC에 같은 소스 재실행. 제공 소스 구조만으로 성공을 추정하지 않습니다.

실행·오류 안내는 [학생 실행 설명서](STUDENT_RUNBOOK.md)를 참고하세요.
