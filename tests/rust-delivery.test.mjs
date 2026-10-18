import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { exerciseById } from '../src/exercises.js';
import { gradingExercises } from '../server/grading-exercises.mjs';
import { gradingRequestFor } from '../src/practice.js';
import { historicalRustPending } from './fixtures/rust-delivery-state.mjs';

const checks = ['theory', 'example-tests', 'quiz-retry', 'actual-grading',
  'correction-retry', 'backup', 'mastery-next', 'explicit-start', 'offline'];
const evidence = {
  unitId: 'F01', scope: 'trusted-local-cargo', exerciseId: 'rust-cargo',
  commit: 'f91a931d3214e8038c8e889b5295790f29e02d50',
  ci: 'https://github.com/cys123431-ship-it/CodeWeave/actions/runs/39157149118',
  checks, platforms: ['linux', 'darwin'], review: 'docs/F01_ACCEPTANCE.md'
};
const find = data => data.stages.find(stage => stage.id === 'F').units.find(unit => unit.id === 'F01');
const load = async () => JSON.parse(await readFile(new URL('../docs/roadmap.json', import.meta.url), 'utf8'));
async function pending(source) {
  return historicalRustPending(source ?? await load());
}
async function api() {
  const module = await import('../scripts/roadmap.mjs');
  assert.equal(typeof module.recordRustPracticeDelivery, 'function');
  return module;
}

test('verified local Rust delivery completes only F01 and advances once to the next C unit without mutating input', async () => {
  const { recordRustPracticeDelivery, summarize, validateRoadmap } = await api();
  const data = await pending(), before = structuredClone(data);
  const result = recordRustPracticeDelivery(data, evidence);
  assert.deepEqual(data, before);
  assert.deepEqual(result.next, { track: 'C', unit: 'C06' });
  assert.equal(find(result).status, '완료');
  assert.deepEqual(summarize(result).map(row => row.completed), [3, 10, 5, 2, 2, 1, 0, 0, 0]);
  assert.equal(validateRoadmap(result), true);
  assert.deepEqual(find(result).theoryDelivery, find(before).theoryDelivery);
  assert.equal(find(result).practiceDelivery.commit, evidence.commit);
  assert.throws(() => recordRustPracticeDelivery(result, evidence), /selected|선택|already|이미/);
});

test('local Rust delivery refuses every missing acceptance check and duplicate or unknown evidence', async () => {
  const { recordRustPracticeDelivery } = await api();
  for (const check of checks) {
    const data = await pending();
    assert.throws(() => recordRustPracticeDelivery(data, { ...evidence, checks: checks.filter(item => item !== check) }));
  }
  for (const change of [{ checks: [...checks, checks[0]] }, { checks: [...checks.slice(1), 'unverified'] }]) {
    const data = await pending();
    assert.throws(() => recordRustPracticeDelivery(data, { ...evidence, ...change }));
  }
});

test('local Rust delivery rejects foreign CI, mutable refs, unsupported scope, platforms and exercise IDs', async () => {
  const { recordRustPracticeDelivery } = await api();
  for (const change of [{ ci: 'https://example.org/run/1' }, { commit: 'main' },
    { commit: [evidence.commit] }, { ci: [evidence.ci] }, { scope: 'public-sandbox' },
    { platforms: ['win32'] }, { platforms: ['linux'] }, { platforms: ['linux', 'linux'] },
    { exerciseId: 'rust-mut' }, { unitId: 'F02' }, { review: '../F01_ACCEPTANCE.md' }]) {
    const data = await pending(), before = structuredClone(data);
    assert.throws(() => recordRustPracticeDelivery(data, { ...evidence, ...change }));
    assert.deepEqual(data, before);
  }
});

test('completed Rust validation rejects lost proof, missing files, mismatched mapping and a repeated Rust cursor', async () => {
  const { recordRustPracticeDelivery, validateRoadmap } = await api();
  const accepted = recordRustPracticeDelivery(await pending(), evidence);
  for (const mutate of [unit => { delete unit.practiceDelivery; },
    unit => { unit.practiceDelivery.checks.pop(); },
    unit => { unit.manuscripts = []; }, unit => { unit.tests = []; },
    unit => { unit.lessonIds = ['rust-mut']; }]) {
    const data = structuredClone(accepted);
    mutate(find(data));
    assert.throws(() => validateRoadmap(data));
  }
  const stale = structuredClone(accepted);
  stale.next = { track: 'F-G', unit: 'F01' };
  assert.throws(() => validateRoadmap(stale), /next|다음/);
});

test('roadmap delivery never enables default execution or counts another Rust sample as completed', async () => {
  const { recordRustPracticeDelivery } = await api();
  const result = recordRustPracticeDelivery(await pending(), evidence);
  assert.equal(exerciseById('rust-cargo').grader, null);
  assert.equal(gradingExercises.has('rust-cargo'), false);
  assert.throws(() => gradingRequestFor('rust-cargo'));
  assert.equal(gradingRequestFor('rust-cargo', true).endpoint, './api/grade/rust');
  assert.equal(result.stages.find(stage => stage.id === 'F').units.find(unit => unit.id === 'F02').status, '진행 중');
  assert.throws(() => gradingRequestFor('rust-mut', true));
});

test('published F01 completion is reproducible from the independently reviewed scoped delivery', async () => {
  const { recordRustPracticeDelivery } = await api();
  // F01's reviewed proof is stable; unrelated live progress must not be rewound.
  assert.deepEqual(find(await load()), find(recordRustPracticeDelivery(await pending(), evidence)));
});

test('historical F01 replay stays at C06 while live delivery respects independent C06 completion', async () => {
  const { recordRustPracticeDelivery, validateRoadmap } = await api();
  const progressed = await pending();
  progressed.stages.find(stage => stage.id === 'C').units.find(unit => unit.id === 'C06').status = '완료';
  const before = structuredClone(progressed);
  assert.equal(validateRoadmap(progressed), true);
  const live = recordRustPracticeDelivery(progressed, evidence);
  assert.deepEqual(live.next, { track: 'C', unit: 'C07' });
  const replay = recordRustPracticeDelivery(await pending(progressed), evidence);
  assert.deepEqual(replay.next, { track: 'C', unit: 'C06' });
  assert.deepEqual(progressed, before);
});

test('local Rust acceptance rejects a sparse check list instead of counting a missing entry as reviewed', async () => {
  const { recordRustPracticeDelivery } = await api();
  const sparse = [...checks];
  delete sparse[0];
  const data = await pending();
  assert.throws(() => recordRustPracticeDelivery(data, { ...evidence, checks: sparse }));
});
