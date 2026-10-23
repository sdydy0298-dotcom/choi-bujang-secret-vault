import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { detect } from '../src/detect.mjs';
import { checkDetection } from '../scripts/detect-test.mjs';
import { runAttackChecks } from '../src/attack-check.mjs';

// Non-sensitive test input; these values do not grant access.
const TEST_ONLY_VALUE='demo';

const BEGIN = Date.UTC(2026, 9, 1, 0, 0, 0);
const event = (at, sub = 'fixture_a', method = 'GET') => ({
  at: new Date(at).toISOString(), method, identity: { sub },
});
const sequence = (count, spacingMs = 1000, sub = 'fixture_a', start = BEGIN) =>
  Array.from({ length: count }, (_, i) => event(start + i * spacingMs, sub));
const proposal = sub => ({ action: 'propose_revocation', reasonCode: 'burst_read', subject: sub });

test('official six virtual detection cases must pass unmodified', async () => {
  const results = await checkDetection(detect);
  assert.equal(results.length, 6);
  assert.ok(results.every(x => x.passed), JSON.stringify(results));
});
test('half-open ten minute window: 120 is normal, 121 is suspicious', () => {
  assert.deepEqual(detect(sequence(120)), { action: 'observe' });
  assert.deepEqual(detect(sequence(121)), proposal('fixture_a'));
});
test('rolling window across ten minute clock boundary is still a burst', () => {
  assert.deepEqual(detect(sequence(121, 1000, 'fixture_a', BEGIN + 9 * 60_000)), proposal('fixture_a'));
});
test('no single ten minute interval crosses the threshold', () => {
  assert.deepEqual(detect(sequence(200, 7000)), { action: 'observe' });
  assert.deepEqual(detect([...sequence(120), ...sequence(120, 1000, 'fixture_a', BEGIN + 20*60_000)]),
    { action: 'observe' });
});
test('different identities and non-GET methods never inflate count', () => {
  assert.deepEqual(detect([...sequence(100, 1000, 'fixture_a'), ...sequence(100, 1000, 'fixture_b')]),
    { action: 'observe' });
  assert.deepEqual(detect([...sequence(120), ...sequence(200).map(x => ({ ...x, method: 'POST' }))]),
    { action: 'observe' });
});
test('one detected subject only; normal subjects are not included or proposed', () => {
  assert.deepEqual(detect([...sequence(121, 1000, 'fixture_b'), ...sequence(75, 1000, 'fixture_a')]),
    proposal('fixture_b'));
});
test('out-of-order events, event-field junk and duplicate times do not leak inputs', () => {
  assert.deepEqual(detect(sequence(121).reverse()), proposal('fixture_a'));
  assert.deepEqual(detect([...sequence(121), null, {}, { method: 'GET', identity: { sub: 'x' }, at: 'bad' },
    { method: 'GET', at: new Date(BEGIN).toISOString(), identity: { sub: 'other' }, token: TEST_ONLY_VALUE }]),
    proposal('fixture_a'));
  assert.deepEqual(detect(Array.from({ length: 121 }, () => event(BEGIN))), proposal('fixture_a'));
});
test('multiple bursts choose the earliest breach regardless of input order', () => {
  assert.deepEqual(detect([
    ...sequence(121, 1000, 'late', BEGIN + 3600_000),
    ...sequence(121, 1000, 'early', BEGIN)
  ]), proposal('early'));
});
test('invalid argument rejects without opening any account access', () => {
  assert.throws(() => detect(null), /invalid_detection_events/);
  assert.deepEqual(detect([]), { action: 'observe' });
  assert.deepEqual(detect([{ method: 'GET', at: 'bad', identity: { sub: 'fixture_a' } }]),
    { action: 'observe' });
});

test('step9 submission self-check has <= 20 performed checks, retaining prior defenses', async () => {
  const config = { ...JSON.parse(readFileSync(new URL('../aleph.config.json', import.meta.url), 'utf8')), step: 9 };
  assert.equal(config.step, 9);
  const previousFetch = globalThis.fetch;
  const respond = (data, status = 200, headers = {}) =>
    new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', ...headers } });
  try {
    globalThis.fetch = async url => {
      switch (new URL(url).pathname) {
        case '/': return new Response('<title>BYTE BACK | 인증된 자료실</title>',
          { status: 200, headers: { 'X-Content-Type-Options': 'nosniff' } });
        case '/api/notes':
        case '/api/my/notes':
        case '/api/notices': return respond({ error: 'UNAUTHORIZED' }, 401);
        case '/data.json': return respond({ notes: [] });
        case '/aleph.json': return respond({ step: 9, repoUrl: config.repoUrl,
          commit: 'a'.repeat(40), allowedRoutes: config.allowedRoutes,
          originalApiUrl: config.originalApiUrl });
        case '/api/auth-config': return respond({ url: 'https://fixture.example',
          publishableKey: TEST_ONLY_VALUE });
        default: throw new Error('Unexpected self-check URL');
      }
    };
    const checks = await runAttackChecks(config);
    assert.equal(checks.length, 20);
    assert.equal(new Set(checks.map(x => x.attackId)).size, checks.length);
    for (const name of ['stage7_normal_allow', 'stage8_global_notes_list_denied',
      'stage8_cross_owner_read_denied', 'stage9_burst_revocation_proposed',
      'stage9_normal_requests_preserved']) {
      const found = checks.find(x => x.attackId === name);
      assert.ok(found?.observed.startsWith('통과:'), name);
    }
    assert.ok(checks.every(x => x.observed.startsWith('통과:')),
      'Only actually executed local checks belong to step9 bundle');
  } finally {
    globalThis.fetch = previousFetch;
  }
});
