import { exercises } from '../src/exercises.js';

const CASES = {
  'c-hello': [{input:'',expected:'Hello, CodeWeave!'}],
  'c-types': [{input:'4 7\n',expected:'11'},{input:'-5 2\n',expected:'-3'},{input:'0 0\n',expected:'0'}],
  'c-loops': [{input:'5\n',expected:'15'},{input:'0\n',expected:'0'},{input:'10\n',expected:'55'}],
  'c-array': [{input:'5\n2 9 -3 4 1\n',expected:'9'},{input:'1\n-12\n',expected:'-12'},{input:'4\n-9 -3 -5 -10\n',expected:'-3'}],
  'c-pointer': [{input:'7\n',expected:'8'},{input:'-4\n',expected:'-3'},{input:'0\n',expected:'1'}],
  'c-functions': [{input:'5 0 10\n',expected:'5'},{input:'-3 0 10\n',expected:'0'},{input:'15 0 10\n',expected:'10'},{input:'-20 -10 -1\n',expected:'-10'},{input:'-1 -10 -1\n',expected:'-1'}],
  'c-clamp-function': [
    {input:'clamp(5, 0, 10)',args:['0'],expected:'5'},
    {input:'clamp(-3, 0, 10)',args:['1'],expected:'0'},
    {input:'clamp(15, 0, 10)',args:['2'],expected:'10'},
    {input:'clamp(-20, -10, -1)',args:['3'],expected:'-10'},
    {input:'clamp(-1, -10, -1)',args:['4'],expected:'-1'}
  ],
  'c-array-max-function': [
    {input:'find_max({4, -2, 9, 1}, 4, &out)',args:['0'],expected:'1 9'},
    {input:'find_max({-7, -3, -12}, 3, &out)',args:['1'],expected:'1 -3'},
    {input:'find_max({5, 5, 2, 5}, 4, &out)',args:['2'],expected:'1 5'},
    {input:'find_max({INT_MIN, 0, INT_MAX}, 3, &out) · out == INT_MAX',args:['3'],expected:'1 1'},
    {input:'find_max({-42}, 1, &out)',args:['4'],expected:'1 -42'},
    {input:'find_max(NULL, 3, &out) · NULL 배열',args:['5'],expected:'0 77'},
    {input:'find_max({5}, 0, &out) · 길이 0',args:['6'],expected:'0 77'},
    {input:'find_max({5}, 1, NULL)',args:['7'],expected:'0'}
  ],
  'c-multi-file': [{input:'5 0 10\n',expected:'5'},{input:'-3 0 10\n',expected:'0'},{input:'15 0 10\n',expected:'10'},{input:'-20 -10 -1\n',expected:'-10'},{input:'-1 -10 -1\n',expected:'-1'}]
};

const HARNESSES = {
  'c-clamp-function': `#include <stdio.h>
#include <stdlib.h>

int clamp(int value, int low, int high);

int main(int argc, char **argv) {
    if (argc != 2) return 70;
    switch (atoi(argv[1])) {
        case 0: printf("%d\\n", clamp(5, 0, 10)); break;
        case 1: printf("%d\\n", clamp(-3, 0, 10)); break;
        case 2: printf("%d\\n", clamp(15, 0, 10)); break;
        case 3: printf("%d\\n", clamp(-20, -10, -1)); break;
        case 4: printf("%d\\n", clamp(-1, -10, -1)); break;
        default: return 71;
    }
    return 0;
}`,
  'c-array-max-function': `#include <limits.h>
#include <stddef.h>
#include <stdio.h>
#include <stdlib.h>

int find_max(const int values[], size_t length, int *out_max);

int main(int argc, char **argv) {
    if (argc != 2) return 70;
    int out = 77;
    int status;
    switch (atoi(argv[1])) {
        case 0: { const int values[] = {4, -2, 9, 1}; status = find_max(values, 4, &out); printf("%d %d\\n", status, out); break; }
        case 1: { const int values[] = {-7, -3, -12}; status = find_max(values, 3, &out); printf("%d %d\\n", status, out); break; }
        case 2: { const int values[] = {5, 5, 2, 5}; status = find_max(values, 4, &out); printf("%d %d\\n", status, out); break; }
        case 3: { const int values[] = {INT_MIN, 0, INT_MAX}; status = find_max(values, 3, &out); printf("%d %d\\n", status, out == INT_MAX); break; }
        case 4: { const int values[] = {-42}; status = find_max(values, 1, &out); printf("%d %d\\n", status, out); break; }
        case 5: status = find_max(NULL, 3, &out); printf("%d %d\\n", status, out); break;
        case 6: { const int values[] = {5}; status = find_max(values, 0, &out); printf("%d %d\\n", status, out); break; }
        case 7: { const int values[] = {5}; status = find_max(values, 1, NULL); printf("%d\\n", status); break; }
        default: return 71;
    }
    return 0;
}`
};

export function buildGradingExercises(metadata, casesById, harnessesById = {}) {
  if (!Array.isArray(metadata) || !casesById || typeof casesById !== 'object' || Array.isArray(casesById)
      || !harnessesById || typeof harnessesById !== 'object' || Array.isArray(harnessesById)) {
    throw new Error('채점 메타데이터와 사례 객체가 필요합니다.');
  }
  const byId = new Map(metadata.map(exercise => [exercise.id, exercise]));
  for (const id of Object.keys(casesById)) {
    if (!byId.get(id)?.grader) throw new Error(`${id}: 채점 불가 문제에 사례가 등록되었습니다.`);
  }
  for (const id of Object.keys(harnessesById)) {
    if (byId.get(id)?.grader !== 'c-function') throw new Error(`${id}: 함수형이 아닌 문제에 하네스가 등록되었습니다.`);
  }
  const result = new Map();
  for (const exercise of metadata) {
    if (exercise.grader === null) continue;
    const harness = harnessesById[exercise.id];
    if (exercise.grader === 'c-function' && (typeof harness !== 'string' || harness.trim() === '')) {
      throw new Error(`${exercise.id}: 함수 채점 하네스 누락입니다.`);
    }
    if (exercise.grader !== 'c-function' && harness !== undefined) {
      throw new Error(`${exercise.id}: 함수형이 아닌 문제에는 함수 하네스를 사용할 수 없습니다.`);
    }
    const cases = casesById[exercise.id];
    if (cases === undefined) throw new Error(`${exercise.id}: 채점 사례 누락입니다.`);
    if (!Array.isArray(cases) || cases.length === 0) throw new Error(`${exercise.id}: cases는 비어 있지 않은 배열이어야 합니다.`);
    const normalized = cases.map((testCase, index) => {
      if (!testCase || typeof testCase.input !== 'string') throw new Error(`${exercise.id} cases[${index}]: input은 문자열이어야 합니다.`);
      if (typeof testCase.expected !== 'string') throw new Error(`${exercise.id} cases[${index}]: expected는 문자열이어야 합니다.`);
      if (exercise.grader === 'c-function'
          && (!Array.isArray(testCase.args) || testCase.args.length === 0 || testCase.args.some(arg => typeof arg !== 'string'))) {
        throw new Error(`${exercise.id} cases[${index}]: args는 비어 있지 않은 문자열 배열이어야 합니다.`);
      }
      return Object.freeze({
        input: testCase.input,
        expected: testCase.expected,
        args: Object.freeze(exercise.grader === 'c-function' ? [...testCase.args] : [])
      });
    });
    result.set(exercise.id, Object.freeze({ ...exercise, harness, cases: Object.freeze(normalized) }));
  }
  return result;
}

export const gradingExercises = buildGradingExercises(exercises, CASES, HARNESSES);
