import { createHash } from 'node:crypto';

export function bodySha256(body) {
  if (typeof body !== 'string') throw new TypeError('INVALID_NOTE_BODY');
  return createHash('sha256').update(body, 'utf8').digest('hex');
}
function outcome(testId, expectedStatus, actualStatus, passed, extras={}) {
  return { testId, expectedStatus, actualStatus,
    outcome: passed ? 'pass' : 'fail', ...extras };
}

// Each recorded 'pass' must correspond to a real HTTP response (never to a
// synthetic fixture). Do not persist JWTs, response note bodies or user data.
export async function runPostRestoreChecks({
  origin, token, noteId, expectedBodySha256, fetcher=fetch
}) {
  const base=new URL(origin);
  if (base.protocol!=='https:' || base.username || base.password || base.search ||
      base.hash || base.pathname!=='/' || !base.hostname.endsWith('.vercel.app'))
    throw new TypeError('INVALID_TRUSTED_RETEST_ORIGIN');
  if (typeof token!=='string' || !token ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu.test(noteId) ||
      !/^[0-9a-f]{64}$/u.test(expectedBodySha256))
    throw new TypeError('INVALID_RETEST_INPUT');
  const path=new URL('/api/notes/'+noteId,base);
  // All reads are independent. Run concurrently so one stalled Function cannot
  // starve the rest of the post-restore checks within a serverless time budget.
  // Promise.all keeps evidence in the declared order, not completion order.
  const probes=[
    {testId:'stage10_owner_get_after_restore',url:path,bearer:true,expected:200,verifyBody:true},
    {testId:'stage10_anonymous_get_after_restore',url:path,bearer:false,expected:401},
    {testId:'stage10_owner_list_after_restore',url:new URL('/api/my/notes',base),bearer:true,expected:200},
    {testId:'stage10_anonymous_list_after_restore',url:new URL('/api/my/notes',base),bearer:false,expected:401},
    {testId:'stage10_anonymous_global_read_blocked',url:new URL('/api/notes',base),bearer:false,expected:401}
  ];
  const checks=await Promise.all(probes.map(async item=>{
    try {
      const response=await fetcher(item.url,{
        method:'GET',redirect:'error',cache:'no-store',
        headers:item.bearer?{Authorization:'Bearer '+token}:{},
        signal:AbortSignal.timeout(6000)
      });
      if(item.verifyBody){
        if(response.status!==200)
          return outcome(item.testId,item.expected,response.status,false);
        let note;
        try { note=await response.json(); }
        catch {
          return outcome(item.testId,item.expected,response.status,false,{error:'invalid_json'});
        }
        const matchesId=note?.id===noteId;
        const matchesHash=typeof note?.body==='string' &&
          bodySha256(note.body)===expectedBodySha256;
        return outcome(item.testId,item.expected,response.status,
          matchesId&&matchesHash,{idMatches:matchesId,bodyHashMatches:matchesHash});
      }
      return outcome(item.testId,item.expected,response.status,response.status===item.expected);
    } catch {
      return outcome(item.testId,item.expected,null,false,{error:'request_unavailable'});
    }
  }));
  checks.push({testId:'stage10_other_owner_signed_get_after_restore',
    outcome:'not_run',reason:'Independent A signed JWT is not available; no fabricated result'});
  return {
    checkedAt:new Date().toISOString(),
    checks,
    allExecutedPassed:checks.filter(x=>x.outcome!=='not_run').every(x=>x.outcome==='pass'),
    unexecuted:checks.filter(x=>x.outcome==='not_run').map(x=>x.testId)
  };
}
