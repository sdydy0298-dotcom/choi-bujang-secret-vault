import { requireApprovedDevice } from '../../src/device-approval.mjs';
import { recordStage11, traceActor } from '../../src/stage11-diagnostics.mjs';
import { createClient } from '@supabase/supabase-js';
import config from '../../aleph.config.json' with { type: 'json' };
import { resourceId, idFromPath } from '../../src/resource-zones.mjs';
import { traceStage8Access } from '../../src/stage8-access-trace.mjs';
import { createLoginVerifier } from '../../src/verify-login.mjs';
import { getNoteScope, scopedNoteQuery, noteOwnerMatches } from '../../src/note-scope.mjs';

const JSON_HEADERS = {
  'Cache-Control': 'no-store, max-age=0',
  'Content-Type': 'application/json; charset=utf-8',
  'X-Content-Type-Options': 'nosniff',
};
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

// Stage 4 ownership: detail operations require both note id and verified identity.userId.
let verifyLogin;

function sendJson(response, status, body) {
  for (const [name, value] of Object.entries(JSON_HEADERS)) response.setHeader(name, value);
  response.status(status).json(body);
}

function unauthorized(response) {
  response.setHeader('WWW-Authenticate', 'Bearer');
  return sendJson(response, 401, { error: 'UNAUTHORIZED' });
}

function requestBody(request) {
  if (request.body && typeof request.body === 'object') return request.body;
  if (typeof request.body === 'string') {
    try { return JSON.parse(request.body); } catch { return null; }
  }
  return null;
}

function serverClient(url, secret) {
  return createClient(url, secret, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
}

async function verifiedIdentity(request, secret) {
  verifyLogin ??= createLoginVerifier({ config, supabaseSecretKey: secret });
  const authorization = typeof request.headers.authorization === 'string'
    ? request.headers.authorization : null;
  return verifyLogin(authorization);
}

export default async function handler(request, response) {
  await recordStage11('notes_enter',{route:'notes'});
  if (!['GET', 'PUT', 'DELETE'].includes(request.method)) {
    response.setHeader('Allow', 'GET, PUT, DELETE');
    return sendJson(response, 405, { error: 'METHOD_NOT_ALLOWED' });
  }

  // Reject query-selected resources, unknown paths and extra trailing segments.
  const id = idFromPath(request, 'notes');
  if (!id) {
    return sendJson(response, 400, { error: 'INVALID_NOTE_ID' });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;
  if (!supabaseUrl || !supabaseSecretKey) {
    return sendJson(response, 503, { error: 'DATA_SOURCE_NOT_CONFIGURED' });
  }

  let identity;
  try {
    identity = await verifiedIdentity(request, supabaseSecretKey);
  } catch {
    return sendJson(response, 503, { error: 'LOGIN_VERIFIER_NOT_CONFIGURED' });
  }
  if (!identity) {
    await recordStage11('notes_auth_rejected',{route:'notes',actor:'anonymous',statusCode:401});
    return unauthorized(response);
  }
  const actor=traceActor(identity);
  await recordStage11('notes_identity_verified',{route:'notes',actor});
  if (!getNoteScope(identity)) return sendJson(response, 403, { error: 'NOTE_SCOPE_NOT_ALLOWED' });

  const supabase = serverClient(supabaseUrl, supabaseSecretKey);
  const device = await requireApprovedDevice(request, identity, supabase);
  if (!device.ok) {
    await recordStage11('notes_device_rejected',{route:'notes',actor,statusCode:device.status});
    return sendJson(response, device.status, { error: device.error });
  }
  await recordStage11('notes_device_verified',{route:'notes',actor,statusCode:200});

  if (request.method === 'GET') {
    const { data, error } = await scopedNoteQuery(supabase
      .schema('defense')
      .from('notes')
      .select('id, title, content, owner_id, judge_run_id, judge_identity')
      .eq('id', id), identity)
      .maybeSingle();

    if (error) {
      traceStage8Access(identity, 'note_item_get', 502);
      return sendJson(response, 502, { error: 'DATA_SOURCE_UNAVAILABLE' });
    }
    if (!data || !noteOwnerMatches(data, identity)) {
      traceStage8Access(identity, 'note_item_get', 404);
      return sendJson(response, 404, { error: 'NOTE_NOT_FOUND' });
    }

    traceStage8Access(identity, 'note_item_get', 200);
    return sendJson(response, 200, { id: data.id, resourceId: resourceId('note', data.id), title: data.title, body: data.content });
  }

  if (request.method === 'PUT') {
    const body = requestBody(request);
    if (!body || Object.prototype.hasOwnProperty.call(body, 'owner_id')
        || Object.prototype.hasOwnProperty.call(body, 'judge_run_id')
        || Object.prototype.hasOwnProperty.call(body, 'judge_identity')
        || typeof body.title !== 'string' || typeof body.body !== 'string'
        || !body.title.trim() || body.title.length > 200 || body.body.length > 5000) {
      return sendJson(response, 400, { error: 'INVALID_NOTE' });
    }

    const { data, error } = await scopedNoteQuery(supabase
      .schema('defense')
      .from('notes')
      .update({ title: body.title.trim(), content: body.body })
      .eq('id', id), identity)
      .select('id')
      .maybeSingle();

    if (error) return sendJson(response, 502, { error: 'DATA_SOURCE_UNAVAILABLE' });
    if (!data) return sendJson(response, 404, { error: 'NOTE_NOT_FOUND' });

    return sendJson(response, 200, { id, resourceId: resourceId('note', id) });
  }

  const { data, error } = await scopedNoteQuery(supabase
    .schema('defense')
    .from('notes')
    .delete()
    .eq('id', id), identity)
    .select('id')
    .maybeSingle();

  if (error) return sendJson(response, 502, { error: 'DATA_SOURCE_UNAVAILABLE' });
  if (!data) return sendJson(response, 404, { error: 'NOTE_NOT_FOUND' });

  return sendJson(response, 200, { id, resourceId: resourceId('note', id) });
}
