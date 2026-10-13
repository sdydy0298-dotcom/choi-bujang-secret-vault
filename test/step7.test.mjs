import assert from 'node:assert/strict';
import { test } from 'node:test';
import { decide, RULE_IDS } from '../src/decider.mjs';

const normal = {
  schema: 'aleph.decision.v1', requestId: '00000000-0000-4000-8000-000000000001',
  classId: 'class_fixture', projectId: 'project_fixture',
  subjectId: 'learner_fixture', deviceId: 'aaaaaaaaaaaaaaaa',
  service: 'notes', method: 'GET', path: '/notes/demo', route: 'GET /notes/:id',
  deviceRegistered: true, signals: {source: 'judge_fixture',region:'local',network:'usual',hour:14},
  recentEvents: [], stepUp: {verified:false,authAgeSeconds:null},
};
const burst = [{ kind:'risk_signal', ageSeconds:60, count:20 }];
const unusual = { ...normal, signals: {source:'judge_fixture',region:'foreign',network:'unusual',hour:3}, recentEvents:burst };
const classify = async (req,decision,reason,rule) => {
  const out=await decide(req);
  assert.deepEqual(Object.keys(out).sort(),['decision','reasonCode','requestId','ruleIds','schema']);
  assert.equal(out.schema,'aleph.decision.v1');
  assert.equal(out.requestId,req.requestId);
  assert.equal(out.decision,decision);
  assert.equal(out.reasonCode,reason);
  assert.deepEqual(out.ruleIds,[rule]);
};

test('stage6 rule retained and only two declared rules',async()=>{
  assert.ok(RULE_IDS.includes('device_registered')); assert.ok(RULE_IDS.includes('step_up_required'));
  await classify(normal,'allow','approved','device_registered');
  await classify({...unusual,deviceRegistered:false},'deny','device_not_registered','device_registered');
  await classify({...unusual,deviceRegistered:undefined},'deny','device_not_registered','device_registered');
  await classify({...unusual,service:'other'},'deny','device_not_registered','device_registered');
  await classify({...unusual,method:'POST'},'deny','route_not_allowed','route_not_allowed');
});
test('two or more validated synthetic warning signs require stepup',async()=>{
  await classify(unusual,'step_up','step_up_required','step_up_required');
  await classify({...normal,signals:{source:'judge_fixture',region:'local',network:'unusual',hour:3}},'step_up','step_up_required','step_up_required');
  await classify({...normal,signals:{source:'judge_fixture',region:'local',network:'unusual',hour:14},recentEvents:burst},'step_up','step_up_required','step_up_required');
});
test('one region or time irregularity does not cause permanent denial',async()=>{
  await classify({...normal,signals:{source:'judge_fixture',region:'foreign',network:'usual',hour:14}},'allow','approved','device_registered');
  await classify({...normal,signals:{source:'judge_fixture',region:'local',network:'usual',hour:3}},'allow','approved','device_registered');
});
test('verified re-login evidence permits a new request',async()=>{
  await classify({...unusual,stepUp:{verified:true,authAgeSeconds:60}},'allow','approved','device_registered');
  for(const age of [null,undefined,-1,901,'60']) {
    await classify({...unusual,stepUp:{verified:true,authAgeSeconds:age}},'step_up','step_up_required','step_up_required');
  }
});
test('missing or untrusted signal source is never upgraded to verified fixture evidence',async()=>{
  const suspicious={...unusual,signals:{...unusual.signals,source:'client_header'}};
  await classify(suspicious,'allow','approved','device_registered');
  await classify({...suspicious,signals:{region:'foreign',network:'unusual',hour:3}},'allow','approved','device_registered');
  await classify({...suspicious,signals:undefined},'allow','approved','device_registered');
  await classify({...normal,recentEvents:[{kind:'risk_signal',ageSeconds:99999,count:200}],signals:{source:'judge_fixture',region:'foreign',network:'usual',hour:14}},'allow','approved','device_registered');
});
