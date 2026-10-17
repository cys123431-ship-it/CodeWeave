import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const api = () => import('../server/rust-pipeline.mjs');
const cases = Array.from({ length: 8 }, (_, i) => ({ id: `case_0${i}`, label: `fixture ${i}` }));
const code = 'pub fn value() -> i32 { 2 }\n';
const harness = cases.map(tc => `#[test]\nfn ${tc.id}() { assert_eq!(codeweave_submission::value(), 2); }`).join('\n');
const request = { exerciseId: 'rust-pipeline-fixture', code };
const registry = (text = harness) => new Map([[request.exerciseId, { id: request.exerciseId,
  language: 'rust', grader: 'cargo-test', starter: code, harness: text, cases }]]);
const out = (stdout = '', status = 0) => ({ stdout, stderr: '', status, signal: null });
const report = (id, passed = true) => `running 1 test\ntest ${id} ... ${passed ? 'ok' : 'FAILED'}\ntest result: ${passed ? 'ok' : 'FAILED'}. ${passed ? 1 : 0} passed; ${passed ? 0 : 1} failed; 0 ignored; 0 measured; 7 filtered out; finished in 0.00s\n`;
async function parent(t) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'codeweave-pipeline-test-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  return dir;
}
function observer(calls, override = () => undefined) {
  return async event => {
    calls.push(event.stage);
    const changed = await override(event);
    if (changed !== undefined) return changed;
    if (event.stage === 'compile') {
      const binary = path.join(event.workspace.targetDir, 'fixture');
      await fs.writeFile(binary, 'not executed by synthetic observer', { mode: 0o700 });
      return out(JSON.stringify({ reason: 'compiler-artifact', manifest_path: path.join(event.workspace.dir, 'Cargo.toml'),
        target: { name: 'codeweave', kind: ['test'] }, profile: { test: true }, executable: binary }) +
        '\n' + JSON.stringify({ reason: 'build-finished', success: true }));
    }
    if (event.stage === 'list') return out(cases.map(tc => tc.id + ': test\n').join(''));
    if (event.stage === 'list-ignored') return out();
    return out(report(event.test.id));
  };
}

test('Rust pipeline rejects invalid requests and missing observers before creating files', async t => {
  const { gradeRustInternal } = await api();
  const dir = await parent(t);
  const calls = [];
  await assert.rejects(gradeRustInternal({ ...request, files: [] }, registry(), { parent: dir, observe: observer(calls) }));
  await assert.rejects(gradeRustInternal(request, registry(), { parent: dir }));
  assert.deepEqual(calls, []);
  assert.deepEqual(await fs.readdir(dir), []);
});

test('Rust pipeline orders build, both listings and exact cases, then removes only its workspace', async t => {
  const { gradeRustInternal } = await api();
  const dir = await parent(t);
  await fs.writeFile(path.join(dir, 'keep'), 'user data');
  const calls = [];
  const result = await gradeRustInternal(request, registry(), { parent: dir, observe: observer(calls) });
  assert.deepEqual(calls, ['compile', 'list', 'list-ignored', ...cases.map(() => 'case')]);
  assert.equal(result.ok, true);
  assert.equal(result.tests.length, 8);
  assert.match(result.message, /8\/8/);
  assert.deepEqual(await fs.readdir(dir), ['keep']);
  assert.equal(await fs.readFile(path.join(dir, 'keep'), 'utf8'), 'user data');
});

test('Rust pipeline compile rejection keeps diagnostics and never enumerates or runs cases', async t => {
  const { gradeRustInternal } = await api();
  for (const change of [{ status: 101, stderr: 'error[E0308]: type mismatch' },
    { status: null, error: { code: 'ETIMEDOUT', message: 'build deadline' } }]) {
    const dir = await parent(t), calls = [];
    const result = await gradeRustInternal(request, registry(), { parent: dir,
      observe: observer(calls, () => ({ ...out(), ...change })) });
    assert.deepEqual(calls, ['compile']);
    assert.equal(result.ok, false);
    assert.ok(result.tests.every(tc => tc.detail === '미실행'));
    assert.match(result.compileOutput, /type mismatch|build deadline/);
    assert.deepEqual(await fs.readdir(dir), []);
  }
});

