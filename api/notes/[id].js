import { createClient } from '@supabase/supabase-js';
import config from '../../aleph.config.json' with { type: 'json' };
import { createLoginVerifier } from '../../src/verify-login.mjs';

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
  if (!['GET', 'PUT', 'DELETE'].includes(request.method)) {
    response.setHeader('Allow', 'GET, PUT, DELETE');
    return sendJson(response, 405, { error: 'METHOD_NOT_ALLOWED' });
  }

  const id = Array.isArray(request.query.id) ? request.query.id[0] : request.query.id;
  if (typeof id !== 'string' || !UUID.test(id)) {
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
  if (!identity) return unauthorized(response);

  const supabase = serverClient(supabaseUrl, supabaseSecretKey);

  if (request.method === 'GET') {
    const { data, error } = await supabase
      .schema('defense')
      .from('notes')
      .select('id, title, content')
      .eq('id', id)
      .eq('owner_id', identity.userId)
      .maybeSingle();

    if (error) return sendJson(response, 502, { error: 'DATA_SOURCE_UNAVAILABLE' });
    if (!data) return sendJson(response, 404, { error: 'NOTE_NOT_FOUND' });

    return sendJson(response, 200, { id: data.id, title: data.title, body: data.content });
  }

  if (request.method === 'PUT') {
    const body = requestBody(request);
    if (!body || Object.prototype.hasOwnProperty.call(body, 'owner_id')
        || typeof body.title !== 'string' || typeof body.body !== 'string'
        || !body.title.trim() || body.title.length > 200 || body.body.length > 5000) {
      return sendJson(response, 400, { error: 'INVALID_NOTE' });
    }

    const { data, error } = await supabase
      .schema('defense')
      .from('notes')
      .update({ title: body.title.trim(), content: body.body })
      .eq('id', id)
      .eq('owner_id', identity.userId)
      .select('id')
      .maybeSingle();

    if (error) return sendJson(response, 502, { error: 'DATA_SOURCE_UNAVAILABLE' });
    if (!data) return sendJson(response, 404, { error: 'NOTE_NOT_FOUND' });

    return sendJson(response, 200, { id });
  }

  const { data, error } = await supabase
    .schema('defense')
    .from('notes')
    .delete()
    .eq('id', id)
    .eq('owner_id', identity.userId)
    .select('id')
    .maybeSingle();

  if (error) return sendJson(response, 502, { error: 'DATA_SOURCE_UNAVAILABLE' });
  if (!data) return sendJson(response, 404, { error: 'NOTE_NOT_FOUND' });

  return sendJson(response, 200, { id });
}
