// Stage 12 evidence contracts: no invented HTTP outcomes or judge passes.
// Stage cases are a reproducible checklist; only live HTTP responses can fill
// actualStatus/requestId/checkedAt. The 41 judge attacks are not publicly
// enumerated, so their official outcomes MUST stay not_run.
const PAIRS=[
  [1,'공개 페이지 정상 열람','GET /',200,'1단계 접근 금지 시나리오 정의 없음',null,null],
  [2,'가상 메모 없는 정적 파일 조회','GET /data.json',200,'이 단계의 금지 요청은 별도 실측 필요',null,null],
  [3,'공개 인증 설정 조회','GET /api/auth-config',200,'무인증 메모 목록 차단','GET /api/notes',401],
  [4,'인증된 본인 메모 목록 조회','GET /api/my/notes',200,'다른 소유자 메모 조회 차단','GET /api/notes/:id',404],
  [5,'서버를 통한 본인 자료 조회','GET /api/my/notes',200,'무인증 개인 메모 목록 차단','GET /api/my/notes',401],
  [6,'등록 기기 정상 판정','ALEPH SDP 판정기 allow',null,'미등록 기기 거부','ALEPH SDP 판정기 deny',null],
  [7,'재확인된 정상 사용자 접근','ALEPH SDP 판정기 allow',null,'복합 이상 접근 추가 확인','ALEPH SDP 판정기 step_up',null],
  [8,'본인 구역 메모 조회','GET /api/my/notes',200,'무인증 강사 공지 조회 차단','GET /api/notices',401],
  [9,'정상 빈도 자료 요청 허용','ALEPH SDP 탐지 observe',null,'폭주 후 회수 제안/실제 재접근 차단','ALEPH SDP 탐지·회수',null],
  [10,'검증 백업으로 B 메모 복원','POST /api/restore (서명된 B)',200,'무인증 복구 요청 차단','POST /api/restore',401],
  [11,'승인 기기에서 메모 열람','GET /api/my/notes (기기 서명)',200,'무인증 기기 등록 시도 차단','POST /api/device',401]
];
export const STAGE_CASES=Object.freeze(PAIRS.flatMap(([step,nLabel,nRoute,nExpected,
  fLabel,fRoute,fExpected])=>[
  {caseId:`S${String(step).padStart(2,'0')}_NORMAL`,stage:step,category:'normal',
    label:nLabel,request:nRoute,expectedStatus:nExpected},
  {caseId:`S${String(step).padStart(2,'0')}_FORBIDDEN`,stage:step,category:'forbidden',
    label:fLabel,request:fRoute,expectedStatus:fExpected}
]).map(Object.freeze));

// Only these exact, non-destructive HTTP requests are automatically exercised.
// The server receives the HTTP Response and writes the observed status itself.
export const LIVE_PROBES=Object.freeze([
  {caseId:'S01_NORMAL',stage:1,category:'normal',method:'GET',path:'/',expectedStatus:200},
  {caseId:'S02_NORMAL',stage:2,category:'normal',method:'GET',path:'/data.json',expectedStatus:200},
  {caseId:'S03_NORMAL',stage:3,category:'normal',method:'GET',path:'/api/auth-config',expectedStatus:200},
  {caseId:'S03_FORBIDDEN',stage:3,category:'forbidden',method:'GET',path:'/api/notes',expectedStatus:401},
  {caseId:'S05_FORBIDDEN',stage:5,category:'forbidden',method:'GET',path:'/api/my/notes',expectedStatus:401},
  {caseId:'S08_FORBIDDEN',stage:8,category:'forbidden',method:'GET',path:'/api/notices',expectedStatus:401},
  {caseId:'S10_FORBIDDEN',stage:10,category:'forbidden',method:'POST',path:'/api/restore',expectedStatus:401},
  {caseId:'S11_FORBIDDEN',stage:11,category:'forbidden',method:'POST',path:'/api/device',expectedStatus:401}
].map(Object.freeze));

const NAMED_ATTACKS=[
  '1첩반상: 무인증 접근 뒤 타인 메모 조회',
  '천안호날두과자: 미등록 기기 뒤 회수 신원 재접속',
  '양양송이버섯고양이: 복구 뒤 무서명 변경 및 타 구역 조회'
];
export const ATTACK_CATALOG=Object.freeze(Array.from({length:41},(_,index)=>Object.freeze({
  slot:`ATTACK-${String(index+1).padStart(2,'0')}`,
  title:NAMED_ATTACKS[index]??'운영 심판의 비공개 세부 공격 (정의 미제공)',
  officialMappingVerified:false,
  outcome:'not_run',
  observedAt:null
})));
export function stageMatrix(evidence=[]){
  const latest=new Map();
  for(const row of evidence){
    if(!row||typeof row.case_id!=='string'||latest.has(row.case_id)||
      typeof row.checked_at!=='string'||typeof row.verdict!=='string')continue;
    latest.set(row.case_id,row);
  }
  return STAGE_CASES.map(item=>{
    const actual=latest.get(item.caseId);
    return {
      ...item,actualStatus:actual?.actual_status??null,
      expectedStatus:item.expectedStatus,
      requestId:actual?.request_id??null,
      checkedAt:actual?.checked_at??null,
      outcome:actual?.verdict??'not_run',
      source:actual?.source??null
    };
  });
}
