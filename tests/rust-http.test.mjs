import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { once, getEventListeners } from 'node:events';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRustGradingService } from '../server/rust-service.mjs';
import { gradingAdmission } from '../server/grading-admission.mjs';

const api = async () => ({ ...await import('../server/local-auth.mjs'), ...await import('../server/rust-http.mjs') });
const request = { exerciseId: 'http-fixture', code: 'pub fn value() -> i32 { 2 }' };
const cases = Array.from({ length: 8 }, (_, i) => ({ id: `case_0${i}`, label: 'fixture' }));
const definitions = new Map([[request.exerciseId, { id: request.exerciseId, language: 'rust', grader: 'cargo-test',
  starter: request.code, cases, harness: cases.map(c => `#[test] fn ${c.id}() { assert_eq!(codeweave_submission::value(), 2); }`).join('\n') }]]);
const result = { ok: true, message: '8/8', compileOutput: '', tests: cases.map(() => ({ passed: true, detail: '통과' })) };
async function fixture(t, options = {}) {
  const { createLocalGradeAuth, createRustHttpHandler } = await api();
  let server;
  const auth = createLocalGradeAuth(() => server.address().port);
  const handler = createRustHttpHandler({ auth, ...options });
  server = http.createServer(handler);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }));
  const port = server.address().port;
  const token = auth.tokenMeta.match(/content="([a-f0-9]{64})"/)?.[1];
  assert.match(token, /^[a-f0-9]{64}$/);
  return { server, auth, port, token };
}
function post(f, body = JSON.stringify(request), headers = {}, method = 'POST') {
  return new Promise((resolve, reject) => {
    const values = { Host: '127.0.0.1:' + f.port, 'Content-Type': 'application/json',
      'X-CodeWeave-Token': f.token, ...headers };
    const raw = Object.entries(values).filter(([, value]) => value !== undefined)
      .flatMap(([key, value]) => Array.isArray(value) ? value.flatMap(v => [key, v]) : [key, value]);
    const req = http.request({ hostname: '127.0.0.1', port: f.port, path: '/api/grade/rust', method, headers: raw }, res => {
      let data = ''; res.on('data', chunk => { data += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, data: JSON.parse(data) }));
    });
    req.on('error', reject); req.end(body);
  });
}
const serviceWith = grade => createRustGradingService({ enabled: true, definitions, grade });

