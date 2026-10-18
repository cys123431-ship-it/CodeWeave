import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const api = () => import('../server/rust-service.mjs');
const request = { exerciseId: 'service-fixture', code: 'pub fn value() -> i32 { 2 }' };
const cases = Array.from({ length: 8 }, (_, i) => ({ id: `case_0${i}`, label: `fixture ${i}` }));
const definitions = new Map([[request.exerciseId, { id: request.exerciseId, language: 'rust', grader: 'cargo-test',
  starter: request.code, cases,
  harness: cases.map(c => `#[test] fn ${c.id}() { assert_eq!(codeweave_submission::value(), 2); }`).join('\n') }]]);
const result = (passed = true) => ({ ok: passed, message: `${passed ? 8 : 0}/8개 테스트 통과`, compileOutput: '',
  tests: cases.map(() => ({ passed, detail: passed ? '테스트 통과' : '단언 실패' })) });
const rejection = (code, statusCode) => error => error.code === code && error.statusCode === statusCode;
function latch() {
  let release;
  const promise = new Promise(resolve => { release = resolve; });
  return { promise, release };
}

test('Rust service defaults disabled and requires explicit boolean activation and an injected grader', async () => {
  const { createRustGradingService } = await api();
  let calls = 0;
  const service = createRustGradingService({ definitions, grade: () => { calls++; } });
  await assert.rejects(service.submit(request), rejection('RUST_DISABLED', 503));
  assert.equal(calls, 0);
  for (const enabled of ['true', 1, null]) assert.throws(() => createRustGradingService({ enabled, definitions }));
  assert.throws(() => createRustGradingService({ enabled: true, definitions }));
});

test('Rust service validates requests and pre-aborted signals before invoking the grader', async () => {
  const { createRustGradingService } = await api();
  let calls = 0;
  const service = createRustGradingService({ enabled: true, definitions, grade: () => { calls++; return result(); } });
  for (const value of [{ ...request, files: [] }, { ...request, exerciseId: 'unregistered' }, { ...request, code: 'x'.repeat(25001) }]) {
    await assert.rejects(service.submit(value), rejection('RUST_INVALID', 400));
  }
  await assert.rejects(service.submit(request, { signal: {} }), rejection('RUST_INVALID', 400));
  const controller = new AbortController();
  controller.abort('private reason');
  await assert.rejects(service.submit(request, { signal: controller.signal }), rejection('RUST_CANCELLED', 499));
  assert.equal(calls, 0);
  assert.equal((await service.submit(request)).ok, true);
});

test('Rust service admits one request without queueing and snapshots the submitted code', async () => {
  const { createRustGradingService } = await api();
  const gate = latch(), seen = [];
  const service = createRustGradingService({ enabled: true, definitions, grade: async value => {
    seen.push(value); await gate.promise; return result();
  } });
  const mutable = { ...request };
  const pending = service.submit(mutable);
  mutable.code = 'mutated after submission';
  await assert.rejects(service.submit(request), rejection('RUST_BUSY', 429));
  assert.equal(seen.length, 1);
  assert.equal(seen[0].code, request.code);
  assert.equal(Object.isFrozen(seen[0]), true);
  gate.release();
  assert.equal((await pending).ok, true);
  assert.equal((await service.submit(request)).ok, true);
});

test('Rust service cancellation keeps the slot until grader cleanup settles and discards late success', async () => {
  const { createRustGradingService } = await api();
  const gate = latch(), controller = new AbortController();
  let calls = 0, cleaned = false;
  const service = createRustGradingService({ enabled: true, definitions, grade: async (_r, _d, { signal }) => {
    calls++;
    if (calls === 1) assert.equal(signal, controller.signal);
    await gate.promise; cleaned = true; return result();
  } });
  const pending = assert.rejects(service.submit(request, { signal: controller.signal }), rejection('RUST_CANCELLED', 499));
  controller.abort(new Error('private cancellation reason'));
  await assert.rejects(service.submit(request), rejection('RUST_BUSY', 429));
  assert.equal(cleaned, false);
  assert.equal(calls, 1);
  gate.release(); await pending;
  assert.equal(cleaned, true);
  assert.equal((await service.submit(request)).ok, true);
  assert.equal(calls, 2);
});

