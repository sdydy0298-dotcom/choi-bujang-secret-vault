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
  const checks=[];
  try {
    const response=await fetcher(path,{
      method:'GET', redirect:'error', cache:'no-store',
      headers:{ Authorization:'Bearer '+token },
      signal:AbortSignal.timeout(6000)
    });
    if (response.status===200) {
      const note=await response.json();
      const matchesId=note?.id===noteId;
      const matchesHash=typeof note?.body==='string' &&
        bodySha256(note.body)===expectedBodySha256;
      checks.push(outcome('stage10_owner_get_after_restore',200,200,
        matchesId && matchesHash,{ idMatches:matchesId, bodyHashMatches:matchesHash }));
    } else {
      checks.push(outcome('stage10_owner_get_after_restore',200,response.status,false));
    }
  } catch {
    checks.push(outcome('stage10_owner_get_after_restore',200,null,false,
      { error:'request_unavailable' }));
  }
  try {
    const response=await fetcher(path,{
      method:'GET',redirect:'error',cache:'no-store',headers:{},
      signal:AbortSignal.timeout(6000)
    });
    checks.push(outcome('stage10_anonymous_get_after_restore',401,
      response.status,response.status===401));
  } catch {
    checks.push(outcome('stage10_anonymous_get_after_restore',401,null,false,
      { error:'request_unavailable' }));
  }
  checks.push({testId:'stage10_other_owner_signed_get_after_restore',
    outcome:'not_run',reason:'Independent A signed JWT is not provided to this B-only restore endpoint'});
  return {
    checkedAt:new Date().toISOString(),
    checks,
    allExecutedPassed:checks.filter(x=>x.outcome!=='not_run').every(x=>x.outcome==='pass'),
    unexecuted:checks.filter(x=>x.outcome==='not_run').map(x=>x.testId)
  };
}
