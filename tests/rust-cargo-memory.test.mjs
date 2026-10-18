import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRustPlan } from '../server/rust-contract.mjs';
import { gradeRustInternal } from '../server/rust-pipeline.mjs';
import { trustedRustObserver } from './helpers/rust-pipeline.mjs';

async function fixture() {
  const code = await fs.readFile(new URL('./fixtures/rust-build-memory.rs', import.meta.url), 'utf8');
  const request = { exerciseId: 'cargo-memory-fixture', code };
  const cases = Array.from({ length: 8 }, (_, i) => ({ id: `case_0${i}`, label: `fixture ${i}` }));
  const definitions = new Map([[request.exerciseId, { id: request.exerciseId, language: 'rust', grader: 'cargo-test',
    starter: code, cases,
    harness: cases.map(c => `#[test] fn ${c.id}() { assert_eq!(codeweave_submission::value(), 2); }`).join('\n') }]]);
  return { request, definitions };
}

test('Rust memory fixture obeys the bounded internal request contract without activating execution', async () => {
  const { request, definitions } = await fixture();
  const plan = createRustPlan(request, definitions);
  assert.equal(plan.executionEnabled, false);
  assert.equal(plan.runCases.length, 8);
  assert.equal(plan.files.find(file => file.path === 'src/lib.rs').content, request.code);
});

const available = spawnSync('cargo', ['--version'], { timeout: 3000 }).status === 0;
test('Real trusted Cargo memory exhaustion stops before enumeration and cleans only its owned workspace', {
  skip: !available && process.env.CODEWEAVE_REQUIRE_RUST !== '1' ? 'Cargo unavailable locally; mandatory in CI' : false,
  timeout: 30000
}, async t => {
  const { request, definitions } = await fixture();
  const parent = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'codeweave-cargo-memory-')));
  t.after(() => fs.rm(parent, { recursive: true, force: true }));
  await fs.writeFile(path.join(parent, 'keep'), 'user file');
  const run = await trustedRustObserver();
  const stages = [];
  let observed;
  const result = await gradeRustInternal(request, definitions, { parent, observe: async event => {
    stages.push(event.stage);
    assert.equal(event.stage, 'compile');
    observed = await run(event);
    console.log('Memory-constrained Cargo:', JSON.stringify({ status: observed.status, signal: observed.signal,
      code: observed.error?.code, diagnostic: observed.stderr.slice(-2000), observation: observed.observation }));
    assert.equal(observed.error, undefined, 'must not substitute wall-clock or output overflow for memory exhaustion');
    assert.equal(observed.status, 101, 'Cargo must report the failed compiler, not a missing tool or setup failure');
    assert.match(observed.stderr, /memory allocation of \d+ bytes failed|out of memory/i);
    return observed;
  } });
  assert.equal(result.ok, false);
  // Compiler allocation diagnostics do not become an authoritative memory verdict.
  assert.equal(result.message, '0/8개 테스트 통과 · 컴파일 실패');
  assert.equal(result.tests.length, 8);
  assert.ok(result.tests.every(c => !c.passed && c.detail === '미실행'));
  assert.deepEqual(stages, ['compile']);
  assert.deepEqual(await fs.readdir(parent), ['keep']);
  assert.equal(await fs.readFile(path.join(parent, 'keep'), 'utf8'), 'user file');
});
