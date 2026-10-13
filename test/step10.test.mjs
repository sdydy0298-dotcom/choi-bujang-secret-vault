import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { STAGE9_SAFE_COMMIT, VERIFIED_POLICY_DIGEST, VERIFIED_POLICY_RAW_DIGEST, noteContentHash, equalHash,
  loadVerifiedPolicy, reloadVerifiedPolicy, policyDiff, restoreTestPolicy, verifiedBackup }
  from '../src/stage10-recovery.mjs';
import { runAttackChecks } from '../src/attack-check.mjs';
const ID='11111111-1111-4111-8111-111111111111';
const OWNER='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const RUN='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

test('pinned stage9 policy digest and baseline are correct',()=>{
 const p=loadVerifiedPolicy();
 assert.equal(p.baseCommit,STAGE9_SAFE_COMMIT);
 assert.equal(createHash('sha256').update(JSON.stringify(p)).digest('hex'),VERIFIED_POLICY_DIGEST);
 assert.ok(!p.services.notes.allowedRoutes.includes('GET /api/notes'));
});
test('manifest and verified bytes are pinned independently and fail closed',()=>{
 const backupFile=new URL('../recovery/stage9-safe-policy.json',import.meta.url);
 const manifestFile=new URL('../recovery/MANIFEST.json',import.meta.url);
 assert.equal(createHash('sha256').update(readFileSync(backupFile)).digest('hex'),VERIFIED_POLICY_RAW_DIGEST);
 const base=loadVerifiedPolicy();
 const temp=mkdtempSync(join(tmpdir(),'stage10-forgery-'));
 try {
  const changed=structuredClone(base);
  changed.services.notes.allowedRoutes.push('GET /api/notes');
  const changedContent=JSON.stringify(changed,null,2)+'\n';
  const altered=join(temp,'policy.json');
  writeFileSync(altered,changedContent);
  const manifest=JSON.parse(readFileSync(manifestFile,'utf8'));
  manifest.files['stage9-safe-policy.json'].sha256=createHash('sha256').update(JSON.stringify(changed)).digest('hex');
  manifest.files['stage9-safe-policy.json'].rawSha256=createHash('sha256').update(changedContent).digest('hex');
  const forged=join(temp,'MANIFEST.json');
  writeFileSync(forged,JSON.stringify(manifest));
  assert.throws(()=>loadVerifiedPolicy(altered,forged),/VERIFIED_POLICY_MISSING_OR_INVALID/);
 } finally { rmSync(temp,{recursive:true,force:true}); }
});

