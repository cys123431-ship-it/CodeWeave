import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRustGradingDefinitions } from '../server/rust-exercises.mjs';
import { createRustPlan } from '../server/rust-contract.mjs';
import { createRustGradingService } from '../server/rust-service.mjs';
import { figureFor } from '../src/figures.js';

const load = () => import('../server/rust-mut-exercise.mjs');
const manuscript = () => fs.readFile(new URL('../content/rust/02-bindings.md', import.meta.url), 'utf8');
const cargo = spawnSync('cargo', ['--version'], { timeout: 3000 }).status === 0;
const rust = { skip: !cargo && process.env.CODEWEAVE_REQUIRE_RUST !== '1' ? 'Cargo unavailable locally; mandatory in CI' : false, timeout: 90000 };
const reference = `pub fn next_count(start: i32, step: i32) -> i32 {
    let mut current = start;
    current += step;
    current
}
pub fn is_nonnegative(value: i32) -> bool { value >= 0 }
`;

test('F02 preparation declares ten frozen independent scalar cases without changing F01 registration', async () => {
  const before = createRustGradingDefinitions();
  const { mutDefinition: d } = await load();
  assert.equal(d.id, 'rust-mut');
  assert.equal(d.grader, 'cargo-test');
  assert.equal(d.language, 'rust');
  assert.deepEqual(d.cases.map(c => c.id), Array.from({ length: 10 }, (_, i) => 'case_0' + i));
  assert.equal(new Set(d.cases.map(c => c.label)).size, 10);
  assert.ok(Object.isFrozen(d) && Object.isFrozen(d.cases) && d.cases.every(Object.isFrozen));
  assert.deepEqual([...createRustGradingDefinitions()], [...before]);
  assert.equal(before.has(d.id), false, 'prepared F02 cannot silently expand the F01 allowlist');
});
test('F02 preparation uses the existing frozen four-file offline Cargo plan', async () => {
  const { mutDefinition: d } = await load();
  const plan = createRustPlan({ exerciseId: d.id, code: reference }, new Map([[d.id, d]]));
  assert.equal(plan.executionEnabled, false);
  assert.deepEqual(plan.files.map(f => f.path), ['Cargo.toml', 'Cargo.lock', 'src/lib.rs', 'tests/codeweave.rs']);
  assert.equal(plan.files[3].content, d.harness);
  assert.equal(plan.runCases.length, 10);
  assert.equal(plan.environment.RUSTFLAGS, '-Dwarnings');
  assert.equal(plan.environment.CARGO_NET_OFFLINE, 'true');
  assert.ok(Object.isFrozen(plan.runCases));
});
test('F02 prepared service stays disabled and rejects client-owned harnesses', async () => {
  const { mutDefinition: d } = await load();
  const definitions = new Map([[d.id, d]]);
  const service = createRustGradingService({ definitions });
  await assert.rejects(service.submit({ exerciseId: d.id, code: reference }), { code: 'RUST_DISABLED' });
  assert.throws(() => createRustPlan({ exerciseId: d.id, code: reference, harness: 'override' }, definitions));
});
test('F02 roadmap records the manuscript and prepared executable evidence', async () => {
  const data = JSON.parse(await fs.readFile(new URL('../docs/roadmap.json', import.meta.url), 'utf8'));
  const unit = data.stages.find(s => s.id === 'F').units.find(u => u.id === 'F02');
  assert.ok(unit.manuscripts.includes('content/rust/02-bindings.md'));
  assert.ok(unit.tests.includes('tests/rust-mut-preparation.test.mjs'));
});
test('F02 original static diagram explains independent caller values and a changed local binding', () => {
  const svg = figureFor('rust-binding-copy');
  assert.match(svg, /^<svg[^>]+role="img"/);
  assert.match(svg, /aria-label="[^"]*바인딩/);
  assert.doesNotMatch(svg, /<script|<animate|foreignObject|onload=/i);
});
test('F02 manuscript preserves essential teaching headings and identifies a complete Rust program', async () => {
  const md = await manuscript();
  for (const heading of ['개요', '이론', '도식', '완성 프로그램', '출력', '오류', '퀴즈', '직접 풀기', 'Mini Project', '복습']) {
    assert.ok(md.split('\n').some(l => l.startsWith('## ') && l.includes(heading)), heading);
  }
  assert.ok(md.match(/```rust\n([\s\S]*?)\n```/));
});
test('real F02 Cargo rejects eight scalar mistakes and the starter but accepts mutable and immutable solutions', rust, async t => {
  const { mutDefinition: d } = await load();
  const published = (await manuscript()).match(/```rust\n([\s\S]*?)\n```/)[1].split('fn main()')[0];
  const { createLocalRustGradingService } = await import('../server/rust-executor.mjs');
  const { trustedRustTools } = await import('./helpers/rust-tools.mjs');
  const tools = await trustedRustTools();
  const parent = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'codeweave-f02-contract-')));
  t.after(() => fs.rm(parent, { recursive: true, force: true }));
  const service = await createLocalRustGradingService({ enabled: true, definitions: new Map([[d.id, d]]),
    sysroot: path.dirname(path.dirname(tools.rustc)), parent });
  const next = expression => `pub fn next_count(start:i32, step:i32)->i32 { let _=(start,step); ${expression} }\npub fn is_nonnegative(value:i32)->bool { value>=0 }`;
  const wrong = [d.starter, next('start-step'), next('start'), next('start+1'), next('(start+step).max(0)'),
    next('(start+step).min(1000)'), next('if start==3 && step == -5 { -2 } else { 0 }'),
    reference.replace('value >= 0', 'value > 0'), reference.replace('value >= 0', 'value < 0')];
  for (const [code, ok] of [...wrong.map(code => [code, false]), [published, true], [next('start+step'), true]]) {
    const result = await service.submit({ exerciseId: d.id, code });
    assert.equal(result.ok, ok, JSON.stringify(result));
    assert.equal(result.tests.length, 10);
    assert.ok(result.tests.every(c => c.detail !== '미실행'), 'wrong answers must reach actual assertions, not a build failure');
    assert.ok(result.tests.every(c => c.passed ? c.detail === '테스트 통과' : c.detail.startsWith('단언 실패 · ')));
    assert.deepEqual(await fs.readdir(parent), []);
    console.log('F02 actual Cargo:', JSON.stringify({ ok, passed: result.tests.filter(c => c.passed).length, total: 10 }));
  }
});
test('F02 complete manuscript program compiles with denied warnings and prints unchanged caller state', rust, async t => {
  const { trustedRustTools } = await import('./helpers/rust-tools.mjs');
  const tools = await trustedRustTools();
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'codeweave-f02-example-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  const source = path.join(dir, 'example.rs'), binary = path.join(dir, 'example');
  const program = (await manuscript()).match(/```rust\n([\s\S]*?)\n```/)[1];
  await fs.writeFile(source, program);
  const built = spawnSync(tools.rustc, ['--edition=2021', '-Dwarnings', source, '-o', binary], { encoding: 'utf8', timeout: 15000 });
  assert.equal(built.status, 0, built.stderr);
  const ran = spawnSync(binary, [], { encoding: 'utf8', timeout: 2000 });
  assert.equal(ran.status, 0, ran.stderr);
  assert.equal(ran.stdout, '3 -2 false\ntrue\n');
});
test('F02 reassignment without mut is a real compiler error rather than an invented runtime failure', rust, async t => {
  const { trustedRustTools } = await import('./helpers/rust-tools.mjs');
  const tools = await trustedRustTools();
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'codeweave-f02-error-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  const source = path.join(dir, 'bad.rs');
  await fs.writeFile(source, reference.replace('let mut current', 'let current') + '\nfn main() { println!("{}", next_count(3,-5)); }');
  const built = spawnSync(tools.rustc, ['--edition=2021', source, '-o', path.join(dir, 'bad')], { encoding: 'utf8', timeout: 15000 });
  assert.notEqual(built.status, 0);
  assert.match(built.stderr, /E0384/);
});
