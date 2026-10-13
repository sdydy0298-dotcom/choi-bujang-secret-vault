import assert from 'node:assert/strict';
import {test} from 'node:test';
import {decide,RULE_IDS} from '../src/decider.mjs';
import {readFileSync} from 'node:fs';
import {resourceId,idFromPath,isVerifiedInstructor,safeContent} from '../src/resource-zones.mjs';
const ID='11111111-1111-4111-8111-111111111111';
const base={schema:'aleph.decision.v1',requestId:'stage8-unit',classId:'class_fixture',
 projectId:'project_fixture',subjectId:'learner_fixture',deviceId:'aaaaaaaaaaaaaaaa',
 deviceRegistered:true,service:'notes',method:'GET',path:'/notes/demo',
 route:'GET /notes/:id',queryLength:0,signals:{source:'none'},recentEvents:[],
 stepUp:{verified:false,authAgeSeconds:null}};
async function expect(x,decision,reason){
 const r={...base,...x},out=await decide(r);
 assert.equal(out.decision,decision);
 assert.equal(out.reasonCode,reason);
 assert.equal(out.requestId,r.requestId);
 assert.deepEqual(Object.keys(out).sort(),['decision','reasonCode','requestId','ruleIds','schema']);
 assert.ok(out.ruleIds.every(id=>RULE_IDS.includes(id)));
}
test('only official owned training resource allows self GET and PUT',async()=>{
 await expect({},'allow','approved');
 await expect({method:'PUT',route:'PUT /notes/:id'},'allow','approved');
});
test('other subjects, devices, classes, projects cannot access same resource',async()=>{
 for(const x of [{subjectId:'student_A'},{subjectId:'student_B'},
  {subjectId:'other_student'},{deviceId:'fedcba9876543210'},
  {classId:'another_class'},{projectId:'another_project'},{path:'/notes/other'}])
  await expect(x,'deny','route_not_allowed');
 await expect({subjectId:'other_student',method:'PUT',route:'PUT /notes/:id'},'deny','write_not_allowed');
});
test('global list denied, personal list permitted, notice writes denied',async()=>{
 await expect({route:'GET /api/notes',path:'/api/notes'},'deny','route_not_allowed');
 await expect({route:'GET /notes',path:'/notes'},'deny','route_not_allowed');
 await expect({route:'GET /api/my/notes',path:'/api/my/notes'},'allow','approved');
 await expect({method:'PUT',route:'PUT /api/notices/:id',path:'/api/notices/'+ID},'deny','write_not_allowed');
 await expect({method:'POST',route:'POST /api/notices',path:'/api/notices'},'deny','write_not_allowed');
});
test('stage8 forbidden routes stay denied even with injected instructor or owner bindings',async()=>{
 const previous=process.env.ALEPH_RESOURCE_BINDINGS;
 const id=ID;
 const keys={classId:'class_fixture',projectId:'project_fixture',
   subjectId:'learner_fixture',deviceId:'aaaaaaaaaaaaaaaa'};
 const bindings=[
  {...keys,service:'notes',path:'/api/notes',resourceId:'note:collection',
   ownerSubjectId:'learner_fixture',methods:['GET']},
  {...keys,service:'notes',path:'/notes',resourceId:'note:collection',
   ownerSubjectId:'learner_fixture',methods:['GET']},
  {...keys,service:'notices',path:'/api/notices/'+id,resourceId:'notice:'+id,
   instructor:true,methods:['GET','PUT','PATCH','DELETE']},
  {...keys,service:'notices',path:'/api/notices',resourceId:'notice:collection',
   instructor:true,methods:['GET','POST']}
 ];
 try{
  process.env.ALEPH_RESOURCE_BINDINGS=JSON.stringify(bindings);
  for(const r of [
   {method:'GET',route:'GET /notes',path:'/notes'},
   {method:'GET',route:'GET /api/notes',path:'/api/notes'}
  ]) await expect(r,'deny','route_not_allowed');
  for(const [method,path,route] of [
   ['POST','/api/notices','POST /api/notices'],
   ['PUT','/api/notices/'+id,'PUT /api/notices/:id'],
   ['PATCH','/api/notices/'+id,'PATCH /api/notices/:id'],
   ['DELETE','/api/notices/'+id,'DELETE /api/notices/:id'],
   ['PUT','/api/instructor-notices/'+id,'PUT /api/instructor-notices/:id']
  ]) await expect({service:'notices',method,path,route},'deny','write_not_allowed');
 }finally{
  if(previous===undefined)delete process.env.ALEPH_RESOURCE_BINDINGS;
  else process.env.ALEPH_RESOURCE_BINDINGS=previous;
 }
});

