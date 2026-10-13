import {createClient} from '@supabase/supabase-js';
import config from '../aleph.config.json' with {type:'json'};
import {createLoginVerifier} from './verify-login.mjs';
import {isVerifiedInstructor} from './resource-zones.mjs';
let verifyLogin;
export function sendJson(res,status,body){for(const [k,v] of Object.entries({'Cache-Control':'no-store, max-age=0','Content-Type':'application/json; charset=utf-8','X-Content-Type-Options':'nosniff'}))res.setHeader(k,v);if(status===401)res.setHeader('WWW-Authenticate','Bearer');return res.status(status).json(body)}
export function parseBody(req){if(req.body&&typeof req.body==='object'&&!Array.isArray(req.body))return req.body;if(typeof req.body==='string'){try{return JSON.parse(req.body)}catch{}}return null}
export async function noticeContext(req){const url=process.env.SUPABASE_URL,secret=process.env.SUPABASE_SECRET_KEY;if(!url||!secret)return{status:503,error:'DATA_SOURCE_NOT_CONFIGURED'};let identity;try{verifyLogin??=createLoginVerifier({config,supabaseSecretKey:secret});identity=await verifyLogin(typeof req.headers?.authorization==='string'?req.headers.authorization:null)}catch{return{status:503,error:'LOGIN_VERIFIER_NOT_CONFIGURED'}}if(!identity)return{status:401,error:'UNAUTHORIZED'};const db=createClient(url,secret,{auth:{autoRefreshToken:false,persistSession:false,detectSessionInUrl:false}});return{identity,db}}
export async function requireInstructor(ctx){if(ctx.identity?.kind!=='student')return{allowed:false,status:403};try{const{data,error}=await ctx.db.auth.admin.getUserById(ctx.identity.userId);if(error)return{allowed:false,status:503};return{allowed:isVerifiedInstructor(ctx.identity,data?.user),status:403}}catch{return{allowed:false,status:503}}}
