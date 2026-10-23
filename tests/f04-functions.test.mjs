import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createRustPlan } from '../server/rust-contract.mjs';
import { createRustGradingDefinitions, createRustBindingDefinitions } from '../server/rust-exercises.mjs';
import { createRustGradingService } from '../server/rust-service.mjs';
import { createLearningServer } from '../server/learning-server.mjs';
import { figureFor } from '../src/figures.js';

const load = () => import('../server/rust-functions-exercise.mjs');
const root = fileURLToPath(new URL('../', import.meta.url));
const reference = `pub fn line_total(unit_price: u32, quantity: u32) -> u32 {
    unit_price * quantity
}

pub fn checkout_total(unit_price: u32, quantity: u32, shipping: u32) -> u32 {
    line_total(unit_price, quantity) + shipping
}
`;
const cargo = spawnSync('cargo', ['--version'], { timeout: 3000 }).status === 0;
const rustOptions = {
  skip: !cargo && process.env.CODEWEAVE_REQUIRE_RUST !== '1' ? 'Cargo unavailable locally; mandatory in CI' : false,
  timeout: 60000
};

test('F04 prepared definition freezes ten independent cases without widening existing registries', async () => {
  const before = [...createRustBindingDefinitions()];
  const { functionDefinition: d, functionMetadata: m } = await load();
  assert.equal(d.id, 'rust-functions');
  assert.equal(d.language, 'rust');
  assert.equal(d.grader, 'cargo-test');
  assert.equal(d.cases.length, 10);
  assert.deepEqual(d.cases.map(c => c.id), Array.from({ length: 10 }, (_, i) => 'case_0' + i));
  assert.equal(new Set(d.cases.map(c => c.label)).size, 10);
  assert.ok(Object.isFrozen(d) && Object.isFrozen(d.cases) && d.cases.every(Object.isFrozen));
  assert.throws(() => { d.cases[0].label = 'forged'; }, TypeError);
  const plan = createRustPlan({ exerciseId: d.id, code: reference }, new Map([[d.id, d]]));
  assert.equal(plan.executionEnabled, false);
  assert.equal(plan.runCases.length, 10);
  assert.equal(plan.files.find(f => f.path === 'tests/codeweave.rs').content, d.harness);
  assert.deepEqual(m.publicExample, { input: 'checkout_total(250, 2, 80)', output: '580' });
  assert.deepEqual([...createRustBindingDefinitions()], before);
  assert.equal(createRustGradingDefinitions().has(d.id), false);
  assert.equal(createRustBindingDefinitions().has(d.id), false);
});

test('F04 prepared factory is fresh and preserves F01-F03 default factories', async () => {
  const { createRustFunctionDefinitions, functionDefinition: d } = await load();
  const first = createRustFunctionDefinitions(), second = createRustFunctionDefinitions();
  assert.deepEqual([...first.keys()], ['rust-cargo', 'rust-mut', 'rust-control-flow', d.id]);
  assert.equal(first.get(d.id), d);
  first.clear();
  assert.equal(second.size, 4);
  assert.deepEqual([...createRustGradingDefinitions().keys()], ['rust-cargo']);
  assert.deepEqual([...createRustBindingDefinitions().keys()], ['rust-cargo', 'rust-mut']);
});

test('F04 remains rejected before HTTP opt-in and its private definition is never served', async t => {
  const { functionDefinition: d } = await load();
  let calls = 0;
  const definitions = new Map([...createRustGradingDefinitions(), [d.id, d]]);
  const service = createRustGradingService({ enabled: true, definitions, grade: () => { calls++; throw Error('must not execute'); } });
  const app = createLearningServer({ root, rustService: service, rustExerciseIds: ['rust-cargo'] });
  t.after(() => app.close());
  const { port } = await app.listen(0), base = 'http://127.0.0.1:' + port;
  const html = await (await fetch(base)).text();
  const token = html.match(/name="codeweave-token" content="([a-f0-9]{64})"/)[1];
  const response = await fetch(base + '/api/grade/rust', { method: 'POST', headers: {
    'Content-Type': 'application/json', 'X-CodeWeave-Token': token
  }, body: JSON.stringify({ exerciseId: d.id, code: reference }) });
  assert.equal(response.status, 400);
  assert.equal(calls, 0);
  assert.equal((await fetch(base + '/server/rust-functions-exercise.mjs')).status, 404);
});

async function grade(t, code) {
  const { functionDefinition: d } = await load();
  const { trustedRustTools } = await import('./helpers/rust-tools.mjs');
  const { createLocalRustGradingService } = await import('../server/rust-executor.mjs');
  const tools = await trustedRustTools();
  const parent = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'codeweave-f04-')));
  t.after(() => fs.rm(parent, { recursive: true, force: true }));
  const service = await createLocalRustGradingService({ enabled: true, definitions: new Map([[d.id, d]]),
    sysroot: path.dirname(path.dirname(tools.rustc)), parent });
  const result = await service.submit({ exerciseId: d.id, code });
  assert.deepEqual(await fs.readdir(parent), []);
  assert.equal(result.tests.length, 10);
  assert.doesNotMatch(result.compileOutput, /(?:^|\n)(?:error|warning)(?:\[|:)/i);
  return result;
}

