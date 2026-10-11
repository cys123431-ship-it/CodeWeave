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
  ]
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
    if (exercise.grader === 'stdin-output' && harness !== undefined) {
      throw new Error(`${exercise.id}: 입출력 문제에는 함수 하네스를 사용할 수 없습니다.`);
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
