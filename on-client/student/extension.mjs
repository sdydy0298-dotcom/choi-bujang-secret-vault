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
        // 16단계: 제공된 미지원 조치만 상세 안에 비활성 안내로 표시한다.
        // 실제 목록의 supportedActions가 비어 있으면 버튼도 없다. 조치 요청은 보내지 않는다.
        if (Array.isArray(event?.supportedActions) && event.supportedActions.length > 0) {
          const unsupported = document.createElement('div');
          unsupported.className = 'student-unsupported-actions';
          addText(unsupported, 'p', '조치 실행 연결은 아직 지원하지 않습니다. 이 버튼은 요청을 보내거나 조치를 실행하지 않습니다.', 'muted');
          for (const action of new Set(event.supportedActions)) {
            const name = readable(action, '확인되지 않은 조치');
            const disabled = document.createElement('button');
            disabled.type = 'button';
            disabled.className = 'btn';
            disabled.disabled = true;
            disabled.setAttribute('aria-disabled', 'true');
            disabled.setAttribute('aria-label', `${name} 미지원`);
            disabled.textContent = `${name} 미지원`;
            unsupported.appendChild(disabled);
          }
          detail.appendChild(unsupported);
        }
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
    renderStatus({ devices, sessions, notifications, diagnostics, mode } = {}) {
      // 제공 UI의 상태 스냅샷만 표시한다. 별도 API 호출이나 자동 재요청은 하지 않는다.
      // 매 호출마다 DOM을 새로 만들어, 복구 이후 이전 오류/알림/도움정보가 남지 않게 한다.
      const root = document.createElement('section');
      root.className = 'student-security-status';
      const addText = (parent, tag, value, className) => {
        const element = document.createElement(tag);
        element.textContent = String(value);
        if (className) element.className = className;
        parent.appendChild(element);
        return element;
      };
      const readable = (value, fallback = '확인 불가') =>
        typeof value === 'string' && value.trim() ? value : fallback;
      const statusLabels = {
        device: { compliant: '보안 기준 충족', noncompliant: '보안 기준 미충족', unknown: '확인 불가' },
        session: { active: '활성', expired: '만료', revoked: '철회됨', unknown: '확인 불가' },
      };
      const stateText = (kind, code) => {
        const raw = readable(code, 'unknown');
        const labels = statusLabels[kind];
        const label = Object.prototype.hasOwnProperty.call(labels, raw) ? labels[raw] : '확인 불가';
        return `${label}(${raw})`;
      };
      const isTimeout = (resource) =>
        /timeout|time.?out/i.test(readable(resource?.error?.code, '')) ||
        /시간\s*초과|시간이\s*초과/.test(readable(resource?.error?.message, ''));
      const retryNotice = (target, resource, isDiagnostics = false) => {
        if (isTimeout(resource)) addText(target, 'p', '요청 시간이 초과되었습니다. 응답 성공으로 판단하지 않습니다.', 'state state-error');
        addText(target, 'p', isDiagnostics
          ? '다시 시도하려면 제공 화면의 「도움정보 불러오기」 버튼을 직접 누르세요. 자동 재시도는 하지 않습니다.'
          : '다시 시도하려면 위쪽 「다시 불러오기」 버튼을 직접 누르세요. 자동으로 재요청하지 않습니다.', 'muted');
      };
      if (mode === 'demo') {
        addText(root, 'p', '예제 자료(demo) · 실제 보안 연결 결과가 아닙니다.', 'tag tag-demo');
      } else if (mode === 'disconnected') {
        addText(root, 'p', '연결 없음(disconnected) · 실제 상태 조회가 연결되지 않았습니다.', 'state state-empty');
      } else if (mode === 'unknown' || mode == null) {
        addText(root, 'p', '연결 상태 확인 불가(unknown)', 'state state-empty');
      }

      const renderList = (title, resource, kind) => {
        const section = document.createElement('section');
        section.className = `student-${kind}-status`;
        addText(section, 'h3', title);
        if (resource?.mode === 'demo') addText(section, 'p', '예제 자료(demo)', 'tag tag-demo');
        if (resource?.mode === 'disconnected') addText(section, 'p', '연결 없음(disconnected)', 'muted');
        if (resource?.mode === 'unknown') addText(section, 'p', '연결 확인 불가(unknown)', 'muted');
        if (kind === 'session') {
          addText(section, 'p', '세션 조회는 현재 검증된 연결 1개만 대상으로 합니다. 과거 세션 전체 목록이 아닙니다.', 'muted');
        } else {
          addText(section, 'p', '등록 기기는 본인에게 연결된 기기 최대 100개 범위입니다. 전체 현황·생략 여부는 제공 화면에서 확인합니다.', 'muted');
        }
        if (resource?.status === 'loading') {
          addText(section, 'p', `${title} 불러오는 중…`, 'state state-loading');
        } else if (resource?.status === 'error') {
          const msg = readable(resource.error?.message, '서버 응답 확인 불가');
          addText(section, 'p', `${title}을(를) 불러오지 못했습니다: ${msg}`, 'state state-error');
          retryNotice(section, resource);
        } else if (resource?.status === 'ok' && Array.isArray(resource.data)) {
          if (resource.data.length === 0) {
            addText(section, 'p', kind === 'device' ? '등록된 기기가 없습니다.' : '현재 연결이 없습니다.', 'state state-empty');
          } else {
            const list = document.createElement('ul');
            list.className = 'plain-list';
            for (const item of resource.data) {
              const name = kind === 'device'
                ? readable(item?.label, readable(item?.id))
                : readable(item?.id);
              addText(list, 'li', `${name} · ${stateText(kind, item?.status)}`);
            }
            section.appendChild(list);
          }
        } else {
          addText(section, 'p', `${title} 확인 불가 · 상태 또는 응답 형식을 확인할 수 없습니다.`, 'state state-error');
          retryNotice(section, resource);
        }
        root.appendChild(section);
      };
      renderList('기기 목록', devices, 'device');
      renderList('세션 목록', sessions, 'session');

      const notices = document.createElement('section');
      notices.className = 'student-notifications';
      addText(notices, 'h3', '보안 알림');
      if (Array.isArray(notifications) && notifications.length > 0) {
        const list = document.createElement('ul');
        list.className = 'records';
        for (const notice of notifications) {
          const li = document.createElement('li');
          addText(li, 'p', `자료(resource): ${readable(notice?.resource)} · 코드(code): ${readable(notice?.code)}`, 'muted');
          addText(li, 'p', `알림(message): ${readable(notice?.message)}`);
          list.appendChild(li);
        }
        notices.appendChild(list);
        addText(notices, 'p', '문제가 계속되면 위쪽 「다시 불러오기」를 직접 눌러 확인하세요. 자동 재시도하지 않습니다.', 'muted');
      } else if (Array.isArray(notifications)) {
        addText(notices, 'p', '주의할 알림이 없습니다.', 'state state-empty');
      } else {
        addText(notices, 'p', '알림 목록 확인 불가 · 응답을 확인할 수 없습니다.', 'state state-error');
      }
      root.appendChild(notices);

      const help = document.createElement('section');
      help.className = 'student-diagnostics';
      addText(help, 'h3', '도움정보 / 연결 진단');
      addText(help, 'p', '제공 화면에서 조회한 비밀 없는 진단 항목만 보여 줍니다. 복사한 정보는 도움 요청에 사용할 수 있으며, 누르기 전에는 복사하거나 전송하지 않습니다.', 'muted');
      // 정확히 허용된 여섯 필드만 선택한다. 원본 객체·meta·인증/AI 설정은 복사하지 않는다.
      const safeDiagnosticText = (value) => {
        if (typeof value !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._:+\/-]{0,127}$/.test(value)) return '확인 불가(제외됨)';
        if (/(?:token|secret|password|authorization|bearer|api.?key|github_pat_|ghp_|sk-|private.?key|비밀번호|토큰)/i.test(value)) return '확인 불가(제외됨)';
        return value;
      };
      let safeHelp = null;
      if (diagnostics?.status === 'idle') {
        addText(help, 'p', '아직 진단 정보를 조회하지 않았습니다. 제공 화면의 「도움정보 불러오기」를 직접 누르세요.', 'state state-empty');
      } else if (diagnostics?.status === 'loading') {
        addText(help, 'p', '진단 정보를 불러오는 중…', 'state state-loading');
      } else if (diagnostics?.status === 'error') {
        addText(help, 'p', `진단 정보를 불러오지 못했습니다: ${readable(diagnostics.error?.message, '진단 정보 확인 불가')}`, 'state state-error');
        retryNotice(help, diagnostics, true);
      } else if (diagnostics?.status === 'ok' && diagnostics.data && typeof diagnostics.data === 'object' && !Array.isArray(diagnostics.data)) {
        const value = diagnostics.data;
        safeHelp = {
          requestId: safeDiagnosticText(value.requestId),
          component: safeDiagnosticText(value.component),
          version: safeDiagnosticText(value.version),
          checkedAt: safeDiagnosticText(value.checkedAt),
          engine: {
            mode: safeDiagnosticText(value.engine?.mode),
            code: safeDiagnosticText(value.engine?.code),
          },
        };
        const dl = document.createElement('dl');
        dl.className = 'kv';
        addText(dl, 'dt', 'requestId'); addText(dl, 'dd', safeHelp.requestId);
        addText(dl, 'dt', 'component'); addText(dl, 'dd', safeHelp.component);
        addText(dl, 'dt', 'version'); addText(dl, 'dd', safeHelp.version);
        addText(dl, 'dt', 'checkedAt'); addText(dl, 'dd', safeHelp.checkedAt);
        addText(dl, 'dt', 'engine.mode'); addText(dl, 'dd', safeHelp.engine.mode);
        addText(dl, 'dt', 'engine.code'); addText(dl, 'dd', safeHelp.engine.code);
        help.appendChild(dl);
      } else {
        addText(help, 'p', '진단 정보를 확인할 수 없습니다. 제공 화면에서 직접 다시 조회하세요.', 'state state-error');
      }
      const copy = document.createElement('button');
      copy.type = 'button';
      copy.className = 'btn';
      copy.textContent = '도움정보 복사';
      copy.setAttribute('aria-label', '도움정보 복사');
      copy.disabled = safeHelp === null;
      help.appendChild(copy);
      const copied = addText(help, 'p', copy.disabled ? '검증된 진단 정보가 없어 복사할 수 없습니다.' : '위의 여섯 가지 진단 항목만 사용자가 누를 때 복사합니다.', 'muted');
      copied.setAttribute('role', 'status');
      copy.addEventListener('click', async () => {
        if (!safeHelp) return;
        try {
          if (typeof navigator === 'undefined' || typeof navigator.clipboard?.writeText !== 'function') {
            throw new Error('CLIPBOARD_UNAVAILABLE');
          }
          await navigator.clipboard.writeText(JSON.stringify(safeHelp, null, 2));
          copied.textContent = '선별된 도움정보 여섯 항목을 클립보드에 복사했습니다. 전송은 하지 않았습니다.';
        } catch {
          copied.textContent = '자동 복사를 사용할 수 없습니다. 브라우저의 클립보드 권한을 확인하세요. 정보는 전송하지 않았습니다.';
        }
      });
      root.appendChild(help);
      return root;
    },
    renderVulnerabilities({ status = 'idle', mode, data, error } = {}) {
      // 제공 UI가 호출할 때마다 새 요소를 만든다. 요청·취소·이전 결과는 학생 함수에서 보관하지 않는다.
      const root = document.createElement('section');
      root.className = 'student-vulnerabilities';
      const addText = (parent, tag, content, className) => {
        const node = document.createElement(tag);
        node.textContent = String(content);
        if (className) node.className = className;
        parent.appendChild(node);
        return node;
      };
      const safeText = (value, fallback = '확인 불가') => {
        if (typeof value !== 'string' || !value.trim() || value.length > 2048
          || /[\u0000-\u001f\u007f]/.test(value)
          || /(?:Bearer\s+\S+|sk-(?:proj-|ant-|svcacct-)?[A-Za-z0-9_-]{8,}|ghp_[A-Za-z0-9]+|github_pat_[A-Za-z0-9_]+|-----BEGIN [A-Z ]*PRIVATE KEY-----|(?:api[_ -]?key|authorization|password|passwd|token|secret|비밀번호|토큰)\s*[:=]\s*\S+)/i.test(value)) return fallback;
        return value;
      };
      const safeCode = (value) => typeof value === 'string' && /^[A-Z][A-Z0-9_]{0,79}$/.test(value)
        ? value : 'LOOKUP_UNVERIFIED';
      const scanLabels = {
        complete: '모두 조회(complete)',
        partial: '일부 조회 실패(partial)',
        not_checked: '아직 조회 안 함(not_checked)',
        not_configured: '프로젝트 조회 설정 미완료(not_configured)',
        unverifiable: '잠금 파일 확인 불가(unverifiable)',
      };
      if (mode === 'demo') {
        addText(root, 'p', '예제 자료(demo) · 실제 설치 패키지 점검 결과가 아닙니다.', 'tag tag-demo');
      } else if (mode === 'disconnected') {
        addText(root, 'p', '연결 없음(disconnected) · 실제 조회 여부는 현재 상태에 따릅니다.', 'muted');
      }
      if (status === 'idle') {
        addText(root, 'p', '조회 전(idle) · 설치 패키지의 취약점 정보를 아직 조회하지 않았습니다.', 'state state-empty');
        return root;
      }
      if (status === 'loading') {
        addText(root, 'p', '조회 중(loading) · 현재 요청을 확인하는 중입니다. 이전 조회 결과는 표시하지 않습니다.', 'state state-loading');
        return root;
      }
      if (status === 'error') {
        addText(root, 'p', '조회 실패(error) · 현재 패키지 조회 결과를 확인할 수 없습니다.', 'state state-error');
        if (error && typeof error === 'object') {
          addText(root, 'p', '오류 코드: ' + safeCode(error.code), 'muted');
          addText(root, 'p', '조회 실패: ' + safeText(error.message, '오류 내용을 확인할 수 없습니다.'), 'state state-error');
        } else {
          addText(root, 'p', '조회 실패: 오류 내용을 확인할 수 없습니다.', 'state state-error');
        }
        addText(root, 'p', '이전 결과를 현재 조회 결과로 사용하지 않습니다. 필요하면 제공 화면에서 직접 다시 조회하세요.', 'muted');
        return root;
      }
      if (status !== 'ok' || !data || typeof data !== 'object' || Array.isArray(data)
        || !Object.prototype.hasOwnProperty.call(scanLabels, data.status)) {
        addText(root, 'p', '조회 결과 확인 불가 · 전체 조회 상태 또는 응답이 올바르지 않습니다.', 'state state-error');
        return root;
      }
      addText(root, 'h3', '설치 패키지·OSV 조회 결과');
      addText(root, 'p', '전체 조회 상태: ' + scanLabels[data.status], 'state state-ok');
      const metadata = document.createElement('dl');
      metadata.className = 'kv';
      const field = (name, value) => {
        if (value === null || value === undefined || value === '') return;
        addText(metadata, 'dt', name);
        addText(metadata, 'dd', value);
      };
      if (data.lockfileVersion === 2 || data.lockfileVersion === 3) {
        field('설치 목록 원천', 'package-lock.json 및 설치된 node_modules 메타데이터 대조');
        field('잠금 파일 버전(lockfileVersion)', data.lockfileVersion);
      }
      if (typeof data.lockfileHash === 'string') field('잠금 파일 해시(lockfileHash)', safeText(data.lockfileHash));
      if (typeof data.checkedAt === 'string') field('전체 조회 시각(checkedAt)', safeText(data.checkedAt));
      if (metadata.children.length > 0) root.appendChild(metadata);
      if (data.status === 'not_configured') {
        addText(root, 'p', '조회 대상 프로젝트 설정이 필요합니다. 대상 경로와 승인된 공개 패키지 범위는 운영자가 준비합니다. 취약점이 없다는 뜻이 아닙니다.', 'muted');
        return root;
      }
      if (data.status === 'not_checked') {
        addText(root, 'p', '승인된 공개 조회 대상이 없어 패키지 취약점을 조회하지 않았습니다. 미조회이며, 취약점이 없다는 뜻이 아닙니다.', 'muted');
        return root;
      }
      if (data.status === 'unverifiable') {
        addText(root, 'p', 'package-lock.json 또는 설치 목록을 확인할 수 없습니다. OSV 대조 결과를 확인할 수 없으며 안전함을 뜻하지 않습니다.', 'state state-error');
        return root;
      }
      if (data.status === 'partial') {
        addText(root, 'p', '일부 패키지의 조회가 끝나지 않았습니다. 이미 확인된 취약점 ID는 유지하며, 확인하지 못한 패키지를 취약점 없음으로 판단하지 않습니다.', 'state state-error');
      }
      if (!Array.isArray(data.packages)) {
        addText(root, 'p', '패키지 목록 형식 확인 불가 · 취약점이 없다고 판단할 수 없습니다.', 'state state-error');
        return root;
      }
      if (data.packages.length === 0) {
        addText(root, 'p', '표시할 패키지 조회 결과가 없습니다. 결과가 없다는 이유만으로 전체 애플리케이션의 안전을 보장할 수 없습니다.', 'muted');
        return root;
      }
      // stage20-package-rows
      addText(root, 'p', 'OSV 결과는 조회 시점에 알려진 취약점 정보입니다. 알려진 항목이 없더라도 패키지 또는 앱 전체의 안전을 보장하지 않습니다.', 'muted');
      return root;
    },
    renderAiConnection({ status = 'idle', mode, data, error, checkedAt, explanationAccepted = false } = {}) {
      // 제공 UI가 호출할 때마다 새 DOM을 만든다. 이전 점검 결과·오류를 보관하지 않는다.
      // 앱 권한 확인과 실제 사건 설명 요청은 별개의 서버 작업이다.
      const root = document.createElement('section');
      root.className = 'student-ai-connection';
      const addText = (parent, tag, content, className) => {
        const node = document.createElement(tag);
        node.textContent = String(content);
        if (className) node.className = className;
        parent.appendChild(node);
        return node;
      };
      const readable = (value, fallback = '확인 불가') =>
        typeof value === 'string' && value.trim() ? value : fallback;
      const safeCode = (value) => typeof value === 'string' && /^[A-Z][A-Z0-9_]{0,79}$/.test(value)
        ? value : 'AI_REQUEST_UNVERIFIED';
      const safeMessage = (value) => {
        if (typeof value !== 'string' || !value.trim() || value.length > 1000) return '오류 상세 확인 불가';
        if (/(?:Bearer\s+\S+|sk-(?:proj-|ant-|svcacct-)?[A-Za-z0-9_-]{8,}|ghp_[A-Za-z0-9]+|github_pat_[A-Za-z0-9_]+|-----BEGIN [A-Z ]*PRIVATE KEY-----|(?:api[_ -]?key|authorization|password|passwd|token|secret|비밀번호|토큰)\s*[:=]\s*\S+)/i.test(value)) {
          return '보안상 표시할 수 없는 오류 상세입니다. 담당자에게 확인하세요.';
        }
        return value;
      };
      // 보안상 권한·연결 상태를 성공으로 유추하지 않고 전달된 모드만 표시한다.
      if (mode === 'demo') {
        addText(root, 'p', '예제 자료(demo) · 실제 AI 게이트 권한 확인 아님', 'tag tag-demo');
      } else if (mode === 'disconnected') {
        addText(root, 'p', '연결 없음(disconnected) · 실제 AI 게이트 점검 전', 'state state-empty');
      } else if (mode !== 'connected') {
        addText(root, 'p', '연결 모드 확인 불가(unknown)', 'state state-empty');
      }

      if (status === 'idle') {
        addText(root, 'p', 'AI 연결 점검 전 · 모델 응답 또는 앱 권한을 확인한 상태가 아닙니다.', 'state state-empty');
      } else if (status === 'loading') {
        addText(root, 'p', 'AI 연결 점검 중 · 현재 로그인으로 모델 응답을 확인하고 있습니다.', 'state state-loading');
      } else if (status === 'error') {
        const code = safeCode(error?.code);
        const guides = {
          ON_AI_PROVISIONING_PENDING: '권한 준비 중: 담당자에게 계정 연결 및 앱 권한 발급을 확인하세요.',
          WB_CLCO_AUTH_REQUIRED: '인증 실패: 계정 연결을 직접 다시 확인하고 담당자에게 문의하세요.',
          WB_CLCO_ACCESS_BLOCKED: '접근 제한: 담당자에게 현재 앱 이용 권한을 확인하세요.',
          WB_CLCO_COHORT_BUDGET_EXHAUSTED: '반 사용량 소진: 담당자에게 사용량을 확인하세요.',
          WB_CLCO_LIMIT_REACHED: 'AI 이용 한도 도달: 담당자에게 한도를 확인하세요.',
          WB_CLCO_SESSION_CLOSED: '이용 시간 아님: 이용 가능한 시간을 확인하세요.',
          WB_CLCO_RATE_LIMITED: '요청 제한: 잠시 뒤 사용자가 직접 다시 점검하세요.',
          WB_CLCO_TIMEOUT: '시간 초과: 잠시 뒤 사용자가 직접 다시 점검하세요.',
          REQUEST_TIMEOUT: '시간 초과: 잠시 뒤 사용자가 직접 다시 점검하세요.',
          ENGINE_TIMEOUT: '시간 초과: 잠시 뒤 사용자가 직접 다시 점검하세요.',
          TIMEOUT: '시간 초과: 잠시 뒤 사용자가 직접 다시 점검하세요.',
          WB_CLCO_NETWORK_ERROR: 'AI 게이트 네트워크 연결 실패: 네트워크 상태를 확인하고 잠시 뒤 사용자가 직접 다시 점검하세요.',
          NETWORK_ERROR: '네트워크 연결 실패: 로컬 서버 연결을 확인한 뒤 직접 다시 점검하세요.',
          WB_CLCO_CANCELLED: '취소됨: 취소 이전 결과는 현재 점검 결과가 아닙니다.',
          CANCELLED: '취소됨: 취소 이전 결과는 현재 점검 결과가 아닙니다.',
          REQUEST_CANCELLED: '취소됨: 취소 이전 결과는 현재 점검 결과가 아닙니다.',
          MODEL_NOT_CONFIGURED: '사용 가능한 모델 없음: 담당자에게 모델 설정을 확인하세요.',
          ON_AI_MODEL_LIST_EMPTY: '사용 가능한 모델 없음: 담당자에게 모델 허용 설정을 확인하세요.',
          ON_AI_AUTHORIZATION_CHANGED: '권한 변경 확인 필요: 현재 계정 및 앱 권한을 담당자에게 확인하세요.',
          SUBJECT_SCOPE_UNVERIFIED: '계정 범위 확인 불가: 담당자에게 계정 연결을 확인하세요.',
          AI_REQUEST_UNVERIFIED: 'AI 연결 확인 불가: 담당자에게 계정 연결과 앱 권한을 확인하세요.',
          ON_AI_INVALID_INPUT: '사건 자료 확인 불가: 기록의 근거·규칙을 확인하세요.',
          ON_AI_INVALID_OUTPUT: '응답 검증 실패: 현재 점검 성공으로 처리하지 않습니다.',
        };
        addText(root, 'p', 'AI 연결 점검 실패(' + code + '): ' + safeMessage(error?.message), 'state state-error');
        addText(root, 'p', guides[code] || '원인 확인 불가: 계정 연결 및 담당자 안내를 확인하세요.', 'muted');
      } else if (status === 'ok') {
        const valid = data?.transportChecked === true &&
          (data.audienceAuthorization === 'test' || data.audienceAuthorization === 'verified') &&
          Number.isInteger(data.modelCount) && data.modelCount >= 0;
        if (!valid) {
          addText(root, 'p', 'AI 연결 결과 확인 불가 · 응답 자료가 공식 계약과 다릅니다.', 'state state-error');
        } else {
          const label = data.audienceAuthorization === 'test'
            ? '시험 연결 점검(test) · 실제 게이트 권한 검증 아님'
            : '앱 권한 확인 후 점검(verified) · 점검 시각 기준';
          addText(root, 'p', label, 'state state-ok');
          const dl = document.createElement('dl');
          dl.className = 'kv';
          addText(dl, 'dt', '모델 응답 수(modelCount)');
          addText(dl, 'dd', data.modelCount);
          addText(dl, 'dt', '점검 시각(checkedAt)');
          addText(dl, 'dd', readable(checkedAt, '시각 확인 불가'));
          root.appendChild(dl);
          if (data.modelCount === 0) {
            addText(root, 'p', '사용 가능한 모델이 0개입니다. 사건 설명을 실행할 수 있다고 판단하지 마세요.', 'state state-error');
          }
          addText(root, 'p', '사건 설명은 아직 실행하지 않았습니다. 모델 목록·연결 점검만으로 실제 사건 설명 성공을 뜻하지 않습니다.', 'muted');
        }
      } else {
        addText(root, 'p', 'AI 연결 상태 확인 불가 · 현재 점검 결과가 없습니다.', 'state state-error');
      }
      // explanationAccepted는 이 연결 점검의 인증 성취가 아니다. 확인 없는 성공 안내를 하지 않는다.
      addText(root, 'p', '다시 점검하려면 사용자가 제공 화면의 「현재 API 연결 점검」을 직접 누르세요. 자동 재점검은 하지 않습니다.', 'muted');
      return root;
    },
    renderExplanation({ event, explanation, checkedAt } = {}) {
      // 17단계는 사건 설명의 기초 표시만 구현한다. 18단계의 근거 해석은 추가하지 않는다.
      const root = document.createElement('section');
      root.className = 'student-ai-explanation';
      const addText = (parent, tag, value, className) => {
        const node = document.createElement(tag);
        node.textContent = String(value);
        if (className) node.className = className;
        parent.appendChild(node);
        return node;
      };
      const readable = (value, fallback = '확인 불가') =>
        typeof value === 'string' && value.trim() ? value : fallback;
      const safeCode = (value) => typeof value === 'string' && /^[A-Z][A-Z0-9_]{0,79}$/.test(value)
        ? value : 'AI_REQUEST_UNVERIFIED';
      const safeText = (value) => {
        if (typeof value !== 'string' || !value.trim() || value.length > 1500) return '내용 확인 불가';
        if (/(?:Bearer\s+\S+|sk-(?:proj-|ant-|svcacct-)?[A-Za-z0-9_-]{8,}|ghp_[A-Za-z0-9]+|github_pat_[A-Za-z0-9_]+|-----BEGIN [A-Z ]*PRIVATE KEY-----|(?:api[_ -]?key|authorization|password|passwd|token|secret|비밀번호|토큰)\s*[:=]\s*\S+)/i.test(value)) {
          return '보안상 표시할 수 없는 내용입니다.';
        }
        return value;
      };
      const status = explanation?.status || 'idle';
      // 오류 정보는 선택된 사건이 없더라도 반드시 우선 표시한다.
      if (status === 'error') {
        addText(root, 'p', 'AI 설명 실패(' + safeCode(explanation?.error?.code) + '): ' + safeText(explanation?.error?.message), 'state state-error');
        if (['ON_AI_INVALID_INPUT', 'ON_AI_INVALID_OUTPUT'].includes(explanation?.error?.code)) {
          addText(root, 'p', '사건 근거 부족, 근거 ID 불일치 또는 설명 응답의 검증 실패 가능성을 확인하세요.', 'muted');
        }
        addText(root, 'p', 'AI 설명이 실패해도 보안 기록과 접속 판정은 그대로 유지됩니다. 과제 실패로 처리하지 않으며 자동 재요청하지 않습니다.', 'muted');
      } else if (event == null) {
        addText(root, 'p', '보안 기록에서 기록을 먼저 고르세요. 사건을 선택한 뒤 AI 설명을 직접 요청할 수 있습니다.', 'state state-empty');
      } else if (status === 'idle') {
        addText(root, 'p', 'AI 사건 설명 요청 전 · 아직 설명을 실행하지 않았습니다.', 'state state-empty');
      } else if (status === 'loading') {
        addText(root, 'p', 'AI 사건 설명 요청 중 · 아직 생성된 설명이 없습니다.', 'state state-loading');
      } else if (status === 'ok') {
        const data = explanation?.data;
        const validId = (value) => typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9._:-]{0,79}$/.test(value);
        const validRow = (row, max) => row && validId(row.id)
          && typeof row.text === 'string' && row.text.trim() && row.text.length <= max && safeText(row.text) === row.text;
        const evidence = Array.isArray(event.evidence) ? event.evidence : null;
        const rules = Array.isArray(event.rules) ? event.rules : null;
        const references = Array.isArray(data?.evidenceIds) ? data.evidenceIds : null;
        const sourceIds = evidence && new Set(evidence.map((row) => row?.id));
        const validEvent = validId(event.id) && evidence?.length > 0
          && evidence.every((row) => validRow(row, 500)) && sourceIds.size === evidence.length
          && rules?.length > 0 && rules.every((row) => validRow(row, 300))
          && new Set(rules.map((row) => row.id)).size === rules.length
          && event.state && typeof event.state === 'object'
          && Array.isArray(event.supportedActions) && event.supportedActions.every(validId);
        const validExplanation = data && typeof data.summary === 'string' && data.summary.trim()
          && data.summary.length <= 1500 && safeText(data.summary) === data.summary
          && Array.isArray(data.proposals) && data.requiresHumanConfirmation === true && data.executed === false;
        // 제공 코드가 정상화한 제안이라도 현재 사건의 지원 조치와 인용 근거를 재확인한다.
        const validProposals = Array.isArray(data?.proposals) && data.proposals.length <= 3
          && data.proposals.every((proposal) => {
            const refs = proposal?.evidenceIds;
            return validId(proposal?.action) && Array.isArray(event.supportedActions)
              && event.supportedActions.includes(proposal.action)
              && typeof proposal.reason === 'string' && proposal.reason.trim()
              && proposal.reason.length <= 500 && safeText(proposal.reason) === proposal.reason
              && Array.isArray(refs) && refs.length > 0 && new Set(refs).size === refs.length
              && refs.every((ref) => validId(ref) && sourceIds?.has(ref));
          });
        // 제공 app.js도 검사하지만 학생 화면에서 받은 사건의 모든 근거와 인용을 다시 대조한다.
        const matched = references && sourceIds && references.length === sourceIds.size
          && new Set(references).size === references.length
          && references.every((ref) => validId(ref) && sourceIds.has(ref));
        if (!validEvent || !validExplanation || !matched || !validProposals) {
          addText(root, 'p', 'AI 설명 확인 불가 · 현재 사건의 근거가 부족하거나 인용한 근거 ID가 일치하지 않아 설명을 표시할 수 없습니다.', 'state state-error');
          if (typeof explanation?.error?.code === 'string' && /^[A-Z][A-Z0-9_]{0,79}$/.test(explanation.error.code)) {
            addText(root, 'p', '오류 코드: ' + safeCode(explanation.error.code), 'muted');
          }
          if (data?.executed === true) {
            addText(root, 'p', 'AI가 이미 조치를 실행했다고 답한 설명은 표시할 수 없습니다.', 'state state-error');
          }
          addText(root, 'p', '없는 근거를 만들어 연결하지 않습니다. 기존 보안 기록과 판정은 그대로 유지됩니다.', 'muted');
        } else {
          // 실패·불일치 분기를 모두 지난 실제 현재 사건 설명에만 성공 속성을 부여한다.
          root.setAttribute('data-student-explanation-event', event.id);
          addText(root, 'h3', 'AI 설명(참고용)');
          addText(root, 'p', '사건 ID: ' + event.id);
          addText(root, 'p', 'AI 요약: ' + data.summary);
          addText(root, 'p', '설명 확인 시각: ' + readable(checkedAt, '시각 확인 불가'), 'muted');
          addText(root, 'p', 'AI 해석은 원본 근거 및 원천 시스템의 현재 상태를 대신하지 않습니다.', 'muted');
          const evidenceText = new Map(evidence.map((row) => [row.id, row.text]));
          addText(root, 'h4', '인용한 사건 근거');
          const evidenceList = document.createElement('ul');
          for (const ref of references) addText(evidenceList, 'li', ref + ' — ' + evidenceText.get(ref));
          root.appendChild(evidenceList);
          addText(root, 'h4', '적용 규칙');
          const rulesList = document.createElement('ul');
          for (const row of rules) addText(rulesList, 'li', row.id + ' — ' + row.text);
          root.appendChild(rulesList);
          // unknown은 안전·정상이 아니라 원천 상태를 확인하지 못했다는 뜻이다.
          addText(root, 'h4', '현재 상태의 확인 불가 항목');
          const unknown = [['access', '접속'], ['session', '세션'], ['device', '기기']]
            .filter(([key]) => event.state[key] === 'unknown');
          if (unknown.length === 0) {
            addText(root, 'p', '없음', 'muted');
          } else {
            const stateList = document.createElement('ul');
            for (const [, label] of unknown) addText(stateList, 'li', label + ': 확인 불가(unknown)');
            root.appendChild(stateList);
          }
          addText(root, 'h4', '조치 제안');
          if (data.proposals.length === 0) {
            addText(root, 'p', event.supportedActions.length === 0
              ? '연동 시스템이 지원하는 조치가 없어 제안이 없습니다(정상).'
              : 'AI가 이 사건에 제안한 조치가 없습니다.', 'muted');
          } else {
            const proposalList = document.createElement('ul');
            for (const proposal of data.proposals) {
              addText(proposalList, 'li', '조치: ' + proposal.action + ' — 이유: ' + proposal.reason
                + ' · 근거 ID: ' + proposal.evidenceIds.join(', ') + ' · 미실행');
            }
            root.appendChild(proposalList);
            addText(root, 'p', '사람 확인이 필요하며 실행되지 않았습니다.', 'muted');
          }
          addText(root, 'p', 'AI 설명과 제안은 참고용입니다. 보안 조치는 실행되지 않았습니다(executed:false).', 'muted');
        }
      } else {
        addText(root, 'p', 'AI 사건 설명 결과 확인 불가 · 사건 또는 설명 응답이 유효하지 않습니다.', 'state state-error');
        addText(root, 'p', '기존 보안 기록은 그대로 유지됩니다.', 'muted');
      }
      return root;
    },
    renderAction({ status = 'idle', event = null, actionId = null, target = null, receipt = null,
      observation = null, message, confirmationExpiresAt, error } = {}) {
      // 제공 UI가 상태 변경마다 다시 호출한다. 이전 사건/요청의 DOM과 성공 속성은 보관하지 않는다.
      const root = document.createElement('section');
      root.className = 'student-action-status';
      const addText = (parent, tag, value, className) => {
        const node = document.createElement(tag);
        node.textContent = String(value);
        if (className) node.className = className;
        parent.appendChild(node);
        return node;
      };
      const safeText = (value, fallback = '확인 불가') => {
        if (typeof value !== 'string' || !value.trim() || value.length > 1500
          || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value)
          || /(?:Bearer\s+\S+|sk-(?:proj-|ant-|svcacct-)?[A-Za-z0-9_-]{8,}|ghp_[A-Za-z0-9]+|github_pat_[A-Za-z0-9_]+|-----BEGIN [A-Z ]*PRIVATE KEY-----|(?:api[_ -]?key|authorization|password|passwd|token|secret|비밀번호|토큰)\s*[:=]\s*\S+)/i.test(value)) return fallback;
        return value;
      };
      const safeCode = (value) => typeof value === 'string' && /^[A-Z][A-Z0-9_]{0,79}$/.test(value)
        ? value : 'ACTION_RESULT_UNVERIFIED';
      const known = ['idle', 'loading', 'prepared', 'executing', 'pending',
        'succeeded', 'denied', 'failed', 'unknown', 'error', 'expired'];
      const phase = known.includes(status) ? status : 'unknown';
      if (phase === 'idle') {
        addText(root, 'p', '아직 미실행(idle) · 조치를 요청하지 않았습니다.', 'state state-empty');
        addText(root, 'p', safeText(message, '이 화면을 닫거나 취소해도 서버에 이미 전달된 조치가 되돌려지지는 않습니다.'), 'muted');
      } else if (phase === 'loading') {
        addText(root, 'p', '조치 준비 또는 연동 시스템 결과 조회 중(loading) · 아직 효과가 확인되지 않았습니다.', 'state state-loading');
      } else if (phase === 'prepared') {
        addText(root, 'p', '준비됨·미실행(prepared) · 사람 확인 전이며 보안 조치는 집행되지 않았습니다.', 'state state-loading');
        addText(root, 'p', '제공 화면에서 실제 대상과 확인 기한을 확인한 후 사용자에게 명시적인 집행 확인이 필요합니다.', 'muted');
      } else if (phase === 'executing') {
        addText(root, 'p', '서버에 전달 중(executing) · 처리 결과가 아직 확인되지 않았습니다.', 'state state-loading');
      } else if (phase === 'pending') {
        addText(root, 'p', '서버 접수·처리 중(pending) · 접수 응답(ACK)은 효과 확인이나 완료를 의미하지 않습니다.', 'state state-loading');
      } else if (phase === 'succeeded') {
        // 성공/관측 문구는 아래에서 현재 사건·요청·영수증·대상을 확인한 뒤에만 출력한다.
      } else if (phase === 'denied') {
        addText(root, 'p', '연동 시스템 요청 거절(denied) · 효과 확인이 아닙니다.', 'state state-error');
      } else if (phase === 'failed') {
        addText(root, 'p', '연동 시스템 처리 실패(failed) · 효과 확인이 아닙니다.', 'state state-error');
      } else if (phase === 'expired') {
        addText(root, 'p', '사람 확인 기한 지남(expired) · 이 준비로는 집행할 수 없으므로 다시 준비하세요.', 'state state-error');
      } else if (phase === 'error') {
        addText(root, 'p', '조치 요청이 처리되지 않았습니다(error).', 'state state-error');
        addText(root, 'p', '오류 코드: ' + safeCode(error?.code) + ' · ' + safeText(error?.message, '원인을 확인할 수 없습니다.'), 'state state-error');
      } else {
        addText(root, 'p', '결과 불명(unknown) · 효과가 없다고도 성공했다고도 판단하지 마세요.', 'state state-error');
        addText(root, 'p', '제공 화면의 「연동 시스템 결과만 재조회」로 기존 요청의 결과만 확인하세요. 자동 재집행하지 않습니다.', 'muted');
      }
      if (['loading', 'denied', 'failed', 'unknown', 'expired'].includes(phase)
        && typeof message === 'string' && message.trim()) {
        addText(root, 'p', '서버 안내: ' + safeText(message), 'muted');
      }
      if (phase !== 'idle' && phase !== 'error' && typeof error?.code === 'string') {
        addText(root, 'p', '상태 코드: ' + safeCode(error.code) + ' · ' + safeText(error.message), 'muted');
      }
      if (phase === 'idle' && Array.isArray(event?.supportedActions) && event.supportedActions.length === 0) {
        addText(root, 'p', '연동 시스템이 지원하는 조치가 없어 준비 버튼이 표시되지 않는 것이 정상입니다.', 'muted');
      }
      // 현재 입력에 실제로 존재하는 값만 표시한다. 사용자 확인 티켓은 입력되지 않으며 저장하지 않는다.
      const validId = (value) => typeof value === 'string'
        && /^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$/.test(value) && safeText(value) === value;
      const eventId = validId(event?.id) ? event.id : null;
      const currentActionId = validId(actionId) ? actionId : null;
      const requestId = validId(receipt?.requestId) ? receipt.requestId : null;
      const receiptId = validId(receipt?.receiptId) ? receipt.receiptId : null;
      const receiptEventId = validId(receipt?.eventId) ? receipt.eventId : null;
      const receiptActionId = validId(receipt?.actionId) ? receipt.actionId : null;
      const targetId = validId(target?.id) ? target.id : null;
      const targetGeneration = Number.isSafeInteger(target?.generation) && target.generation > 0 ? target.generation : null;
      const receiptVersion = Number.isSafeInteger(receipt?.version) && receipt.version > 0 ? receipt.version : null;
      const currentIntentMatches = eventId !== null && currentActionId !== null
        && requestId !== null && receiptId !== null
        && receiptEventId === eventId && receiptActionId === currentActionId;
      // 두 data-* 속성은 실행 성공 표시가 아니라 현재 사건과 요청의 식별자다.
      // prepared/executing/pending 등의 정상 표시에도 연결하되 잘못 연결된 영수증은 제외한다.
      const currentRequestIdentified = phase !== 'idle' && eventId !== null && requestId !== null
        && (receipt?.eventId === undefined || receiptEventId === eventId)
        && (receipt?.actionId === undefined || receiptActionId === currentActionId);
      if (currentRequestIdentified) {
        root.setAttribute('data-student-action-event', eventId);
        root.setAttribute('data-student-action-request', requestId);
      }
      if (phase !== 'idle' && phase !== 'error') {
        const details = document.createElement('dl');
        details.className = 'kv';
        const field = (label, value) => {
          if (value === null || value === undefined) return;
          addText(details, 'dt', label);
          addText(details, 'dd', value);
        };
        field('사건 ID', eventId);
        if (eventId && Array.isArray(event?.evidence)) {
          const ids = event.evidence.filter((item) => validId(item?.id)).map((item) => item.id);
          if (ids.length) field('현재 사건 근거 ID', [...new Set(ids)].join(', '));
        }
        field('조치 ID', currentActionId);
        field('실제 대상 ID', targetId);
        field('대상 세대(generation)', targetGeneration);
        field('요청 ID(requestId)', requestId);
        field('영수증 ID(receiptId)', receiptId);
        field('영수증 버전(version)', receiptVersion);
        if (phase === 'prepared') {
          field('사람 확인 기한(confirmationExpiresAt)',
            typeof confirmationExpiresAt === 'string' ? safeText(confirmationExpiresAt) : null);
        }
        if (details.children.length) root.appendChild(details);
        if (receipt?.replayed === true) {
          addText(root, 'p', '중복 응답(replayed:true) · 동일 요청의 재조회·재전달이며 신규 집행의 증거가 아닙니다.', 'muted');
        }
        if (receipt?.superseded === true) {
          addText(root, 'p', '이전 영수증(superseded:true)은 최신 관측 결과를 대신하지 않습니다. 결과만 재조회하세요.', 'state state-error');
        }
        if (receipt && (receiptEventId !== null && eventId !== null && receiptEventId !== eventId
          || receiptActionId !== null && currentActionId !== null && receiptActionId !== currentActionId)) {
          addText(root, 'p', '현재 사건·조치와 수신 영수증이 일치하지 않습니다. 기존 요청을 다른 사건의 성공으로 사용하지 마세요.', 'state state-error');
        }
      }
      if (phase === 'succeeded') {
        const evidenceIds = Array.isArray(event?.evidence) ? event.evidence.map((row) => row?.id) : [];
        const evidenceBound = evidenceIds.length > 0 && evidenceIds.every(validId)
          && new Set(evidenceIds).size === evidenceIds.length;
        const actionSupported = Array.isArray(event?.supportedActions)
          && event.supportedActions.includes(currentActionId);
        // 수신된 조치 준비 대상과 원본 사건의 대상이 함께 제공된 경우, 서로 다르면 성공으로 표시하지 않는다.
        const sameTarget = !event?.target || (event.target?.id === targetId
          && event.target?.generation === targetGeneration);
        const observedAt = observation?.observedAt;
        const validObservationTime = typeof observedAt === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?(?:Z|[+-]\d{2}:\d{2})$/.test(observedAt)
          && Number.isFinite(Date.parse(observedAt));
        const verifiedEffect = observation?.effectApplied === true && validObservationTime
          && receipt?.status === 'succeeded' && receipt?.superseded !== true
          && currentIntentMatches && receiptVersion !== null
          && targetId !== null && targetGeneration !== null
          && evidenceBound && actionSupported && sameTarget;
        if (verifiedEffect) {
          addText(root, 'p', '효과 확인(succeeded) · 연동 시스템의 효과 관측 결과를 확인했습니다.', 'state state-ok');
          addText(root, 'p', '관측 시각(observedAt): ' + observedAt, 'muted');
          addText(root, 'p', 'effectApplied: true · 영수증 ID(receiptId): ' + receiptId, 'muted');
          if (receipt.replayed === true) {
            addText(root, 'p', '재조회된 동일 요청의 효과를 확인한 것입니다. 새로운 조치를 집행한 결과로 해석하지 않습니다.', 'muted');
          }
        } else {
          addText(root, 'p', '결과 불명(unknown) · succeeded 상태만으로는 현재 사건에 적용된 효과를 확인할 수 없습니다.', 'state state-error');
          addText(root, 'p', '관측값(effectApplied:true)과 사건·조치·대상·요청·영수증 결속을 확인해야 합니다. 성공이나 효과 없음으로 판단하지 말고 제공 화면에서 결과만 재조회하세요.', 'muted');
        }
      }
      addText(root, 'p', '실행·승인·결과 재조회는 제공 화면의 버튼을 사용하세요. 「조치 화면 취소」는 이미 전달된 효과의 취소가 아닙니다.', 'muted');
      return root;
    },
  };
}
