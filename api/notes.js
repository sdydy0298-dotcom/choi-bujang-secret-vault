import { createClient } from '@supabase/supabase-js';
import config from '../aleph.config.json' with { type: 'json' };
import { createLoginVerifier } from '../src/verify-login.mjs';

const JSON_HEADERS = {
  'Cache-Control': 'no-store, max-age=0',
  'Content-Type': 'application/json; charset=utf-8',
  'X-Content-Type-Options': 'nosniff',
};

let verifyLogin;

function sendJson(response, status, body) {
  for (const [name, value] of Object.entries(JSON_HEADERS)) {
    response.setHeader(name, value);
  }
  response.status(status).json(body);
}

function unauthorized(response) {
  response.setHeader('WWW-Authenticate', 'Bearer');
  return sendJson(response, 401, { error: 'UNAUTHORIZED' });
}

export default async function handler(request, response) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return sendJson(response, 405, { error: 'METHOD_NOT_ALLOWED' });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;
  if (!supabaseUrl || !supabaseSecretKey) {
    return sendJson(response, 503, { error: 'DATA_SOURCE_NOT_CONFIGURED' });
  }

  try {
    verifyLogin ??= createLoginVerifier({ config, supabaseSecretKey });
  } catch {
    return sendJson(response, 503, { error: 'LOGIN_VERIFIER_NOT_CONFIGURED' });
  }

  const authorization = typeof request.headers.authorization === 'string'
    ? request.headers.authorization
    : null;
  const identity = await verifyLogin(authorization);
  if (!identity) {
    return unauthorized(response);
  }

  const supabase = createClient(supabaseUrl, supabaseSecretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });

  const { data, error } = await supabase
    .schema('defense')
    .from('notes')
    .select('title, content')
    .order('id', { ascending: true });

  if (error) {
    return sendJson(response, 502, { error: 'DATA_SOURCE_UNAVAILABLE' });
  }

  return sendJson(response, 200, { notes: data ?? [] });
}
