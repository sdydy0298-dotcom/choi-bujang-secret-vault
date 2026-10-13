import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { scopedNoteQuery, noteOwnerColumns, getNoteScope, noteOwnerMatches } from '../src/note-scope.mjs';
import { idFromPath } from '../src/resource-zones.mjs';

const sub='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const run='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const run2='dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const ids={a:'11111111-1111-4111-8111-111111111111',b:'22222222-2222-4222-8222-222222222222',legacy:'33333333-3333-4333-8333-333333333333'};
const identities={
  'Bearer fixture-judge-a':{kind:'judge',userId:sub,runId:run,identity:'a'},
  'Bearer fixture-judge-b':{kind:'judge',userId:sub,runId:run,identity:'b'},
  'Bearer fixture-run-2':{kind:'judge',userId:sub,runId:run2,identity:'a'},
  'Bearer fixture-student':{kind:'student',userId:sub}
};
function createMockDB() {
  const rows=[
    {id:ids.a,owner_id:getNoteScope(identities['Bearer fixture-judge-a']).owner_id,judge_run_id:run,judge_identity:'a',title:'A private',content:'fixture',created_at:'2026-10-13T00:00:00Z'},
    {id:ids.b,owner_id:getNoteScope(identities['Bearer fixture-judge-b']).owner_id,judge_run_id:run,judge_identity:'b',title:'B private',content:'fixture',created_at:'2026-10-13T00:00:01Z'},
    {id:ids.legacy,owner_id:sub,judge_run_id:null,judge_identity:null,title:'student legacy',content:'fixture',created_at:'2026-10-13T00:00:02Z'}
  ];
  const db={schema(name){assert.equal(name,'defense');return{from(name){assert.equal(name,'notes');
    let mode='read',body,filters=[],single=false;
    const q={select(){return q},eq(k,v){filters.push([k,v]);return q},is(k,v){filters.push([k,v]);return q},
      order(){return q},maybeSingle(){single=true;return q},insert(v){mode='insert';body=v;return q},
      update(v){mode='update';body=v;return q},delete(){mode='delete';return q},
      then(resolve,reject){
        if(mode==='insert'){rows.push({...body,created_at:'2026-10-13T00:00:03Z'});
          return Promise.resolve({data:null,error:null}).then(resolve,reject);}
        const matched=rows.filter(row=>filters.every(([k,v])=>row[k]===v));
        if(mode==='update')matched.forEach(row=>Object.assign(row,body));
        const data=single?matched[0]??null:matched;
        if(mode==='delete')for(const row of matched)rows.splice(rows.indexOf(row),1);
        return Promise.resolve({data,error:null}).then(resolve,reject);
      }
    };return q;
  }}}};
  return {db,rows};
}
// Stage 8 regression isolates the historical ownership rules. Stage 11
// signature verification is exercised independently in step11.test.mjs.
function makeHandler(relativePath,db){
  const source=readFileSync(new URL(relativePath,import.meta.url),'utf8')
    .replace(/^import[^\n]+\n/gmu,'')
    .replace('export default async function handler','async function handler');
  const factory=new Function('createClient','createLoginVerifier','config','resourceId','idFromPath','traceStage8Access',
    'scopedNoteQuery','noteOwnerColumns','getNoteScope','noteOwnerMatches','crypto','process','requireApprovedDevice',
    'recordStage11','traceActor',source+'\nreturn handler;');
  return factory(()=>db,()=>async auth=>identities[auth]??null,{},
    (type,id)=>type+':'+id,idFromPath,()=>{},scopedNoteQuery,noteOwnerColumns,getNoteScope,noteOwnerMatches,
    {randomUUID},{env:{SUPABASE_URL:'https://example.invalid',SUPABASE_SECRET_KEY:'test-only-placeholder'}},
    async()=>({ok:true}),async()=>true,identity=>identity?.kind==='judge'?'judge_'+identity.identity:'student');
}
function request(handler,token,method,path,body){
  return new Promise((resolve,reject)=>{
    const req={method,headers:{authorization:token},query:{id:path.split('/').at(-1)},url:path,body};
    const res={code:0,setHeader(){},status(code){this.code=code;return this},
      json(data){resolve({status:this.code,data})}};
    Promise.resolve(handler(req,res)).catch(reject);
  });
}
test('production GET and list: A/B same sub do not cross, legacy student still reads',async()=>{
  const {db}=createMockDB();
  const detail=makeHandler('../api/notes/[id].js',db);
  const list=makeHandler('../api/notes.js',db);
  assert.equal((await request(detail,'Bearer fixture-judge-a','GET','/api/notes/'+ids.a)).status,200);
  assert.deepEqual(await request(detail,'Bearer fixture-judge-b','GET','/api/notes/'+ids.a),
    {status:404,data:{error:'NOTE_NOT_FOUND'}});
  assert.equal((await request(detail,'Bearer fixture-run-2','GET','/api/notes/'+ids.a)).status,404);
  assert.equal((await request(detail,'Bearer fixture-student','GET','/api/notes/'+ids.a)).status,404);
  const a=await request(list,'Bearer fixture-judge-a','GET','/api/notes');
  const b=await request(list,'Bearer fixture-judge-b','GET','/api/notes');
  const student=await request(list,'Bearer fixture-student','GET','/api/notes');
  assert.deepEqual(a.data.notes.map(x=>x.id),[ids.a]);
  assert.deepEqual(b.data.notes.map(x=>x.id),[ids.b]);
  assert.deepEqual(student.data.notes.map(x=>x.id),[ids.legacy]);
});
test('production PUT/DELETE: B cannot change A, A own operations remain allowed',async()=>{
  const {db,rows}=createMockDB(),h=makeHandler('../api/notes/[id].js',db);
  const changed={title:'Changed',body:'test only'};
  assert.equal((await request(h,'Bearer fixture-judge-b','PUT','/api/notes/'+ids.a,changed)).status,404);
  assert.equal((await request(h,'Bearer fixture-judge-b','DELETE','/api/notes/'+ids.a)).status,404);
  assert.equal(rows[0].title,'A private');
  assert.equal((await request(h,'Bearer fixture-judge-a','PUT','/api/notes/'+ids.a,changed)).status,200);
  assert.equal(rows[0].title,'Changed');
  assert.equal((await request(h,'Bearer fixture-judge-a','DELETE','/api/notes/'+ids.a)).status,200);
  assert.equal(rows.some(x=>x.id===ids.a),false);
  assert.equal(rows.some(x=>x.id===ids.b),true);
});
test('production POST: scope is server-verified, never accepted from body',async()=>{
  const {db,rows}=createMockDB(),h=makeHandler('../api/notes.js',db);
  assert.equal((await request(h,'Bearer fixture-judge-a','POST','/api/notes',{title:'New',body:'test only'})).status,201);
  const row=rows.at(-1);
  assert.equal(row.owner_id,getNoteScope(identities['Bearer fixture-judge-a']).owner_id);
  assert.notEqual(row.owner_id,sub);
  assert.notEqual(row.owner_id,getNoteScope(identities['Bearer fixture-judge-b']).owner_id);
  assert.equal(row.judge_run_id,run);assert.equal(row.judge_identity,'a');
  assert.equal((await request(h,'Bearer fixture-judge-b','POST','/api/notes',{title:'Forge',body:'bad',judge_identity:'a'})).status,400);
  assert.equal((await request(h,'Bearer fixture-student','POST','/api/notes',{title:'Forge',body:'bad',owner_id:sub})).status,400);
  assert.equal(rows.length,4);
});

