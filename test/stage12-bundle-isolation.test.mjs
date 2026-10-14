import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { runAttackChecks } from '../src/stage12-bundle-check.mjs';

const config = JSON.parse(readFileSync(new URL('../aleph.config.json', import.meta.url), 'utf8'));

test('stage12 bundle import graph uses only judge-supported built-ins', () => {
  const reachable = [
    '../scripts/bundle.mjs', '../src/stage12-bundle-check.mjs',
    '../src/decider.mjs', '../src/detect.mjs',
    '../scripts/decider-test.mjs', '../scripts/fixture-7.mjs'
  ];
  const allowed = new Set(['node:fs','node:path','node:url','node:child_process','node:crypto']);
  for (const file of reachable) {
    const src = readFileSync(new URL(file, import.meta.url), 'utf8');
    for (const match of src.matchAll(/(?:from\s*|import\s*\(\s*)['"](node:[^'"]+)['"]/gu))
      assert.ok(allowed.has(match[1]), file + ' imports unsupported ' + match[1]);
    assert.doesNotMatch(src, /\btimingSafeEqual\b|\bcreateHmac\b/gu, file);
    if (file.endsWith('stage12-bundle-check.mjs'))
      assert.doesNotMatch(src, /method\s*:\s*['"](?:POST|PUT|PATCH|DELETE)['"]\s*,\s*redirect/gu);
  }
  const bundle = readFileSync(new URL('../scripts/bundle.mjs',import.meta.url), 'utf8');
  assert.match(bundle, /config\.step\s*===\s*12\s*\?\s*'stage12-bundle-check\.mjs'/u);
});

test('judge bundle carries its own truthful stage-12 notes without prepare:12', () => {
  const src = readFileSync(new URL('../scripts/bundle.mjs', import.meta.url), 'utf8');
  assert.match(src, /const notes = config\.step === 12 \? stage12Notes/u);
  assert.match(src, /기기 등록, 승인, 기기 전자서명 검증/u);
  assert.match(src, /7단계 복합 이상 접속/u);
  assert.match(src, /ALEPH SDP/u);
  assert.match(src, /observed=not_run/u);
  assert.match(src, /실측 행이 0건이면 0건으로 표시/u);
  assert.match(src, /: JSON\.parse\(readFileSync\(join\(root, 'bundle-notes\.json'\)/u);
});

test('stage12 judge path issues GET only; unsupported POST evidence is not_run', async () => {
  const priorFetch = globalThis.fetch;
  const urls = [];
  const responses = {
    '/': [200, '<title>BYTE BACK | 인증된 자료실</title>'],
    '/api/notes': [401, { error: 'UNAUTHORIZED' }],
    '/data.json': [200, { notes: [] }],
    '/aleph.json': [200, {
      step: 12, repoUrl: config.repoUrl, commit: 'a'.repeat(40),
      allowedRoutes: config.allowedRoutes, originalApiUrl: config.originalApiUrl
    }],
    '/api/auth-config': [200, { url: 'https://example.supabase.co', publishableKey: 'anon-public' }],
    '/api/notices': [401, { error: 'UNAUTHORIZED' }]
  };
  globalThis.fetch = async (url, options) => {
    assert.equal(options.method, 'GET');
    assert.equal(url.protocol, 'https:');
    assert.equal(url.origin, config.publicAppUrl);
    const path = url.pathname;
    assert.ok(Object.hasOwn(responses, path), 'unexpected probe: ' + path);
    urls.push(path);
    const [status, body] = responses[path];
    return {
      status,
      headers: { get(name) { return name === 'x-content-type-options' ? 'nosniff' : null; } },
      async json() { return body; },
      async text() { return body; }
    };
  };
  try {
    const result = await runAttackChecks(config);
    assert.equal(urls.length, 6);
    assert.equal(result.length, 20);
    assert.equal(new Set(result.map(item => item.attackId)).size, 20);
    assert.equal(result.find(row => row.attackId === 'stage10_unauthorized_restore_rejected')?.observed, 'not_run');
    // Favourable GET responses and passing local fixtures cannot be treated
    // as judge-attested execution for each attackId.
    assert.equal(result.filter(row => row.observed === 'not_run').length, 20);
    assert.equal(result.some(row => row.observed.startsWith('통과:')), false);
    assert.ok(result.every(row => typeof row.observed === 'string' && row.observed.length <= 300));
  } finally {
    globalThis.fetch = priorFetch;
  }
});

test('unreachable public GET cannot be fabricated as an HTTP PASS', async () => {
  const oldFetch = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error('network unreachable'); };
  try {
    const result = await runAttackChecks(config);
    assert.equal(result.length, 20);
    assert.equal(result.every(row => row.observed === 'not_run'), true,
      'unlogged judge attack IDs cannot be reported as executed');
  } finally {
    globalThis.fetch = oldFetch;
  }
});
