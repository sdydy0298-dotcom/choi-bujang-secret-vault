import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { getNoteScope } from '../src/note-scope.mjs';

const sub='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const run='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const identities={
  a:{kind:'judge',userId:sub,runId:run,identity:'a'},
  b:{kind:'judge',userId:sub,runId:run,identity:'b'},
  student:{kind:'student',userId:sub}
};
const fixtures={
  'Bearer judge-a':identities.a,'Bearer judge-b':identities.b,
  'Bearer student':identities.student
};
const key={kty:'EC',crv:'P-256',x:'a'.repeat(43),y:'b'.repeat(43)};
const ids=[
  '11111111-1111-4111-8111-111111111111',
  '22222222-2222-4222-8222-222222222222',
  '33333333-3333-4333-8333-333333333333'
];
function setup(){
  const rows=[];
  let idIndex=0;
  const db={schema(name){
    assert.equal(name,'defense');
    return {from(table){
      assert.equal(table,'device_approvals');
      let where=[];
      const q={
        select(){return q},
        eq(name,value){where.push(record=>record[name]===value);return q},
        in(name,values){where.push(record=>values.includes(record[name]));return q},
        async maybeSingle(){return {data:rows.find(row=>where.every(fn=>fn(row)))??null,error:null}},
        async insert(row){rows.push(row);return {error:null}},
        then(resolve,reject){return Promise.resolve({count:rows.filter(row=>where.every(fn=>fn(row))).length,error:null}).then(resolve,reject)}
      };
      return q;
    }};
  }};
  const raw=readFileSync(new URL('../api/device.js',import.meta.url),'utf8')
    .replace(/^import[^\n]+\n/gmu,'')
    .replace('export default async function handler','async function handler');
  const factory=new Function('randomUUID','createClient','config','createLoginVerifier',
    'getNoteScope','validPublicKey','process',raw+'\nreturn handler;');
  const handler=factory(()=>ids[idIndex++],()=>db,{},
    ()=>async authorization=>fixtures[authorization]??null,
    getNoteScope,value=>value?.kty==='EC'&&value.crv==='P-256',
    {env:{SUPABASE_URL:'https://example.invalid',SUPABASE_SECRET_KEY:'fixture-not-real'}});
  async function request(token,method,url,body){
    return new Promise((resolve,reject)=>{
      const req={method,url,headers:{authorization:token},body};
      const res={statusCode:0,setHeader(){},status(code){this.statusCode=code;return this},
        json(data){resolve({status:this.statusCode,data})}};
      Promise.resolve(handler(req,res)).catch(reject);
    });
  }
  return {request,rows};
}

test('verified judge A/B and student can only enroll pending devices with isolated scopes',async()=>{
  const {request,rows}=setup();
  const a=await request('Bearer judge-a','POST','/api/device',{label:'A device',publicKey:key});
  const b=await request('Bearer judge-b','POST','/api/device',{label:'B device',publicKey:key});
  const student=await request('Bearer student','POST','/api/device',{label:'student device',publicKey:key});
  assert.deepEqual([a.status,b.status,student.status],[201,201,201]);
  assert.deepEqual(rows.map(row=>row.status),['pending','pending','pending']);
  assert.deepEqual(rows.map(row=>row.owner_id),[getNoteScope(identities.a).owner_id,
    getNoteScope(identities.b).owner_id,getNoteScope(identities.student).owner_id]);
  assert.equal(new Set(rows.map(row=>row.owner_id)).size,3);
  assert.equal((await request('Bearer judge-a','GET','/api/device?id='+a.data.deviceId)).data.status,'pending');
  assert.equal((await request('Bearer judge-b','GET','/api/device?id='+a.data.deviceId)).status,404);
  assert.equal((await request('Bearer student','GET','/api/device?id='+a.data.deviceId)).status,404);
});

test('device registration cannot set approval or impersonate another scope',async()=>{
  const {request,rows}=setup();
  const forged=await request('Bearer judge-b','POST','/api/device',
    {label:'privileged',publicKey:key,status:'approved'});
  assert.equal(forged.status,400);
  assert.equal(rows.length,0);
  assert.equal((await request('Bearer invalid','POST','/api/device',
    {label:'unknown',publicKey:key})).status,401);
});
