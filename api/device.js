import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import config from '../aleph.config.json' with { type: 'json' };
import { createLoginVerifier } from '../src/verify-login.mjs';
import { getNoteScope } from '../src/note-scope.mjs';
import { validPublicKey } from '../src/device-approval.mjs';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
let verifyLogin;
const respond = (res,status,body) => {
  res.setHeader('Cache-Control','no-store, max-age=0');
  res.setHeader('X-Content-Type-Options','nosniff');
  return res.status(status).json(body);
};

export default async function handler(req,res) {
  if (!['GET','POST'].includes(req.method)) {
    res.setHeader('Allow','GET, POST');
    return respond(res,405,{error:'METHOD_NOT_ALLOWED'});
  }
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SECRET_KEY)
    return respond(res,503,{error:'DEVICE_SERVICE_UNAVAILABLE'});
  let identity;
  try {
    verifyLogin ??= createLoginVerifier({config,supabaseSecretKey:process.env.SUPABASE_SECRET_KEY});
    identity = await verifyLogin(req.headers?.authorization);
  } catch { return respond(res,503,{error:'LOGIN_VERIFIER_UNAVAILABLE'}); }
  if (!identity) return respond(res,401,{error:'UNAUTHORIZED'});
  // Enrollment is a student-only workflow. Signed judge accounts cannot silently
  // approve their own devices or acquire a registration through judge traffic.
  if (identity.kind !== 'student') return respond(res,403,{error:'DEVICE_REGISTRATION_FORBIDDEN'});
  const scope = getNoteScope(identity);
  if (!scope) return respond(res,403,{error:'DEVICE_REGISTRATION_FORBIDDEN'});
  const db = createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SECRET_KEY,{
    auth:{autoRefreshToken:false,persistSession:false,detectSessionInUrl:false}
  });
  const url = new URL(req.url ?? '/api/device','https://invalid.example');
  if (url.pathname !== '/api/device' || url.hash)
    return respond(res,404,{error:'RESOURCE_NOT_FOUND'});
  if (req.method === 'GET') {
    if ([...url.searchParams.keys()].some(key=>key!=='id') ||
        !UUID.test(url.searchParams.get('id') ?? ''))
      return respond(res,400,{error:'INVALID_DEVICE_ID'});
    const {data,error}=await db.schema('defense').from('device_approvals')
      .select('id,status,requested_at,approved_at').eq('id',url.searchParams.get('id'))
      .eq('owner_id',scope.owner_id).maybeSingle();
    if (error) return respond(res,503,{error:'DEVICE_SERVICE_UNAVAILABLE'});
    if (!data) return respond(res,404,{error:'DEVICE_NOT_FOUND'});
    return respond(res,200,{deviceId:data.id,status:data.status,
      requestedAt:data.requested_at,approvedAt:data.approved_at});
  }
  if (url.search) return respond(res,400,{error:'INVALID_DEVICE_REQUEST'});
  let body=req.body;
  if (typeof body==='string') {try {body=JSON.parse(body)}catch{return respond(res,400,{error:'INVALID_DEVICE_REQUEST'})}}
  if (!body || typeof body!=='object' || Array.isArray(body) ||
      Object.keys(body).some(key=>!['label','publicKey'].includes(key)) ||
      typeof body.label!=='string' || !body.label.trim() ||
      body.label.length>60 || !validPublicKey(body.publicKey))
    return respond(res,400,{error:'INVALID_DEVICE_REQUEST'});
  const {count,error:countError}=await db.schema('defense').from('device_approvals')
    .select('id',{count:'exact',head:true}).eq('owner_id',scope.owner_id)
    .in('status',['pending','approved']);
  if (countError) return respond(res,503,{error:'DEVICE_SERVICE_UNAVAILABLE'});
  if ((count??0)>=5) return respond(res,409,{error:'DEVICE_LIMIT_REACHED'});
  const id=randomUUID();
  const {error}=await db.schema('defense').from('device_approvals').insert({
    id,owner_id:scope.owner_id,label:body.label.trim(),
    public_jwk:{kty:'EC',crv:'P-256',x:body.publicKey.x,y:body.publicKey.y},status:'pending'
  });
  if (error) return respond(res,503,{error:'DEVICE_SERVICE_UNAVAILABLE'});
  return respond(res,201,{deviceId:id,status:'pending',
    message:'운영자 확인 대기 중입니다. 요청만으로 자료 접근이 허용되지 않습니다.'});
}
