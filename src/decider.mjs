// Only accept ALEPH engine verified claims, never user-supplied roles or owners.
// Real owner/instructor claims are absent from aleph.decision.v1.
export const RULE_IDS=Object.freeze(['device_registered','step_up_required','resource_zone','route_not_allowed','write_not_allowed']);
const reply=(r,decision,reasonCode,ruleId)=>({schema:'aleph.decision.v1',requestId:r?.requestId,decision,reasonCode,ruleIds:[ruleId]});
const UUID='[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}';
const READ=Object.freeze({
 'GET /notes/:id':/^\/notes\/[A-Za-z0-9._~-]{1,128}$/u,
 'GET /api/my/notes':/^\/api\/my\/notes$/u,
 'GET /api/notes/:id':new RegExp('^/api/notes/'+UUID+'$','iu'),
 'GET /api/notices':/^\/api\/notices$/u,
 'GET /api/notices/:id':new RegExp('^/api/notices/'+UUID+'$','iu')
});
const WRITE=Object.freeze({
 'PUT /notes/:id':/^\/notes\/[A-Za-z0-9._~-]{1,128}$/u,
 'POST /api/notes':/^\/api\/notes$/u,
 'PUT /api/notes/:id':new RegExp('^/api/notes/'+UUID+'$','iu'),
 'DELETE /api/notes/:id':new RegExp('^/api/notes/'+UUID+'$','iu')
});
// Exact API resource routes are admitted to the owner-filtered *server* API.
// A route match is not an ownership grant: the API must verify the signed user
// and DB owner on every single-item GET/PUT/DELETE, including judge A/B.
const OWNER_ENFORCED_ROUTES = new Set([
  'POST /api/notes', 'GET /api/my/notes',
  'GET /api/notes/:id', 'PUT /api/notes/:id', 'DELETE /api/notes/:id'
]);
const PUBLIC_NOTICE_READ_ROUTES = new Set(['GET /api/notices', 'GET /api/notices/:id']);
// Stage 8: engine v1 contains no instructor-role attestation. Notice or
// instructor-material writes are NEVER authorized by this decider, even if
// a server binding attempts to mark a caller as an instructor.
const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const BLOCKED_GLOBAL_LISTS = new Set(['GET /notes', 'GET /api/notes']);
function isNoticeOrInstructorPath(r) {
  return r.service === 'notices' ||
    (typeof r.path === 'string' &&
      /^\/(?:api\/)?(?:notices|instructor-notices|announcements|instructor-materials)(?:\/|$)/u.test(r.path));
}
function apiOwnedRoute(r, key) {
  return (r.service === 'notes' && OWNER_ENFORCED_ROUTES.has(key))
    || (['notes', 'notices'].includes(r.service) && PUBLIC_NOTICE_READ_ROUTES.has(key));
}
// The sole default resource is the official fixture-7 training request.
// Earlier invented student_A/student_B UUID grants were not legitimate owners.
const STARTER=Object.freeze({classId:'class_fixture',projectId:'project_fixture',
 subjectId:'learner_fixture',deviceId:'aaaaaaaaaaaaaaaa',service:'notes',
 path:'/notes/demo',resourceId:'note:demo',ownerSubjectId:'learner_fixture',
 methods:['GET','PUT']});
function serverBindings(){
 const source=typeof process==='undefined'?undefined:process.env?.ALEPH_RESOURCE_BINDINGS;
 if(!source)return [STARTER];
 if(typeof source!=='string'||source.length>100000)return [];
 try{const extra=JSON.parse(source);
  return Array.isArray(extra)&&extra.length<=1000?[STARTER,...extra]:[];
 }catch{return []}
}
function boundResource(r){
 const notice=r.path.startsWith('/api/notices')||r.path.startsWith('/notices/');
 return serverBindings().some(x=>x&&x.classId===r.classId
  &&x.projectId===r.projectId&&x.subjectId===r.subjectId
  &&x.deviceId===r.deviceId&&x.service===r.service
  &&x.path===r.path&&Array.isArray(x.methods)&&x.methods.includes(r.method)
  &&typeof x.resourceId==='string'&&(notice
   ?x.resourceId.startsWith('notice:')&&r.method==='GET'
   :x.resourceId.startsWith('note:')&&x.ownerSubjectId===r.subjectId));
}
function riskCount(r){
 const s=r?.signals;if(s?.source!=='judge_fixture')return 0;
 return Number(s.region==='foreign')+Number(s.network==='unusual')
  +Number(Number.isInteger(s.hour)&&s.hour>=0&&s.hour<6)
  +Number(Array.isArray(r.recentEvents)&&r.recentEvents.some(e=>
   e?.kind==='risk_signal'&&Number.isInteger(e.ageSeconds)
   &&e.ageSeconds>=0&&e.ageSeconds<=900&&Number.isInteger(e.count)&&e.count>=10));
}
function freshStepUp(r){return r?.stepUp?.verified===true
 &&Number.isInteger(r.stepUp.authAgeSeconds)
 &&r.stepUp.authAgeSeconds>=0&&r.stepUp.authAgeSeconds<=900}
export async function decide(r){
 if(r?.schema!=='aleph.decision.v1'||r.deviceRegistered!==true
  ||typeof r.classId!=='string'||!r.classId.trim()
  ||typeof r.projectId!=='string'||!r.projectId.trim()
  ||typeof r.subjectId!=='string'||!r.subjectId.trim()
  ||typeof r.deviceId!=='string'||!/^[a-f0-9]{16}$/u.test(r.deviceId)
  ||!['notes','notices'].includes(r.service)){
  return reply(r,'deny','device_not_registered','device_registered');
 }
 const key=typeof r.route==='string'&&typeof r.method==='string'
  &&r.route.startsWith(r.method+' ')?r.route:null;
 // An explicit deny must take priority over every allowlist and trusted
 // binding. A valid UUID note item remains readable through the owner-
 // enforcing API, while GET /api/my/notes is the only personal list route.
 if(WRITE_METHODS.has(r.method)&&isNoticeOrInstructorPath(r))
  return reply(r,'deny','write_not_allowed','write_not_allowed');
 if(BLOCKED_GLOBAL_LISTS.has(key)||
    (r.method==='GET'&&(r.path==='/notes'||r.path==='/api/notes')))
  return reply(r,'deny','route_not_allowed','resource_zone');
 const read=key?READ[key]:null,write=key?WRITE[key]:null;
 if((!read&&!write)||typeof r.path!=='string'
  ||!(read??write).test(r.path)||r.queryLength!==0
  ||/[%?#\\]/u.test(r.path))
  return reply(r,'deny','route_not_allowed','route_not_allowed');
 if(!apiOwnedRoute(r,key)&&!boundResource(r)){
  if(write)return reply(r,'deny','write_not_allowed','write_not_allowed');
  return reply(r,'deny','route_not_allowed','resource_zone');
 }
 if(riskCount(r)>=2&&!freshStepUp(r))
  return reply(r,'step_up','step_up_required','step_up_required');
 return reply(r,'allow','approved','device_registered');
}
