import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { recordRustPracticeDelivery, validateRoadmap, selectUnit, renderRoadmap } from '../scripts/roadmap.mjs';
import { createRustGradingDefinitions } from '../server/rust-exercises.mjs';
import { gradingRequestFor } from '../src/practice.js';

const load = async () => JSON.parse(await readFile(new URL('../docs/roadmap.json', import.meta.url), 'utf8'));
const find = data => data.stages.find(s => s.id === 'F').units.find(u => u.id === 'F02');
const checks = ['theory', 'example-tests', 'quiz-retry', 'actual-grading',
  'correction-retry', 'backup', 'mastery-next', 'explicit-start', 'offline'];
const evidence = { unitId: 'F02', scope: 'trusted-local-cargo', exerciseId: 'rust-mut',
  commit: '0726bf04df84dea0a5af036ac1b632e580b92eaa',
  ci: 'https://github.com/cys123431-ship-it/CodeWeave/actions/runs/39221228817',
  checks, platforms: ['linux'], operatorFlags: ['--include-f02'], review: 'docs/F02_ACCEPTANCE.md' };
async function pending() {
  const data = await load();
  find(data).status = '진행 중';
  delete find(data).practiceDelivery;
  const f03 = data.stages.find(s => s.id === 'F').units.find(u => u.id === 'F03');
  f03.status = '진행 중';
  delete f03.practiceDelivery;
  // Reconstruct the valid point before F02/F03 acceptance, then replay only F02.
  data.next = { track: 'F-G', unit: 'F02' };
  return data;
}

test('verified F02 delivery completes only the selected scope and rotates once without mutating input', async () => {
  const data = await pending(), before = structuredClone(data);
  const result = recordRustPracticeDelivery(data, evidence);
  assert.deepEqual(data, before);
  assert.equal(find(result).status, '완료');
  assert.deepEqual(result.next, { track: 'C', unit: selectUnit(data, 'C').id });
  assert.deepEqual(result.stages.filter(s => s.id !== 'F'), before.stages.filter(s => s.id !== 'F'));
  assert.deepEqual(result.stages.find(s => s.id === 'F').units.filter(u => u.id !== 'F02'),
    before.stages.find(s => s.id === 'F').units.filter(u => u.id !== 'F02'));
  assert.equal(validateRoadmap(result), true);
  assert.throws(() => recordRustPracticeDelivery(result, evidence));
});

test('F02 rejects missing checks, unsupported claims, wrong mapping and missing explicit opt-in proof', async () => {
  const changes = checks.map(check => ({ checks: checks.filter(c => c !== check) }));
  const sparse = [...checks]; delete sparse[0];
  changes.push({ checks: sparse }, { checks: [...checks, checks[0]] }, { commit: 'main' },
    { ci: 'https://example.org/run/1' }, { scope: 'public-sandbox' }, { unitId: 'F03' },
    { exerciseId: 'rust-cargo' }, { review: 'docs/F01_ACCEPTANCE.md' },
    { platforms: ['win32'] }, { platforms: ['linux', 'darwin'] },
    { operatorFlags: undefined }, { operatorFlags: [] }, { operatorFlags: ['--unknown'] });
  for (const change of changes) {
    const data = await pending(), before = structuredClone(data);
    assert.throws(() => recordRustPracticeDelivery(data, { ...evidence, ...change }));
    assert.deepEqual(data, before);
  }
});

test('accepted F02 requires retained graded proof and cannot claim an unrelated manuscript or skip F01', async () => {
  const accepted = recordRustPracticeDelivery(await pending(), evidence);
  for (const mutate of [u => { delete u.practiceDelivery; }, u => { u.tests = []; },
    u => { u.manuscripts = ['content/rust/01-cargo.md']; },
    u => { u.lessonIds = ['rust-cargo']; }, u => { u.practiceDelivery.checks.pop(); },
    u => { delete u.practiceDelivery.operatorFlags; }]) {
    const data = structuredClone(accepted); mutate(find(data));
    assert.throws(() => validateRoadmap(data));
  }
  const data = structuredClone(accepted);
  const f01 = data.stages.find(s => s.id === 'F').units.find(u => u.id === 'F01');
  f01.status = '진행 중'; delete f01.practiceDelivery;
  assert.throws(() => validateRoadmap(data));
});

test('F02 renders its own review link without activating the default or boolean F01 grading route', async () => {
  const accepted = recordRustPracticeDelivery(await pending(), evidence);
  assert.ok(renderRoadmap(accepted).split('\n').find(l => l.startsWith('| F02 |')).includes('(F02_ACCEPTANCE.md)'));
  assert.equal(createRustGradingDefinitions().has('rust-mut'), false);
  assert.throws(() => gradingRequestFor('rust-mut'));
  assert.throws(() => gradingRequestFor('rust-mut', true));
  assert.equal(gradingRequestFor('rust-mut', ['rust-cargo', 'rust-mut']).expectedTests, 10);
});

test('published F02 completion retains independently reviewed Linux proof instead of only a green CI label', async () => {
  const data = await load();
  assert.equal(find(data).status, '완료');
  const { unitId, ...delivery } = evidence;
  assert.deepEqual(find(data).practiceDelivery, delivery);
  assert.equal(validateRoadmap(data), true);
});
