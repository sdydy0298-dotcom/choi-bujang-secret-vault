import assert from 'node:assert/strict';
import { test } from 'node:test';
import { traceStage8Access } from '../src/stage8-access-trace.mjs';

test('stage8 diagnostic events expose no identities, tokens, paths or contents', () => {
  const records = [], emit = (...args) => records.push(args);
  const actor = { kind: 'judge', identity: 'a', userId: 'private-sub',
    runId: 'private-run-id', access_token: 'private-token' };
  assert.equal(traceStage8Access(actor, 'note_item_get', 200, emit), true);
  assert.equal(traceStage8Access({ ...actor, identity: 'b' }, 'note_item_get', 404, emit), true);
  assert.equal(traceStage8Access({ ...actor, kind: 'student' }, 'note_item_get', 200, emit), false);
  assert.equal(traceStage8Access(actor, 'private-sub', 200, emit), false);
  assert.equal(traceStage8Access(actor, 'note_item_get', 999, emit), false);
  assert.deepEqual(records[0], ['S08_JUDGE_ACCESS',
    '{"actor":"a","operation":"note_item_get","status":200}']);
  const stringified = JSON.stringify(records);
  for(const privateString of ['private-sub', 'private-run-id', 'private-token'])
    assert.equal(stringified.includes(privateString), false);
});
