# KESHEV 17단계 소스 검토용 제출본

이 커밋은 **AI 코드 검토 용량(250KB)** 때문에 만든 소스 검토용 스냅샷이며, 전체 앱 실행본이 아닙니다. 원래 실행용 `keshev` 브랜치는 그대로 유지합니다. 아래 파일은 기존 실행본에서 바이트 단위로 동일한 원본 4개와 `WB_CLCO_NETWORK_ERROR` 안내를 수정한 학생 코드 1개입니다. 코드 발췌 문자열·가짜 API·모의 모델 호출로 대체하지 않았습니다.

## 검토 경로 (모두 실제 `.mjs`/`.js` 원본)

1. **학생 표시** `on-client/student/extension.mjs` — `renderAiConnection`(약 589행), `renderExplanation`(약 684행). 639행 부근 `WB_CLCO_NETWORK_ERROR`는 네트워크 오류로 구분하고 사용자의 수동 재점검을 안내합니다.
2. **제공 브라우저** `on-client/public/app.js` — `requestExplain`(약 978행)이 실제 `POST /api/ai/explain`을 호출(약 996행); 세대 비교(약 999행)와 취소(약 1024행). 계정 재연결은 `invalidateAppConnectView`(약 560행)에서 `cancelAiCheck({ reset: true })`로 초기화합니다.
3. **실제 서버 라우트** `on-client/src/server.mjs` — `POST /api/ai/explain`(약 466행, 527행)이 신원·사건을 확인하고 `service.explainIncident`(약 504행) 또는 `mappedService().explainIncident`(약 541행)를 호출합니다.
4. **기본 모델 서비스** `on-client/src/ai/service.mjs` — `explainIncident`(약 337행)에서 앱 권한 검증 뒤 모델 요청 `activeClient.chat` 또는 동일한 수송 메서드 호출을 수행합니다.
5. **네이티브 권한 보관 경로** `on-client/src/ai/vault-service.mjs` — `explainIncident`를 실제 AI 서비스에 위임(약 126행)합니다.

**검증 경계:** 이 소스는 호출 경로와 오류 표시 구현을 보여 주며 실제 운영 계정 승인, AI 게이트의 사용 권한 발급 또는 실제 유료 AI 호출 성공을 증명하지는 않습니다. 권한 준비는 운영 측 안내를 따릅니다. 비밀정보를 추가하거나 다른 파일을 대체하지 마세요.