test('missing or forged policy cannot be restored',()=>{
 assert.throws(()=>loadVerifiedPolicy(new URL('../recovery/nonexistent.json',import.meta.url)));
 const temp=mkdtempSync(join(tmpdir(),'aleph10-'));
 try {
  const unsafe=structuredClone(loadVerifiedPolicy());
  unsafe.services.notes.allowedRoutes.push('GET /api/notes');
  const file=join(temp,'bad.json');
  writeFileSync(file,JSON.stringify(unsafe));
  assert.throws(()=>loadVerifiedPolicy(file),/VERIFIED_POLICY_MISSING_OR_INVALID/);
 }finally{rmSync(temp,{recursive:true,force:true});}
});
test('preview is limited to notes, test restore retains unrelated services and audits',()=>{
 const safe=loadVerifiedPolicy();
 const current={services:{notes:{...structuredClone(safe.services.notes),
   allowedRoutes:['GET /api/notes']},notices:{status:'unchanged'}},
   auditEvents:[{kind:'existing'}],other:'untouched'};
 assert.ok(policyDiff(current,safe).some(x=>x.field==='services.notes.allowedRoutes'));
 const {restored}=restoreTestPolicy(current,safe);
 assert.deepEqual(restored.services.notes,safe.services.notes);
 assert.deepEqual(restored.services.notices,current.services.notices);
 assert.deepEqual(restored.auditEvents,current.auditEvents);
 assert.equal(restored.other,'untouched');
});
test('content hash is over title and body; modified bytes change digest',()=>{
 const original=noteContentHash('title','clean body');
 assert.ok(equalHash(original,original));
 assert.ok(!equalHash(original,noteContentHash('title','altered body')));
 assert.ok(!equalHash(original,noteContentHash('changed','clean body')));
});
test('judge B backup is bound to one signed owner/run/note and verified digest',()=>{
 const who={kind:'judge',identity:'b',userId:OWNER,ownerId:OWNER,runId:RUN};
 const backup={note_id:ID,owner_id:OWNER,judge_run_id:RUN,judge_identity:'b',
  title:'clean',content:'fixture',content_sha256:noteContentHash('clean','fixture'),
  captured_at:'2026-10-13T05:00:00Z',verified_at:'2026-10-13T05:00:00Z'};
 assert.equal(verifiedBackup(backup,who,ID),true);
 assert.equal(verifiedBackup({...backup,content:'other'},who,ID),false);
 assert.equal(verifiedBackup({...backup,owner_id:RUN},who,ID),false);
 assert.equal(verifiedBackup({...backup,note_id:RUN},who,ID),false);
 assert.equal(verifiedBackup(backup,{...who,identity:'a'},ID),false);
 assert.equal(verifiedBackup(null,who,ID),false);
});
test('database restore migration is scoped and keeps evidence append-only',()=>{
 const sql=readFileSync(new URL('../sql/stage10-recovery.sql',import.meta.url),'utf8');
 for(const term of ['note_recovery_backups','note_restore_audit',
  'AFTER INSERT ON defense.notes','stage10_restore_b_note','stage10_reject_evidence_mutation'])
   assert.ok(sql.includes(term),term);
 assert.match(sql,/judge_identity = 'b'/);
 assert.doesNotMatch(sql,/(?:TRUNCATE|DROP TABLE|DELETE\s+FROM\s+defense\.notes)/iu);
});
test('stage10 submission self-check retains prior protections within 20 cases',async()=>{
 const config=JSON.parse(readFileSync(new URL('../aleph.config.json',import.meta.url),'utf8'));
 assert.ok([10,11].includes(config.step));
 assert.equal(config.restoreRoute,'/api/restore');
 const before=globalThis.fetch;
 const json=(data,status=200)=>new Response(JSON.stringify(data),{
   status,headers:{'Content-Type':'application/json'}});
 try {
  globalThis.fetch=async (url,options={})=>{
   switch(new URL(url).pathname){
    case '/':return new Response('<title>BYTE BACK | 인증된 자료실</title>',{
      status:200,headers:{'X-Content-Type-Options':'nosniff'}});
    case '/api/notes':case '/api/my/notes':case '/api/notices':
      return json({error:'UNAUTHORIZED'},401);
    case '/api/restore':assert.equal(options.method,'POST');return json({error:'UNAUTHORIZED'},401);
    case '/data.json':return json({notes:[]});
    case '/aleph.json':return json({step:config.step,repoUrl:config.repoUrl,
      commit:'a'.repeat(40),allowedRoutes:config.allowedRoutes,
      originalApiUrl:config.originalApiUrl});
    case '/api/auth-config':return json({url:'https://fixture.example',publishableKey:'fixture-public'});
    default:throw new Error('Unexpected URL: '+url);
   }
  };
  const checks=await runAttackChecks(config);
  assert.equal(checks.length,20);
  for(const id of ['stage9_burst_revocation_proposed','stage9_normal_requests_preserved',
    'stage10_verified_policy_snapshot','stage10_unauthorized_restore_rejected']){
   const check=checks.find(x=>x.attackId===id);
   assert.ok(check?.observed.startsWith('통과:'),id);
  }
  assert.ok(checks.every(x=>x.observed.startsWith('통과:')));
 }finally{globalThis.fetch=before;}
});
test('restore route: only signed B can restore its own one row',async()=>{
 const source=readFileSync(new URL('../api/restore.js',import.meta.url),'utf8')
  .replace(/^import[^\n]+\n/gmu,'')
  .replace('export default async function handler','async function handler');
 const identity={kind:'judge',identity:'b',userId:OWNER,ownerId:OWNER,runId:RUN};
 const backup={note_id:ID,owner_id:OWNER,judge_run_id:RUN,judge_identity:'b',
   title:'clean',content:'clean note',
   content_sha256:createHash('sha256').update('clean note').digest('hex'),
   sealed_backup_sha256:noteContentHash('clean','clean note'),
   captured_at:'2026-10-13T05:00:00Z',verified_at:'2026-10-13T05:00:00Z'};
 let current={id:ID,owner_id:OWNER,judge_run_id:RUN,judge_identity:'b',
   title:'tampered',content:'tampered'};
 const untouched={id:'22222222-2222-4222-8222-222222222222',content:'untouched'};
 const audit=[];
 const db={schema(schema){
  assert.equal(schema,'defense');
  return {
   from(table){const clauses=[];
    const q={select(){return q;},eq(k,v){clauses.push([k,v]);return q;},
     async insert(){return {error:null};},
     async maybeSingle(){
      const r=table==='note_recovery_backups'?backup:current;
      return {data:r&&clauses.every(([k,v])=>r[k]===v)?r:null,error:null};
     }};
    return q;
   },
   async rpc(name,values){
    assert.equal(name,'stage10_restore_b_note');
    assert.equal(values.p_note_id,ID);
    assert.equal(values.p_owner_id,OWNER);
    assert.equal(values.p_run_id,RUN);
    current={...current,title:backup.title,content:backup.content};
    audit.push('repaired');
    return {data:{id:ID,owner_id:OWNER,content_sha256:createHash('sha256').update(backup.content).digest('hex'),
      operation:'repaired'},error:null};
   }
  };
 }};
 const factory=new Function('createClient','createLoginVerifier','getNoteScope',
  'equalHash','noteContentHash','verifiedBackup','verifyRecoveryPreflight','runPostRestoreChecks','bodySha256','config','process',source+'\nreturn handler;');
 const h=factory(()=>db,()=>async header=>{
  if(header==='Bearer B')return identity;
  if(header==='Bearer A')return {...identity,identity:'a'};
  return null;
 },()=>({owner_id:OWNER,judge_run_id:RUN,judge_identity:'b'}),
 equalHash,noteContentHash,verifiedBackup,
 ()=>({verified:true,version:'stage9-d1004397',baseCommit:STAGE9_SAFE_COMMIT,changedFields:[]}),
 async()=>({checks:[{testId:'stage10_owner_get_after_restore',outcome:'pass'},
 {testId:'stage10_anonymous_get_after_restore',outcome:'pass'}],allExecutedPassed:true,unexecuted:[]}),
 body=>createHash('sha256').update(body,'utf8').digest('hex'),{},{
  env:{SUPABASE_URL:'https://mock.invalid',SUPABASE_SECRET_KEY:'test-only-secret'}});
 async function request(header,id=ID,extra={dryRun:false,ownerId:OWNER,contentSha256:createHash('sha256').update(backup.content).digest('hex')}){
  return new Promise((resolve,reject)=>{
   const req={method:'POST',url:'/api/restore',headers:{authorization:header},body:{id,...extra}};
   const res={setHeader(){},status(status){this.code=status;return this;},
    json(body){resolve({status:this.code,body});}};
   Promise.resolve(h(req,res)).catch(reject);
  });
 }
 assert.equal((await request(null)).status,401);
 assert.equal((await request('Bearer A')).status,403);
 assert.equal((await request('Bearer B','33333333-3333-4333-8333-333333333333')).status,404);
 assert.equal(audit.length,0);
 const preview=await request('Bearer B',ID,{dryRun:true});
 assert.equal(preview.status,200);
 assert.equal(preview.body.applied,false);
 assert.equal(preview.body.changes.content,true);
 assert.equal(audit.length,0);
 const mismatch=await request('Bearer B',ID,{...preview.body.confirm,contentSha256:'0'.repeat(64)});
 assert.equal(mismatch.status,409);
 assert.equal(audit.length,0);
 const restored=await request('Bearer B',ID,preview.body.confirm);
 assert.equal(restored.status,200);
 assert.ok(equalHash(restored.body.sealed_backup_sha256,backup.sealed_backup_sha256));
 assert.equal(restored.body.content_sha256,
   createHash('sha256').update(backup.content).digest('hex'));
 assert.equal(current.content,backup.content);
 assert.equal(untouched.content,'untouched');
 assert.equal(audit.length,1);
 const judgeSinglePost=await request('Bearer B',ID,{});
 assert.equal(judgeSinglePost.status,200);
 assert.equal(judgeSinglePost.body.restored,true);
 assert.equal(audit.length,2);
});


test('policy is reread immediately before writing and changed snapshot is rejected', () => {
 const first=loadVerifiedPolicy();
 let reads=0;
 assert.deepEqual(reloadVerifiedPolicy(first,()=>{reads++;return loadVerifiedPolicy();}),first);
 assert.equal(reads,1);
 assert.throws(()=>reloadVerifiedPolicy(first,()=>({...first,version:'changed'})),/CHANGED_BEFORE_WRITE/);
 assert.throws(()=>reloadVerifiedPolicy(first,()=>{throw Error('missing')}),/missing/);
 const current={services:{notes:{...first.services.notes,injectedAllow:true}}};
 assert.ok(policyDiff(current,first).some(x=>x.field==='services.notes.injectedAllow'));
});