test('signed A can read own freshly created UUID, B must not read it',async()=>{
 const {db}=createMockDB(),list=makeHandler('../api/notes.js',db);
 const detail=makeHandler('../api/notes/[id].js',db);
 const created=await request(list,'Bearer fixture-judge-a','POST','/api/notes',
   {title:'Own UUID note',body:'fixture'});
 assert.equal(created.status,201);
 assert.match(created.data.id,/^[a-f0-9-]{36}$/u);
 assert.equal((await request(detail,'Bearer fixture-judge-a','GET','/api/notes/'+created.data.id)).status,200);
 assert.equal((await request(detail,'Bearer fixture-judge-b','GET','/api/notes/'+created.data.id)).status,404);
});

test('exact UUID resource URL and list route reject query-based owner selection',async()=>{
 const {db}=createMockDB(),detail=makeHandler('../api/notes/[id].js',db);
 const list=makeHandler('../api/notes.js',db);
 const token='Bearer fixture-judge-a';
 assert.equal((await request(detail,token,'GET','/api/notes/'+ids.a+'?role=instructor')).status,400);
 assert.equal((await request(detail,token,'GET','/api/notes/'+ids.a+'/export')).status,400);
 assert.equal((await request(list,token,'GET','/api/notes?owner_id=another')).status,404);
 assert.equal((await request(list,token,'GET','/api/my/notes')).status,200);
});
