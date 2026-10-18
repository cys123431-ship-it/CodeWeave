import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';
import { createRustGradingService } from '../server/rust-service.mjs';
import { gradingAdmission } from '../server/grading-admission.mjs';

const api = () => import('../server/learning-server.mjs');
const project = fileURLToPath(new URL('../', import.meta.url));
const source = { exerciseId: 'server-fixture', code: 'pub fn value() -> i32 { 2 }' };
const cases = Array.from({ length: 8 }, (_, i) => ({ id: `case_0${i}`, label: 'fixture' }));
const definitions = new Map([[source.exerciseId, { id: source.exerciseId, language: 'rust', grader: 'cargo-test',
  starter: source.code, cases, harness: cases.map(c => `#[test] fn ${c.id}() { assert_eq!(codeweave_submission::value(), 2); }`).join('\n') }]]);
const result = { ok: true, message: '8/8', compileOutput: '', tests: cases.map(() => ({ passed: true, detail: '통과' })) };
async function instance(t, options = {}) {
  const { createLearningServer } = await api();
  const app = createLearningServer({ root: project, ...options });
  t.after(() => app.close());
  assert.equal(app.address(), null, 'construction must not bind a socket');
  const address = await app.listen(0);
  assert.equal(address.address, '127.0.0.1');
  assert.equal(address.family, 'IPv4');
  const url = 'http://127.0.0.1:' + address.port;
  const page = await fetch(url), html = await page.text();
  assert.equal(page.status, 200);
  const token = html.match(/name="codeweave-token" content="([a-f0-9]{64})"/)?.[1];
  assert.match(token, /^[a-f0-9]{64}$/);
  return { app, url, token, address };
}
async function post(f, body, target = '/api/grade/rust', headers = {}) {
  const response = await fetch(f.url + target, { method: 'POST', headers: {
    'Content-Type': 'application/json', 'X-CodeWeave-Token': f.token, ...headers
  }, body: typeof body === 'string' ? body : JSON.stringify(body) });
  return { status: response.status, body: await response.json() };
}
const serviceWith = grade => createRustGradingService({ enabled: true, definitions, grade });

