import test from 'node:test';
import assert from 'node:assert/strict';
import { lessons } from '../src/catalog.js';
import {
  exercises, exerciseById, isGradedExercise, validateExerciseMetadata
} from '../src/exercises.js';
import {
  gradingExercises, buildGradingExercises
} from '../server/grading-exercises.mjs';

const valid = {
  id: 'sample', kind: 'concept', language: 'c', grader: 'stdin-output',
  concepts: ['standard-output'], prerequisites: [],
  publicExample: { input: '입력 없음', output: 'hello' }
};

test('every lesson challenge has one validated public exercise definition', () => {
  assert.equal(exercises.length, lessons.length);
  assert.equal(new Set(exercises.map(exercise => exercise.id)).size, exercises.length);
  for (const lesson of lessons) {
    const exercise = exerciseById(lesson.challenge.id);
    assert.ok(exercise, lesson.id);
    assert.equal(exercise.id, lesson.id);
    assert.equal(exercise.publicExample.input, lesson.challenge.input);
    assert.equal(exercise.publicExample.output, lesson.challenge.expected);
    assert.ok(['concept', 'practice'].includes(exercise.kind));
    assert.ok(exercise.concepts.length > 0);
    assert.ok(!exercise.prerequisites.includes(exercise.id));
  }
  assert.ok(exercises.some(exercise => exercise.kind === 'concept'));
  assert.ok(exercises.some(exercise => exercise.kind === 'practice'));
});

test('only the six implemented C stdin-output exercises advertise grading', () => {
  const expected = ['c-array', 'c-functions', 'c-hello', 'c-loops', 'c-pointer', 'c-types'];
  assert.deepEqual(exercises.filter(exercise => isGradedExercise(exercise.id)).map(exercise => exercise.id).sort(), expected);
  assert.deepEqual([...gradingExercises.keys()].sort(), expected);
  for (const id of expected) {
    assert.equal(exerciseById(id).language, 'c');
    assert.equal(exerciseById(id).grader, 'stdin-output');
    assert.ok(gradingExercises.get(id).cases.length >= 1, id);
    const sample = exerciseById(id).publicExample;
    assert.ok(gradingExercises.get(id).cases.some(testCase =>
      testCase.input.trim() === sample.input.replace('입력 없음', '').trim()
      && testCase.expected.trim() === sample.output.trim()
    ), `${id}: 공개 예시가 비공개 채점 사례에도 있어야 합니다.`);
  }
  assert.equal(gradingExercises.get('c-functions').cases.length, 5);
  for (const id of ['rust-mut', 'ds-stack', 'algo-binary']) assert.equal(isGradedExercise(id), false);
});

test('metadata rejects duplicate ids and unsupported enum values', () => {
  assert.throws(() => validateExerciseMetadata([valid, { ...valid }]), /중복/);
  assert.throws(() => validateExerciseMetadata([{ ...valid, kind: 'challenge' }]), /kind/);
  assert.throws(() => validateExerciseMetadata([{ ...valid, language: 'python' }]), /language/);
  assert.throws(() => validateExerciseMetadata([{ ...valid, grader: 'browser-eval' }]), /grader/);
});

test('metadata rejects invalid concepts, examples and prerequisite graphs', () => {
  assert.throws(() => validateExerciseMetadata([{ ...valid, concepts: [] }]), /concepts/);
  assert.throws(() => validateExerciseMetadata([{ ...valid, publicExample: { input: 1, output: 'x' } }]), /publicExample/);
  assert.throws(() => validateExerciseMetadata([{ ...valid, prerequisites: ['sample'] }]), /자기 자신/);
  assert.throws(() => validateExerciseMetadata([{ ...valid, prerequisites: ['missing'] }]), /알 수 없는 선수/);
});

test('private grading definitions reject missing, unknown and malformed cases', () => {
  assert.throws(() => buildGradingExercises([valid], {}), /채점 사례 누락/);
  assert.throws(() => buildGradingExercises([{ ...valid, grader: null }], { sample: [{ input: '', expected: 'x' }] }), /채점 불가 문제/);
  assert.throws(() => buildGradingExercises([valid], { sample: [] }), /cases/);
  assert.throws(() => buildGradingExercises([valid], { sample: [{ input: 1, expected: 'x' }] }), /input/);
});
