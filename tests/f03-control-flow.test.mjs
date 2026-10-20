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
import { rustGradingIds, gradingRequestFor, recordGradedSubmission } from '../src/practice.js';

const load = () => import('../server/rust-control-flow-exercise.mjs');
const root = fileURLToPath(new URL('../', import.meta.url));
const reference = `pub fn sum_even_before(limit: u32, stop: u32) -> u32 {
    let end = if limit > 1000 { 1000 } else { limit };
    let mut sum = 0;
    for n in 0..=end {
        if n >= stop {
            break;
        }
        if n % 2 != 0 {
            continue;
        }
        sum += n;
    }
    sum
}
`;
const cargo = spawnSync('cargo', ['--version'], { timeout: 3000 }).status === 0;
const rustOptions = {
  skip: !cargo && process.env.CODEWEAVE_REQUIRE_RUST !== '1' ? 'Cargo unavailable locally; mandatory in CI' : false,
  timeout: 60000
};

test('F03 prepared definition freezes ten independent cases without activating existing registries', async () => {
  const before = [...createRustBindingDefinitions()];
  const { controlDefinition: d, controlMetadata: m } = await load();
  assert.equal(d.id, 'rust-control-flow');
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
  assert.equal(m.publicExample.input, 'sum_even_before(10, 7)');
  assert.equal(m.publicExample.output, '12');
  assert.deepEqual([...createRustBindingDefinitions()], before);
  assert.equal(createRustGradingDefinitions().has(d.id), false);
  assert.equal(createRustBindingDefinitions().has(d.id), false);
});

test('F03 roadmap preparation retains executable evidence without rotating before learner delivery', async () => {
  const data = JSON.parse(await fs.readFile(new URL('../docs/roadmap.json', import.meta.url), 'utf8'));
  const unit = data.stages.find(s => s.id === 'F').units.find(u => u.id === 'F03');
  assert.notEqual(unit.status, '미착수');
  assert.ok(unit.manuscripts.includes('content/rust/03-control-flow.md'));
  assert.ok(unit.tests.includes('tests/f03-control-flow.test.mjs'));
  // Future delivery may legitimately complete/rotate this unit; preparation does not freeze its cursor forever.
  if (unit.lessonIds.length === 0) {
    assert.equal(unit.status, '진행 중');
    assert.deepEqual(data.next, { track: 'F-G', unit: 'F03' });
  }
});

test('F03 remains rejected before the HTTP grading callback and private definition is never served', async t => {
  const { controlDefinition: d } = await load();
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
  assert.equal((await fetch(base + '/server/rust-control-flow-exercise.mjs')).status, 404);
});

test('F03 explicit prepared registry is fresh and never widens default F01 or F02 factories', async () => {
  const { createRustControlDefinitions, controlDefinition: d } = await load();
  const first = createRustControlDefinitions(), second = createRustControlDefinitions();
  assert.deepEqual([...first.keys()], ['rust-cargo', 'rust-mut', d.id]);
  assert.equal(first.get(d.id), d);
  first.clear();
  assert.equal(second.size, 3);
  assert.deepEqual([...createRustGradingDefinitions().keys()], ['rust-cargo']);
  assert.deepEqual([...createRustBindingDefinitions().keys()], ['rust-cargo', 'rust-mut']);
});

test('F03 explicit trusted HTTP capability preserves authentication allowlisting and exact advertisement', async t => {
  let calls = 0;
  const rustService = { async submit() {
    calls++;
    return { ok: true, message: '10/10', compileOutput: '', tests: Array.from({ length: 10 }, () => ({ passed: true, detail: '테스트 통과' })) };
  } };
  const ids = ['rust-cargo', 'rust-mut', 'rust-control-flow'];
  const app = createLearningServer({ root, rustService, rustExerciseIds: ids });
  t.after(() => app.close());
  ids.pop();
  const { port } = await app.listen(0), base = 'http://127.0.0.1:' + port;
  const html = await (await fetch(base)).text();
  assert.match(html, /name="codeweave-rust-exercises" content="rust-cargo rust-mut rust-control-flow"/);
  const token = html.match(/name="codeweave-token" content="([a-f0-9]{64})"/)[1];
  const post = (headers = {}, exerciseId = 'rust-control-flow') => fetch(base + '/api/grade/rust', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CodeWeave-Token': token, ...headers },
    body: JSON.stringify({ exerciseId, code: reference })
  });
  assert.equal((await post({ 'Content-Type': 'text/plain' })).status, 415);
  assert.equal((await post({ Origin: 'https://outside.invalid' })).status, 403);
  assert.equal((await post({ 'X-CodeWeave-Token': '' })).status, 403);
  assert.equal((await post({}, 'rust-unknown')).status, 400);
  assert.equal(calls, 0);
  assert.equal((await post()).status, 200);
  assert.equal(calls, 1);
});

