import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { getEventListeners } from 'node:events';
import { observeProcess } from './helpers/observe-process.mjs';
import { gradeRustInternal } from '../server/rust-pipeline.mjs';
import { linuxProcessAlive } from './helpers/linux-process-alive.mjs';

const posix = ['linux', 'darwin'].includes(process.platform);
async function temporary(t) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'codeweave-cancel-test-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  return dir;
}
async function ready(file) {
  const end = Date.now() + 2000;
  while (Date.now() < end) {
    try { return JSON.parse(await fs.readFile(file, 'utf8')); } catch {}
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  throw Error('Trusted fixture did not become ready');
}
async function alive(pid) {
  if (process.platform === 'linux') return linuxProcessAlive(pid);
  try { process.kill(pid, 0); } catch (error) { if (error.code === 'ESRCH') return false; throw error; }
  const state = spawnSync('/bin/ps', ['-o', 'stat=', '-p', String(pid)], { encoding: 'utf8' }).stdout.trim();
  return !!state && !state.startsWith('Z');
}
const family = marker => `const {spawn}=require('node:child_process');
const child=spawn(process.execPath,['-e','setInterval(()=>{},1000)'],{stdio:'ignore'});
require('node:fs').writeFileSync(${JSON.stringify(marker)},JSON.stringify([process.pid,child.pid]));
setInterval(()=>{},1000);`;

test('trusted observer rejects malformed cancellation signals before spawn', () => {
  assert.throws(() => observeProcess(process.execPath, ['-e', ''], { abortSignal: { aborted: true } }), /signal/i);
});

test('trusted observer pre-aborted signal never starts a process or creates its marker', async t => {
  const dir = await temporary(t), marker = path.join(dir, 'must-not-exist');
  const controller = new AbortController();
  controller.abort(new Error('private cancellation reason'));
  const result = await observeProcess(process.execPath, ['-e', `require('node:fs').writeFileSync(${JSON.stringify(marker)},'started')`], {
    abortSignal: controller.signal, timeout: 3000
  });
  assert.equal(result.error?.code, 'ABORT_ERR');
  assert.equal(result.error?.name, 'AbortError');
  assert.equal(result.observation.pid, null);
  assert.doesNotMatch(result.error.message, /private/);
  await assert.rejects(fs.stat(marker), { code: 'ENOENT' });
  assert.equal(getEventListeners(controller.signal, 'abort').length, 0);
});

test('trusted observer active abort kills the POSIX parent and descendants before its deadline', { skip: !posix }, async t => {
  const dir = await temporary(t), marker = path.join(dir, 'pids.json');
  const controller = new AbortController();
  const pending = observeProcess(process.execPath, ['-e', family(marker)], { abortSignal: controller.signal, timeout: 3000 });
  const pids = await ready(marker);
  assert.ok(pids.every(Number.isInteger));
  const start = Date.now();
  controller.abort();
  const result = await pending;
  assert.equal(result.error?.code, 'ABORT_ERR');
  assert.ok(Date.now() - start < 1500, 'abort must not wait for the original 3-second deadline');
  for (const pid of pids) assert.equal(await alive(pid), false, 'live process left after cancellation: ' + pid);
  assert.equal(getEventListeners(controller.signal, 'abort').length, 0);
});

test('trusted observer removes abort listeners after success and spawn errors', async () => {
  const controller = new AbortController();
  const success = await observeProcess(process.execPath, ['-e', ''], { abortSignal: controller.signal });
  const missing = await observeProcess('/codeweave-missing-cancel-fixture', [], { abortSignal: controller.signal });
  assert.equal(success.status, 0);
  assert.equal(missing.error.code, 'ENOENT');
  assert.equal(getEventListeners(controller.signal, 'abort').length, 0);
  controller.abort();
  assert.equal(success.error, undefined);
});

test('internal Rust lifecycle active-stage cancellation waits for group cleanup then removes its owned workspace', {
  skip: !posix
}, async t => {
  const parent = await temporary(t), marker = path.join(parent, 'pids.json'), controller = new AbortController();
  const cases = Array.from({ length: 8 }, (_, i) => ({ id: `case_0${i}`, label: 'fixture' }));
  const request = { exerciseId: 'cancel-fixture', code: 'pub fn value() {}' };
  const definitions = new Map([[request.exerciseId, { id: request.exerciseId, language: 'rust', grader: 'cargo-test',
    starter: request.code, harness: '// trusted synthetic observer does not compile', cases }]]);
  const stages = [];
  const pending = gradeRustInternal(request, definitions, { parent, signal: controller.signal, observe: event => {
    stages.push(event.stage);
    return observeProcess(process.execPath, ['-e', family(marker)], {
      cwd: event.workspace.dir, abortSignal: event.signal, timeout: 3000
    });
  } });
  // Attach a rejection handler before requesting cancellation.
  const rejected = assert.rejects(pending, { name: 'AbortError' });
  const pids = await ready(marker);
  const start = Date.now();
  controller.abort();
  await rejected;
  assert.ok(Date.now() - start < 1500, 'pipeline cancellation must not wait for the original deadline');
  assert.deepEqual(stages, ['compile']);
  for (const pid of pids) assert.equal(await alive(pid), false);
  assert.deepEqual(await fs.readdir(parent), ['pids.json']);
});

const available = spawnSync('cargo', ['--version'], { timeout: 3000 }).status === 0;
test('real trusted Rust case cancellation propagates through the CI adapter and cleans the workspace', {
  skip: !available && process.env.CODEWEAVE_REQUIRE_RUST !== '1' ? 'Cargo unavailable locally; mandatory in CI' : false,
  timeout: 30000
}, async t => {
  const { trustedRustObserver } = await import('./helpers/rust-pipeline.mjs');
  const real = await trustedRustObserver(), parent = await temporary(t), marker = path.join(parent, 'ready.json');
  const controller = new AbortController(), stages = [];
  const cases = Array.from({ length: 8 }, (_, i) => ({ id: `case_0${i}`, label: 'fixture' }));
  const source = 'pub fn value() -> i32 { 2 }';
  const harness = cases.map(tc => `#[test] fn ${tc.id}() { ${tc.id === 'case_00'
    ? `std::fs::write(${JSON.stringify(marker)}, std::process::id().to_string()).unwrap(); std::thread::sleep(std::time::Duration::from_secs(10));`
    : 'assert_eq!(codeweave_submission::value(), 2);'} }`).join('\n');
  const request = { exerciseId: 'real-cancel-fixture', code: source };
  const definitions = new Map([[request.exerciseId, { id: request.exerciseId, language: 'rust', grader: 'cargo-test',
    starter: source, harness, cases }]]);
  let cancellation;
  const pending = gradeRustInternal(request, definitions, { parent, signal: controller.signal, observe: event => {
    stages.push(event.stage);
    const result = real(event);
    if (event.stage === 'case') cancellation ??= ready(marker).then(() => controller.abort());
    return result;
  } });
  await assert.rejects(pending, { name: 'AbortError' });
  await cancellation;
  const pid = Number(await fs.readFile(marker, 'utf8'));
  assert.equal(await alive(pid), false);
  assert.deepEqual(stages, ['compile', 'list', 'list-ignored', 'case']);
  assert.deepEqual(await fs.readdir(parent), ['ready.json']);
});
