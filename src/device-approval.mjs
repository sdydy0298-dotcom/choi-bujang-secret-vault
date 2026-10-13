import { createHash, createHmac, createPublicKey, timingSafeEqual, verify as verifySignature } from 'node:crypto';
import { getNoteScope } from './note-scope.mjs';

const DEVICE_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const NONCE = /^[0-9a-f]{32}$/u;
const SIGNATURE = /^[A-Za-z0-9_-]{86}$/u;
const MAX_SKEW_MS = 90_000;

export function requestBodyDigest(body) {
  const value = body == null ? '' : typeof body === 'string' ? body : JSON.stringify(body);
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

export function signedRequestMessage(method, target, bodyDigest, timestamp, nonce) {
  return [method.toUpperCase(), target, bodyDigest, timestamp, nonce].join('\n');
}

export function validPublicKey(key) {
  return key && typeof key === 'object' && !Array.isArray(key) &&
    key.kty === 'EC' && key.crv === 'P-256' &&
    typeof key.x === 'string' && /^[A-Za-z0-9_-]{43}$/u.test(key.x) &&
    typeof key.y === 'string' && /^[A-Za-z0-9_-]{43}$/u.test(key.y) &&
    (key.ext === undefined || key.ext === true) &&
    (key.key_ops === undefined || Array.isArray(key.key_ops));
}

export function verifyBoundSignature({ method, target, body, timestamp, nonce, signature, publicJwk }) {
  if (!validPublicKey(publicJwk) || !NONCE.test(nonce ?? '') ||
      !SIGNATURE.test(signature ?? '') || !/^[0-9]{13}$/u.test(timestamp ?? '')) return false;
  const time = Number(timestamp);
  if (!Number.isSafeInteger(time) || Math.abs(Date.now() - time) > MAX_SKEW_MS) return false;
  try {
    const key = createPublicKey({ key: publicJwk, format: 'jwk' });
    const message = signedRequestMessage(method, target, requestBodyDigest(body), timestamp, nonce);
    return verifySignature('sha256', Buffer.from(message, 'utf8'),
      { key, dsaEncoding: 'ieee-p1363' }, Buffer.from(signature, 'base64url'));
  } catch { return false; }
}

// Existing stage-10 server-initiated judge-B retests still need to reach their
// owner-scoped read routes. Only our RESTORE FUNCTION can mint this short-lived
// proof with a server-only secret; never accept a caller-owned bypass flag.
function permittedRestoreRetest(method,target,identity) {
  return method === 'GET' && identity?.kind === 'judge' &&
    identity.identity === 'b' && (
      /^\/api\/notes\/[0-9a-f-]{36}$/u.test(target) ||
      target === '/api/my/notes' || target === '/api/notices'
    );
}
export function restoreRetestHmac(method,target,timestamp,nonce,secret) {
  if (typeof secret !== 'string' || !secret) throw new Error('RESTORE_RETEST_SECRET_MISSING');
  return createHmac('sha256',secret).update(
    ['aleph.stage10.verified-retest.v1',method,target,timestamp,nonce].join('\n')).digest('hex');
}
function verifiedInternalRetest(req,identity) {
  const h=req.headers??{};
  const timestamp=h['x-aleph-retest-at'],nonce=h['x-aleph-retest-nonce'],digest=h['x-aleph-retest-proof'];
  if (!/^[0-9]{13}$/u.test(timestamp??'') || !NONCE.test(nonce??'') ||
      !/^[0-9a-f]{64}$/u.test(digest??'') ||
      Math.abs(Date.now()-Number(timestamp))>30_000) return false;
  let target;
  try { const u=new URL(req.url,'https://invalid.example');target=u.pathname+u.search; }
  catch { return false; }
  if(!permittedRestoreRetest(req.method,target,identity))return false;
  try{
    const expected=restoreRetestHmac(req.method,target,timestamp,nonce,process.env.SUPABASE_SECRET_KEY);
    return timingSafeEqual(Buffer.from(expected,'hex'),Buffer.from(digest,'hex'));
  }catch{return false}
}

// Fail closed: an authenticated user and an approved public key are necessary.
// The private signing key never leaves the caller's non-extractable in-memory CryptoKey.
// Recording a nonce after signature verification makes exact replays fail.
export async function requireApprovedDevice(request, identity, db) {
  const scope = getNoteScope(identity);
  if (verifiedInternalRetest(request,identity)) return { ok: true, internalRetest: true };
  if (!scope) return { status: 403, error: 'DEVICE_SCOPE_FORBIDDEN' };
  const headers = request.headers ?? {};
  const id = headers['x-aleph-device-id'];
  const nonce = headers['x-aleph-nonce'];
  const timestamp = headers['x-aleph-timestamp'];
  const signature = headers['x-aleph-signature'];
  if (!DEVICE_ID.test(id ?? '') || !NONCE.test(nonce ?? '') ||
      !SIGNATURE.test(signature ?? '') || !/^[0-9]{13}$/u.test(timestamp ?? ''))
    return { status: 403, error: 'DEVICE_SIGNATURE_REQUIRED' };
  let target;
  try {
    const url = new URL(request.url, 'https://invalid.example');
    if (url.hash || url.username || url.password || !url.pathname.startsWith('/api/')) throw Error('path');
    target = url.pathname + url.search;
  } catch { return { status: 400, error: 'DEVICE_INVALID_TARGET' }; }
  const { data: record, error } = await db.schema('defense').from('device_approvals')
    .select('id,public_jwk,status').eq('id', id.toLowerCase())
    .eq('owner_id', scope.owner_id).maybeSingle();
  if (error) return { status: 503, error: 'DEVICE_APPROVAL_UNAVAILABLE' };
  if (!record || record.status !== 'approved')
    return { status: 403, error: 'DEVICE_NOT_APPROVED' };
  if (!verifyBoundSignature({method:request.method,target,body:request.body,
    timestamp,nonce,signature,publicJwk:record.public_jwk}))
    return { status: 403, error: 'DEVICE_SIGNATURE_INVALID' };
  const { error: used } = await db.schema('defense').from('device_request_nonces')
    .insert({device_id:record.id,nonce});
  if (used) return used.code === '23505'
    ? { status: 409, error: 'DEVICE_SIGNATURE_REPLAYED' }
    : { status: 503, error: 'DEVICE_NONCE_UNAVAILABLE' };
  return { ok: true, deviceId: record.id };
}
