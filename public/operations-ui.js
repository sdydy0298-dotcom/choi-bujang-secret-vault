// Stage 12 view: only data from the protected, redacted operations API.
// Do not read notes, tokens, key material or direct Supabase tables here.
const el=id=>document.getElementById(id);
const set=(id,value)=>{const node=el(id);if(node)node.textContent=String(value??'—')};
const time=value=>{
  if(!value)return '미실행';
  const ms=Date.parse(value);
  return Number.isFinite(ms)?new Date(ms).toLocaleString('ko-KR',{timeZone:'Asia/Seoul'}):'확인 불가';
};
const badge=outcome=>outcome==='pass'?'PASS (실측)':
  outcome==='fail'?'FAIL (실측)':'미실행';
function cell(text){
  const td=document.createElement('td');
  td.textContent=String(text??'—');
  return td;
}
function renderEvidence(rows){
  const body=el('ops-evidence-body');
  if(!body)return;
  const fragment=document.createDocumentFragment();
  for(const item of rows){
    const row=document.createElement('tr');
    const status=document.createElement('span');
    status.className='ops-status';
    status.dataset.outcome=['pass','fail'].includes(item.outcome)?item.outcome:'not_run';
    status.textContent=badge(item.outcome);
    row.append(
      cell(item.stage),cell(item.label),
      cell(item.expectedStatus===null?'계약상 미정':item.expectedStatus),
      cell(item.actualStatus??'미실행'),
      cell(item.requestId??'미실행'),cell(time(item.checkedAt))
    );
    const final=document.createElement('td');final.append(status);row.append(final);
    fragment.append(row);
  }
  body.replaceChildren(fragment);
}
function renderEvents(items){
  const body=el('ops-records-body');
  if(!body)return;
  const fragment=document.createDocumentFragment();
  for(const item of items){
    const tr=document.createElement('tr');
    tr.append(cell(time(item.checkedAt)),cell(item.event),
      cell(item.statusCode??'—'),cell(item.source));
    fragment.append(tr);
  }
  body.replaceChildren(fragment);
}
function renderAttacks(cases){
  const view=el('ops-attack-list');
  if(!view)return;
  const fragment=document.createDocumentFragment();
  // The three published combinations are only labels, never proof of coverage.
  for(const item of cases.slice(0,3)){
    const li=document.createElement('li');
    li.textContent=item.title+' — 미실행 (공식 매핑 미확인)';
    fragment.append(li);
  }
  const rest=document.createElement('li');
  rest.textContent='나머지 38종 — 심판의 개별 정의·실측 결과가 없어 모두 미실행';
  fragment.append(rest);
  view.replaceChildren(fragment);
}
export function renderOperations(data){
  if(data?.schema!=='aleph.stage12.operations.v1')throw new Error('작전실 API 응답 계약 오류');
  const decision=data.decision??{},detection=data.detection??{},
    revocation=data.revocation??{},recovery=data.recovery??{},
    evidence=data.evidence??{},attacks=data.attacks??{};
  set('ops-rules',decision.ruleCount??'—');
  set('ops-rule-info',(Array.isArray(decision.ruleIds)?decision.ruleIds.join(' · '):'규칙 확인 불가')
    +' | 엔진 실측: 미실행');
  set('ops-detect','미실행');
  set('ops-detect-info','제공 엔진: ALEPH SDP · 운영 탐지 사건 데이터 미연결');
  set('ops-revoked',revocation.revoked??'—');
  set('ops-revoke-info','DB 승인 '+(revocation.approved??'—')+'건 / 대기 '+
    (revocation.pending??'—')+'건 · SDP 신원 회수 실측: 미실행');
  set('ops-restore',recovery.auditRecords??'—');
  set('ops-restore-info','정책 '+(recovery.policyVersion??'—')+
    ' · 복원 뒤 재시험 '+(recovery.postRestoreRetest?.status==='observed'?'실행 기록 존재':'미실행'));
  set('ops-result-time',time(data.checkedAt));
  set('ops-attack-count',(attacks.notRun??41)+' / '+(attacks.total??41)+'종 미실행');
  set('ops-evidence-count',(evidence.passed??0)+'건 실측 PASS, '+
    (evidence.failed??0)+'건 실측 FAIL');
  renderEvidence(Array.isArray(evidence.cases)?evidence.cases:[]);
  renderEvents(Array.isArray(data.redactedServerRecords)?data.redactedServerRecords:[]);
  renderAttacks(Array.isArray(attacks.cases)?attacks.cases:[]);
}
export function resetOperations(message){
  const live=el('operations-live');
  if(live)live.hidden=true;
  set('ops-message',message||'승인된 기기로 로그인하면 가린 서버 기록을 볼 수 있습니다.');
}
export function unlockOperations(){
  const live=el('operations-live');
  if(live)live.hidden=false;
}
