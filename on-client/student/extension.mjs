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
    renderEvents({ status = 'loading', mode, data, error } = {}) {
      // 서버가 전달한 본인 기록만 읽는다. 필터는 받은 배열 안에서만 처리한다.
      // 호출 때마다 새 DOM과 필터 상태를 만들어 새로고침 시 이전 상세를 지운다.
      const root = document.createElement('section');
      root.className = 'student-event-history';
      const addText = (parent, tag, value, className) => {
        const node = document.createElement(tag);
        node.textContent = String(value);
        if (className) node.className = className;
        parent.appendChild(node);
        return node;
      };
      const readable = (value, fallback = '확인 불가') =>
        typeof value === 'string' && value.trim() ? value : fallback;
      const appValue = (event) => typeof event?.appId === 'string' ? event.appId : '';
      const appLabel = (event) => readable(event?.appId, '앱 확인 불가(appId 없음)');
      const accessValue = (event) => readable(event?.state?.access, 'unknown');
      const kindLabels = { access: '접속 기록', xdr: 'XDR 경보' };
      const stateLabels = {
        access: { allowed: '접근 허용', denied: '접근 거부', unknown: '확인 불가' },
        session: { active: '활성', expired: '만료', revoked: '철회됨', unknown: '확인 불가' },
        device: { compliant: '보안 기준 충족', noncompliant: '보안 기준 미충족', unknown: '확인 불가' },
      };
      const stateText = (type, value) => {
        const original = readable(value, 'unknown');
        const label = Object.prototype.hasOwnProperty.call(stateLabels[type], original)
          ? stateLabels[type][original] : '확인 불가';
        return `${label}(${original})`;
      };
      const kindText = (value) => {
        const original = readable(value, 'unknown');
        return `${kindLabels[original] || '종류 확인 불가'}(${original})`;
      };
      const addField = (parent, label, value) => {
        addText(parent, 'dt', label);
        addText(parent, 'dd', value);
      };

      if (mode === 'demo') {
        addText(root, 'p', '예제 자료(demo) · 실제 접속/XDR 기록이 아닙니다.', 'tag tag-demo');
      } else if (mode === 'disconnected') {
        addText(root, 'p', '연결 없음(disconnected) · 실제 기록 조회에 연결되지 않았습니다.', 'state state-empty');
      } else if (mode === 'unknown') {
        addText(root, 'p', '연결 상태 확인 불가(unknown)', 'state state-empty');
      }
      if (status === 'loading') {
        addText(root, 'p', '보안 기록을 불러오는 중…', 'state state-loading');
        return root;
      }
      if (status === 'error') {
        const message = readable(error?.message, '서버 응답을 확인할 수 없습니다.');
        const unverified = error?.code === 'CONTRACT_MISMATCH' || error?.code === 'ENGINE_RESULT_UNVERIFIED';
        addText(root, 'p', `기록을 불러오지 못했습니다: ${message}`, 'state state-error');
        if (unverified) addText(root, 'p', '응답 확인 불가 · 이전 목록을 현재 기록으로 표시하지 않습니다.', 'muted');
        return root;
      }
      if (status !== 'ok' || !Array.isArray(data)) {
        addText(root, 'p', '기록 확인 불가 · 서버가 유효한 기록 목록을 제공하지 않았습니다.', 'state state-error');
        return root;
      }
      addText(root, 'p', '서버가 반환한 현재 계정 범위의 최근 최대 40건만 표시합니다. 전체 직원 로그나 실시간 전체 탐지가 아닙니다.', 'muted');
      if (data.length === 0) {
        addText(root, 'p', '표시할 기록이 없습니다.', 'state state-empty');
        return root;
      }

      // 원본 배열과 사건 객체를 수정하지 않고 시간 역순의 별도 배열을 만든다.
      const atMs = (event) => {
        const time = Date.parse(event?.at);
        return Number.isFinite(time) ? time : -Infinity;
      };
      const events = data.slice().sort((a, b) => atMs(b) - atMs(a));
      const filters = document.createElement('div');
      filters.className = 'student-event-filters';
      const makeFilter = (title, values, labelOf) => {
        const label = document.createElement('label');
        addText(label, 'span', title);
        const select = document.createElement('select');
        select.setAttribute('aria-label', title);
        const addOption = (value, text) => {
          const option = document.createElement('option');
          option.value = value;
          option.textContent = text;
          select.appendChild(option);
        };
        addOption('all', '전체');
        for (const value of new Set(values)) addOption(value, labelOf(value));
        select.value = 'all';
        label.appendChild(select);
        filters.appendChild(label);
        return select;
      };
      const kindFilter = makeFilter('기록 종류', events.map(event => readable(event?.kind, 'unknown')),
        value => kindText(value));
      const appFilter = makeFilter('업무 앱', events.map(appValue),
        value => value || '앱 확인 불가(appId 없음)');
      const accessFilter = makeFilter('접속 상태', events.map(accessValue),
        value => stateText('access', value));
      root.appendChild(filters);

      const counter = addText(root, 'p', '', 'muted');
      counter.setAttribute('role', 'status');
      const list = document.createElement('ul');
      list.className = 'records';
      root.appendChild(list);

      const addEntries = (parent, title, entries) => {
        const block = document.createElement('section');
        block.className = 'event-block';
        addText(block, 'h4', title);
        if (!Array.isArray(entries) || entries.length === 0) {
          addText(block, 'p', `${title} 없음`, 'muted');
        } else {
          const ul = document.createElement('ul');
          for (const entry of entries) {
            addText(ul, 'li', `${readable(entry?.id, 'ID 확인 불가')} · ${readable(entry?.text, '내용 확인 불가')}`);
          }
          block.appendChild(ul);
        }
        parent.appendChild(block);
      };
      const createRow = (event) => {
        const id = readable(event?.id, 'ID 확인 불가');
        const row = document.createElement('li');
        row.className = 'event';
        row.setAttribute('data-student-event-id', id);
        addText(row, 'h3', readable(event?.summary, '요약 없음'));
        addText(row, 'p', `기록 ID: ${id} · 시각: ${readable(event?.at, '시각 확인 불가')}`, 'muted');
        addText(row, 'p', `종류: ${kindText(event?.kind)} · 업무 앱: ${appLabel(event)}`, 'muted');

        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'btn';
        button.textContent = `${id} 상세`;
        button.setAttribute('aria-label', `${id} 상세`);
        button.setAttribute('aria-expanded', 'false');
        const detail = document.createElement('div');
        detail.className = 'student-event-detail';
        detail.setAttribute('data-student-event-detail', id);
        detail.hidden = true;
        const fields = document.createElement('dl');
        fields.className = 'kv';
        addField(fields, '사건 ID', id);
        addField(fields, '업무 앱 ID', appLabel(event));
        addField(fields, '발생 시각', readable(event?.at, '시각 확인 불가'));
        addField(fields, '기록 종류', kindText(event?.kind));
        addField(fields, '접속 상태', stateText('access', event?.state?.access));
        addField(fields, '세션 상태', stateText('session', event?.state?.session));
        addField(fields, '기기 상태', stateText('device', event?.state?.device));
        detail.appendChild(fields);
        addEntries(detail, '근거', event?.evidence);
        addEntries(detail, '규칙', event?.rules);
        // 15단계는 기록 조회만 구현한다. supportedActions가 있어도 조치 버튼은 만들지 않는다.
        button.addEventListener('click', () => {
          detail.hidden = !detail.hidden;
          button.setAttribute('aria-expanded', String(!detail.hidden));
        });
        row.appendChild(button);
        row.appendChild(detail);
        return row;
      };
      const showFiltered = () => {
        const rows = events.filter(event =>
          (kindFilter.value === 'all' || readable(event?.kind, 'unknown') === kindFilter.value) &&
          (appFilter.value === 'all' || appValue(event) === appFilter.value) &&
          (accessFilter.value === 'all' || accessValue(event) === accessFilter.value));
        counter.textContent = `필터 결과 ${rows.length}건 / 받은 기록 ${events.length}건`;
        if (rows.length === 0) {
          const empty = document.createElement('li');
          addText(empty, 'p', '선택한 조건에 맞는 기록이 없습니다.', 'state state-empty');
          list.replaceChildren(empty);
        } else {
          list.replaceChildren(...rows.map(createRow));
        }
      };
      kindFilter.addEventListener('change', showFiltered);
      appFilter.addEventListener('change', showFiltered);
      accessFilter.addEventListener('change', showFiltered);
      showFiltered();
      return root;
    },
    renderStatus() { return '학생 구현 대기: 기기·세션·알림과 연결 점검 상태를 구분하세요.'; },
    renderVulnerabilities() { return '학생 구현 대기: 정확한 설치 버전·OSV 출처·조회 시각·부분 결과·조회 실패를 구분하세요.'; },
    renderAiConnection() { return '학생 구현 대기: 모델 응답 점검과 실제 사건 설명을 구분하고 AI 오류·취소·수동 복구를 안내하세요.'; },
    renderExplanation() { return '학생 구현 대기: 선택한 사건의 근거·규칙·현재 상태와 AI 설명을 연결하세요. 제안은 자동 실행하지 않습니다.'; },
    renderAction() { return '학생 구현 대기: 현재 사건·조치·실제 대상·사람 확인·ACK와 원천 효과·unknown을 구분하세요.'; },
  };
}
