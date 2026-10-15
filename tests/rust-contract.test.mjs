import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { exerciseById } from '../src/exercises.js';
import { gradingExercises } from '../server/grading-exercises.mjs';
import { lessonLearningStatus } from '../src/mastery.js';

const api = () => import('../server/rust-contract.mjs');
const fixture = () => ({
  id: 'rust-contract-fixture', language: 'rust', grader: 'cargo-test',
  starter: 'pub fn fixture() {}\n',
  harness: '// Trusted synthetic harness; not a curriculum exercise.\n',
  cases: Array.from({ length: 8 }, (_, i) => ({ id: `case_0${i}`, label: `fixture ${i}` }))
});
const request = () => ({ exerciseId: 'rust-contract-fixture', code: 'pub fn fixture() {}\n' });
const registry = () => new Map([[fixture().id, fixture()]]);

test('Rust design accepts only a bounded source string and a registered Rust ID', async () => {
  const { createRustPlan } = await api();
  for (const bad of [null, [], {}, { ...request(), code: 4 }, { ...request(), code: '' },
    { ...request(), code: 'x'.repeat(25001) }, { ...request(), exerciseId: 'unknown' }]) {
    assert.throws(() => createRustPlan(bad, registry()), /제출|문제|길이/);
  }
  const plan = createRustPlan({ ...request(), code: '한'.repeat(25000) }, registry());
  assert.equal(plan.files.find(f => f.path === 'src/lib.rs').content.length, 25000);
  assert.equal(plan.executionEnabled, false, 'a design plan is not a host executor');
});

test('Rust design rejects client manifests, paths, harnesses and Cargo options', async () => {
  const { createRustPlan } = await api();
  for (const field of ['files', 'path', 'manifest', 'harness', 'args', 'env', 'grader', 'tests']) {
    assert.throws(() => createRustPlan({ ...request(), [field]: '../build.rs' }, registry()), /제출/);
  }
  const inherited = Object.assign(Object.create({ manifest: 'bad' }), request());
  assert.throws(() => createRustPlan(inherited, registry()), /제출/);
});

test('Rust design requires eight to twelve distinct trusted exact-match case IDs', async () => {
  const { createRustPlan } = await api();
  for (const size of [0, 7, 13]) {
    const definition = { ...fixture(), cases: Array.from({ length: size }, (_, i) => ({ id: `case_${String(i).padStart(2, '0')}`, label: 'case' })) };
    assert.throws(() => createRustPlan(request(), new Map([[definition.id, definition]])), /契約|계약/);
  }
  for (const id of ['case_00', 'case_01; touch x', '../case', 'module::case_01', '--ignored']) {
    const definition = fixture();
    definition.cases[1].id = id;
    assert.throws(() => createRustPlan(request(), new Map([[definition.id, definition]])), /계약/);
  }
});

test('Rust design never converts C or ungraded metadata into executable Rust contracts', async () => {
  const { createRustPlan } = await api();
  for (const change of [{ language: 'c' }, { grader: null }, { harness: '' }, { starter: null }]) {
    const definition = { ...fixture(), ...change };
    assert.throws(() => createRustPlan(request(), new Map([[definition.id, definition]])), /계약/);
  }
});

test('Rust design fixes the four package paths and disables automatic targets and build scripts', async () => {
  const { createRustPlan } = await api();
  const definition = fixture();
  const plan = createRustPlan(request(), new Map([[definition.id, definition]]));
  assert.deepEqual(plan.files.map(f => f.path), ['Cargo.toml', 'Cargo.lock', 'src/lib.rs', 'tests/codeweave.rs']);
  const manifest = plan.files[0].content;
  for (const key of ['build', 'autobins', 'autoexamples', 'autotests', 'autobenches']) {
    assert.match(manifest, new RegExp(`^${key} = false$`, 'm'));
  }
  assert.match(manifest, /^doctest = false$/m);
  assert.doesNotMatch(manifest, /\[.*dependencies\]/);
  assert.equal(plan.files[2].content, request().code);
  assert.equal(plan.files[3].content, definition.harness);
});

test('Rust design compiles only the trusted integration target in frozen single-job mode', async () => {
  const { createRustPlan } = await api();
  const plan = createRustPlan(request(), registry());
  assert.deepEqual(plan.compile, { command: 'cargo', args: [
    'test', '--manifest-path', 'Cargo.toml', '--frozen', '--test', 'codeweave',
    '--no-run', '--message-format=json', '--jobs', '1', '--color', 'never'
  ] });
  assert.equal(plan.environment.RUSTFLAGS, '-Dwarnings');
  assert.equal(plan.environment.CARGO_NET_OFFLINE, 'true');
});

test('Rust design lists the trusted artifact and runs each declared case in a fresh exact invocation', async () => {
  const { createRustPlan } = await api();
  const plan = createRustPlan(request(), registry());
  assert.deepEqual(plan.list, { artifact: 'codeweave', args: ['--list', '--format', 'terse'] });
  assert.equal(plan.runCases.length, 8);
  assert.deepEqual(plan.runCases[1], {
    id: 'case_01', label: 'fixture 1', artifact: 'codeweave', args: ['case_01', '--exact', '--test-threads=1']
  });
  assert.ok(plan.runCases.every(c => !c.args.includes('--ignored')));
});

test('Rust design snapshots and freezes the plan without modifying submitted code or registry', async () => {
  const { createRustPlan } = await api();
  const definition = fixture();
  const input = request();
  const plan = createRustPlan(input, new Map([[definition.id, definition]]));
  definition.cases[0].label = 'changed later';
  input.code = 'changed later';
  assert.equal(plan.runCases[0].label, 'fixture 0');
  assert.equal(plan.files[2].content, 'pub fn fixture() {}\n');
  assert.throws(() => plan.compile.args.push('--release'), TypeError);
  assert.throws(() => { plan.files[0].path = 'build.rs'; }, TypeError);
});

test('Rust design does not activate the existing Rust sample or invent practice mastery', async () => {
  const { createRustPlan } = await api();
  assert.throws(() => createRustPlan({ exerciseId: 'rust-mut', code: 'fn main() {}' }, gradingExercises));
  assert.equal(exerciseById('rust-mut').grader, null);
  assert.equal(gradingExercises.has('rust-mut'), false);
  const status = lessonLearningStatus('rust-mut', { completed: ['rust-mut'], theoryRead: ['rust-mut'], results: {}, review: [] }, {}, false);
  assert.equal(status.practiceAvailable, false);
  assert.equal(status.mastered, false);
});

test('Roadmap next-work instruction follows the selected unit instead of the initial D01 task', async () => {
  const { renderRoadmap } = await import('../scripts/roadmap.mjs');
  const data = JSON.parse(await readFile(new URL('../docs/roadmap.json', import.meta.url), 'utf8'));
  const rendered = renderRoadmap(data);
  const instruction = rendered.split('\n').find(line => line.startsWith('- 다음 차례는'));
  const selected = data.stages.flatMap(s => s.units).find(u => u.id === data.next.unit);
  assert.ok(instruction.includes(selected.title));
});