test('F04 actual Cargo accepts helper composition and an equivalent direct return', rustOptions, async t => {
  const direct = reference.replace('line_total(unit_price, quantity) + shipping', 'unit_price * quantity + shipping');
  for (const code of [reference, direct]) {
    const result = await grade(t, code);
    assert.equal(result.ok, true, JSON.stringify(result));
    assert.match(result.message, /10\/10/);
  }
});

const mutants = [
  ['adds instead of multiplying the line', s => s.replace('unit_price * quantity', 'unit_price + quantity')],
  ['omits shipping', s => s.replace('line_total(unit_price, quantity) + shipping', '{ let _ = shipping; line_total(unit_price, quantity) }')],
  ['returns only shipping', s => s.replace('line_total(unit_price, quantity) + shipping', '{ let _ = (unit_price, quantity); shipping }')],
  ['doubles shipping', s => s.replace('+ shipping', '+ shipping + shipping')],
  ['adds one item', s => s.replace('unit_price * quantity', 'unit_price * (quantity + 1)')],
  ['returns a fixed public example', s => s.replace('line_total(unit_price, quantity) + shipping', '{ let _ = (unit_price, quantity, shipping); 580 }')]
];
for (const [name, mutate] of mutants) {
  test('F04 actual Cargo rejects ' + name, rustOptions, async t => {
    const code = mutate(reference);
    assert.notEqual(code, reference);
    const result = await grade(t, code);
    assert.equal(result.ok, false, name);
    assert.ok(result.tests.some(c => !c.passed));
  });
}

test('F04 starter is warning-free Rust but remains unsolved', rustOptions, async t => {
  const { functionDefinition: d } = await load();
  assert.equal((await grade(t, d.starter)).ok, false);
});

test('F04 manuscript has the required teaching path and its complete program matches the contract', async () => {
  const text = await fs.readFile(new URL('../content/rust/04-functions.md', import.meta.url), 'utf8');
  assert.ok(text.split('\n').length <= 150);
  for (const heading of ['개요', '이론', '도식', '완성 프로그램', '출력', '오류', '퀴즈', '직접 풀기', 'Mini Project', '복습']) {
    assert.ok(text.split('\n').some(l => l.startsWith('## ') && l.includes(heading)), heading);
  }
  const program = text.match(/```rust\n([\s\S]*?)\n```/)[1];
  assert.equal(program.split('fn main()')[0].trim(), reference.trim());
});

test('F04 complete program compiles with warnings denied and prints predicted output', rustOptions, async t => {
  const { trustedRustTools } = await import('./helpers/rust-tools.mjs');
  const tools = await trustedRustTools();
  const text = await fs.readFile(new URL('../content/rust/04-functions.md', import.meta.url), 'utf8');
  const program = text.match(/```rust\n([\s\S]*?)\n```/)[1];
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'codeweave-f04-example-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  const source = path.join(dir, 'example.rs'), binary = path.join(dir, 'example');
  await fs.writeFile(source, program);
  const built = spawnSync(tools.rustc, ['--edition=2021', '-Dwarnings', source, '-o', binary], { encoding: 'utf8', timeout: 15000 });
  assert.equal(built.status, 0, built.stderr);
  const ran = spawnSync(binary, [], { encoding: 'utf8', timeout: 3000 });
  assert.equal(ran.status, 0, ran.stderr);
  assert.equal(ran.stdout.replaceAll('\r\n', '\n'), '500\n580\n0\n1001000\n');
});

test('F04 static diagram is accessible and contains no executable markup', () => {
  const svg = figureFor('rust-function-return');
  assert.match(svg, /^<svg[^>]+role="img"/);
  assert.match(svg, /aria-label="[^"]*함수[^"]*반환/);
  assert.doesNotMatch(svg, /<script|<animate|foreignObject|onload=/i);
});

test('F04 roadmap preparation retains evidence and the F04 cursor', async () => {
  const data = JSON.parse(await fs.readFile(new URL('../docs/roadmap.json', import.meta.url), 'utf8'));
  const unit = data.stages.find(s => s.id === 'F').units.find(u => u.id === 'F04');
  assert.equal(unit.status, '진행 중');
  assert.deepEqual(unit.lessonIds, []);
  assert.ok(unit.manuscripts.includes('content/rust/04-functions.md'));
  assert.ok(unit.tests.includes('tests/f04-functions.test.mjs'));
  assert.deepEqual(data.next, { track: 'F-G', unit: 'F04' });
});

test('F04 changed JavaScript has valid syntax and roadmap is synchronized', () => {
  for (const file of ['server/rust-functions-exercise.mjs', 'src/figures.js', 'tests/f04-functions.test.mjs']) {
    const result = spawnSync(process.execPath, ['--check', path.join(root, file)], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
  }
  const result = spawnSync(process.execPath, [path.join(root, 'scripts/roadmap.mjs'), '--check'], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
});
