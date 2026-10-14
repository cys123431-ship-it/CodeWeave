import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { exercises } from '../src/exercises.js';
import { gradingExercises } from '../server/grading-exercises.mjs';

const auditPath = new URL('../docs/C_EXERCISE_AUDIT.md', import.meta.url);

test('C exercise audit table stays synchronized with executable grading definitions', async () => {
  const markdown = await readFile(auditPath, 'utf8');
  const rows = [...markdown.matchAll(/^\| `([^`]+)` \| `([^`]+)` \| (\d+) \|/gm)]
    .map(([, id, grader, count]) => ({ id, grader, count: Number(count) }));
  const gradedC = exercises.filter(exercise => exercise.language === 'c' && exercise.grader !== null);

  assert.equal(rows.length, 22);
  assert.deepEqual(rows.map(row => row.id), gradedC.map(exercise => exercise.id));
  for (const row of rows) {
    assert.equal(row.grader, gradedC.find(exercise => exercise.id === row.id).grader, row.id);
    assert.equal(row.count, gradingExercises.get(row.id).cases.length, row.id);
  }
});

test('every graded C exercise has a mirrored public example and unique private cases', () => {
  const gradedC = exercises.filter(exercise => exercise.language === 'c' && exercise.grader !== null);
  for (const exercise of gradedC) {
    const definition = gradingExercises.get(exercise.id);
    const inputs = definition.cases.map(testCase => testCase.input);
    assert.equal(new Set(inputs).size, inputs.length, `${exercise.id}: 중복 사례 설명`);
    assert.ok(definition.cases.some(testCase =>
      testCase.input.trim() === exercise.publicExample.input.replace('입력 없음', '').trim()
      && testCase.expected.trim() === exercise.publicExample.output.trim()
    ), `${exercise.id}: 공개 예시 불일치`);
    if (definition.harness) {
      const argumentSets = definition.cases.map(testCase => JSON.stringify(testCase.args));
      assert.equal(new Set(argumentSets).size, argumentSets.length, `${exercise.id}: 중복 하네스 인수`);
    }
  }
});
