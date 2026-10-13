import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import {allowedBrowserEvent,traceActor,recordStage11} from '../src/stage11-diagnostics.mjs';

test('diagnostic event names cannot contain user input, tokens, paths or arbitrary strings',async()=>{
  assert.equal(allowedBrowserEvent('html_loaded'),true);
  assert.equal(allowedBrowserEvent('device_request_started'),true);
  assert.equal(allowedBrowserEvent('notes_request_failed'),true);
  for(const bad of ['Authorization: Bearer secret','/api/notes/123',
    'note content','debug','uid','constructor','../secrets']) {
    assert.equal(allowedBrowserEvent(bad),false);
    assert.equal(await recordStage11(bad,{source:'browser',route:'page'}),false);
  }
  assert.equal(await recordStage11('html_loaded',{
    source:'browser',route:'page',traceId:'not-a-uuid'
  }),false);
  assert.equal(await recordStage11('html_loaded',{
    source:'browser',route:'page',actor:'administrator'
  }),false);
});

test('server actor markers contain no user IDs',()=>{
  assert.equal(traceActor({kind:'student',userId:'sensitive-user-id'}),'student');
  assert.equal(traceActor({kind:'judge',identity:'a',userId:'sensitive-user-id'}),'judge_a');
  assert.equal(traceActor({kind:'judge',identity:'b',userId:'sensitive-user-id'}),'judge_b');
  assert.equal(traceActor(null),'anonymous');
});

test('all trace persistence lives inside private schema with no public read endpoint',()=>{
  const sql=readFileSync(new URL('../sql/stage11-diagnostics.sql',import.meta.url),'utf8');
  assert.match(sql,/ENABLE ROW LEVEL SECURITY/u);
  assert.match(sql,/REVOKE ALL ON TABLE defense\.stage11_diagnostic_events FROM PUBLIC,anon,authenticated/u);
  const publicHtml=readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
  assert.match(publicHtml,/window\.stage11Trace\('html_loaded'\)/u);
  assert.match(publicHtml,/trace\('module_started'\)/u);
  const config=readFileSync(new URL('../api/auth-config.js',import.meta.url),'utf8');
  assert.match(config,/BROWSER_MARKERS/u);
  assert.match(config,/INVALID_DIAGNOSTIC_QUERY/u);
  const store=readFileSync(new URL('../src/stage11-diagnostics.mjs',import.meta.url),'utf8');
  assert.match(store,/\.from\('stage11_diagnostic_events'\)/u);
  assert.doesNotMatch(store,/console\.log\(/u);
  assert.doesNotMatch(store,/\.from\('notes'\)/u);
});
