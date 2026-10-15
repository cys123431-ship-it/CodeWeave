import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import { createRustPlan } from '../server/rust-contract.mjs';
import { prepareRustWorkspace, selectRustArtifact, validateRustListing, checkRustToolchain } from '../server/rust-preparation.mjs';
import { recordIteration, normalizeIterations } from '../src/iterations.js';
import { lessonLearningStatus } from '../src/mastery.js';

const api = () => import('../server/rust-results.mjs');
const cases = Array.from({ length: 8 }, (_, i) => ({ id: `case_0${i}`, label: `fixture ${i}` }));
const source = 'pub fn value() -> i32 { 2 }\n';
const harness = cases.map(c => `#[test]\nfn ${c.id}() { assert_eq!(codeweave_submission::value(), 2); }`).join('\n');
const request = { exerciseId: 'rust-result-fixture', code: source };
const registry = text => new Map([[request.exerciseId, { ...request, id: request.exerciseId, language: 'rust', grader: 'cargo-test', starter: source, harness: text ?? harness, cases }]]);
const plan = () => createRustPlan(request, registry());
const out = (stdout, status = 0) => ({ status, signal: null, stdout, stderr: '' });
const report = (id, passed = true) => `\nrunning 1 test\ntest ${id} ... ${passed ? 'ok' : 'FAILED'}\n\ntest result: ${passed ? 'ok' : 'FAILED'}. ${passed ? 1 : 0} passed; ${passed ? 0 : 1} failed; 0 ignored; 0 measured; 7 filtered out; finished in 0.00s\n\n`;

test('Rust case verdict requires a matching one-test report and consistent process exit', async () => {
  const { classifyRustCase } = await api();
  assert.deepEqual(classifyRustCase('case_00', out(report('case_00')), 8), { passed: true, fatal: false, detail: '테스트 통과' });
  const failed = classifyRustCase('case_00', out(report('case_00', false), 101), 8);
  assert.equal(failed.passed, false);
  assert.equal(failed.fatal, false);
  assert.match(failed.detail, /단언 실패/);
});

test('Rust case verdict rejects zero, ignored, duplicate, mismatched and forged-success reports', async () => {
  const { classifyRustCase } = await api();
  for (const stdout of ['', 'all passed', report('case_01'), report('case_00') + report('case_00'),
    report('case_00').replace('running 1 test', 'running 0 tests'), report('case_00') + 'test other ... ok\n',
    report('case_00').replace('1 passed', '0 passed'), report('case_00').replace('0 ignored', '1 ignored'),
    report('case_00').replace('7 filtered out', '0 filtered out')]) {
    assert.equal(classifyRustCase('case_00', out(stdout), 8).fatal, true);
  }
  assert.equal(classifyRustCase('case_00', out(report('case_00'), 101), 8).passed, false);
  assert.equal(classifyRustCase('case_00', out(report('case_00', false), 0), 8).fatal, true);
});

test('Rust case verdict treats time, output and signal failures as fatal despite valid-looking output', async () => {
  const { classifyRustCase } = await api();
  for (const change of [{ error: { code: 'ETIMEDOUT' } }, { error: { code: 'ENOBUFS' } },
    { signal: 'SIGKILL' }, { status: 3 }, { stdout: '한'.repeat(27000) }]) {
    const result = classifyRustCase('case_00', { ...out(report('case_00')), ...change }, 8);
    assert.equal(result.passed, false);
    assert.equal(result.fatal, true);
  }
});

test('Rust collection continues after an assertion failure and preserves the full denominator', async () => {
  const { runRustCases, buildRustResult } = await api();
  const called = [];
  const p = plan();
  const tests = await runRustCases(p, async tc => { called.push(tc.id); return out(report(tc.id, tc.id !== 'case_00'), tc.id === 'case_00' ? 101 : 0); });
  assert.equal(called.length, 8);
  assert.equal(tests.length, 8);
  const result = buildRustResult(p, out(''), tests);
  assert.equal(result.ok, false);
  assert.equal(result.message, '7/8개 테스트 통과');
});

test('Rust collection stops on a fatal case and fills every remaining case as unexecuted', async () => {
  const { runRustCases, buildRustResult } = await api();
  let called = 0;
  const p = plan();
  const tests = await runRustCases(p, async tc => ++called === 1 ? out(report(tc.id)) : { ...out(''), error: { code: 'ETIMEDOUT' } });
  assert.equal(called, 2);
  assert.equal(tests.length, 8);
  assert.ok(tests.slice(2).every(tc => tc.passed === false && tc.detail === '미실행'));
  assert.equal(buildRustResult(p, out(''), tests).message, '1/8개 테스트 통과');
});

test('Rust collection has no default host executor and propagates infrastructure failure', async () => {
  const { runRustCases, classifyRustCase, buildRustResult } = await api();
  await assert.rejects(runRustCases(plan()), /관찰|실행/);
  await assert.rejects(runRustCases(plan(), async () => { throw Error('tool missing'); }), /tool missing/);
  assert.throws(() => classifyRustCase('case_00', { ...out(''), error: { code: 'ENOENT' } }, 8), /운영/);
  for (const code of ['ENOENT', 'ELIMIT']) {
    assert.throws(() => buildRustResult(plan(), { ...out(''), error: { code } }), /운영/);
  }
});