test('F03 client capability requires exact authenticated IDs and rejects short successful results before storage', () => {
  const doc = content => ({ querySelector(selector) {
    return { content: { 'codeweave-token': 'a'.repeat(64), 'codeweave-rust': 'rust-cargo',
      'codeweave-rust-exercises': content }[selector.match(/name="([^"]+)"/)[1]] };
  } });
  const ids = rustGradingIds(doc('rust-cargo rust-mut rust-control-flow'));
  assert.deepEqual(ids, ['rust-cargo', 'rust-mut', 'rust-control-flow']);
  assert.equal(gradingRequestFor('rust-control-flow', ids).expectedTests, 10);
  assert.throws(() => gradingRequestFor('rust-control-flow', true));
  assert.throws(() => gradingRequestFor('rust-control-flow', []));
  assert.deepEqual(rustGradingIds(doc('rust-cargo rust-control-flow rust-unknown')), []);
  let writes = 0;
  const storage = { getItem: () => '{}', setItem() { writes++; } };
  assert.throws(() => recordGradedSubmission(storage, ['rust-control-flow'], 'rust-control-flow', reference,
    { ok: true, message: 'forged', compileOutput: '', tests: [{ passed: true, detail: '테스트 통과' }] }));
  assert.equal(writes, 0);
});

async function grade(t, code) {
  const { controlDefinition: d } = await load();
  const { trustedRustTools } = await import('./helpers/rust-tools.mjs');
  const { createLocalRustGradingService } = await import('../server/rust-executor.mjs');
  const tools = await trustedRustTools();
  const parent = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'codeweave-f03-')));
  t.after(() => fs.rm(parent, { recursive: true, force: true }));
  const service = await createLocalRustGradingService({ enabled: true, definitions: new Map([[d.id, d]]),
    sysroot: path.dirname(path.dirname(tools.rustc)), parent });
  const result = await service.submit({ exerciseId: d.id, code });
  assert.deepEqual(await fs.readdir(parent), [], 'every submission workspace must be cleaned');
  assert.equal(result.tests.length, 10);
  // Cargo writes normal Compiling/Finished status to stderr even on success.
  // Preserve those diagnostics; actual executed-case verdicts prove compilation.
  assert.doesNotMatch(result.compileOutput, /(?:^|\n)(?:error|warning)(?:\[|:)/i);
  assert.ok(result.tests.every(c => c.passed ? c.detail === '테스트 통과' : c.detail.startsWith('단언 실패 · ')));
  return result;
}

test('F03 actual Cargo accepts for and while implementations including inclusive bounds clamp and u32 extremes', rustOptions, async t => {
  const alternative = `pub fn sum_even_before(limit: u32, stop: u32) -> u32 {
    let end = limit.min(1000);
    let mut n = 0;
    let mut result = 0;
    while n <= end && n < stop {
        if n % 2 == 0 { result += n; }
        n += 1;
    }
    result
}`;
  for (const code of [reference, alternative]) {
    const result = await grade(t, code);
    assert.equal(result.ok, true, JSON.stringify(result));
    assert.match(result.message, /10\/10/);
  }
});

const mutants = [
  ['excludes the inclusive limit', s => s.replace('0..=end', '0..end')],
  ['includes the exclusive stop', s => s.replace('n >= stop', 'n > stop')],
  ['ignores stop', s => s.replace('n >= stop', 'n > 1001')],
  ['sums odd values', s => s.replace('n % 2 != 0', 'n % 2 == 0')],
  ['breaks instead of continuing', s => s.replace('continue;', 'break;')],
  ['counts instead of accumulating', s => s.replace('sum += n;', 'sum += 1;')],
  ['uses the wrong cap', s => s.replace('{ 1000 }', '{ 1002 }')],
  ['returns a fixed public example', s => s.replace('\n    sum\n', '\n    let _ = sum;\n    12\n')]
];
for (const [name, mutate] of mutants) {
  test('F03 actual Cargo rejects ' + name, rustOptions, async t => {
    const code = mutate(reference);
    assert.notEqual(code, reference);
    const result = await grade(t, code);
    assert.equal(result.ok, false, name);
    assert.ok(result.tests.some(c => !c.passed));
  });
}

test('F03 starter is warning-free executable Rust but not a solved exercise', rustOptions, async t => {
  const { controlDefinition: d } = await load();
  assert.equal((await grade(t, d.starter)).ok, false);
});

