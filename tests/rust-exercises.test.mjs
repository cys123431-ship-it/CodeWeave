import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { lessons } from '../src/catalog.js';
import { exerciseById } from '../src/exercises.js';
import { createRustPlan } from '../server/rust-contract.mjs';
import { createRustGradingService } from '../server/rust-service.mjs';
import { createLearningServer } from '../server/learning-server.mjs';

const api = () => import('../server/rust-exercises.mjs');
const lesson = lessons.find(l => l.id === 'rust-cargo');
const correct = lesson.sections.find(s => s.fileName === 'src/lib.rs').code;
const request = code => ({ exerciseId: lesson.id, code });
test('F01 server contract preserves the existing function starter and ID with ten declared independent cases', async () => {
  const { createRustGradingDefinitions } = await api();
  const definitions = createRustGradingDefinitions(), definition = definitions.get('rust-cargo');
  assert.equal(definitions.size, 1);
  assert.equal(definition.id, lesson.challenge.id);
  assert.equal(definition.language, 'rust'); assert.equal(definition.grader, 'cargo-test');
  assert.equal(definition.starter, lesson.challenge.starter);
  assert.deepEqual(definition.cases.map(tc => tc.id), Array.from({ length: 10 }, (_, i) => 'case_0' + i));
  assert.equal(new Set(definition.cases.map(tc => tc.label)).size, 10);
  const plan = createRustPlan(request(definition.starter), definitions);
  assert.equal(plan.runCases.length, 10);
  assert.equal(plan.files.find(file => file.path === 'tests/codeweave.rs').content, definition.harness);
  assert.equal(plan.executionEnabled, false, 'declaring the registry cannot enable execution');
  assert.throws(() => createRustPlan({ ...request(correct), exerciseId: 'rust-mut' }, definitions), /문제/);
});
test('F01 registry copies cannot change another instance or mutate trusted nested cases', async () => {
  const { createRustGradingDefinitions } = await api();
  const first = createRustGradingDefinitions(), second = createRustGradingDefinitions();
  const definition = first.get('rust-cargo');
  assert.equal(Object.isFrozen(definition), true);
  assert.equal(Object.isFrozen(definition.cases), true);
  assert.ok(definition.cases.every(Object.isFrozen));
  assert.throws(() => { definition.cases[0].label = 'forged'; }, TypeError);
  first.clear();
  assert.equal(second.size, 1);
  assert.equal(createRustPlan(request(correct), second).runCases.length, 10);
});
test('server F01 registration leaves client grading and mastery disabled until the UI and v1 path are accepted', async () => {
  const { createRustGradingDefinitions } = await api();
  const service = createRustGradingService({ definitions: createRustGradingDefinitions() });
  await assert.rejects(service.submit(request(correct)), { code: 'RUST_DISABLED' });
  assert.equal(exerciseById('rust-cargo').grader, null);
  assert.equal(exerciseById('rust-mut').grader, null);
});
test('configured learning server accepts only the registered F01 ID and never serves the private harness', async t => {
  const { createRustGradingDefinitions } = await api();
  let calls = 0;
  const definitions = createRustGradingDefinitions();
  const service = createRustGradingService({ enabled: true, definitions, grade: () => {
    calls++; return { ok: true, message: '10/10', compileOutput: '',
      tests: Array.from({ length: 10 }, () => ({ passed: true, detail: '통과' })) };
  } });
  const app = createLearningServer({ root: fileURLToPath(new URL('../', import.meta.url)), rustService: service });
  t.after(() => app.close());
  const address = await app.listen(0), url = 'http://127.0.0.1:' + address.port;
  const html = await (await fetch(url)).text(), token = html.match(/name="codeweave-token" content="([a-f0-9]{64})"/)[1];
  const post = body => fetch(url + '/api/grade/rust', { method: 'POST', headers: {
    'Content-Type': 'application/json', 'X-CodeWeave-Token': token
  }, body: JSON.stringify(body) });
  assert.equal((await post({ ...request(correct), exerciseId: 'rust-mut' })).status, 400);
  assert.equal((await post({ ...request(correct), harness: 'client override' })).status, 400);
  assert.equal(calls, 0);
  const answer = await post(request(correct));
  assert.equal(answer.status, 200); assert.equal((await answer.json()).tests.length, 10);
  assert.equal(calls, 1);
  const hidden = await fetch(url + '/server/rust-exercises.mjs');
  assert.equal(hidden.status, 404); assert.doesNotMatch(await hidden.text(), /assert_eq|case_09/);
});
const cargo = spawnSync('cargo', ['--version'], { timeout: 3000 }).status === 0;
test('real F01 Cargo grading rejects the starter and representative wrong solutions, accepts two implementations, and cleans every submission', {
  skip: !cargo && process.env.CODEWEAVE_REQUIRE_RUST !== '1' ? 'Cargo unavailable locally; mandatory in CI' : false, timeout: 60000
}, async t => {
  const { createRustGradingDefinitions } = await api();
  const { createLocalRustGradingService } = await import('../server/rust-executor.mjs');
  const { trustedRustTools } = await import('./helpers/rust-tools.mjs');
  const tools = await trustedRustTools(), parent = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'codeweave-f01-contract-')));
  t.after(() => fs.rm(parent, { recursive: true, force: true }));
  const definitions = createRustGradingDefinitions();
  const service = await createLocalRustGradingService({ enabled: true, definitions,
    sysroot: path.dirname(path.dirname(tools.rustc)), parent });
  // The existing learner starter intentionally leaves both parameters unused.
  // Under the established -Dwarnings policy it fails compilation, not an assertion.
  const starter = await service.submit(request(lesson.challenge.starter));
  assert.equal(starter.ok, false); assert.equal(starter.tests.length, 10);
  assert.notEqual(starter.compileOutput, '');
  assert.ok(starter.tests.every(tc => tc.detail === '미실행'));
  assert.deepEqual(await fs.readdir(parent), []);
  console.log('F01 verified:', JSON.stringify({ solution: 'original starter', compiled: false, cases: starter.tests.length }));
  const mutations = [
    ['addition', 'items + price'],
    ['ignores item count', 'price'],
    ['ignores unit price', 'items'],
    ['always public answer', '500'],
    ['exclusive item upper bound', 'if items == 10 { 0 } else { items * price }'],
    ['exclusive price upper bound', 'if price == 1000 { 0 } else { items * price }'],
    ['off by one item', 'items.saturating_sub(1) * price'],
    ['public pair only', 'if items == 2 && price == 250 { 500 } else { 0 }']
  ];
  for (const [name, expression] of mutations) {
    const code = 'pub fn total(items: u32, price: u32) -> u32 { let _ = (items, price); ' + expression + ' }';
    const answer = await service.submit(request(code));
    assert.equal(answer.ok, false, name);
    assert.equal(answer.tests.length, 10, name);
    assert.ok(answer.tests.some(tc => tc.detail !== '미실행' && !tc.passed), name + ': real assertions, not compiler errors, reject the solution');
    assert.equal(answer.compileOutput, '', name + ': the wrong solution must compile');
    assert.deepEqual(await fs.readdir(parent), []);
    console.log('F01 verified:', JSON.stringify({ solution: name, compiled: true,
      passed: answer.tests.filter(tc => tc.passed).length, cases: answer.tests.length }));
  }
  for (const code of [correct, 'pub fn total(items: u32, price: u32) -> u32 { (0..items).map(|_| price).sum() }']) {
    const answer = await service.submit(request(code));
    assert.equal(answer.ok, true); assert.equal(answer.tests.length, 10);
    assert.ok(answer.tests.every(tc => tc.passed)); assert.match(answer.message, /10\/10/);
    assert.deepEqual(await fs.readdir(parent), []);
    console.log('F01 verified:', JSON.stringify({ solution: 'valid implementation', passed: 10, cases: answer.tests.length }));
  }
  const app = createLearningServer({ root: fileURLToPath(new URL('../', import.meta.url)), rustService: service });
  t.after(() => app.close());
  const address = await app.listen(0), url = 'http://127.0.0.1:' + address.port;
  const html = await (await fetch(url)).text(), token = html.match(/name="codeweave-token" content="([a-f0-9]{64})"/)[1];
  for (const [code, ok] of [[correct.replace('items * price', 'items + price'), false], [correct, true]]) {
    const response = await fetch(url + '/api/grade/rust', { method: 'POST', headers: {
      'Content-Type': 'application/json', 'X-CodeWeave-Token': token
    }, body: JSON.stringify(request(code)) });
    assert.equal(response.status, 200);
    const answer = await response.json();
    assert.equal(answer.ok, ok); assert.equal(answer.tests.length, 10);
    assert.deepEqual(await fs.readdir(parent), []);
    console.log('F01 HTTP verified:', JSON.stringify({ ok, cases: answer.tests.length }));
  }
});

