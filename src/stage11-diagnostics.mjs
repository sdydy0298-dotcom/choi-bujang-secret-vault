import { createClient } from '@supabase/supabase-js';

// Diagnostic-only allowlists. Never accept log contents, Authorization,
// addresses, user IDs, note IDs, key material, or arbitrary URL strings.
const BROWSER = new Set([
  'html_loaded','module_started','auth_config_loaded','auth_config_failed',
  'auth_ready','login_attempt','login_succeeded','login_failed',
  'device_keygen_started','device_keygen_failed','device_request_started',
  'device_request_succeeded','device_request_failed','device_status_requested',
  'device_approved','device_pending','device_status_failed',
  'notes_request_started','notes_request_succeeded','notes_request_failed'
]);
const SERVER = new Set([
  'auth_config_enter','auth_config_served','auth_config_unavailable',
  'device_enter','device_auth_rejected','device_identity_verified',
  'device_pending_created','device_status_served','device_error',
  'notes_enter','notes_auth_rejected','notes_identity_verified',
  'notes_device_rejected','notes_device_verified'
]);
const ROUTES = new Set(['page','auth_config','device','notes']);
const TRACE_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;
let connection;

export function traceActor(identity) {
  if (identity?.kind === 'student') return 'student';
  if (identity?.kind === 'judge' && identity.identity === 'a') return 'judge_a';
  if (identity?.kind === 'judge' && identity.identity === 'b') return 'judge_b';
  return 'anonymous';
}
export function allowedBrowserEvent(event) {
  return typeof event === 'string' && BROWSER.has(event);
}

// Best-effort observability MUST NEVER gate authentication or a data request.
// The 900ms ceiling is solely to prevent diagnostics slowing the judge.
export async function recordStage11(event, {
  source='server', route, actor='unknown', traceId=null, statusCode=null
} = {}) {
  if (!(source === 'browser' ? BROWSER : source === 'server' ? SERVER : null)?.has(event)
    || !ROUTES.has(route) || !['unknown','anonymous','student','judge_a','judge_b'].includes(actor)
    || (traceId !== null && (typeof traceId !== 'string' || !TRACE_ID.test(traceId)))
    || (statusCode !== null && (!Number.isInteger(statusCode)
      || statusCode < 100 || statusCode > 599))) return false;
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SECRET_KEY) return false;
  try {
    connection ??= createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SECRET_KEY,{
      auth:{autoRefreshToken:false,persistSession:false,detectSessionInUrl:false}
    });
    const write=connection.schema('defense').from('stage11_diagnostic_events').insert({
      event,source,route,actor,trace_id:traceId,status_code:statusCode
    });
    let timer;
    const done=await Promise.race([
      write.then(({error})=>!error).catch(()=>false),
      new Promise(resolve=>{ timer=setTimeout(()=>resolve(false),900); })
    ]);
    clearTimeout(timer);
    return done;
  } catch {
    return false;
  }
}
