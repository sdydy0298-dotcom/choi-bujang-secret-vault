// 이 파일은 학생이 같은 프로젝트에서 이어서 구현합니다.
// 제공 UI를 받은 것만으로 단계 완료를 인정하지 않습니다.
export function createStudentView() {
  return {
    renderIdentity({ me, devices, sessions } = {}) {
      // 제공 UI는 이 함수를 다시 호출할 때 이전 DOM을 교체한다.
      // 호출마다 새로운 요소를 만들어 지난 로그인 정보가 남지 않도록 한다.
      const root = document.createElement('div');
      root.className = 'student-identity-details';

      const deviceLabels = {
        compliant: '보안 기준 충족',
        noncompliant: '보안 기준 미충족',
        unknown: '확인 불가',
      };
      const sessionLabels = {
        active: '활성',
        expired: '만료',
        revoked: '철회됨',
        unknown: '확인 불가',
      };

      const readable = (value) =>
        typeof value === 'string' && value.trim() ? value : '확인 불가';
      const itemName = (item) => {
        const label = typeof item?.label === 'string' ? item.label.trim() : '';
        const id = typeof item?.id === 'string' ? item.id.trim() : '';
        return label || id || '확인 불가';
      };
      // 한국어 설명과 서버가 전달한 원래 상태 코드를 항상 함께 표시한다.
      // 현재 기기·세션과 각각의 목록은 모두 이 공통 함수를 사용한다.
      const stateLabel = (table, status) => {
        const originalCode = typeof status === 'string' && status.trim() ? status : 'unknown';
        const description = Object.prototype.hasOwnProperty.call(table, originalCode)
          ? table[originalCode]
          : '확인 불가';
        return `${description}(${originalCode})`;
      };

      const addText = (parent, tag, value, className) => {
        const element = document.createElement(tag);
        element.textContent = value;
        if (className) element.className = className;
        parent.appendChild(element);
        return element;
      };
      const addField = (list, label, value) => {
        addText(list, 'dt', label);
        addText(list, 'dd', value);
      };
      const addMode = (parent, resource) => {
        const mode = resource?.mode;
        if (mode === 'demo') {
          addText(parent, 'p', '예제 자료(demo) · 실제 연결 아님', 'tag tag-demo');
        } else if (mode === 'disconnected') {
          addText(parent, 'p', '연결 없음(disconnected) · 실제 연결 아님', 'state state-empty');
        } else if (mode === 'connected') {
          addText(parent, 'p', resource?.status === 'ok' ? '연결 모드: connected' : '연결 모드: connected · 현재 조회 성공은 확인되지 않음', 'muted');
        } else {
          addText(parent, 'p', '연결 상태 확인 불가(unknown)', 'state state-empty');
        }
      };
      const addResource = (title, resource, renderOk) => {
        const section = document.createElement('section');
        section.className = 'identity-resource';
        addText(section, 'h3', title);
        // 로딩·실패에서도 demo/disconnected/unknown 정보는 숨기지 않는다.
        addMode(section, resource);

        if (resource?.status === 'loading') {
          addText(section, 'p', '불러오는 중…', 'state state-loading');
        } else if (resource?.status === 'error') {
          const message = typeof resource.error?.message === 'string' && resource.error.message.trim()
            ? resource.error.message
            : '서버 응답을 확인할 수 없습니다.';
          addText(section, 'p', `연결 실패 또는 확인 불가: ${message}`, 'state state-error');
        } else if (resource?.status === 'ok') {
          renderOk(section, resource.data);
        } else {
          addText(section, 'p', '상태를 확인할 수 없습니다.', 'state state-error');
        }
        root.appendChild(section);
      };

      addResource('현재 로그인 정보', me, (section, data) => {
        if (!data || typeof data !== 'object' || !data.user || !data.device || !data.session) {
          addText(section, 'p', '확인 불가: 로그인 정보의 응답 형식이 올바르지 않습니다.', 'state state-error');
          return;
        }
        const fields = document.createElement('dl');
        fields.className = 'kv';
        addField(fields, '사용자', itemName(data.user));
        addField(fields, '현재 기기', `${itemName(data.device)} · ${stateLabel(deviceLabels, data.device.status)}`);
        addField(fields, '현재 세션', `${readable(data.session.id)} · ${stateLabel(sessionLabels, data.session.status)}`);
        section.appendChild(fields);
      });

      addResource('본인 기기 목록', devices, (section, data) => {
        if (!Array.isArray(data)) {
          addText(section, 'p', '확인 불가: 기기 목록의 응답 형식이 올바르지 않습니다.', 'state state-error');
          return;
        }
        if (data.length === 0) {
          addText(section, 'p', '표시할 기기가 없습니다.', 'muted');
          return;
        }
        const list = document.createElement('ul');
        list.className = 'plain-list';
        for (const device of data) {
          addText(list, 'li', `${itemName(device)} · ${stateLabel(deviceLabels, device?.status)}`);
        }
        section.appendChild(list);
      });

      addResource('본인 세션 목록', sessions, (section, data) => {
        if (!Array.isArray(data)) {
          addText(section, 'p', '확인 불가: 세션 목록의 응답 형식이 올바르지 않습니다.', 'state state-error');
          return;
        }
        if (data.length === 0) {
          addText(section, 'p', '표시할 세션이 없습니다.', 'muted');
          return;
        }
        const list = document.createElement('ul');
        list.className = 'plain-list';
        for (const session of data) {
          addText(list, 'li', `${readable(session?.id)} · ${stateLabel(sessionLabels, session?.status)}`);
        }
        section.appendChild(list);
      });

      return root;
    },
    renderDecision({ status = 'idle', mode, data, error, appId } = {}) {
      // 기존 제공 UI가 새 요청·새로고침 때 호출하므로 매번 새 DOM을 반환한다.
      // 요청을 직접 보내거나 과거 결과를 이 함수에 저장하지 않는다.
      const root = document.createElement('section');
      root.className = 'student-access-decision';

      const addText = (parent, tag, value, className) => {
        const element = document.createElement(tag);
        element.textContent = value;
        if (className) element.className = className;
        parent.appendChild(element);
        return element;
      };
      const readable = (value, fallback = '확인 불가') =>
        typeof value === 'string' && value.trim() ? value : fallback;
      const addField = (list, label, value) => {
        addText(list, 'dt', label);
        addText(list, 'dd', value);
      };
      const requestApp = readable(appId);

      // 연결 모드는 개별 요청의 판정과 별개이며 demo는 실제 보안 판정이 아니다.
      if (mode === 'demo') {
        addText(root, 'p', '예제 자료(demo) · 실제 접속 판정 아님', 'tag tag-demo');
      } else if (mode === 'disconnected') {
        addText(root, 'p', '연결 없음(disconnected) · 실제 접속 판정 확인 불가', 'state state-empty');
      } else if (mode === 'connected') {
        addText(root, 'p', '연결 모드: connected · 실제 앱 접속 성공과는 별개', 'muted');
      } else {
        addText(root, 'p', '연결 상태 확인 불가(unknown)', 'state state-empty');
      }

      if (status === 'idle') {
        addText(root, 'p', '업무 앱 하나를 선택하고 접속 요청 버튼을 눌러 주세요. 아직 판정을 요청하지 않았습니다.', 'muted');
        return root;
      }
      if (status === 'loading') {
        addText(root, 'p', `판정 확인 중… · 요청 앱: ${requestApp}`, 'state state-loading');
        return root;
      }
      if (status === 'error') {
        const message = readable(error?.message, '서버의 요청 결과를 확인할 수 없습니다.');
        addText(root, 'p', `요청 실패: ${message}`, 'state state-error');
        addText(root, 'p', '요청 실패는 접근 거부(deny) 판정이 아닙니다. 허용 여부도 확인되지 않았습니다.', 'muted');
        if (requestApp !== '확인 불가') addText(root, 'p', `요청 앱: ${requestApp}`, 'muted');
        return root;
      }
      if (status !== 'ok' || !data || typeof data !== 'object' || Array.isArray(data)) {
        addText(root, 'p', '판정 확인 불가(unknown) · 유효한 서버 판정 자료가 없습니다.', 'state state-error');
        return root;
      }

      const decisions = {
        allow: '접근 허용',
        deny: '접근 거부',
        challenge: '추가 인증 또는 확인 필요',
        unknown: '판정 확인 불가',
      };
      const receivedCode = typeof data.decision === 'string' ? data.decision : 'unknown';
      const decisionCode = Object.prototype.hasOwnProperty.call(decisions, receivedCode)
        ? receivedCode
        : 'unknown';
      // 알 수 없는 값은 허용으로 해석하지 않고 unknown으로 표시한다.
      addText(root, 'p', `${decisions[decisionCode]}(${decisionCode})`,
        `decision decision-${decisionCode}`);
      const fields = document.createElement('dl');
      fields.className = 'kv';
      addField(fields, '업무 앱 ID', readable(data.appId, requestApp));
      addField(fields, '판정 이유(reason)', readable(data.reason, '판정 이유 확인 불가'));
      addField(fields, '판정 시각(checkedAt)', readable(data.checkedAt, '판정 시각 확인 불가'));
      root.appendChild(fields);

      if (decisionCode === 'allow') {
        addText(root, 'p', '서버 정책상 접근 허용이며 실제 업무 앱 접속 성공을 보장하지 않습니다.', 'muted');
      } else if (decisionCode === 'deny') {
        addText(root, 'p', '서버 정책상 접근이 거부되었습니다.', 'muted');
      } else if (decisionCode === 'challenge') {
        addText(root, 'p', '추가 인증 또는 확인이 필요합니다. 이 화면은 인증 절차를 대신 수행하지 않습니다.', 'muted');
      } else {
        addText(root, 'p', '판정을 확인할 수 없어 접근을 승인한 상태가 아닙니다.', 'muted');
        if (receivedCode !== 'unknown') {
          addText(root, 'p', `서버가 전달한 미지원 판정 코드: ${receivedCode}`, 'muted');
        }
      }
      return root;
    },
    renderEvents() { return '학생 구현 대기: 본인 접속·XDR 기록을 연결하세요.'; },
    renderStatus() { return '학생 구현 대기: 기기·세션·알림과 연결 점검 상태를 구분하세요.'; },
    renderVulnerabilities() { return '학생 구현 대기: 정확한 설치 버전·OSV 출처·조회 시각·부분 결과·조회 실패를 구분하세요.'; },
    renderAiConnection() { return '학생 구현 대기: 모델 응답 점검과 실제 사건 설명을 구분하고 AI 오류·취소·수동 복구를 안내하세요.'; },
    renderExplanation() { return '학생 구현 대기: 선택한 사건의 근거·규칙·현재 상태와 AI 설명을 연결하세요. 제안은 자동 실행하지 않습니다.'; },
    renderAction() { return '학생 구현 대기: 현재 사건·조치·실제 대상·사람 확인·ACK와 원천 효과·unknown을 구분하세요.'; },
  };
}