test('Rust pipeline rejects bad artifacts, listings and ignored cases before case execution and cleans up', async t => {
  const { gradeRustInternal } = await api();
  for (const stage of ['compile', 'list', 'list-ignored']) {
    const dir = await parent(t), calls = [];
    await assert.rejects(gradeRustInternal(request, registry(), { parent: dir,
      observe: observer(calls, event => event.stage === stage ? out('case_00: test\n') : undefined) }));
    assert.equal(calls.includes('case'), false);
    assert.deepEqual(await fs.readdir(dir), []);
  }
});

test('Rust pipeline rejects a failed first enumeration without launching the ignored enumeration', async t => {
  const { gradeRustInternal } = await api();
  const dir = await parent(t), calls = [];
  await assert.rejects(gradeRustInternal(request, registry(), { parent: dir,
    observe: observer(calls, event => event.stage === 'list' ? out('', 1) : undefined) }));
  assert.deepEqual(calls, ['compile', 'list']);
  assert.deepEqual(await fs.readdir(dir), []);
});

test('Rust pipeline continues after assertion failure but stops after a fatal case with full denominator', async t => {
  const { gradeRustInternal } = await api();
  for (const fatal of [false, true]) {
    const dir = await parent(t), calls = [];
    const result = await gradeRustInternal(request, registry(), { parent: dir,
      observe: observer(calls, event => event.stage === 'case' && event.test.id === 'case_00'
        ? fatal ? { ...out(), error: { code: 'ETIMEDOUT' } } : out(report('case_00', false), 101) : undefined) });
    assert.equal(result.ok, false);
    assert.equal(calls.filter(s => s === 'case').length, fatal ? 1 : 8);
    assert.equal(result.tests.length, 8);
    assert.equal(result.tests.filter(tc => tc.passed).length, fatal ? 0 : 7);
    if (fatal) assert.ok(result.tests.slice(1).every(tc => tc.detail === '미실행'));
    assert.deepEqual(await fs.readdir(dir), []);
  }
});

test('Rust pipeline propagates infrastructure exceptions and malformed observations after cleanup', async t => {
  const { gradeRustInternal } = await api();
  for (const failure of [() => { throw Error('observer failure'); }, () => null,
    () => ({ ...out(), error: { code: 'ENOENT' } })]) {
    const dir = await parent(t);
    await assert.rejects(gradeRustInternal(request, registry(), { parent: dir, observe: failure }));
    assert.deepEqual(await fs.readdir(dir), []);
  }
});

test('Rust pipeline cancellation at stage boundaries prevents subsequent stages and cleans up', async t => {
  const { gradeRustInternal } = await api();
  for (const abortAt of ['before', 'compile', 'case']) {
    const dir = await parent(t), calls = [], controller = new AbortController();
    if (abortAt === 'before') controller.abort();
    await assert.rejects(gradeRustInternal(request, registry(), { parent: dir, signal: controller.signal,
      observe: observer(calls, event => { if (event.stage === abortAt) controller.abort(); }) }), { name: 'AbortError' });
    assert.equal(calls.length, abortAt === 'before' ? 0 : abortAt === 'compile' ? 1 : 4);
    assert.deepEqual(await fs.readdir(dir), []);
  }
});

const available = spawnSync('cargo', ['--version'], { timeout: 3000 }).status === 0;
test('Real trusted Rust pipeline grades normal, assertion, syntax and warning submissions with workspace cleanup', {
  skip: !available && process.env.CODEWEAVE_REQUIRE_RUST !== '1' ? 'Cargo unavailable locally; mandatory in CI' : false,
  timeout: 90000
}, async t => {
  const { gradeRustInternal } = await api();
  const { trustedRustObserver } = await import('./helpers/rust-pipeline.mjs');
  const observe = await trustedRustObserver();
  const dir = await parent(t);
  for (const [source, expected] of [[code, 8], [code.replace('{ 2 }', '{ 3 }'), 0],
    ['pub fn value( {', 0], [code + 'fn unused_function() {}\n', 0]]) {
    const result = await gradeRustInternal({ ...request, code: source }, registry(), { parent: dir, observe });
    assert.equal(result.ok, expected === 8, JSON.stringify(result));
    assert.equal(result.tests.length, 8);
    assert.equal(result.tests.filter(tc => tc.passed).length, expected);
    if (source.includes('unused_function')) assert.match(result.compileOutput, /dead_code|never used/);
    assert.deepEqual(await fs.readdir(dir), []);
  }
});