test('Rust HTTP defaults disabled and refuses implicit activation or missing trusted dependencies', async t => {
  const { createRustHttpHandler } = await api();
  const f = await fixture(t, { service: { submit() { throw Error('must not execute'); } } });
  assert.equal((await post(f)).status, 503);
  assert.equal((await post(f, '', {}, 'OPTIONS')).status, 405);
  assert.throws(() => createRustHttpHandler({ enabled: 'true', auth: f.auth }), TypeError);
  assert.throws(() => createRustHttpHandler({ enabled: true, auth: f.auth }), TypeError);
  assert.throws(() => createRustHttpHandler({ enabled: true, service: serviceWith(() => result) }), TypeError);
});
test('Rust HTTP rejects CSRF and rebinding headers before service calls or workspace allocation', async t => {
  let calls = 0, allocations = 0;
  const f = await fixture(t, { enabled: true, service: serviceWith(() => { calls++; return result; }) });
  const original = fs.mkdtemp.bind(fs);
  t.mock.method(fs, 'mkdtemp', (...args) => { allocations++; return original(...args); });
  const checks = [
    [{ 'Content-Type': 'text/plain' }, 415],
    [{ 'Content-Type': 'application/json; charset=utf-8' }, 415],
    [{ Origin: 'https://attacker.invalid' }, 403],
    [{ Host: 'attacker.invalid:' + f.port }, 403],
    [{ Host: '127.0.0.1:' + (f.port + 1) }, 403],
    [{ 'X-CodeWeave-Token': undefined }, 403],
    [{ 'X-CodeWeave-Token': '0'.repeat(64) }, 403],
    [{ Origin: ['http://localhost:' + f.port, 'http://localhost:' + f.port] }, 403],
    [{ 'Content-Type': ['application/json', 'application/json'] }, 415],
    [{ 'X-CodeWeave-Token': [f.token, f.token] }, 403]
  ];
  for (const [headers, status] of checks) {
    const response = await post(f, JSON.stringify(request), headers);
    assert.equal(response.status, status);
    assert.equal(response.headers['access-control-allow-origin'], undefined);
    assert.equal(response.headers['cache-control'], 'no-store');
  }
  assert.equal(calls, 0); assert.equal(allocations, 0);
  assert.equal((await post(f, JSON.stringify(request), { Host: 'localhost:' + f.port, Origin: 'http://localhost:' + f.port })).status, 200);
  assert.equal(calls, 1);
});
test('per-server token rotates and a previous local server token cannot authorize Rust execution', async t => {
  let calls = 0;
  const service = serviceWith(() => { calls++; return result; });
  const first = await fixture(t, { enabled: true, service }), second = await fixture(t, { enabled: true, service });
  assert.notEqual(first.token, second.token);
  assert.equal((await post(second, JSON.stringify(request), { 'X-CodeWeave-Token': first.token })).status, 403);
  assert.equal(calls, 0);
  assert.equal((await post(second)).status, 200); assert.equal(calls, 1);
});
test('Rust HTTP bounds UTF-8 bytes and validates JSON and request fields without rejecting 25000 Korean code units', async t => {
  const seen = [];
  const f = await fixture(t, { enabled: true, service: serviceWith(value => { seen.push(value); return result; }) });
  assert.equal((await post(f, '{')).status, 400);
  assert.equal((await post(f, JSON.stringify({ ...request, path: '/private' }))).status, 400);
  assert.equal((await post(f, JSON.stringify({ ...request, exerciseId: 'unknown' }))).status, 400);
  assert.equal((await post(f, JSON.stringify({ ...request, code: '가'.repeat(25001) }))).status, 400);
  assert.equal((await post(f, ' '.repeat(104097))).status, 413);
  assert.equal(seen.length, 0);
  const code = '가'.repeat(25000), response = await post(f, JSON.stringify({ ...request, code }));
  assert.equal(response.status, 200); assert.equal(seen[0].code, code);
  assert.deepEqual(Object.keys(response.data).sort(), ['compileOutput', 'message', 'ok', 'tests']);
  assert.equal(response.headers['x-content-type-options'], 'nosniff');
});
test('Rust HTTP maps service errors to fixed statuses without exposing private metadata', async t => {
  const f = await fixture(t, { enabled: true, service: { submit() { throw Object.assign(Error('SECRET /private/work'), {
    code: 'ERUSTCLEANUP', workspaceDir: '/private/work', statusCode: 200
  }); } } });
  const response = await post(f);
  assert.equal(response.status, 503);
  assert.equal(response.data.ok, false);
  assert.equal(JSON.stringify(response.data).includes('SECRET'), false);
  assert.equal(JSON.stringify(response.data).includes('/private'), false);
  assert.equal(gradingAdmission.busy, false);
});
test('Rust HTTP disconnect propagates cancellation and holds shared admission until cleanup settles', { timeout: 10000 }, async t => {
  let started, finish, signal;
  const entered = new Promise(resolve => { started = resolve; });
  const service = serviceWith((_value, _registry, options) => {
    signal = options.signal; started(); return new Promise(resolve => { finish = () => resolve(result); });
  });
  const f = await fixture(t, { enabled: true, service });
  const client = http.request({ hostname: '127.0.0.1', port: f.port, path: '/api/grade/rust', method: 'POST',
    headers: { Host: 'localhost:' + f.port, 'Content-Type': 'application/json', 'X-CodeWeave-Token': f.token } });
  client.on('error', () => {}); client.end(JSON.stringify(request));
  await entered;
  try {
    assert.equal(signal.aborted, false, 'normal completed request body must not cancel the grade');
    const busy = await post(f, '{');
    assert.equal(busy.status, 429, 'busy rejection precedes JSON parsing');
    const aborted = once(signal, 'abort'); client.destroy(); await aborted;
    assert.equal(gradingAdmission.busy, true);
    assert.equal((await post(f)).status, 429);
  } finally { finish(); }
  for (let i = 0; gradingAdmission.busy && i < 100; i++) await new Promise(resolve => setTimeout(resolve, 5));
  assert.equal(gradingAdmission.busy, false);
  assert.equal(getEventListeners(signal, 'abort').length, 0);
});
const cargo = spawnSync('cargo', ['--version'], { timeout: 3000 }).status === 0;
test('real local Rust HTTP preserves eight-case failure correction and private infrastructure rejection', {
  skip: !cargo && process.env.CODEWEAVE_REQUIRE_RUST !== '1' ? 'Cargo unavailable locally; mandatory in CI' : false,
  timeout: 30000
}, async t => {
  const { createLocalRustGradingService } = await import('../server/rust-executor.mjs');
  const { trustedRustTools } = await import('./helpers/rust-tools.mjs');
  const tools = await trustedRustTools(), parent = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'codeweave-http-rust-')));
  t.after(() => fs.rm(parent, { recursive: true, force: true }));
  const service = await createLocalRustGradingService({ enabled: true, definitions, sysroot: path.dirname(path.dirname(tools.rustc)), parent });
  const f = await fixture(t, { enabled: true, service });
  const wrong = await post(f, JSON.stringify({ ...request, code: 'pub fn value() -> i32 { 3 }' }));
  assert.equal(wrong.status, 200); assert.equal(wrong.data.ok, false);
  assert.equal(wrong.data.tests.length, 8); assert.ok(wrong.data.tests.every(tc => !tc.passed));
  const corrected = await post(f);
  assert.equal(corrected.status, 200); assert.equal(corrected.data.ok, true);
  assert.equal(corrected.data.tests.length, 8); assert.deepEqual(await fs.readdir(parent), []);
  const remove = fs.rm.bind(fs);
  const denied = t.mock.method(fs, 'rm', async (target, options) => {
    if (path.dirname(target) === parent) throw Object.assign(Error('SECRET /private'), { code: 'EACCES' });
    return remove(target, options);
  });
  let owned;
  try {
    const failed = await post(f);
    assert.equal(failed.status, 503); assert.doesNotMatch(JSON.stringify(failed.data), /SECRET|workspaceDir|private/);
    owned = service.inspect().workspaceDir;
    assert.equal((await post(f)).status, 429);
  } finally { denied.mock.restore(); }
  try { await remove(owned, { recursive: true, force: true }); assert.equal(await service.recover(), true); }
  finally { if (owned) await remove(owned, { recursive: true, force: true }); await service.recover(); }
});

