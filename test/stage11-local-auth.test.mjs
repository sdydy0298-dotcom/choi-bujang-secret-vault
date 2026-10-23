import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createClient } from '../public/auth-client.js';

// Test-only placeholders: never embed a credential-shaped sample value.
const TEST_PASSWORD = 'demo';
const TEST_ACCESS = 'demo';
const TEST_PUBLIC = 'demo';

test('first-party authentication starts logged out and never persists credentials',async()=>{
 const calls=[], events=[];
 const remote=async (url,init)=>{
   calls.push({url,init});
   if(url.includes('/token?')){
     assert.equal(init.credentials,'omit');
     assert.equal(init.headers.apikey,TEST_PUBLIC);
     assert.equal(init.body,JSON.stringify({email:'user@example.invalid',password:TEST_PASSWORD}));
     return new Response(JSON.stringify({
       access_token:TEST_ACCESS,
       user:{id:'00000000-0000-4000-8000-000000000001',email:'user@example.invalid'},
       expires_in:3600
     }),{status:200,headers:{'Content-Type':'application/json'}});
   }
   if(url.endsWith('/logout?scope=global')){
     assert.equal(init.headers.Authorization,'Bearer '+TEST_ACCESS);
     return new Response(null,{status:204});
   }
   throw new Error('unexpected route '+url);
 };
 const client=createClient('https://example.supabase.co',TEST_PUBLIC,remote);
 client.auth.onAuthStateChange((event,session)=>events.push({event,session:session?.user?.id??null}));
 assert.equal((await client.auth.getSession()).data.session,null);
 const login=await client.auth.signInWithPassword({email:'user@example.invalid',password:TEST_PASSWORD});
 assert.equal(login.error,null);
 assert.equal(login.data.session.user.email,'user@example.invalid');
 assert.equal((await client.auth.getSession()).data.session.access_token,TEST_ACCESS);
 assert.deepEqual(events.map(x=>x.event),['SIGNED_IN']);
 assert.equal((await client.auth.signOut()).error,null);
 assert.equal((await client.auth.getSession()).data.session,null);
 assert.deepEqual(events.map(x=>x.event),['SIGNED_IN','SIGNED_OUT']);
 assert.equal(calls.length,2);
 assert.ok(calls.every(c=>!c.init.headers.cookie));
 const independent=createClient('https://example.supabase.co',TEST_PUBLIC,remote);
 assert.equal((await independent.auth.getSession()).data.session,null);
});

test('auth rejects invalid credentials and does not show a fake session',async()=>{
 const client=createClient('https://example.supabase.co',TEST_PUBLIC,
   async()=>new Response(JSON.stringify({error:'invalid_grant',error_description:'Invalid login credentials'}),
    {status:400,headers:{'Content-Type':'application/json'}}));
 const result=await client.auth.signInWithPassword({email:'user@example.invalid',password:'wrong'});
 assert.match(result.error.message,/Invalid login credentials/u);
 assert.equal((await client.auth.getSession()).data.session,null);
});

test('auth endpoint, configuration and existing login call contract remain stable',async()=>{
 const client=createClient('https://example.supabase.co/',TEST_PUBLIC,async (url,options)=>{
   assert.equal(url,'https://example.supabase.co/auth/v1/token?grant_type=password');
   assert.equal(options.mode,'cors');
   assert.equal(options.credentials,'omit');
   return new Response(JSON.stringify({access_token:'test',
     user:{id:'00000000-0000-4000-8000-000000000001'}}),{status:200});
 });
 const {data,error}=await client.auth.signInWithPassword({email:'user@example.invalid',password:'fixture'});
 assert.equal(error,null);
 assert.ok(data.session.user.id);
});