test('F03 explicitly configured HTTP grades real Cargo correction and cleans every workspace', rustOptions, async t => {
  const { controlDefinition: d, createRustControlDefinitions } = await load();
  const { trustedRustTools } = await import('./helpers/rust-tools.mjs');
  const { createLocalRustGradingService } = await import('../server/rust-executor.mjs');
  const tools = await trustedRustTools();
  const parent = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'codeweave-f03-http-')));
  t.after(() => fs.rm(parent, { recursive: true, force: true }));
  const service = await createLocalRustGradingService({ enabled: true, definitions: createRustControlDefinitions(),
    sysroot: path.dirname(path.dirname(tools.rustc)), parent });
  const app = createLearningServer({ root, rustService: service, rustExerciseIds: ['rust-cargo', 'rust-mut', d.id] });
  t.after(() => app.close());
  const { port } = await app.listen(0), base = 'http://127.0.0.1:' + port;
  const html = await (await fetch(base)).text();
  const token = html.match(/name="codeweave-token" content="([a-f0-9]{64})"/)[1];
  for (const [code, ok] of [[reference.replace('n >= stop', 'n > stop'), false], [reference, true]]) {
    const response = await fetch(base + '/api/grade/rust', { method: 'POST', headers: {
      'Content-Type': 'application/json', 'X-CodeWeave-Token': token
    }, body: JSON.stringify({ exerciseId: d.id, code }), signal: AbortSignal.timeout(30000) });
    assert.equal(response.status, 200);
    const result = await response.json();
    assert.equal(result.ok, ok);
    assert.doesNotMatch(result.compileOutput, /(?:^|\n)(?:error|warning)(?:\[|:)/i);
    assert.equal(result.tests.length, 10);
    assert.ok(result.tests.every(c => c.passed ? c.detail === '테스트 통과' : c.detail.startsWith('단언 실패 · ')));
    assert.deepEqual(await fs.readdir(parent), []);
  }
});

test('F03 manuscript retains required teaching headings and distinguishes the compiled complete program', async () => {
  const text = await fs.readFile(new URL('../content/rust/03-control-flow.md', import.meta.url), 'utf8');
  for (const heading of ['개요', '이론', '도식', '완성 프로그램', '출력', '오류', '퀴즈', '직접 풀기', 'Mini Project', '복습']) {
    assert.ok(text.split('\n').some(l => l.startsWith('## ') && l.includes(heading)), heading);
  }
  const program = text.match(/```rust\n([\s\S]*?)\n```/)[1];
  assert.equal(program.split('fn main()')[0].trim(), reference.trim());
});

test('F03 complete program actually compiles with warnings denied and prints independently predicted output', rustOptions, async t => {
  const { trustedRustTools } = await import('./helpers/rust-tools.mjs');
  const tools = await trustedRustTools();
  const text = await fs.readFile(new URL('../content/rust/03-control-flow.md', import.meta.url), 'utf8');
  const program = text.match(/```rust\n([\s\S]*?)\n```/)[1];
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'codeweave-f03-example-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  const source = path.join(dir, 'example.rs'), binary = path.join(dir, 'example');
  await fs.writeFile(source, program);
  const built = spawnSync(tools.rustc, ['--edition=2021', '-Dwarnings', source, '-o', binary], { encoding: 'utf8', timeout: 15000 });
  assert.equal(built.status, 0, built.stderr);
  const ran = spawnSync(binary, [], { encoding: 'utf8', timeout: 3000 });
  assert.equal(ran.status, 0, ran.stderr);
  assert.equal(ran.stdout.replaceAll('\r\n', '\n'), '12\n6\n250500\n10 7\n');
});

test('F03 original static diagram is accessible and contains no executable markup', () => {
  const svg = figureFor('rust-control-flow');
  assert.match(svg, /^<svg[^>]+role="img"/);
  assert.match(svg, /aria-label="[^"]*조건[^"]*반복/);
  assert.doesNotMatch(svg, /<script|<animate|foreignObject|onload=/i);
});

test('F03 changed JS modules have valid Node syntax and roadmap is synchronized', () => {
  for (const file of ['server/rust-control-flow-exercise.mjs', 'server/learning-server.mjs', 'src/practice.js', 'src/figures.js', 'tests/f03-control-flow.test.mjs']) {
    const result = spawnSync(process.execPath, ['--check', path.join(root, file)], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
  }
  const result = spawnSync(process.execPath, [path.join(root, 'scripts/roadmap.mjs'), '--check'], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
});