test('Rust compile failure keeps original Cargo diagnostics and all cases unexecuted', async () => {
  const { buildRustResult } = await api();
  const diagnostic = 'error[E0308]: mismatched types\n';
  const compilation = { ...out(JSON.stringify({ reason: 'compiler-message', message: { rendered: diagnostic } }), 101), stderr: 'could not compile\n' };
  const result = buildRustResult(plan(), compilation);
  assert.equal(result.ok, false);
  assert.equal(result.message, '0/8개 테스트 통과 · 컴파일 실패');
  assert.match(result.compileOutput, /E0308/);
  assert.match(result.compileOutput, /could not compile/);
  assert.ok(result.tests.length === 8 && result.tests.every(tc => tc.detail === '미실행'));
  assert.equal(result.compilerFeedback, undefined, 'Rust diagnostics must not be misclassified as C');
});

test('Rust aggregate rejects incomplete results instead of awarding empty or partial success', async () => {
  const { buildRustResult } = await api();
  for (const tests of [[], [{ passed: true, detail: 'ok' }], Array(8).fill({ passed: 'yes', detail: 'ok' })]) {
    assert.throws(() => buildRustResult(plan(), out(''), tests), /결과/);
  }
  assert.equal(buildRustResult(plan(), out(''), Array(8).fill({ passed: true, detail: 'ok' })).ok, true);
});

test('Rust-shaped results round-trip existing v1 attempts without activating Rust mastery', async () => {
  const { buildRustResult } = await api();
  const p = plan();
  let history = recordIteration({}, 'rust-mut', source, buildRustResult(p, out(''), Array(8).fill({ passed: true, detail: '테스트 통과' })), '2026-10-15T21:05:00.000Z');
  history = recordIteration(history, 'rust-mut', source, buildRustResult(p, out('', 101)), '2026-10-15T21:06:00.000Z');
  const normalized = normalizeIterations(JSON.parse(JSON.stringify(history)), ['rust-mut']);
  assert.deepEqual(normalized['rust-mut'].map(entry => entry.passed), [false, true]);
  assert.equal(normalized['rust-mut'][0].tests.length, 8);
  assert.equal(lessonLearningStatus('rust-mut', { completed: ['rust-mut'], theoryRead: ['rust-mut'] }, normalized, false).mastered, false);
});

const cargo = spawnSync('cargo', ['--version'], { encoding: 'utf8', timeout: 3000 });
const rustc = spawnSync('rustc', ['--version'], { encoding: 'utf8', timeout: 3000 });
test('Rust process diagnostic retains timeout metadata even when stderr is nonempty', async () => {
  const { formatRustProcessFailure } = await api();
  const diagnostic = JSON.parse(formatRustProcessFailure({ status: null, signal: 'SIGTERM',
    error: { code: 'ETIMEDOUT' }, stdout: 'artifact message', stderr: 'Compiling fixture' }));
  assert.equal(diagnostic.code, 'ETIMEDOUT');
  assert.equal(diagnostic.signal, 'SIGTERM');
  assert.equal(diagnostic.status, null);
  assert.equal(diagnostic.stdout, 'artifact message');
  assert.equal(diagnostic.stderr, 'Compiling fixture');
});
test('Real Rust case bodies distinguish all-pass, assertion failure and early exit without a libtest report', {
  skip: (cargo.status !== 0 || rustc.status !== 0) && process.env.CODEWEAVE_REQUIRE_RUST !== '1' ? 'Cargo/rustc unavailable locally; mandatory in CI' : false,
  timeout: 90000
}, async t => {
  const { runRustCases, buildRustResult, formatRustProcessFailure } = await api();
  console.log('Rust result fixture toolchain:', checkRustToolchain(cargo, rustc));
  const parent = await fs.mkdtemp(path.join(os.tmpdir(), 'codeweave-rust-results-'));
  t.after(() => fs.rm(parent, { recursive: true, force: true }));
  const bad = harness.replace('assert_eq!(codeweave_submission::value(), 2)', 'assert_eq!(codeweave_submission::value(), 3)');
  const early = harness.replace('assert_eq!(codeweave_submission::value(), 2)', 'std::process::exit(0)');
  for (const [text, expected] of [[harness, 8], [bad, 7], [early, 0]]) {
    const workspace = await prepareRustWorkspace(request, registry(text), parent);
    const env = { PATH: process.env.PATH, HOME: process.env.HOME, RUSTUP_HOME: process.env.RUSTUP_HOME,
      CARGO_HOME: path.join(parent, 'cargo-home'), CARGO_TARGET_DIR: workspace.targetDir, ...workspace.plan.environment };
    const options = { cwd: workspace.dir, env, encoding: 'utf8', timeout: 2000, maxBuffer: 80000 };
    const compiled = spawnSync('cargo', workspace.plan.compile.args, { ...options, timeout: 15000 });
    assert.equal(compiled.status, 0, formatRustProcessFailure(compiled));
    const binary = await selectRustArtifact(compiled.stdout, workspace);
    validateRustListing(spawnSync(binary, workspace.plan.list.args, options), spawnSync(binary, workspace.plan.listIgnored.args, options), cases);
    const tests = await runRustCases(workspace.plan, tc => spawnSync(binary, tc.args, options));
    const result = buildRustResult(workspace.plan, compiled, tests);
    assert.equal(tests.filter(tc => tc.passed).length, expected);
    assert.equal(result.ok, expected === 8);
    assert.equal(result.tests.length, 8);
    if (expected === 0) assert.ok(tests.slice(1).every(tc => tc.detail === '미실행'));
  }
});
