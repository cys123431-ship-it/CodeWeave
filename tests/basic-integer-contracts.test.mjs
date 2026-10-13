import test from 'node:test';
import assert from 'node:assert/strict';
import { lessons } from '../src/catalog.js';
import { exerciseById } from '../src/exercises.js';
import { gradingExercises } from '../server/grading-exercises.mjs';

function lessonById(id) {
  return lessons.find(lesson => lesson.id === id);
}

test('c-types fixes a portable operand range and exercises both sum boundaries', () => {
  const lesson = lessonById('c-types');
  const sectionText = lesson.sections.map(section => section.text).join('\n');
  const cases = gradingExercises.get('c-types').cases;

  assert.match(lesson.challenge.description, /-10000.*10000/);
  assert.match(sectionText, /-32767.*32767/);
  assert.match(sectionText, /정확히 두.*정수/);
  assert.match(sectionText, /범위 밖 값/);
  assert.match(sectionText, /채점 대상이 아닙니다/);
  assert.match(lesson.challenge.starter, /scanf\("%d%d", &a, &b\) != 2/);
  assert.ok(exerciseById('c-types').concepts.includes('input-contract'));
  assert.ok(exerciseById('c-types').concepts.includes('signed-overflow'));
  assert.equal(cases.length, 5);
  assert.ok(cases.some(testCase => testCase.input === '10000 10000\n' && testCase.expected === '20000'));
  assert.ok(cases.some(testCase => testCase.input === '-10000 -10000\n' && testCase.expected === '-20000'));
});

test('c-pointer fixes a pre-increment range and exercises both result boundaries', () => {
  const lesson = lessonById('c-pointer');
  const sectionText = lesson.sections.map(section => section.text).join('\n');
  const cases = gradingExercises.get('c-pointer').cases;

  assert.match(lesson.challenge.description, /-10000.*9999/);
  assert.match(sectionText, /-9999.*10000/);
  assert.match(sectionText, /정확히 한.*정수/);
  assert.match(sectionText, /범위 밖 값/);
  assert.match(sectionText, /채점 대상이 아닙니다/);
  assert.ok(exerciseById('c-pointer').concepts.includes('input-contract'));
  assert.ok(exerciseById('c-pointer').concepts.includes('signed-overflow'));
  assert.equal(cases.length, 5);
  assert.ok(cases.some(testCase => testCase.input === '9999\n' && testCase.expected === '10000'));
  assert.ok(cases.some(testCase => testCase.input === '-10000\n' && testCase.expected === '-9999'));
});
