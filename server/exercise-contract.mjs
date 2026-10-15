// Shared validation/normalization only; no exercise catalog or private cases.
// Keep the legacy grading-exercises export available for existing callers.
export function buildGradingExercises(metadata, casesById, harnessesById = {}, linkArgsById = {}) {
  if (!Array.isArray(metadata) || !casesById || typeof casesById !== 'object' || Array.isArray(casesById)
      || !harnessesById || typeof harnessesById !== 'object' || Array.isArray(harnessesById)
      || !linkArgsById || typeof linkArgsById !== 'object' || Array.isArray(linkArgsById)) {
    throw new Error('채점 메타데이터와 사례 객체가 필요합니다.');
  }
  const byId = new Map(metadata.map(exercise => [exercise.id, exercise]));
  for (const id of Object.keys(casesById)) {
    if (!byId.get(id)?.grader) throw new Error(`${id}: 채점 불가 문제에 사례가 등록되었습니다.`);
  }
  for (const id of Object.keys(harnessesById)) {
    if (byId.get(id)?.grader !== 'c-function') throw new Error(`${id}: 함수형이 아닌 문제에 하네스가 등록되었습니다.`);
  }
  for (const [id, linkArgs] of Object.entries(linkArgsById)) {
    if (byId.get(id)?.grader !== 'c-function' || !Array.isArray(linkArgs) || linkArgs.length === 0
        || linkArgs.some(arg => typeof arg !== 'string' || !/^-Wl,--wrap=(malloc|realloc|free)$/.test(arg))
        || new Set(linkArgs).size !== linkArgs.length) {
      throw new Error(`${id}: linkArgs는 허용된 함수형 링커 래퍼 배열이어야 합니다.`);
    }
  }
  const result = new Map();
  for (const exercise of metadata) {
    if (exercise.grader === null) continue;
    const harness = harnessesById[exercise.id];
    const linkArgs = linkArgsById[exercise.id] ?? [];
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
    result.set(exercise.id, Object.freeze({ ...exercise, harness, linkArgs: Object.freeze([...linkArgs]), cases: Object.freeze(normalized) }));
  }
  return result;
}
