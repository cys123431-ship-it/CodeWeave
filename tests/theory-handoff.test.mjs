import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { exerciseById } from '../src/exercises.js';
import { gradingExercises } from '../server/grading-exercises.mjs';
import { historicalRustPending } from './fixtures/rust-delivery-state.mjs';

const api = () => import('../scripts/roadmap.mjs');
const load = async () => JSON.parse(await readFile(new URL('../docs/roadmap.json', import.meta.url), 'utf8'));
const evidence = {
  unitId: 'F01', commit: 'd92dd760fcdcae96f11a8f0f14e42df59e2bff5c',
  ci: 'https://github.com/cys123431-ship-it/CodeWeave/actions/runs/38843874384',
  checks: ['theory', 'quiz-retry', 'drafts', 'offline', 'example-tests']
};
const find = data => data.stages.find(s => s.id === 'F').units.find(u => u.id === 'F01');
async function pending() {
  const data = historicalRustPending(await load());
  // Reconstruct the historical theory-only state independently of later acceptance.
  find(data).status = '진행 중';
  delete find(data).practiceDelivery;
  data.next = { track: 'F-G', unit: 'F01' };
  delete find(data).theoryDelivery;
  return data;
}

test('theory-only handoff advances the Rust turn without completing F01 or activating practice', async () => {
  const { recordTheoryDelivery, summarize, validateRoadmap, selectUnit } = await api();
  const data = await pending();
  const original = structuredClone(data);
  const next = recordTheoryDelivery(data, evidence);
  assert.deepEqual(data, original);
  assert.deepEqual(next.next, { track: 'C', unit: selectUnit(data, 'C').id });
  assert.equal(find(next).status, '진행 중');
  assert.deepEqual(find(next).theoryDelivery, { scope: 'theory-quiz', commit: evidence.commit, ci: evidence.ci, checks: evidence.checks });
  assert.deepEqual(summarize(next), summarize(data));
  assert.equal(exerciseById('rust-cargo').grader, null);
  assert.equal(gradingExercises.has('rust-cargo'), false);
  assert.equal(validateRoadmap(next), true);
});

test('theory-only handoff rejects missing checks, foreign evidence and bypassing the selected turn', async () => {
  const { recordTheoryDelivery, selectUnit } = await api();
  const data = await pending();
  for (const change of [{ checks: [] }, { checks: evidence.checks.slice(1) },
    { checks: [...evidence.checks, evidence.checks[0]] }, { commit: 'main' },
    { ci: 'https://example.org/actions/runs/38843874384' }, { commit: [evidence.commit] },
    { ci: [evidence.ci] }, { unitId: 'F02' }]) {
    assert.throws(() => recordTheoryDelivery(structuredClone(data), { ...evidence, ...change }), /handoff|인수|selected|선택/);
  }
  const wrongTurn = await pending();
  wrongTurn.next = { track: 'C', unit: selectUnit(wrongTurn, 'C').id };
  assert.throws(() => recordTheoryDelivery(wrongTurn, evidence), /selected|선택/);
  assert.equal(find(wrongTurn).theoryDelivery, undefined);
});

test('a recorded theory delivery cannot be reused to skip unfinished Rust work on its next turn', async () => {
  const { recordTheoryDelivery, validateRoadmap } = await api();
  const data = recordTheoryDelivery(await pending(), evidence);
  data.next = { track: 'F-G', unit: 'F01' };
  assert.throws(() => recordTheoryDelivery(data, evidence), /already|이미/);
  const broken = structuredClone(data);
  find(broken).theoryDelivery.scope = 'mastered';
  assert.throws(() => validateRoadmap(broken), /handoff|인수/);
  const completed = structuredClone(data);
  find(completed).status = '완료';
  assert.throws(() => validateRoadmap(completed), /graded|채점|handoff|인수/);
});

test('historical F01 theory handoff keeps its limited scope and cannot count completed practice', async () => {
  const { recordTheoryDelivery, validateRoadmap, renderRoadmap, summarize } = await api();
  const data = recordTheoryDelivery(await pending(), evidence);
  assert.equal(validateRoadmap(data), true);
  assert.equal(find(data).theoryDelivery?.scope, 'theory-quiz');
  assert.equal(find(data).status, '진행 중');
  assert.equal(summarize(data).find(s => s.id === 'F').completed, 0);
  assert.match(renderRoadmap(data), /38843874384/);
});
