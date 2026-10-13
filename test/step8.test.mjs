import assert from 'node:assert/strict';
import {test} from 'node:test';
import {decide,RULE_IDS} from '../src/decider.mjs';
import {resourceId,idFromPath,isVerifiedInstructor,safeContent} from '../src/resource-zones.mjs';
const ID='11111111-1111-4111-8111-111111111111';
const base={schema:'aleph.decision.v1',requestId:'00000000-0000-4000-8000-000000000008',classId:'class_fixture',projectId:'project_fixture',subjectId:'student_A',deviceId:'0123456789abcdef',deviceRegistered:true,service:'notes',method:'GET',route:'GET /api/notes/:id',path:'/api/notes/'+ID,queryLength:0,stepUp:{verified:false,authAgeSeconds:null},signals:{source:'none',region:'unknown',network:'unknown',hour:null},recentEvents:[]};
async function expect(changes,decision,reason){const x=await decide({...base,...changes});assert.equal(x.decision,decision);assert.equal(x.reasonCode,reason);assert.deepEqual(Object.keys(x).sort(),['decision','reasonCode','requestId','ruleIds','schema']);assert.ok(x.ruleIds.every(r=>RULE_IDS.includes(r)))}
test('stage8 S08_OTHER_ZONE_ALLOWED: scoped reads, broad list and writes fail closed',async()=>{
  await expect({},'allow','approved');
  await expect({route:'GET /api/my/notes',path:'/api/my/notes'},'allow','approved');
  await expect({method:'GET',route:'GET /api/notes',path:'/api/notes'},'deny','route_not_allowed');
  await expect({method:'GET',route:'GET /api/notes/all',path:'/api/notes/all'},'deny','route_not_allowed');
  await expect({method:'PUT',route:'PUT /api/notes/:id'},'allow','approved');
  await expect({method:'DELETE',route:'DELETE /api/notes/:id'},'allow','approved');
  await expect({method:'POST',route:'POST /api/notes',path:'/api/notes'},'deny','write_not_allowed');
});
test('public class notice reads stay available, instructor writes fail closed in v1',async()=>{
  await expect({route:'GET /api/notices',path:'/api/notices'},'allow','approved');
  await expect({route:'GET /api/notices/:id',path:'/api/notices/'+ID},'deny','route_not_allowed');
  await expect({method:'PUT',route:'PUT /api/notices/:id',path:'/api/notices/'+ID},'deny','write_not_allowed');
  await expect({method:'POST',route:'POST /api/notices',path:'/api/notices'},'deny','write_not_allowed');
});
test('unknown paths / query action denied',async()=>{await expect({route:'GET /api/notes/:id',path:'/api/notes/export'},'deny','route_not_allowed');await expect({route:'GET /api/notes',path:'/api/notes',queryLength:13},'deny','route_not_allowed');await expect({route:'GET /api/notices/:id',path:'/api/notes/'+ID},'deny','route_not_allowed')});
test('previous device and anomaly rules unchanged',async()=>{await expect({deviceRegistered:false},'deny','device_not_registered');await expect({signals:{source:'judge_fixture',region:'foreign',network:'unusual',hour:3}},'step_up','step_up_required');await expect({signals:{source:'judge_fixture',region:'foreign',network:'unusual',hour:3},stepUp:{verified:true,authAgeSeconds:60}},'allow','approved')});
test('resource IDs and instructor metadata cannot be spoofed',()=>{assert.notEqual(resourceId('note',ID),resourceId('notice',ID));assert.equal(idFromPath({url:'/api/notes/'+ID+'?action=export'},'notes'),null);assert.equal(idFromPath({url:'/api/notes/export'},'notes'),null);assert.equal(isVerifiedInstructor({kind:'student',userId:ID},{id:ID,app_metadata:{aleph_role:'instructor'}}),true);assert.equal(isVerifiedInstructor({kind:'student',userId:ID},{id:ID,user_metadata:{aleph_role:'instructor'}}),false);assert.equal(safeContent({title:'x',body:'y',role:'instructor'}),null)});

test('S08_OTHER_ZONE_ALLOWED: same exact note ID is denied to another verified subject and device',async()=>{
 const victimPath='/api/notes/'+ID;
 await expect({},'allow','approved');
 await expect({subjectId:'student_B',deviceId:'fedcba9876543210'},'deny','route_not_allowed');
 await expect({subjectId:'student_B',deviceId:'fedcba9876543210',method:'PUT',route:'PUT /api/notes/:id'},'deny','write_not_allowed');
 await expect({subjectId:'student_B',deviceId:'fedcba9876543210',method:'DELETE',route:'DELETE /api/notes/:id'},'deny','write_not_allowed');
 await expect({subjectId:'student_A',deviceId:'fedcba9876543210'},'deny','route_not_allowed');
 await expect({classId:'other_class'},'deny','route_not_allowed');
 await expect({projectId:'other_project'},'deny','route_not_allowed');
 await expect({subjectId:'student_B',deviceId:'fedcba9876543210',path:'/api/notes/22222222-2222-4222-8222-222222222222'},'allow','approved');
});
test('the official supplied learner fixture remains allowed while unrelated subjects are denied',async()=>{
 const normal={classId:'class_fixture',projectId:'project_fixture',subjectId:'learner_fixture',deviceId:'aaaaaaaaaaaaaaaa',path:'/notes/demo',route:'GET /notes/:id'};
 await expect(normal,'allow','approved');
 await expect({...normal,subjectId:'other_user'},'deny','route_not_allowed');
 await expect({...normal,path:'/notes/other'},'deny','route_not_allowed');
});
