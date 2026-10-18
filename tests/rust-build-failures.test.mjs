import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { buildRustResult } from '../server/rust-results.mjs';
import { createRustPlan } from '../server/rust-contract.mjs';
import { gradeRustInternal } from '../server/rust-pipeline.mjs';
import { observeProcess } from './helpers/observe-process.mjs';
import { rustBuildBudget } from './helpers/rust-build-budget.mjs';
import { trustedRustTools } from './helpers/rust-tools.mjs';
import { withRustFixtureLinker } from './helpers/rust-fixture-linker.mjs';

const cases = Array.from({ length: 8 }, (_, i) => ({ id: `case_0${i}`, label: `fixture ${i}` }));
const request = { exerciseId: 'build-failure-fixture', code: 'pub fn value() -> i32 { 2 }' };
const definitions = new Map([[request.exerciseId, { id: request.exerciseId, language: 'rust',
  grader: 'cargo-test', starter: request.code, cases,
  harness: cases.map(c => `#[test] fn ${c.id}() { assert_eq!(codeweave_submission::value(), 2); }`).join('\n') }]]);
const plan = createRustPlan(request, definitions);
const output = change => ({ status: 101, signal: null, stdout: '', stderr: 'original diagnostic', ...change });
function failed(result, detail) {
  assert.equal(result.ok, false);
  assert.equal(result.message, `0/8개 테스트 통과 · ${detail}`);
  assert.equal(result.tests.length, 8);
  assert.ok(result.tests.every(t => !t.passed && t.detail === '미실행'));
}

test('Rust build time and output ceilings remain distinct from source compilation failures', () => {
  for (const [code, detail] of [['ETIMEDOUT', '빌드 시간 제한 초과'], ['ENOBUFS', '빌드 출력 크기 제한 초과']]) {
    const result = buildRustResult(plan, output({ error: { code, message: 'original observer failure' } }));
    failed(result, detail);
    assert.match(result.compileOutput, /original diagnostic/);
  }
});

test('Rust build signals identify only observed CPU or file limits and never infer memory exhaustion', () => {
  for (const [signal, detail] of [['SIGXCPU', '빌드 CPU 제한 초과'], ['SIGXFSZ', '빌드 파일 크기 제한 초과'],
    ['SIGKILL', '빌드 비정상 종료'], ['SIGABRT', '빌드 비정상 종료']]) {
    failed(buildRustResult(plan, output({ status: null, signal })), detail);
  }
});

test('Rust build infrastructure and cancellation errors propagate instead of becoming failed attempts', () => {
  for (const code of ['ENOENT', 'EACCES', 'ELIMIT', 'ECLEANUP', 'EIO', 'ABORT_ERR']) {
    const error = Object.assign(Error('private operator detail'), { code });
    assert.throws(() => buildRustResult(plan, output({ error })), e => e.code === code);
  }
  assert.throws(() => buildRustResult(plan, output({ status: 125 })), e => e.code === 'ELIMIT');
  assert.throws(() => buildRustResult(plan, output({ error: Error('unknown observer failure') })),
    e => e.code === 'ERUSTBUILD');
});

test('Cargo source diagnostics cannot forge structured build limit classifications', () => {
  const result = buildRustResult(plan, output({ stderr: 'SIGXCPU SIGXFSZ memory allocation failed ETIMEDOUT' }));
  failed(result, '컴파일 실패');
  assert.match(result.compileOutput, /memory allocation failed/);
});

async function parent(t) {
  const dir = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'codeweave-build-failure-')));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  return dir;
}

test('Internal Rust build deadline and output overflow stop before enumeration and remove owned files', async t => {
  for (const [source, detail] of [['setInterval(()=>{},1000)', '빌드 시간 제한 초과'],
    ['process.stdout.write("x".repeat(90000))', '빌드 출력 크기 제한 초과']]) {
    const dir = await parent(t), stages = [];
    const result = await gradeRustInternal(request, definitions, { parent: dir, observe: event => {
      stages.push(event.stage);
      return observeProcess(process.execPath, ['-e', source], { cwd: event.workspace.dir, timeout: 200 });
    } });
    failed(result, detail);
    assert.deepEqual(stages, ['compile']);
    assert.deepEqual(await fs.readdir(dir), []);
  }
});

const available = spawnSync('cargo', ['--version'], { timeout: 3000 }).status === 0;
test('Real trusted Cargo inherited file ceiling fails the build without enumerating cases and cleans its workspace', {
  skip: !available && process.env.CODEWEAVE_REQUIRE_RUST !== '1' ? 'Cargo unavailable locally; mandatory in CI' : false,
  timeout: 30000
}, async t => {
  const tools = await trustedRustTools();
  const dir = await parent(t), stages = [];
  let observed;
  const result = await gradeRustInternal(request, definitions, { parent: dir, observe: async event => {
    stages.push(event.stage);
    assert.equal(event.stage, 'compile');
    const env = withRustFixtureLinker({ PATH: process.env.PATH, HOME: process.env.HOME,
      RUSTUP_HOME: process.env.RUSTUP_HOME, ...event.workspace.plan.environment, RUSTC: tools.rustc,
      CARGO_HOME: path.join(event.workspace.dir, 'cargo-home'), CARGO_TARGET_DIR: event.workspace.targetDir });
    const call = rustBuildBudget(tools.cargo, event.workspace.plan.compile.args, { env });
    // Trusted fixture only: a lower inherited ceiling; never raise normal limits.
    const args = [...call.args];
    args[3] = 'ulimit -f 1 || exit 125;\n' + args[3];
    observed = await observeProcess(call.command, args, { ...call, cwd: event.workspace.dir });
    console.log('Constrained Cargo build:', JSON.stringify({ status: observed.status, signal: observed.signal,
      code: observed.error?.code, diagnostic: observed.stderr.slice(-1500) }));
    assert.notEqual(observed.status, 0);
    assert.notEqual(observed.status, 125, 'limit setup must succeed before testing Cargo failure');
    assert.equal(observed.error, undefined, 'must not substitute deadline/output overflow for file ceiling');
    assert.ok(observed.signal === 'SIGXFSZ' || /file too large|SIGXFSZ|signal: 25|File size limit/i.test(observed.stderr));
    return observed;
  } });
  failed(result, observed.signal === 'SIGXFSZ' ? '빌드 파일 크기 제한 초과' : '컴파일 실패');
  assert.deepEqual(stages, ['compile']);
  assert.deepEqual(await fs.readdir(dir), []);
});
