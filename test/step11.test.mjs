import assert from 'node:assert/strict';
import { test } from 'node:test';
import { generateKeyPairSync, sign, randomBytes, createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { requireApprovedDevice, requestBodyDigest, signedRequestMessage, verifyBoundSignature } from '../src/device-approval.mjs';
import { getNoteScope } from '../src/note-scope.mjs';

const userId='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const identity={kind:'student',userId};
const deviceId='11111111-1111-4111-8111-111111111111';
const {privateKey,publicKey}=generateKeyPairSync('ec',{namedCurve:'P-256'});
const publicJwk=publicKey.export({format:'jwk'});
const timestamp=()=>String(Date.now());
const nonce=()=>randomBytes(16).toString('hex');
function signedRequest(method,url,body,override={}) {
  const stamp=timestamp(),once=nonce();
  const path=new URL(url,'https://approved.example').pathname+new URL(url,'https://approved.example').search;
  const message=signedRequestMessage(method,path,requestBodyDigest(body),stamp,once);
  const signature=sign('sha256',Buffer.from(message,'utf8'),
    {key:privateKey,dsaEncoding:'ieee-p1363'}).toString('base64url');
  return {method,url,body,headers:{'x-aleph-device-id':deviceId,
    'x-aleph-nonce':once,'x-aleph-timestamp':stamp,'x-aleph-signature':signature,...override}};
}
function fakeDb(status='approved'){
  const seen=new Set();
  return {schema(schema){
    assert.equal(schema,'defense');
    return {from(table){
      if(table==='device_approvals'){
        const fields=[];
        const q={select(){return q},eq(k,v){fields.push([k,v]);return q},
          async maybeSingle(){
            const matches=fields.every(([k,v])=>({id:deviceId,owner_id:userId})[k]===v);
            return {data:matches?{id:deviceId,public_jwk:publicJwk,status}:null,error:null};
          }};
        return q;
      }
      assert.equal(table,'device_request_nonces');
      return {async insert({nonce:used}){
        if(seen.has(used))return {error:{code:'23505'}};
        seen.add(used);return {error:null};
      }};
    }};
  }};
}
test('ECDSA signature binds method, path, query and exact parsed JSON body',()=>{
 const req=signedRequest('PUT','/api/notes/11111111-1111-4111-8111-111111111111',
   {title:'normal',body:'original'});
 const attrs={method:req.method,target:req.url,body:req.body,
   timestamp:req.headers['x-aleph-timestamp'],nonce:req.headers['x-aleph-nonce'],
   signature:req.headers['x-aleph-signature'],publicJwk};
 assert.equal(verifyBoundSignature(attrs),true);
 assert.equal(verifyBoundSignature({...attrs,target:'/api/notes/22222222-2222-4222-8222-222222222222'}),false);
 assert.equal(verifyBoundSignature({...attrs,method:'DELETE'}),false);
 assert.equal(verifyBoundSignature({...attrs,body:{title:'normal',body:'hacked'}}),false);
 assert.equal(verifyBoundSignature({...attrs,target:req.url+'?role=admin'}),false);
 assert.equal(verifyBoundSignature({...attrs,nonce:'0'.repeat(32)}),false);
 assert.equal(verifyBoundSignature({...attrs,timestamp:String(Date.now()-100000)}),false);
});
test('unsigned and unapproved device requests never access protected data',async()=>{
 const unsigned={method:'GET',url:'/api/my/notes',headers:{}};
 assert.deepEqual(await requireApprovedDevice(unsigned,identity,fakeDb()),
   {status:403,error:'DEVICE_SIGNATURE_REQUIRED'});
 const signed=signedRequest('GET','/api/my/notes',null);
 assert.deepEqual(await requireApprovedDevice(signed,identity,fakeDb('pending')),
   {status:403,error:'DEVICE_NOT_APPROVED'});
 assert.deepEqual(await requireApprovedDevice(signed,identity,fakeDb('revoked')),
   {status:403,error:'DEVICE_NOT_APPROVED'});
 const forgedOwner={kind:'student',userId:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'};
 assert.equal((await requireApprovedDevice(signed,forgedOwner,fakeDb())).status,403);
});
test('approved signature works once; changing target or body fails before a replay record',async()=>{
 const db=fakeDb();
 const req=signedRequest('PUT','/api/notes/'+deviceId,{title:'original',body:'before'});
 const tampered={...req,body:{title:'original',body:'after'}};
 assert.equal((await requireApprovedDevice(tampered,identity,db)).error,'DEVICE_SIGNATURE_INVALID');
 const redirected={...req,url:'/api/notes/22222222-2222-4222-8222-222222222222'};
 assert.equal((await requireApprovedDevice(redirected,identity,db)).error,'DEVICE_SIGNATURE_INVALID');
 assert.equal((await requireApprovedDevice(req,identity,db)).ok,true);
 assert.equal((await requireApprovedDevice(req,identity,db)).error,'DEVICE_SIGNATURE_REPLAYED');
});
test('stage 11 UI shows no materials pending approval and persists no JS secrets',()=>{
 const html=readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
 assert.match(html,/import \{ createClient \} from '\/auth-client\.js'/u);
 assert.doesNotMatch(html,/cdn\.jsdelivr\.net/u);
 const authClient=readFileSync(new URL('../public/auth-client.js',import.meta.url),'utf8');
 assert.doesNotMatch(authClient,/\b(?:localStorage|sessionStorage|indexedDB)\s*[.\[]/u);
 assert.match(authClient,/credentials:'omit'/u);
 assert.match(html,/crypto\.subtle\.generateKey/u);
 assert.match(html,/crypto\.subtle\.sign/u);
 assert.match(html,/device-panel/u);
 assert.match(html,/approvedDevice/u);
 assert.match(html,/if \(!currentSession \|\| !approvedDevice\)/u);
 assert.doesNotMatch(html,/\b(?:localStorage|sessionStorage|indexedDB)\b/u);
 const manifest=JSON.parse(readFileSync(new URL('../public/manifest.webmanifest',import.meta.url),'utf8'));
 assert.equal(manifest.display,'standalone');
 assert.equal(manifest.start_url,'/');
 const sw=readFileSync(new URL('../public/sw.js',import.meta.url),'utf8');
 assert.match(sw,/offline\.html/u);
 assert.doesNotMatch(sw,/\bcache\.add\(['"]\/api\//u);
});
test('existing protected APIs all invoke approval verification before opening rows',()=>{
 for(const file of ['../api/notes.js','../api/notes/[id].js','../api/notices.js','../api/notices/[id].js']){
   const content=readFileSync(new URL(file,import.meta.url),'utf8');
   assert.match(content,/requireApprovedDevice\(/u,file);
 }
});