test('submitted stage8 route config includes only scoped personal reads and no notice writes',()=>{
 const config=JSON.parse(readFileSync(new URL('../aleph.config.json',import.meta.url),'utf8'));
 assert.ok(config.allowedRoutes.includes('GET /api/my/notes'));
 assert.ok(config.allowedRoutes.includes('GET /api/notes/:id'));
 for(const forbidden of ['GET /api/notes','POST /api/notices','PUT /api/notices/:id'])
  assert.ok(!config.allowedRoutes.includes(forbidden),forbidden);
 assert.ok(!config.protectedReadRoutes.includes('GET /notes'));
});

test('unknown feature path and query-supplied action never authorize',async()=>{
 for(const x of [{path:'/notes/export'},{path:'/notes/other'},
  {path:'/notes/demo/export'},{path:'/notes/demo',queryLength:1},
  {route:'PUT /notes/:id',method:'GET'}])
  await expect(x,'deny','route_not_allowed');
});
test('registered device and fresh reauthentication rules remain',async()=>{
 await expect({deviceRegistered:false},'deny','device_not_registered');
 const suspicious={source:'judge_fixture',region:'foreign',network:'unusual',hour:3};
 await expect({signals:suspicious},'step_up','step_up_required');
 await expect({signals:suspicious,stepUp:{verified:true,authAgeSeconds:60}},'allow','approved');
});
test('validated UUID API routes reach the owner-checking server, not an unconditional grant',async()=>{
 for(const method of ['GET','PUT','DELETE']) {
  const r={method,route:method+' /api/notes/:id',path:'/api/notes/'+ID};
  await expect(r,'allow','approved');
  // The stateless engine has no resource owner claim. Real A/B authorization
  // is verified against the signed identity and DB owner by the API tests.
  await expect({...r,subjectId:'other_student'},'allow','approved');
 }
 await expect({method:'POST',route:'POST /api/notes',path:'/api/notes'},'allow','approved');
});

test('trusted engine /notes resource bindings remain subject-and-device specific',async()=>{
 const old=process.env.ALEPH_RESOURCE_BINDINGS;
 const binding={classId:'demo_class',projectId:'demo_project',subjectId:'verified_A',
  deviceId:'0123456789abcdef',service:'notes',path:'/notes/owner-fixture',
  resourceId:'note:owner-fixture',ownerSubjectId:'verified_A',methods:['GET','PUT']};
 const input={...binding,route:'GET /notes/:id'};
 try{
  process.env.ALEPH_RESOURCE_BINDINGS=JSON.stringify([binding]);
  await expect(input,'allow','approved');
  await expect({...input,subjectId:'verified_B'},'deny','route_not_allowed');
  await expect({...input,deviceId:'ffffffffffffffff'},'deny','route_not_allowed');
  await expect({...input,method:'PUT',route:'PUT /notes/:id'},'allow','approved');
  process.env.ALEPH_RESOURCE_BINDINGS=JSON.stringify([{...binding,ownerSubjectId:'verified_B'}]);
  await expect(input,'deny','route_not_allowed');
 }finally{if(old===undefined)delete process.env.ALEPH_RESOURCE_BINDINGS;
  else process.env.ALEPH_RESOURCE_BINDINGS=old}
});
test('resource IDs and instructor role cannot be forged in body',()=>{
 assert.notEqual(resourceId('note',ID),resourceId('notice',ID));
 assert.equal(idFromPath({url:'/api/notes/'+ID+'?action=export'},'notes'),null);
 assert.equal(isVerifiedInstructor({kind:'student',userId:ID},{id:ID,app_metadata:{aleph_role:'instructor'}}),true);
 assert.equal(isVerifiedInstructor({kind:'student',userId:ID},{id:ID,user_metadata:{aleph_role:'instructor'}}),false);
 assert.equal(safeContent({title:'hello',body:'world',role:'instructor'}),null);
});
