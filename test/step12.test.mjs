import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync,readdirSync} from 'node:fs';
import {STAGE_CASES,LIVE_PROBES,ATTACK_CATALOG,stageMatrix} from '../src/stage12-matrix.mjs';
import {RULE_IDS,decide} from '../src/decider.mjs';

test('stage 12 has one normal and one forbidden evidence row for each previous stage',()=>{
  assert.equal(STAGE_CASES.length,22);
  for(let step=1;step<=11;step++){
    const rows=STAGE_CASES.filter(x=>x.stage===step);
    assert.equal(rows.length,2);
    assert.deepEqual(rows.map(x=>x.category),['normal','forbidden']);
    assert.equal(rows.every(x=>typeof x.label==='string'&&x.label.length>0),true);
  }
  const initial=stageMatrix([]);
  assert.equal(initial.length,22);
  assert.equal(initial.every(x=>x.outcome==='not_run'&&x.actualStatus===null
    &&x.checkedAt===null&&x.requestId===null),true);
});

test('all 41 official attack slots remain not_run until real judge evidence exists',()=>{
  assert.equal(ATTACK_CATALOG.length,41);
  assert.equal(new Set(ATTACK_CATALOG.map(x=>x.slot)).size,41);
  assert.equal(ATTACK_CATALOG.every(x=>x.outcome==='not_run'
    &&x.observedAt===null&&x.officialMappingVerified===false),true);
  assert.match(ATTACK_CATALOG[0].title,/무인증/u);
  assert.match(ATTACK_CATALOG[1].title,/회수/u);
  assert.match(ATTACK_CATALOG[2].title,/복구/u);
});

test('recorded HTTP responses never infer a passed check from unexecuted work',()=>{
  const first=LIVE_PROBES[0];
  const evidence=[{case_id:first.caseId,verdict:'pass',actual_status:first.expectedStatus,
    request_id:'11111111-1111-4111-8111-111111111111',
    checked_at:'2026-10-13T13:00:00.000Z',source:'live_http'}];
  const matrix=stageMatrix(evidence);
  assert.equal(matrix.filter(x=>x.outcome==='pass').length,1);
  assert.equal(matrix.filter(x=>x.outcome==='not_run').length,21);
  assert.equal(matrix[0].requestId,evidence[0].request_id);
  assert.equal(matrix[0].checkedAt,evidence[0].checked_at);
});

test('probes are fixed, read-only or authentication-denied, never user-chosen URLs',()=>{
  assert.equal(LIVE_PROBES.length,8);
  assert.equal(new Set(LIVE_PROBES.map(x=>x.caseId)).size,8);
  for(const check of LIVE_PROBES){
    assert.match(check.caseId,/^S[0-9]{2}_(?:NORMAL|FORBIDDEN)$/u);
    assert.ok(['GET','POST'].includes(check.method));
    assert.match(check.path,/^\/[a-z0-9./-]*$/u);
    assert.equal(STAGE_CASES.some(x=>x.caseId===check.caseId
      &&x.expectedStatus===check.expectedStatus),true);
    if(check.method==='POST')assert.equal(check.expectedStatus,401);
  }
});

test('operations endpoint is protected and obtains its state from private DB',()=>{
  const api=readFileSync(new URL('../api/operations.js',import.meta.url),'utf8');
  assert.match(api,/createLoginVerifier/u);
  assert.match(api,/requireApprovedDevice\(/u);
  assert.match(api,/getNoteScope\(/u);
  assert.match(api,/stage12_http_evidence/u);
  assert.match(api,/note_restore_retests/u);
  assert.match(api,/device_approvals/u);
  assert.match(api,/stage11_diagnostic_events/u);
  assert.match(api,/Promise\.all\(LIVE_PROBES/u);
  assert.doesNotMatch(api,/console\.log\(/u);
  const sql=readFileSync(new URL('../sql/stage12-http-evidence.sql',import.meta.url),'utf8');
  assert.match(sql,/ENABLE ROW LEVEL SECURITY/u);
  assert.match(sql,/REVOKE ALL ON TABLE defense\.stage12_http_evidence FROM PUBLIC,anon,authenticated/u);
  const directory=new URL('../api/',import.meta.url);
  const files=readdirSync(directory,{recursive:true}).filter(p=>p.endsWith('.js'));
  assert.ok(files.length<=10,'Vercel Hobby function cap must remain <=10');
});

test('existing decider returns official five keys and declared ruleIds only',async()=>{
  const request={schema:'aleph.decision.v1',
    requestId:'11111111-1111-4111-8111-111111111111',
    classId:'class_fixture',projectId:'project_fixture',
    subjectId:'learner_fixture',deviceId:'aaaaaaaaaaaaaaaa',
    service:'notes',method:'GET',path:'/notes/demo',route:'GET /notes/:id',
    queryLength:0,querySha256:null,at:new Date().toISOString(),
    policyRevision:'stage9-safe',deviceRegistered:true,
    stepUp:{verified:false,authAgeSeconds:null},recentEvents:[],
    signals:{source:'none',region:'unknown',network:'unknown',hour:null}};
  for(const sample of [request,{...request,deviceRegistered:false},
    {...request,path:'/other'}, {...request,method:'PUT',route:'PUT /notes/:id'},
    {...request,signals:{source:'judge_fixture',region:'foreign',network:'unusual',hour:2}}]){
    const result=await decide(sample);
    assert.deepEqual(Object.keys(result).sort(),
      ['decision','reasonCode','requestId','ruleIds','schema']);
    assert.equal(result.schema,'aleph.decision.v1');
    assert.equal(result.requestId,sample.requestId);
    assert.ok(['allow','deny','step_up'].includes(result.decision));
    assert.equal(result.ruleIds.every(x=>RULE_IDS.includes(x)),true);
  }
  const src=readFileSync(new URL('../src/decider.mjs',import.meta.url),'utf8');
  assert.doesNotMatch(src,/\br\??\.identity\b|\br\??\.geo\b|\br\??\.role\b|\br\??\.device\b/u);
});

test('public UI labels engine observations as unrun and does not render private note content',()=>{
  const html=readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
  const ui=readFileSync(new URL('../public/operations-ui.js',import.meta.url),'utf8');
  assert.match(html,/탈환 작전실/u);
  assert.match(html,/ops-evidence-body/u);
  assert.match(html,/ops-records-body/u);
  assert.match(ui,/renderOperations/u);
  assert.match(ui,/미실행/u);
  assert.doesNotMatch(ui,/\.localStorage|\.sessionStorage|\.indexedDB/u);
  const config=JSON.parse(readFileSync(new URL('../aleph.config.json',import.meta.url),'utf8'));
  assert.equal(config.step,12);
  assert.equal(config.allowedRoutes.includes('GET /api/operations'),true);
  assert.equal(config.allowedRoutes.includes('POST /api/operations'),true);
});