test('learning server construction is inert, immutable and can only listen on an explicit loopback port', async t => {
  const { createLearningServer } = await api();
  const app = createLearningServer({ root: project });
  assert.equal(Object.isFrozen(app), true); assert.equal(app.address(), null);
  assert.deepEqual(Object.keys(app).sort(), ['address', 'close', 'listen']);
  assert.throws(() => app.listen(0, '0.0.0.0'), TypeError);
  for (const port of [-1, 65536, '4173', NaN]) assert.throws(() => app.listen(port), TypeError);
  assert.throws(() => createLearningServer({ root: null }), TypeError);
  assert.throws(() => createLearningServer({ rustService: {} }), TypeError);
  await app.close();
  const a = await instance(t), b = await instance(t);
  assert.notEqual(a.token, b.token);
  assert.equal((await post(b, source, '/api/grade/rust', { 'X-CodeWeave-Token': a.token })).status, 403);
});
test('default learning server rejects Rust without spawning compilers or allocating workspaces and retains C and private-file policies', async t => {
  const f = await instance(t), original = fs.mkdtemp.bind(fs);
  let allocations = 0;
  const mock = t.mock.method(fs, 'mkdtemp', (...args) => { allocations++; return original(...args); });
  try {
    assert.equal((await post(f, source)).status, 503);
    assert.equal((await post(f, source, '/api/grade/rust', { Origin: 'https://attacker.invalid' })).status, 403);
    assert.equal((await post(f, source, '/api/grade/rust', { 'Content-Type': 'text/plain' })).status, 415);
    assert.equal((await fetch(f.url + '/api/grade/rust')).status, 405);
    assert.equal((await post(f, source, '/api/grade/rust/extra')).status, 405);
    assert.equal((await post(f, { exerciseId: 'unknown', code: 'int main(void) {}' }, '/api/grade')).status, 400);
    assert.equal(allocations, 0);
  } finally { mock.mock.restore(); }
  for (const target of ['/server/learning-server.mjs', '/server/rust-executor.mjs', '/docs/RUST_GRADER_DESIGN.md', '/package.json']) {
    assert.equal((await fetch(f.url + target)).status, 404);
  }
});
test('Rust environment flags cannot activate the ordinary command-line server', { timeout: 10000 }, async t => {
  await api();
  const child = spawn(process.execPath, ['dev-server.mjs'], { cwd: project, env: { ...process.env, PORT: '0',
    CODEWEAVE_RUST_ENABLED: '1', CODEWEAVE_RUST_SYSROOT: '/must-not-probe', RUST_ENABLED: 'true' },
    stdio: ['ignore', 'pipe', 'pipe'] });
  t.after(async () => { if (child.exitCode === null && child.signalCode === null) { const exit = once(child, 'exit'); child.kill(); await exit; } });
  let output = '', errors = '';
  child.stdout.on('data', chunk => { output += chunk; });
  child.stderr.on('data', chunk => { errors += chunk; });
  let url;
  for (let i = 0; i < 200; i++) {
    url = output.match(/http:\/\/127\.0\.0\.1:\d+/)?.[0];
    if (url) break;
    if (child.exitCode !== null) throw Error(errors || 'server exited');
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  assert.ok(url, output + errors);
  const html = await (await fetch(url)).text();
  const token = html.match(/name="codeweave-token" content="([a-f0-9]{64})"/)[1];
  assert.equal((await post({ url, token }, source)).status, 503);
});
test('an explicitly supplied Rust service shares the live page token and C lease, then C compiles after Rust settles', async t => {
  let entered, finish, calls = 0;
  const started = new Promise(resolve => { entered = resolve; });
  const service = serviceWith(() => { calls++; entered(); return new Promise(resolve => { finish = () => resolve(result); }); });
  const f = await instance(t, { rustService: service });
  assert.equal((await post(f, source, '/api/grade/rust', { Origin: 'https://attacker.invalid' })).status, 403);
  assert.equal(calls, 0);
  const pending = post(f, source);
  await started;
  try {
    assert.equal((await post(f, { exerciseId: 'c-hello', code: 'int main(void){return 0;}' }, '/api/grade')).status, 429);
    assert.equal((await post(f, source)).status, 429);
  } finally { finish(); }
  const done = await pending;
  assert.equal(done.status, 200); assert.deepEqual(done.body, result);
  const compiled = await post(f, { exerciseId: 'c-hello', code: '#include <stdio.h>\nint main(void) { puts("Hello, World!"); return 0; }' }, '/api/grade');
  assert.equal(compiled.status, 200);
  assert.equal(compiled.body.compileOutput, '');
  assert.equal(gradingAdmission.busy, false);
  const workbench = await (await fetch(f.url + '/workbench.html')).text();
  assert.ok(workbench.includes(f.token));
});
test('actual mounted Rust route cancels on disconnect and retains C rejection while cleanup waits', { timeout: 10000 }, async t => {
  let entered, finish, signal;
  const started = new Promise(resolve => { entered = resolve; });
  const f = await instance(t, { rustService: serviceWith((_value, _registry, options) => {
    signal = options.signal; entered(); return new Promise(resolve => { finish = () => resolve(result); });
  }) });
  const client = http.request(f.url + '/api/grade/rust', { method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-CodeWeave-Token': f.token } });
  client.on('error', () => {}); client.end(JSON.stringify(source)); await started;
  try {
    const cancelled = once(signal, 'abort'); client.destroy(); await cancelled;
    assert.equal((await post(f, { exerciseId: 'c-hello', code: 'int main(void){return 0;}' }, '/api/grade')).status, 429);
    assert.equal(gradingAdmission.busy, true);
  } finally { finish(); }
  for (let i = 0; gradingAdmission.busy && i < 100; i++) await new Promise(resolve => setTimeout(resolve, 5));
  assert.equal(gradingAdmission.busy, false);
});
const cargo = spawnSync('cargo', ['--version'], { timeout: 3000 }).status === 0;
test('actual learning server mounts trusted local Cargo and preserves wrong/correct submissions without exposing the server registry', {
  skip: !cargo && process.env.CODEWEAVE_REQUIRE_RUST !== '1' ? 'Cargo unavailable locally; mandatory in CI' : false, timeout: 30000
}, async t => {
  await api();
  const { createLocalRustGradingService } = await import('../server/rust-executor.mjs');
  const { trustedRustTools } = await import('./helpers/rust-tools.mjs');
  const tools = await trustedRustTools(), parent = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'codeweave-mounted-rust-')));
  t.after(() => fs.rm(parent, { recursive: true, force: true }));
  const service = await createLocalRustGradingService({ enabled: true, definitions, sysroot: path.dirname(path.dirname(tools.rustc)), parent });
  const f = await instance(t, { rustService: service });
  const wrong = await post(f, { ...source, code: 'pub fn value() -> i32 { 3 }' });
  assert.equal(wrong.status, 200); assert.equal(wrong.body.ok, false); assert.equal(wrong.body.tests.length, 8);
  const correct = await post(f, source);
  assert.equal(correct.status, 200); assert.equal(correct.body.ok, true); assert.equal(correct.body.tests.length, 8);
  assert.deepEqual(await fs.readdir(parent), []);
  assert.equal((await fetch(f.url + '/server/rust-executor.mjs')).status, 404);
  assert.equal((await post(f, { ...source, harness: 'client override' })).status, 400);
});

