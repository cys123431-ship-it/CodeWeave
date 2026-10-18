import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter, getEventListeners, once } from 'node:events';
import fs from 'node:fs/promises';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { runSubmission } from '../server/run-submission.mjs';
import { runCases } from '../server/grading-pipeline.mjs';
import { linuxProcessAlive } from './helpers/linux-process-alive.mjs';

const api = () => import('../server/request-cancellation.mjs');
const posix = ['linux', 'darwin'].includes(process.platform);
const gcc = spawnSync('gcc', ['--version']).status === 0;
const endpoints = () => ({ req: Object.assign(new EventEmitter(), { aborted: false }),
  res: Object.assign(new EventEmitter(), { destroyed: false, writableFinished: false }) });
async function temporary(t) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'codeweave-disconnect-test-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  return dir;
}
async function until(probe, message) {
  const end = Date.now() + 2500;
  while (Date.now() < end) {
    const value = await probe();
    if (value) return value;
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  throw Error(message);
}
async function read(file) {
  try { return await fs.readFile(file, 'utf8'); }
  catch (error) { if (error.code === 'ENOENT') return ''; throw error; }
}
async function alive(pid) {
  if (process.platform === 'linux') return linuxProcessAlive(pid);
  try { process.kill(pid, 0); }
  catch (error) { if (error.code === 'ESRCH') return false; throw error; }
  const state = spawnSync('/bin/ps', ['-o', 'stat=', '-p', String(pid)], { encoding: 'utf8' }).stdout.trim();
  if (!state) {
    try { process.kill(pid, 0); }
    catch (error) { if (error.code === 'ESRCH') return false; throw error; }
  }
  return !state || !state.startsWith('Z');
}
const source = `#include <stdio.h>
#include <unistd.h>
#include <sys/types.h>
int main(void) {
    pid_t child = fork();
    if (child < 0) return 2;
    if (child == 0) { for (;;) pause(); }
    FILE *file = fopen("pids.txt", "w");
    if (!file) return 3;
    fprintf(file, "%ld %ld\\n", (long)getpid(), (long)child);
    fclose(file);
    for (;;) pause();
}`;
async function compileFamily(dir) {
  const file = path.join(dir, 'family.c'), binary = path.join(dir, 'family');
  await fs.writeFile(file, source);
  const compiled = spawnSync('gcc', ['-std=c11', '-Wall', '-Wextra', '-Werror', '-Wpedantic', file, '-o', binary], { encoding: 'utf8' });
  assert.equal(compiled.status, 0, compiled.stderr);
  return binary;
}

test('request cancellation ignores normal request close and successful response close, and disposes listeners', async () => {
  const { createRequestCancellation } = await api();
  const { req, res } = endpoints();
  const lifetime = createRequestCancellation(req, res);
  req.emit('close');
  res.writableFinished = true;
  res.emit('close');
  assert.equal(lifetime.signal.aborted, false);
  lifetime.dispose(); lifetime.dispose();
  assert.equal(req.listenerCount('aborted'), 0);
  assert.equal(res.listenerCount('close'), 0);
  req.emit('aborted');
  assert.equal(lifetime.signal.aborted, false);
});

test('request cancellation handles premature response close and already disconnected peers without private reasons', async () => {
  const { createRequestCancellation } = await api();
  for (const cause of ['aborted', 'close', 'already-aborted', 'already-destroyed']) {
    const { req, res } = endpoints();
    if (cause === 'already-aborted') req.aborted = true;
    if (cause === 'already-destroyed') res.destroyed = true;
    const lifetime = createRequestCancellation(req, res);
    if (cause === 'aborted') req.emit('aborted', Error('private'));
    if (cause === 'close') res.emit('close', Error('private'));
    assert.equal(lifetime.signal.aborted, true);
    assert.equal(lifetime.signal.reason.name, 'AbortError');
    assert.doesNotMatch(lifetime.signal.reason.message, /private/);
    lifetime.dispose();
    assert.equal(req.listenerCount('aborted') + res.listenerCount('close'), 0);
  }
});

test('C runner refuses invalid and pre-aborted signals without spawning a program', async t => {
  const dir = await temporary(t), marker = path.join(dir, 'must-not-start');
  const controller = new AbortController(); controller.abort(Error('private'));
  assert.throws(() => runSubmission('/does-not-exist', [], { abortSignal: {} }), /signal/i);
  const result = await runSubmission('/bin/sh', ['-c', 'touch "$1"', 'fixture', marker], { abortSignal: controller.signal });
  assert.equal(result.error?.code, 'ABORT_ERR');
  assert.equal(result.error?.name, 'AbortError');
  assert.doesNotMatch(result.error.message, /private/);
  assert.equal(await read(marker), '');
  await assert.rejects(fs.stat(marker), { code: 'ENOENT' });
  assert.equal(getEventListeners(controller.signal, 'abort').length, 0);
});

test('C case loop forwards cancellation and never runs later cases or returns a late success', async () => {
  const exercise = { grader: 'c-function', cases: [{ args: [], expected: '2' }, { args: [], expected: '2' }] };
  const controller = new AbortController(); let calls = 0;
  const runner = async (_binary, _args, options) => {
    calls++;
    assert.equal(options.abortSignal, controller.signal);
    controller.abort();
    return { status: 0, stdout: '2' };
  };
  await assert.rejects(runCases({ binary: 'unused', dir: 'unused' }, exercise, runner, { signal: controller.signal }), { name: 'AbortError' });
  assert.equal(calls, 1);
  await assert.rejects(runCases({ binary: 'unused', dir: 'unused' }, exercise, runner, { signal: controller.signal }), { name: 'AbortError' });
  assert.equal(calls, 1);
});

test('C active cancellation kills the owned POSIX family before the deadline and removes its listener', {
  skip: !posix || !gcc
}, async t => {
  const dir = await temporary(t), binary = await compileFamily(dir), controller = new AbortController();
  const pending = runSubmission(binary, [], { cwd: dir, timeout: 8000, abortSignal: controller.signal });
  try {
    const pids = (await until(() => read(path.join(dir, 'pids.txt')), 'C family did not start')).trim().split(/\s+/).map(Number);
    assert.equal(pids.length, 2);
    const started = Date.now(); controller.abort();
    const result = await pending;
    assert.equal(result.error?.code, 'ABORT_ERR');
    assert.ok(Date.now() - started < 2000, 'must not wait for the 8-second deadline');
    for (const pid of pids) assert.equal(await alive(pid), false, 'surviving PID ' + pid);
    assert.equal(getEventListeners(controller.signal, 'abort').length, 0);
  } finally { controller.abort(); await pending; }
});

test('C runner removes cancellation listeners after normal completion and missing executables', { skip: !gcc }, async t => {
  const controller = new AbortController();
  const dir = await temporary(t), file = path.join(dir, 'normal.c');
  const binary = path.join(dir, process.platform === 'win32' ? 'normal.exe' : 'normal');
  // Use the runner's actual C contract, not a platform system binary's loader requirements.
  await fs.writeFile(file, 'int main(void) { return 0; }\n');
  const compiled = spawnSync('gcc', ['-std=c11', '-Wall', '-Wextra', '-Werror', '-Wpedantic', file, '-o', binary], { encoding: 'utf8' });
  assert.equal(compiled.status, 0, compiled.stderr);
  const result = await runSubmission(binary, [], { cwd: dir, abortSignal: controller.signal });
  assert.equal(result.status, 0, JSON.stringify(result));
  assert.equal(getEventListeners(controller.signal, 'abort').length, 0);
  const missing = await runSubmission('/codeweave-no-such-executable', [], { abortSignal: controller.signal });
  assert.notEqual(missing.status, 0);
  assert.equal(getEventListeners(controller.signal, 'abort').length, 0);
  controller.abort();
  assert.equal(result.error, undefined);
});

test('actual C HTTP disconnect stops execution, holds admission during cleanup and permits a clean resubmission', {
  skip: !posix || !gcc, timeout: 20000
}, async t => {
  const parent = await temporary(t), project = fileURLToPath(new URL('../', import.meta.url));
  const hook = `import fs from 'node:fs/promises';
    import { syncBuiltinESMExports } from 'node:module';
    const originalRemove = fs.rm, originalTimer = globalThis.setTimeout;
    // Test-only extended deadline distinguishes disconnect from ordinary timeout.
    globalThis.setTimeout = (fn, ms, ...args) => originalTimer(fn, ms === 1300 ? 8000 : ms, ...args);
    let first = true;
    fs.rm = async (dir, options) => {
      if (first && String(dir).split('/').at(-1).startsWith('codeweave-')) {
        first = false;
        await fs.writeFile(${JSON.stringify(path.join(parent, 'cleanup-start'))}, String(dir));
        await new Promise(resolve => process.stdin.once('data', resolve));
        const value = await originalRemove(dir, options);
        await fs.writeFile(${JSON.stringify(path.join(parent, 'cleanup-done'))}, 'done');
        return value;
      }
      return originalRemove(dir, options);
    };
    syncBuiltinESMExports();`;
  const child = spawn(process.execPath, ['--import', 'data:text/javascript,' + encodeURIComponent(hook), 'dev-server.mjs'], {
    cwd: project, env: { ...process.env, PORT: '0', TMPDIR: parent, TEMP: parent, TMP: parent }, stdio: ['pipe', 'pipe', 'pipe']
  });
  let ownedPids = [];
  t.after(async () => {
    if (ownedPids.length === 2 && ownedPids.every(pid => Number.isInteger(pid) && pid > 1)) {
      try { process.kill(-ownedPids[0], 'SIGKILL'); }
      catch (error) { if (error.code !== 'ESRCH') throw error; }
    }
    if (child.exitCode === null && child.signalCode === null) { const ended = once(child, 'exit'); child.kill(); await ended; }
  });
  let stdout = '', stderr = '';
  child.stdout.on('data', chunk => { stdout += chunk; });
  child.stderr.on('data', chunk => { stderr += chunk; });
  const url = await until(() => stdout.match(/http:\/\/127\.0\.0\.1:\d+/)?.[0], 'server did not start');
  const page = await (await fetch(url)).text();
  const token = page.match(/name="codeweave-token" content="([0-9a-f]{64})"/)?.[1];
  assert.ok(token);
  const headers = { 'Content-Type': 'application/json', 'X-CodeWeave-Token': token };
  const body = JSON.stringify({ exerciseId: 'c-hello', code: source });
  const client = http.request(url + '/api/grade', { method: 'POST', headers });
  client.on('error', () => {});
  client.end(body);
  let workspace;
  try {
    workspace = await until(async () => {
      for (const name of await fs.readdir(parent)) {
        if (name.startsWith('codeweave-') && await read(path.join(parent, name, 'pids.txt'))) return path.join(parent, name);
      }
      return '';
    }, 'HTTP C family did not start');
    const pids = (await read(path.join(workspace, 'pids.txt'))).trim().split(/\s+/).map(Number);
    ownedPids = pids;
    client.destroy();
    await until(() => read(path.join(parent, 'cleanup-start')), 'disconnect did not start cleanup before extended deadline');
    for (const pid of pids) assert.equal(await alive(pid), false, 'cleanup started before process family stopped');
    const submit = code => fetch(url + '/api/grade', { method: 'POST', headers,
      body: JSON.stringify({ exerciseId: 'c-hello', code }), signal: AbortSignal.timeout(5000) });
    const blocked = await submit('int main(void){return 0;}');
    assert.equal(blocked.status, 429);
    await blocked.arrayBuffer();
    assert.equal(await read(path.join(parent, 'cleanup-done')), '');
    child.stdin.write('release\n');
    await until(() => read(path.join(parent, 'cleanup-done')), 'cleanup did not complete');
    await assert.rejects(fs.stat(workspace), { code: 'ENOENT' });
    const accepted = await submit('#include <stdio.h>\nint main(void){puts("Hello, CodeWeave!");}');
    assert.equal(accepted.status, 200);
    assert.equal((await accepted.json()).ok, true);
    assert.ok(!(await fs.readdir(parent)).some(name => name.startsWith('codeweave-')));
    assert.doesNotMatch(stderr, /unhandled|ERR_HTTP_HEADERS_SENT|ERR_STREAM_WRITE_AFTER_END/i);
  } finally { client.destroy(); child.stdin.write('release\n'); }
});

test('request cancellation reaches internal Rust service and preserves the shared slot until cleanup', async () => {
  const { createRequestCancellation } = await api();
  const { createRustGradingService } = await import('../server/rust-service.mjs');
  const { gradingAdmission } = await import('../server/grading-admission.mjs');
  const { req, res } = endpoints(), lifetime = createRequestCancellation(req, res);
  const cases = Array.from({ length: 8 }, (_, i) => ({ id: `case_0${i}`, label: 'case' }));
  const payload = { exerciseId: 'disconnect-fixture', code: 'pub fn value() {}' };
  const definitions = new Map([[payload.exerciseId, { id: payload.exerciseId, language: 'rust', grader: 'cargo-test',
    starter: payload.code, harness: '// synthetic trusted grader', cases }]]);
  let finish, observed;
  const service = createRustGradingService({ enabled: true, definitions, grade: (_r, _d, { signal }) => {
    observed = signal;
    return new Promise(resolve => { finish = () => resolve({ ok: true, message: '8/8', compileOutput: '',
      tests: cases.map(() => ({ passed: true, detail: '통과' })) }); });
  } });
  const rejected = assert.rejects(service.submit(payload, { signal: lifetime.signal }), { code: 'RUST_CANCELLED' });
  try {
    res.emit('close');
    assert.equal(observed.aborted, true);
    assert.equal(gradingAdmission.busy, true);
    await assert.rejects(service.submit(payload), { code: 'RUST_BUSY' });
  } finally { finish(); await rejected; lifetime.dispose(); }
  assert.equal(gradingAdmission.busy, false);
  assert.equal(req.listenerCount('aborted') + res.listenerCount('close'), 0);
});

const cargo = spawnSync('cargo', ['--version'], { timeout: 3000 }).status === 0;
test('real Rust case receives response-close cancellation through service and pipeline before workspace removal', {
  skip: !cargo && process.env.CODEWEAVE_REQUIRE_RUST !== '1' ? 'Cargo unavailable locally; mandatory in CI' : false,
  timeout: 30000
}, async t => {
  const { createRequestCancellation } = await api();
  const { createRustGradingService } = await import('../server/rust-service.mjs');
  const { gradeRustInternal } = await import('../server/rust-pipeline.mjs');
  const { gradingAdmission } = await import('../server/grading-admission.mjs');
  const { trustedRustObserver } = await import('./helpers/rust-pipeline.mjs');
  const real = await trustedRustObserver(), parent = await temporary(t), marker = path.join(parent, 'rust-pid');
  const { req, res } = endpoints(), lifetime = createRequestCancellation(req, res);
  const cases = Array.from({ length: 8 }, (_, i) => ({ id: `case_0${i}`, label: 'case' }));
  const payload = { exerciseId: 'real-disconnect-fixture', code: 'pub fn value() -> i32 { 2 }' };
  const harness = cases.map(tc => `#[test] fn ${tc.id}() { ${tc.id === 'case_00'
    ? `std::fs::write(${JSON.stringify(marker)}, std::process::id().to_string()).unwrap(); std::thread::sleep(std::time::Duration::from_secs(10));`
    : 'assert_eq!(codeweave_submission::value(), 2);'} }`).join('\n');
  const definitions = new Map([[payload.exerciseId, { id: payload.exerciseId, language: 'rust', grader: 'cargo-test',
    starter: payload.code, harness, cases }]]);
  const stages = [];
  let cancellation;
  const service = createRustGradingService({ enabled: true, definitions, grade: (request, registry, { signal }) =>
    gradeRustInternal(request, registry, { parent, signal, observe: event => {
      stages.push(event.stage);
      const output = real(event);
      if (event.stage === 'case') cancellation ??= until(() => read(marker), 'Rust case did not start').then(() => {
        res.emit('close');
        assert.equal(gradingAdmission.busy, true);
      });
      return output;
    } }) });
  try {
    await assert.rejects(service.submit(payload, { signal: lifetime.signal }), { code: 'RUST_CANCELLED' });
    await cancellation;
    assert.deepEqual(stages, ['compile', 'list', 'list-ignored', 'case']);
    assert.equal(await alive(Number(await read(marker))), false);
    assert.deepEqual(await fs.readdir(parent), ['rust-pid']);
    assert.equal(gradingAdmission.busy, false);
  } finally { lifetime.dispose(); }
  assert.equal(req.listenerCount('aborted') + res.listenerCount('close'), 0);
});
