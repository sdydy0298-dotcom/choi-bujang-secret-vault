import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { verifyRecoveryPreflight } from '../src/stage10-preflight.mjs';
import { bodySha256, runPostRestoreChecks } from '../src/stage10-retest.mjs';

const config=JSON.parse(readFileSync(new URL('../aleph.config.json',import.meta.url),'utf8'));
const ID='11111111-1111-4111-8111-111111111111';
const baseline=JSON.parse(readFileSync(new URL('../recovery/stage9-safe-policy.json',import.meta.url),'utf8'));
test('checks sealed policy twice on each restore request',()=>{
 let called=0;
 const accepted=verifyRecoveryPreflight(config,()=>{called++;return structuredClone(baseline)});
 assert.equal(called,2);
 assert.equal(accepted.verified,true);
 assert.equal(accepted.changedFields.length,0);
 assert.equal(accepted.baseCommit,baseline.baseCommit);
});
test('rejects unexpected global list route before any restore',()=>{
 const invalid=structuredClone(config);
 invalid.allowedRoutes.push('GET /api/notes');
 assert.throws(()=>verifyRecoveryPreflight(invalid),
   /CURRENT_POLICY_DIFFERS_FROM_VERIFIED_BACKUP/);
});
test('rejects missing, modified or nonmatching versions before restore',()=>{
 assert.throws(()=>verifyRecoveryPreflight(config,()=>{throw Error('missing backup')}),
   /missing backup/);
 let calls=0;
 assert.throws(()=>verifyRecoveryPreflight(config,()=>{
   calls++;
   const copy=structuredClone(baseline);
   if(calls===2)copy.version='tampered';
   return copy;
 }),/BACKUP_VERIFICATION_FAILED/);
});
test('body SHA-256 is not the combined title-and-body seal',()=>{
 assert.equal(bodySha256('hello'),
   '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824');
 const combined=createHash('sha256').update('title\n--ALEPH-STAGE10--\nhello').digest('hex');
 assert.notEqual(bodySha256('hello'),combined);
});
test('retests signed owner GET, forbidden anonymous GET and labels A not_run',async()=>{
 const calls=[];
 const report=await runPostRestoreChecks({
   origin:'https://secret-vault-sdydy0298.vercel.app',
   noteId:ID,token:'fixture-never-log',
   expectedBodySha256:bodySha256('before compromise'),
   fetcher:async(_url,options)=>{
     calls.push({method:options.method,signed:Boolean(options.headers.Authorization)});
     if(options.headers.Authorization)return new Response(
       JSON.stringify({id:ID,body:'before compromise'}),{status:200});
     return new Response(JSON.stringify({error:'UNAUTHORIZED'}),{status:401});
   }
 });
 assert.equal(calls.length,7);
 assert.deepEqual(calls.map(x=>x.signed),[true,false,true,false,false,true,false]);
 assert.equal(report.checks[0].outcome,'pass');
 assert.equal(report.checks[1].outcome,'pass');
 assert.equal(report.checks[2].outcome,'pass');
 assert.equal(report.checks[5].outcome,'pass');
 assert.equal(report.checks[6].outcome,'pass');
 assert.equal(report.checks[7].outcome,'not_run');
 assert.equal(report.allExecutedPassed,true);
 assert.equal(JSON.stringify(report).includes('fixture-never-log'),false);
});
test('post-restore requests run concurrently without fabricated successes',{timeout:2500},async()=>{
 let count=0;
 let releaseFirst;
 const held=new Promise(resolve=>{releaseFirst=resolve});
 const report=await runPostRestoreChecks({
  origin:'https://secret-vault-sdydy0298.vercel.app',
  noteId:ID,token:'fixture-not-a-secret',
  expectedBodySha256:bodySha256('before compromise'),
  fetcher:async (_url,options)=>{
   count++;
   if(count===7)releaseFirst();
   if(count===1)await held;
   if(options.headers.Authorization)
    return new Response(JSON.stringify({id:ID,body:'before compromise'}),{status:200});
   return new Response(JSON.stringify({error:'UNAUTHORIZED'}),{status:401});
  }
 });
 assert.equal(count,7);
 assert.equal(report.allExecutedPassed,true);
 assert.equal(report.checks.filter(x=>x.outcome==='pass').length,7);
 assert.equal(report.unexecuted.length,1);
});

test('unavailable and incorrect HTTP observations cannot be marked PASS',async()=>{
 const failed=await runPostRestoreChecks({
   origin:'https://secret-vault-sdydy0298.vercel.app', noteId:ID,token:'not-a-real-token',
   expectedBodySha256:bodySha256('before compromise'),
   fetcher:async()=>{throw Error('connection unavailable');}
 });
 assert.equal(failed.allExecutedPassed,false);
 assert.equal(failed.checks.filter(x=>x.outcome==='fail').length,7);
 await assert.rejects(()=>runPostRestoreChecks({
   origin:'https://evil.example',noteId:ID,token:'token',
   expectedBodySha256:bodySha256('x')
 }),/INVALID_TRUSTED_RETEST_ORIGIN/);
});
test('retest database migration preserves existing notes/backup and restricts access',()=>{
 const sql=readFileSync(new URL('../sql/stage10-retests.sql',import.meta.url),'utf8');
 for(const fragment of ['note_restore_retests','ROW LEVEL SECURITY','anon, authenticated',
   'stage10_reject_evidence_mutation','GRANT SELECT, INSERT'])
   assert.ok(sql.includes(fragment),fragment);
 assert.doesNotMatch(sql,/(?:TRUNCATE|DROP TABLE|DELETE\s+FROM\s+defense\.notes)/iu);
});
