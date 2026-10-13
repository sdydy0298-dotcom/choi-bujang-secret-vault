import {randomUUID} from 'node:crypto';
import {createClient} from '@supabase/supabase-js';
import config from '../aleph.config.json' with {type:'json'};
import manifest from '../recovery/MANIFEST.json' with {type:'json'};
import {createLoginVerifier} from '../src/verify-login.mjs';
import {getNoteScope} from '../src/note-scope.mjs';
import {requireApprovedDevice} from '../src/device-approval.mjs';
import {RULE_IDS} from '../src/decider.mjs';
import {ATTACK_CATALOG,LIVE_PROBES,stageMatrix} from '../src/stage12-matrix.mjs';

const HEADERS={'Cache-Control':'no-store, max-age=0','X-Content-Type-Options':'nosniff',
  'Content-Type':'application/json; charset=utf-8'};
let verify;
function respond(res,status,body){
  for(const [key,value] of Object.entries(HEADERS))res.setHeader(key,value);
  return res.status(status).json(body);
}
function checkedOrigin(raw){
  const url=new URL(raw);
  if(url.protocol!=='https:'||!url.hostname.endsWith('.vercel.app')||
      url.pathname!=='/'||url.search||url.hash||url.username||url.password||url.port)
    throw new Error('INVALID_PROBE_ORIGIN');
  return url.origin;
}
function parsedAction(req){
  let body=req.body;
  if(typeof body==='string'){try{body=JSON.parse(body)}catch{return null}}
  if(!body||typeof body!=='object'||Array.isArray(body)||
     Object.keys(body).join(',')!=='action'||body.action!=='run_public_probes')
    return null;
  return body.action;
}
async function runProbes(db,scope){
  const origin=checkedOrigin(config.publicAppUrl);
  const checks=await Promise.all(LIVE_PROBES.map(async probe=>{
    const requestId=randomUUID();
    try{
      const response=await fetch(new URL(probe.path,origin),{
        method:probe.method,cache:'no-store',redirect:'error',
        headers:{'X-Aleph-Probe-Id':requestId},signal:AbortSignal.timeout(6000)
      });
      const checkedAt=new Date().toISOString();
      return {...probe,requestId,checkedAt,actualStatus:response.status,
        outcome:response.status===probe.expectedStatus?'pass':'fail'};
    }catch{
      // No HTTP response means no observed status and never a synthetic pass.
      return {...probe,requestId:null,checkedAt:null,actualStatus:null,outcome:'not_run'};
    }
  }));
  const completed=checks.filter(row=>row.outcome!=='not_run');
  if(completed.length){
    const {error}=await db.schema('defense').from('stage12_http_evidence')
      .insert(completed.map(item=>({
        owner_id:scope.owner_id,request_id:item.requestId,case_id:item.caseId,
        stage:item.stage,category:item.category,source:'live_http',
        expected_status:item.expectedStatus,actual_status:item.actualStatus,
        verdict:item.outcome,checked_at:item.checkedAt
      })));
    if(error)throw new Error('EVIDENCE_WRITE_FAILED');
  }
  return {
    ranAt:new Date().toISOString(),recorded:completed.length,
    unexecuted:checks.length-completed.length,
    checks:checks.map(({caseId,category,path,method,expectedStatus,actualStatus,
      requestId,checkedAt,outcome})=>({
      caseId,category,request:method+' '+path,expectedStatus,actualStatus,
      requestId,checkedAt,outcome,source:'live_http'
    }))
  };
}
async function loadSummary(db,scope){
  const table=name=>db.schema('defense').from(name);
  const queries=await Promise.all([
    table('stage12_http_evidence')
      .select('case_id,source,actual_status,verdict,request_id,checked_at')
      .eq('owner_id',scope.owner_id).order('checked_at',{ascending:false}).limit(100),
    table('device_approvals').select('status').eq('owner_id',scope.owner_id),
    table('note_restore_audit').select('operation,restored_at')
      .eq('owner_id',scope.owner_id).order('restored_at',{ascending:false}).limit(50),
    table('note_restore_retests').select('policy_version,checked_at,checks')
      .eq('owner_id',scope.owner_id).order('checked_at',{ascending:false}).limit(1),
    table('stage11_diagnostic_events').select('event,source,status_code,occurred_at')
      .eq('source','server').order('occurred_at',{ascending:false}).limit(20)
  ]);
  if(queries.some(query=>query.error))throw new Error('EVIDENCE_QUERY_FAILED');
  const [proofs,devices,restoreAudits,restoreRetests,diagnostics]=queries.map(x=>x.data??[]);
  const countStatus=status=>devices.filter(item=>item.status===status).length;
  const checks=Array.isArray(restoreRetests[0]?.checks)?restoreRetests[0].checks:[];
  const retest={status:restoreRetests.length?'observed':'not_run',
    checkedAt:restoreRetests[0]?.checked_at??null,
    policyVersion:restoreRetests[0]?.policy_version??null,
    executed:checks.filter(item=>item?.outcome==='pass'||item?.outcome==='fail').length,
    passed:checks.filter(item=>item?.outcome==='pass').length,
    failed:checks.filter(item=>item?.outcome==='fail').length,
    notRun:checks.filter(item=>item?.outcome==='not_run').length};
  return {
    schema:'aleph.stage12.operations.v1',
    checkedAt:new Date().toISOString(),
    evidenceSource:'protected_server_api',
    decision:{ruleIds:[...RULE_IDS],ruleCount:RULE_IDS.length,
      source:'student_src_decider',engineExecution:'not_run',engine:'ALEPH SDP'},
    detection:{source:'student_src_detect',engine:'ALEPH SDP',
      liveIncidents:'not_run',revocationProposals:'not_run',
      note:'9단계 가상 탐지 실행 결과를 실제 운영 사건으로 계산하지 않음'},
    revocation:{source:'defense.device_approvals',approved:countStatus('approved'),
      pending:countStatus('pending'),revoked:countStatus('revoked'),
      engineRevocationVerified:'not_run'},
    recovery:{source:'defense.note_restore_audit',
      policyVersion:manifest.files['stage9-safe-policy.json'].version,
      auditRecords:restoreAudits.length,lastRestoredAt:restoreAudits[0]?.restored_at??null,
      lastOperation:restoreAudits[0]?.operation??null,postRestoreRetest:retest},
    evidence:{source:'defense.stage12_http_evidence',cases:stageMatrix(proofs),
      passed:stageMatrix(proofs).filter(item=>item.outcome==='pass').length,
      failed:stageMatrix(proofs).filter(item=>item.outcome==='fail').length},
    attacks:{official41Completed:'not_run',total:ATTACK_CATALOG.length,passed:0,
      // 0 passed means no positive evidence; never an assertion of 41 failures.
      notRun:ATTACK_CATALOG.length,cases:ATTACK_CATALOG},
    redactedServerRecords:diagnostics.map(item=>({
      event:item.event,source:item.source,statusCode:item.status_code,
      checkedAt:item.occurred_at
    }))
  };
}
export default async function handler(req,res){
  if(!['GET','POST'].includes(req.method)){
    res.setHeader('Allow','GET, POST');
    return respond(res,405,{error:'METHOD_NOT_ALLOWED'});
  }
  let url;
  try{url=new URL(req.url??'/api/operations','https://resource.invalid')}
  catch{return respond(res,404,{error:'RESOURCE_NOT_FOUND'})}
  if(url.pathname!=='/api/operations'||url.search||url.hash)
    return respond(res,404,{error:'RESOURCE_NOT_FOUND'});
  if(!process.env.SUPABASE_URL||!process.env.SUPABASE_SECRET_KEY)
    return respond(res,503,{error:'DATA_SOURCE_NOT_CONFIGURED'});
  let identity;
  try{
    verify??=createLoginVerifier({config,supabaseSecretKey:process.env.SUPABASE_SECRET_KEY});
    identity=await verify(req.headers?.authorization);
  }catch{return respond(res,503,{error:'LOGIN_VERIFIER_UNAVAILABLE'})}
  if(!identity){
    res.setHeader('WWW-Authenticate','Bearer');
    return respond(res,401,{error:'UNAUTHORIZED'});
  }
  const scope=getNoteScope(identity);
  if(!scope)return respond(res,403,{error:'INVALID_OWNER_SCOPE'});
  const db=createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SECRET_KEY,{
    auth:{autoRefreshToken:false,persistSession:false,detectSessionInUrl:false}
  });
  const device=await requireApprovedDevice(req,identity,db);
  if(!device.ok)return respond(res,device.status,{error:device.error});
  try{
    if(req.method==='GET')return respond(res,200,await loadSummary(db,scope));
    if(!parsedAction(req))return respond(res,400,{error:'INVALID_OPERATION'});
    const {data,error}=await db.schema('defense').from('stage12_http_evidence')
      .select('checked_at').eq('owner_id',scope.owner_id)
      .order('checked_at',{ascending:false}).limit(1);
    if(error)return respond(res,503,{error:'EVIDENCE_QUERY_FAILED'});
    if(data?.[0]&&Date.now()-Date.parse(data[0].checked_at)<60000)
      return respond(res,429,{error:'EVIDENCE_PROBE_COOLDOWN'});
    return respond(res,200,await runProbes(db,scope));
  }catch{return respond(res,503,{error:'OPERATIONS_EVIDENCE_UNAVAILABLE'})}
}
