import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { gradeRustInternal } from '../server/rust-pipeline.mjs';
import { trustedRustTools } from './helpers/rust-tools.mjs';
import { rustBuildBudget } from './helpers/rust-build-budget.mjs';
import { withRustFixtureLinker } from './helpers/rust-fixture-linker.mjs';
import { observeProcess } from './helpers/observe-process.mjs';

const available = spawnSync('cargo', ['--version'], { timeout: 3000 }).status === 0;
test('Real trusted Cargo CPU exhaustion stops compilation before enumeration and cleans owned files', {
  skip: !available && process.env.CODEWEAVE_REQUIRE_RUST !== '1' ? 'Cargo unavailable locally; mandatory in CI' : false,
  timeout: 30000
}, async t => {
  const tools = await trustedRustTools();
  const parent = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'codeweave-cargo-cpu-')));
  t.after(() => fs.rm(parent, { recursive: true, force: true }));
  const request = { exerciseId: 'cargo-cpu-fixture', code: `#![allow(long_running_const_eval)]
pub fn value() -> i32 {
    const VALUE: u64 = { let mut n = 0; while n < 1_000_000_000 { n += 1; } n };
    VALUE as i32
}` };
  const cases = Array.from({ length: 8 }, (_, i) => ({ id: `case_0${i}`, label: `fixture ${i}` }));
  const definitions = new Map([[request.exerciseId, { id: request.exerciseId, language: 'rust', grader: 'cargo-test',
    starter: request.code, cases,
    harness: cases.map(c => `#[test] fn ${c.id}() { assert_eq!(codeweave_submission::value(), 2); }`).join('\n') }]]);
  await fs.writeFile(path.join(parent, 'keep'), 'user file');
  const stages = [];
  let observed;
  const result = await gradeRustInternal(request, definitions, { parent, observe: async event => {
    stages.push(event.stage);
    assert.equal(event.stage, 'compile');
    const env = withRustFixtureLinker({ PATH: process.env.PATH, HOME: process.env.HOME,
      RUSTUP_HOME: process.env.RUSTUP_HOME, ...event.workspace.plan.environment, RUSTC: tools.rustc,
      CARGO_HOME: path.join(event.workspace.dir, 'cargo-home'), CARGO_TARGET_DIR: event.workspace.targetDir });
    const call = rustBuildBudget(tools.cargo, event.workspace.plan.compile.args, { env, cpuSoftSeconds: 1 });
    observed = await observeProcess(call.command, call.args, { ...call, cwd: event.workspace.dir });
    console.log('CPU-constrained Cargo:', JSON.stringify({ status: observed.status, signal: observed.signal,
      code: observed.error?.code, diagnostic: observed.stderr.slice(-2000), observation: observed.observation }));
    assert.equal(observed.error, undefined, 'CPU probe must not substitute wall-clock or output overflow');
    // macOS Cargo reports only the numeric child signal; Linux can add its name.
    const childCpuExit = observed.status === 101 && new RegExp(
      `\\(signal: ${os.constants.signals.SIGXCPU}(?:, SIGXCPU:[^\\n]*)?\\)\\s*$`
    ).test(observed.stderr);
    assert.ok(observed.signal === 'SIGXCPU' || childCpuExit,
      'must observe actual Cargo/rustc CPU termination, not a source diagnostic');
    return observed;
  } });
  assert.equal(result.ok, false);
  assert.equal(result.tests.length, 8);
  assert.ok(result.tests.every(c => !c.passed && c.detail === '미실행'));
  assert.equal(result.message, `0/8개 테스트 통과 · ${observed.signal === 'SIGXCPU' ? '빌드 CPU 제한 초과' : '컴파일 실패'}`);
  assert.deepEqual(stages, ['compile']);
  assert.deepEqual(await fs.readdir(parent), ['keep']);
  assert.equal(await fs.readFile(path.join(parent, 'keep'), 'utf8'), 'user file');
});