test('Rust service hides infrastructure secrets and releases its slot after every grader exception', async () => {
  const { createRustGradingService } = await api();
  for (const failure of [Error('/private/workspace SECRET'), Object.assign(Error('cleanup SECRET'), { code: 'ERUSTCLEANUP' }), null]) {
    let calls = 0;
    const service = createRustGradingService({ enabled: true, definitions, grade: async () => {
      if (++calls === 1) throw failure;
      return result(false);
    } });
    await assert.rejects(service.submit(request), error => {
      assert.equal(error.code, 'RUST_UNAVAILABLE');
      assert.equal(error.statusCode, 503);
      assert.doesNotMatch(JSON.stringify(error) + error.message, /SECRET|private|workspace/);
      return true;
    });
    assert.equal((await service.submit(request)).ok, false);
  }
});

test('Rust service refuses partial, inconsistent or oversized results instead of creating grading success', async () => {
  const { createRustGradingService } = await api();
  const hostile = Object.defineProperty({}, 'ok', { get() { throw Error('SECRET result getter'); } });
  for (const invalid of [null, { ...result(), tests: [] }, { ...result(), ok: false },
    { ...result(), compileOutput: 'x'.repeat(3001) }, { ...result(), tests: cases.map(() => ({ passed: 'yes', detail: '' })) },
    { ...result(), tests: Array(8) }, hostile]) {
    let calls = 0;
    const service = createRustGradingService({ enabled: true, definitions, grade: async () => ++calls === 1 ? invalid : result() });
    await assert.rejects(service.submit(request), rejection('RUST_UNAVAILABLE', 503));
    assert.equal((await service.submit(request)).tests.length, 8);
  }
  let iterated = false;
  const oversized = new Proxy(Array(9), { get(target, key, receiver) {
    if (key === Symbol.iterator) iterated = true;
    return Reflect.get(target, key, receiver);
  } });
  const service = createRustGradingService({ enabled: true, definitions,
    grade: () => ({ ...result(), tests: oversized }) });
  await assert.rejects(service.submit(request), rejection('RUST_UNAVAILABLE', 503));
  assert.equal(iterated, false, 'reject a wrong case count before copying or invoking an iterator');
  const indexed = result();
  indexed.tests[Symbol.iterator] = () => { throw Error('SECRET custom iterator'); };
  const indexedService = createRustGradingService({ enabled: true, definitions, grade: () => indexed });
  assert.equal((await indexedService.submit(request)).ok, true, 'copy exactly the declared indexed cases, not an iterator');
});

const available = spawnSync('cargo', ['--version'], { timeout: 3000 }).status === 0;
test('Real trusted Rust service rejects overlap, preserves failed resubmission results and cleans workspaces', {
  skip: !available && process.env.CODEWEAVE_REQUIRE_RUST !== '1' ? 'Cargo unavailable locally; mandatory in CI' : false,
  timeout: 60000
}, async t => {
  const { createRustGradingService } = await api();
  const { gradeRustInternal } = await import('../server/rust-pipeline.mjs');
  const { trustedRustObserver } = await import('./helpers/rust-pipeline.mjs');
  const parent = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'codeweave-rust-service-')));
  t.after(() => fs.rm(parent, { recursive: true, force: true }));
  const observe = await trustedRustObserver(), entered = latch(), gate = latch();
  const service = createRustGradingService({ enabled: true, definitions, grade: (value, registry, options) =>
    gradeRustInternal(value, registry, { ...options, parent, observe: async event => {
      if (event.stage === 'compile') { entered.release(); await gate.promise; }
      return observe(event);
    } }) });
  const pending = service.submit(request);
  await entered.promise;
  await assert.rejects(service.submit(request), rejection('RUST_BUSY', 429));
  assert.equal((await fs.readdir(parent)).length, 1);
  gate.release();
  assert.equal((await pending).ok, true);
  assert.deepEqual(await fs.readdir(parent), []);
  const wrong = await service.submit({ ...request, code: request.code.replace('{ 2 }', '{ 3 }') });
  assert.equal(wrong.ok, false);
  assert.equal(wrong.tests.length, 8);
  assert.ok(wrong.tests.every(c => !c.passed));
  assert.deepEqual(await fs.readdir(parent), []);
});
