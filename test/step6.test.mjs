import assert from 'node:assert/strict';
import { test } from 'node:test';
import { decide, RULE_IDS } from '../src/decider.mjs';
import { runAttackChecks } from '../src/attack-check.mjs';

const validRequest = Object.freeze({
  schema:'aleph.decision.v1', requestId:'00000000-0000-4000-8000-000000000000',
  classId:'class_fixture', projectId:'project_fixture', subjectId:'learner_fixture', deviceId:'aaaaaaaaaaaaaaaa', deviceRegistered:true,
  service:'notes', method:'GET', path:'/notes/demo', route:'GET /notes/:id', queryLength:0,
});
const assertDecision = async (changes, expected, reason) => {
  const input={...validRequest,...changes};
  const result=await decide(input);
  assert.equal(result.decision,expected);
  assert.equal(result.reasonCode,reason);
  assert.equal(result.requestId,input.requestId);
  assert.deepEqual(Object.keys(result).sort(), ['decision','reasonCode','requestId','ruleIds','schema']);
  assert.ok(result.ruleIds.length > 0 && result.ruleIds.every(id => RULE_IDS.includes(id)));
};

test('등록된 정상 읽기만 허용',async()=>{
  await assertDecision({},'allow','approved');
  await assertDecision({route:'GET /notes/:id',path:'/notes/demo'},'allow','approved');
});
test('미등록·확인 불충분은 fail closed',async()=>{
  for(const changes of [
    {deviceRegistered:false}, {deviceRegistered:null}, {deviceRegistered:'true'},
    {deviceId:undefined}, {deviceId:'ABCDEF0123456789'}, {deviceId:'random'},
    {subjectId:' '}, {subjectId:null}, {schema:'other'},
    {service:'other'},
  ]) await assertDecision(changes,'deny','device_not_registered');
  for(const changes of [{method:'POST'},{route:'POST /notes'},{route:'GET /secrets'}]){
    await assertDecision(changes,'deny','route_not_allowed');
  }
});

const config={step:6,publicAppUrl:'https://secret-vault-sdydy0298.vercel.app',
  repoUrl:'https://github.com/sdydy0298-dotcom/choi-bujang-secret-vault',
  allowedRoutes:['GET /api/notes','POST /api/notes'], originalApiUrl:'https://db.example.com/rest/v1/notes'};
const json=(body,status=200) => new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json'}});
const mock=(step=6,login=false)=>{
  globalThis.fetch=async url=>{
    const path=new URL(url).pathname;
    switch(path){
      case '/':return new Response(login?'<title>Log in to Vercel</title>':'<title>BYTE BACK | 인증된 자료실</title>',{status:200,headers:{'x-content-type-options':'nosniff'}});
      case '/api/notes':return json({error:'UNAUTHORIZED'},401);
      case '/data.json':return json({notes:[]});
      case '/aleph.json':return json({step,repoUrl:config.repoUrl,commit:'a'.repeat(40),allowedRoutes:config.allowedRoutes,originalApiUrl:config.originalApiUrl});
      case '/api/auth-config':return json({url:'https://db.example.com',publishableKey:'public_key'});
      default:throw new Error('unexpected URL '+url);
    }
  };
};

test('운영 준비 5개 HTTP 자기점검 모두 정상 시 통과',async()=>{
  const original=globalThis.fetch;
  try{mock();const checks=await runAttackChecks(config);
    assert.equal(checks.length,5);
    assert.equal(checks.every(item=>item.observed.startsWith('통과:')),true);
  }finally{globalThis.fetch=original;}
});
test('식별 정보가 5단계이면 실패 기록',async()=>{
  const original=globalThis.fetch;
  try{mock(5);const checks=await runAttackChecks(config);
    assert.match(checks.find(c=>c.attackId==='deployment_identity_available').observed,/^확인 실패:/u);
  }finally{globalThis.fetch=original;}
});
test('Vercel 로그인 HTML이면 첫 화면 점검 실패',async()=>{
  const original=globalThis.fetch;
  try{mock(6,true);const checks=await runAttackChecks(config);
    assert.match(checks.find(c=>c.attackId==='main_security_header').observed,/^확인 실패:/u);
  }finally{globalThis.fetch=original;}
});
test('1단계 시작 틀 자기점검 호환 유지',async()=>{
  const original=globalThis.fetch;
  try{globalThis.fetch=async()=>json({sampleMarker:'SAMPLE_NOTE_1',notes:[{title:'virtual'}]});
    const checks=await runAttackChecks({step:1,publicAppUrl:config.publicAppUrl,sampleMarker:'SAMPLE_NOTE_1'});
    assert.match(checks[0].observed,/확인 표시가 보임/u);
  }finally{globalThis.fetch=original;}
});
