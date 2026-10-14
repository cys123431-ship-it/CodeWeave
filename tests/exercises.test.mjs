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

test('only implemented C exercises advertise their explicit grading strategy', () => {
  const expected = ['c-array', 'c-array-max-function', 'c-bounded-string-length', 'c-clamp-function', 'c-dynamic-student-array', 'c-fgets-logical-line', 'c-functions', 'c-hello', 'c-loops', 'c-multi-file', 'c-pointer', 'c-realloc-student-capacity', 'c-recursion-factorial', 'c-string-count-function', 'c-strtol-integer-input', 'c-struct-array-binary-search', 'c-struct-array-search', 'c-struct-array-sort', 'c-struct-student-registry', 'c-struct-student-score', 'c-student-vector-push', 'c-types'];
  assert.deepEqual(exercises.filter(exercise => isGradedExercise(exercise.id)).map(exercise => exercise.id).sort(), expected);
  assert.deepEqual([...gradingExercises.keys()].sort(), expected);
  for (const id of expected) {
    assert.equal(exerciseById(id).language, 'c');
    assert.ok(['stdin-output', 'c-function', 'c-multi-file'].includes(exerciseById(id).grader));
    assert.ok(gradingExercises.get(id).cases.length >= 1, id);
    const sample = exerciseById(id).publicExample;
    assert.ok(gradingExercises.get(id).cases.some(testCase =>
      testCase.input.trim() === sample.input.replace('입력 없음', '').trim()
      && testCase.expected.trim() === sample.output.trim()
    ), `${id}: 공개 예시가 비공개 채점 사례에도 있어야 합니다.`);
  }
  assert.ok(gradingExercises.get('c-loops').cases.some(testCase =>
    testCase.input === '1000\n' && testCase.expected === '500500'
  ), 'c-loops: 선언한 n 상한 1000을 검사해야 합니다.');
  assert.ok(gradingExercises.get('c-array').cases.some(testCase =>
    testCase.input.startsWith('20\n') && testCase.expected === '-1'
  ), 'c-array: 선언한 원소 개수 상한 20을 검사해야 합니다.');
  assert.equal(gradingExercises.get('c-types').cases.length, 5);
  assert.ok(gradingExercises.get('c-types').cases.some(testCase =>
    testCase.input === '10000 10000\n' && testCase.expected === '20000'
  ), 'c-types: 선언한 피연산자 상한과 합의 상한을 검사해야 합니다.');
  assert.equal(gradingExercises.get('c-pointer').cases.length, 5);
  assert.ok(gradingExercises.get('c-pointer').cases.some(testCase =>
    testCase.input === '9999\n' && testCase.expected === '10000'
  ), 'c-pointer: 선언한 증가 전 상한과 결과 상한을 검사해야 합니다.');
  assert.equal(gradingExercises.get('c-functions').cases.length, 6);
  assert.ok(gradingExercises.get('c-functions').cases.some(testCase =>
    testCase.input === '5 5 5\n' && testCase.expected === '5'
  ), 'c-functions: low와 high가 같은 유효 경계를 검사해야 합니다.');
  assert.equal(exerciseById('c-clamp-function').grader, 'c-function');
  assert.equal(gradingExercises.get('c-clamp-function').cases.length, 6);
  assert.ok(gradingExercises.get('c-clamp-function').cases.some(testCase =>
    testCase.input === 'clamp(5, 5, 5)' && testCase.expected === '5'
  ), 'c-clamp-function: low와 high가 같은 유효 경계를 검사해야 합니다.');
  assert.match(gradingExercises.get('c-clamp-function').harness, /int clamp\(int value, int low, int high\);/);
  assert.equal(exerciseById('c-array-max-function').grader, 'c-function');
  assert.equal(gradingExercises.get('c-array-max-function').cases.length, 8);
  assert.match(gradingExercises.get('c-array-max-function').harness, /int find_max\(const int values\[\], size_t length, int \*out_max\);/);
  assert.equal(exerciseById('c-string-count-function').grader, 'c-function');
  assert.equal(gradingExercises.get('c-string-count-function').cases.length, 9);
  assert.match(gradingExercises.get('c-string-count-function').harness, /int count_char\(const char \*text, char target, size_t \*out_count\);/);
  assert.equal(exerciseById('c-bounded-string-length').grader, 'c-function');
  assert.equal(gradingExercises.get('c-bounded-string-length').cases.length, 9);
  assert.match(gradingExercises.get('c-bounded-string-length').harness, /int bounded_length\(const char \*buffer, size_t capacity, size_t \*out_length\);/);
  assert.equal(exerciseById('c-fgets-logical-line').grader, 'stdin-output');
  assert.equal(gradingExercises.get('c-fgets-logical-line').cases.length, 9);
  assert.equal(gradingExercises.get('c-fgets-logical-line').harness, undefined);
  assert.equal(exerciseById('c-strtol-integer-input').grader, 'stdin-output');
  assert.equal(gradingExercises.get('c-strtol-integer-input').cases.length, 16);
  assert.deepEqual(exerciseById('c-strtol-integer-input').prerequisites, ['c-fgets-logical-line']);
  assert.equal(gradingExercises.get('c-strtol-integer-input').harness, undefined);
  assert.equal(exerciseById('c-struct-student-score').grader, 'c-function');
  assert.equal(gradingExercises.get('c-struct-student-score').cases.length, 11);
  assert.deepEqual(exerciseById('c-struct-student-score').prerequisites, ['c-functions', 'c-pointer']);
  assert.match(gradingExercises.get('c-struct-student-score').harness, /int update_score\(struct Student \*student, int delta\);/);
  assert.equal(exerciseById('c-struct-array-search').grader, 'c-function');
  assert.equal(gradingExercises.get('c-struct-array-search').cases.length, 11);
  assert.deepEqual(exerciseById('c-struct-array-search').prerequisites, ['c-array-max-function', 'c-struct-student-score']);
  assert.match(gradingExercises.get('c-struct-array-search').harness, /int find_student_index\(const struct Student students\[\], size_t count, int target_id, size_t \*out_index\);/);
  assert.equal(exerciseById('c-struct-array-sort').grader, 'c-function');
  assert.equal(gradingExercises.get('c-struct-array-sort').cases.length, 11);
  assert.deepEqual(exerciseById('c-struct-array-sort').prerequisites, ['c-struct-array-search']);
  assert.match(gradingExercises.get('c-struct-array-sort').harness, /int stable_sort_students_by_id\(struct Student students\[\], size_t count\);/);
  assert.equal(exerciseById('c-struct-array-binary-search').grader, 'c-function');
  assert.equal(gradingExercises.get('c-struct-array-binary-search').cases.length, 12);
  assert.deepEqual(exerciseById('c-struct-array-binary-search').prerequisites, ['c-struct-array-sort']);
  assert.match(gradingExercises.get('c-struct-array-binary-search').harness, /int find_first_student_by_id\(const struct Student students\[\], size_t count, int target_id, size_t \*out_index\);/);
  assert.equal(exerciseById('c-multi-file').grader, 'c-multi-file');
  assert.deepEqual(exerciseById('c-multi-file').requiredFiles, ['main.c', 'functions.c', 'functions.h']);
  assert.ok(gradingExercises.get('c-multi-file').cases.some(testCase =>
    testCase.input === '5 5 5\n' && testCase.expected === '5'
  ), 'c-multi-file: 분할 컴파일 경로에서도 low와 high가 같은 경계를 검사해야 합니다.');
  assert.equal(exerciseById('c-struct-student-registry').grader, 'c-multi-file');
  assert.equal(gradingExercises.get('c-struct-student-registry').cases.length, 10);
  assert.deepEqual(exerciseById('c-struct-student-registry').requiredFiles, ['main.c', 'student.c', 'student.h']);
  assert.deepEqual(exerciseById('c-struct-student-registry').prerequisites, ['c-struct-array-binary-search', 'c-multi-file']);
  assert.equal(exerciseById('c-dynamic-student-array').grader, 'c-function');
  assert.equal(gradingExercises.get('c-dynamic-student-array').cases.length, 12);
  assert.deepEqual(exerciseById('c-dynamic-student-array').prerequisites, ['c-struct-student-registry']);
  assert.match(gradingExercises.get('c-dynamic-student-array').harness, /int create_students\(size_t count, int initial_score, struct Student \*\*out_students\);/);
  assert.deepEqual(gradingExercises.get('c-dynamic-student-array').linkArgs, ['-Wl,--wrap=malloc', '-Wl,--wrap=free']);
  assert.equal(exerciseById('c-realloc-student-capacity').grader, 'c-function');
  assert.equal(gradingExercises.get('c-realloc-student-capacity').cases.length, 13);
  assert.deepEqual(exerciseById('c-realloc-student-capacity').prerequisites, ['c-dynamic-student-array']);
  assert.match(gradingExercises.get('c-realloc-student-capacity').harness, /int reserve_students\(struct Student \*\*students, size_t length,/);
  assert.deepEqual(gradingExercises.get('c-realloc-student-capacity').linkArgs, ['-Wl,--wrap=realloc']);
  assert.equal(exerciseById('c-student-vector-push').grader, 'c-function');
  assert.equal(gradingExercises.get('c-student-vector-push').cases.length, 17);
  assert.deepEqual(exerciseById('c-student-vector-push').prerequisites, ['c-realloc-student-capacity']);
  assert.match(gradingExercises.get('c-student-vector-push').harness, /int push_student\(struct Student \*\*students, size_t \*length,/);
  assert.match(gradingExercises.get('c-student-vector-push').harness, /int reserve_students\(struct Student \*\*students, size_t length,/);
  assert.deepEqual(gradingExercises.get('c-student-vector-push').linkArgs, []);
  for (const id of ['rust-mut', 'ds-stack', 'algo-binary']) assert.equal(isGradedExercise(id), false);
});

test('metadata rejects duplicate ids and unsupported enum values', () => {
  assert.throws(() => validateExerciseMetadata([valid, { ...valid }]), /중복/);
  assert.throws(() => validateExerciseMetadata([{ ...valid, kind: 'challenge' }]), /kind/);
  assert.throws(() => validateExerciseMetadata([{ ...valid, language: 'python' }]), /language/);
  assert.throws(() => validateExerciseMetadata([{ ...valid, grader: 'browser-eval' }]), /grader/);
  assert.throws(() => validateExerciseMetadata([{ ...valid, language: 'rust', grader: 'c-function' }]), /C만 지원/);
  assert.throws(() => validateExerciseMetadata([{ ...valid, grader: 'c-multi-file' }]), /requiredFiles/);
});

test('metadata rejects invalid concepts, examples and prerequisite graphs', () => {
  assert.throws(() => validateExerciseMetadata([{ ...valid, concepts: [] }]), /concepts/);
  assert.throws(() => validateExerciseMetadata([{ ...valid, publicExample: { input: 1, output: 'x' } }]), /publicExample/);
  assert.throws(() => validateExerciseMetadata([{ ...valid, prerequisites: ['sample'] }]), /자기 자신/);
  assert.throws(() => validateExerciseMetadata([{ ...valid, prerequisites: ['missing'] }]), /알 수 없는 선수/);
  assert.throws(() => validateExerciseMetadata([
    { ...valid, id: 'cycle-a', prerequisites: ['cycle-b'] },
    { ...valid, id: 'cycle-b', prerequisites: ['cycle-c'] },
    { ...valid, id: 'cycle-c', prerequisites: ['cycle-a'] }
  ]), /순환 선수 관계.*cycle-a.*cycle-b.*cycle-c.*cycle-a/);
});

test('private grading definitions reject missing, unknown and malformed cases', () => {
  assert.throws(() => buildGradingExercises([valid], {}), /채점 사례 누락/);
  assert.throws(() => buildGradingExercises([{ ...valid, grader: null }], { sample: [{ input: '', expected: 'x' }] }), /채점 불가 문제/);
  assert.throws(() => buildGradingExercises([valid], { sample: [] }), /cases/);
  assert.throws(() => buildGradingExercises([valid], { sample: [{ input: 1, expected: 'x' }] }), /input/);
  const functionExercise = { ...valid, grader: 'c-function' };
  const functionCases = { sample: [{ input: 'sample(1)', args: ['0'], expected: '1' }] };
  assert.throws(() => buildGradingExercises([functionExercise], functionCases), /하네스 누락/);
  assert.throws(() => buildGradingExercises([functionExercise], { sample: [{ input: 'sample(1)', expected: '1' }] }, { sample: 'int main(void){return 0;}' }), /args/);
  assert.throws(() => buildGradingExercises([functionExercise], functionCases, { sample: 'int main(void){return 0;}' }, { sample: ['-pthread'] }), /linkArgs/);
  assert.doesNotThrow(() => buildGradingExercises([functionExercise], functionCases, { sample: 'int main(void){return 0;}' }, { sample: ['-Wl,--wrap=realloc'] }));
});
