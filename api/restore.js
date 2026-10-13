import { createClient } from '@supabase/supabase-js';
import config from '../aleph.config.json' with { type: 'json' };
import { createLoginVerifier } from '../src/verify-login.mjs';
import { getNoteScope } from '../src/note-scope.mjs';
import { equalHash, noteContentHash, verifiedBackup } from '../src/stage10-recovery.mjs';
import { verifyRecoveryPreflight } from '../src/stage10-preflight.mjs';
import { bodySha256, runPostRestoreChecks } from '../src/stage10-retest.mjs';

// Stage 10. Restore exactly one judge-B note; never accept caller-supplied owner,
// role, run ID, note contents or token in the request body.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const HEADERS = {
  'Cache-Control': 'no-store, max-age=0',
  'Content-Type': 'application/json; charset=utf-8',
  'X-Content-Type-Options': 'nosniff',
};
let verify;
function reply(res, status, data) {
  for (const [k, v] of Object.entries(HEADERS)) res.setHeader(k,v);
  return res.status(status).json(data);
}
function targetId(req) {
  let url;
  try { url = new URL(req.url ?? '/api/restore', 'https://resource.invalid'); }
  catch { return null; }
  if (url.pathname !== '/api/restore' || url.search || url.hash) return null;
  let body=req.body;
  if (typeof body === 'string') { try { body=JSON.parse(body); } catch {return null;} }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null;
  const keys=Object.keys(body);
  if (keys.length !== 1 || !['id','noteId'].includes(keys[0])) return null;
  const id=body[keys[0]];
  return typeof id === 'string' && UUID.test(id) ? id.toLowerCase() : null;
}
export default async function handler(req,res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow','POST');
    return reply(res,405,{error:'METHOD_NOT_ALLOWED'});
  }
  const secret=process.env.SUPABASE_SECRET_KEY;
  const url=process.env.SUPABASE_URL;
  if (!secret || !url) return reply(res,503,{error:'RECOVERY_NOT_CONFIGURED'});
  const authorization = typeof req.headers?.authorization === 'string' ? req.headers.authorization : null;
  let identity;
  try {
    verify ??= createLoginVerifier({config,supabaseSecretKey:secret});
    identity = await verify(authorization);
  } catch {
    return reply(res,503,{error:'LOGIN_VERIFIER_UNAVAILABLE'});
  }
  if (!identity) {
    res.setHeader('WWW-Authenticate','Bearer');
    return reply(res,401,{error:'UNAUTHORIZED'});
  }
  if (identity.kind !== 'judge' || identity.identity !== 'b')
    return reply(res,403,{error:'RECOVERY_SCOPE_FORBIDDEN'});
  const scope=getNoteScope(identity);
  if (!scope || scope.judge_identity !== 'b' || !scope.judge_run_id)
    return reply(res,403,{error:'RECOVERY_SCOPE_FORBIDDEN'});
  const id=targetId(req);
  if (!id) return reply(res,400,{error:'INVALID_RECOVERY_TARGET'});

  // A sealed baseline is not trustworthy until re-read and checked in the
  // *real* restore request. Fail closed BEFORE modifying anything in DB.
  let preflight;
  try { preflight=verifyRecoveryPreflight(config); }
  catch (error) {
    return reply(res,409,{error:'POLICY_BACKUP_UNVERIFIED',
      differingFields:Array.isArray(error.fields) ? error.fields : []});
  }

  const db=createClient(url,secret,{
    auth:{autoRefreshToken:false,persistSession:false,detectSessionInUrl:false},
  });
  const lookupBackup=()=>db.schema('defense').from('note_recovery_backups')
    .select('note_id,owner_id,judge_run_id,judge_identity,title,content,content_sha256,sealed_backup_sha256,captured_at,verified_at')
    .eq('note_id',id).eq('owner_id',scope.owner_id)
    .eq('judge_run_id',scope.judge_run_id).eq('judge_identity','b').maybeSingle();
  const {data:backup,error:readError}=await lookupBackup();
  if (readError) return reply(res,502,{error:'RECOVERY_DATA_UNAVAILABLE'});
  if (!backup) return reply(res,404,{error:'VERIFIED_BACKUP_NOT_FOUND'});
  const signedB={...identity,ownerId:scope.owner_id};
  if (!verifiedBackup(backup,signedB,id))
    return reply(res,409,{error:'BACKUP_INTEGRITY_FAILED'});
  const {data:reloaded,error:backupRereadError}=await lookupBackup();
  if (backupRereadError || !reloaded || !verifiedBackup(reloaded,signedB,id) ||
      !equalHash(reloaded.content_sha256,backup.content_sha256) ||
      (backup.sealed_backup_sha256 && !equalHash(reloaded.sealed_backup_sha256,backup.sealed_backup_sha256)) ||
      reloaded.title!==backup.title || reloaded.content!==backup.content)
    return reply(res,409,{error:'BACKUP_RECHECK_FAILED'});

  // All-or-nothing stored procedure validates immutable backup, bound owner
  // and run again, then restores one row and appends an audit event.
  const {data:outcome,error:restoreError}=await db.schema('defense')
    .rpc('stage10_restore_b_note',{
      p_note_id:id,p_owner_id:scope.owner_id,p_run_id:scope.judge_run_id
    });
  if (restoreError || !outcome || outcome.id !== id ||
      outcome.owner_id !== scope.owner_id ||
      !equalHash(outcome.content_sha256,bodySha256(backup.content)))
    return reply(res,409,{error:'RECOVERY_REJECTED'});

  const {data:current,error:verifyError}=await db.schema('defense').from('notes')
    .select('id,owner_id,judge_run_id,judge_identity,title,content')
    .eq('id',id).eq('owner_id',scope.owner_id)
    .eq('judge_run_id',scope.judge_run_id).eq('judge_identity','b')
    .maybeSingle();
  const restoredBodyHash=bodySha256(backup.content);
  if (verifyError || !current || current.id!==id ||
      current.owner_id!==scope.owner_id ||
      current.judge_run_id!==scope.judge_run_id ||
      current.judge_identity!=='b' ||
      !equalHash(noteContentHash(current.title,current.content),backup.sealed_backup_sha256 ?? backup.content_sha256) ||
      !equalHash(bodySha256(current.content),restoredBodyHash))
    return reply(res,502,{error:'POST_RESTORE_VERIFICATION_FAILED'});

  // Real post-restore requests, never synthetic success labels.
  // Only status/ID-match/hash-match are recorded; no JWT or note contents.
  const report=await runPostRestoreChecks({
    origin:config.publicAppUrl, token:authorization.slice(7),
    noteId:id, expectedBodySha256:restoredBodyHash
  });
  const {error:auditError}=await db.schema('defense').from('note_restore_retests')
    .insert({note_id:id, owner_id:scope.owner_id, judge_run_id:scope.judge_run_id,
      policy_version:preflight.version, checks:report.checks});
  // Never report a verified recovery when required live retests failed or
  // their append-only evidence was not persisted.
  if (auditError || !report.allExecutedPassed || !report.checks?.some(c => c.testId === 'stage10_owner_get_after_restore' && c.outcome === 'pass') ||
      !report.checks?.some(c => c.testId === 'stage10_anonymous_get_after_restore' && c.outcome === 'pass'))
    return reply(res,502,{error:'POST_RESTORE_RETEST_INCOMPLETE',
      checks:report.checks, persisted:!auditError});

  return reply(res,200,{restored:true,id,owner_id:scope.owner_id,
    content_sha256:restoredBodyHash,
    sealed_backup_sha256:backup.sealed_backup_sha256 ?? backup.content_sha256,
    operation:outcome.operation,
    backupVerification:{
      verified:true, policyVersion:preflight.version,
      baselineCommit:preflight.baseCommit, changedFields:preflight.changedFields
    },
    postRestoreRetests:{
      checks:report.checks,
      allExecutedPassed:report.allExecutedPassed,
      unexecuted:report.unexecuted,
      persisted:!auditError
    }
  });
}
