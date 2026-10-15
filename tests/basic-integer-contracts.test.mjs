import test from 'node:test';
import assert from 'node:assert/strict';
import { lessons } from '../src/catalog.js';
import { exerciseById } from '../src/exercises.js';
import { gradingExercises } from '../server/grading-exercises.mjs';

function lessonById(id) {
  return lessons.find(lesson => lesson.id === id);
}

test('c-types retains metadata and both executable sum boundaries', () => {
  const lesson = lessonById('c-types');
  const cases = gradingExercises.get('c-types').cases;

  assert.match(lesson.challenge.starter, /scanf\("%d%d", &a, &b\) != 2/);
  assert.ok(exerciseById('c-types').concepts.includes('input-contract'));
  assert.ok(exerciseById('c-types').concepts.includes('signed-overflow'));
  assert.equal(cases.length, 5);
  assert.ok(cases.some(testCase => testCase.input === '10000 10000\n' && testCase.expected === '20000'));
  assert.ok(cases.some(testCase => testCase.input === '-10000 -10000\n' && testCase.expected === '-20000'));
});

test('c-pointer retains metadata and both executable increment boundaries', () => {
  const cases = gradingExercises.get('c-pointer').cases;

  assert.ok(exerciseById('c-pointer').concepts.includes('input-contract'));
  assert.ok(exerciseById('c-pointer').concepts.includes('signed-overflow'));
  assert.equal(cases.length, 5);
  assert.ok(cases.some(testCase => testCase.input === '9999\n' && testCase.expected === '10000'));
  assert.ok(cases.some(testCase => testCase.input === '-10000\n' && testCase.expected === '-9999'));
});
