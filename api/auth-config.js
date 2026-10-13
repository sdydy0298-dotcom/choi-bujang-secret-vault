import { recordStage11 } from '../src/stage11-diagnostics.mjs';

const JSON_HEADERS = {
  'Cache-Control': 'no-store, max-age=0',
  'Content-Type': 'application/json; charset=utf-8',
  'X-Content-Type-Options': 'nosniff',
};
const BROWSER_MARKERS=new Set([
  'html_loaded','module_started','auth_config_loaded','auth_config_failed',
  'auth_ready','login_attempt','login_succeeded','login_failed',
  'device_keygen_started','device_keygen_failed','device_request_started',
  'device_request_succeeded','device_request_failed','device_status_requested',
  'device_approved','device_pending','device_status_failed',
  'notes_request_started','notes_request_succeeded','notes_request_failed'
]);
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;

export default async function handler(request, response) {
  for (const [name, value] of Object.entries(JSON_HEADERS)) response.setHeader(name, value);

  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return response.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
  }
  let requested;
  try {requested=new URL(request.url??'/api/auth-config','https://resource.invalid')}
  catch {return response.status(400).json({error:'INVALID_DIAGNOSTIC_QUERY'})}
  const params=[...requested.searchParams.entries()];
  if(params.length) {
    const names=params.map(([key])=>key).sort().join(',');
    const marker=requested.searchParams.get('stage11');
    const traceId=requested.searchParams.get('traceId');
    if(names!=='stage11,traceId'||!BROWSER_MARKERS.has(marker)||!UUID.test(traceId??''))
      return response.status(400).json({error:'INVALID_DIAGNOSTIC_QUERY'});
    // Event names are fixed; traceId is a newly generated per-page random UUID.
    // These client-side markers do NOT prove a judge identity.
    await recordStage11(marker,{source:'browser',route:'page',traceId});
  } else {
    await recordStage11('auth_config_enter',{route:'auth_config'});
  }

  const url = process.env.SUPABASE_URL;
  const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !publishableKey) {
    await recordStage11('auth_config_unavailable',{route:'auth_config',statusCode:503});
    return response.status(503).json({ error: 'AUTH_CONFIG_NOT_CONFIGURED' });
  }
  if(!params.length)
    await recordStage11('auth_config_served',{route:'auth_config',statusCode:200});
  return response.status(200).json({ url, publishableKey });
}
