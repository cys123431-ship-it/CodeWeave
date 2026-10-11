const KINDS = new Set(['concept', 'practice']);
const LANGUAGES = new Set(['c', 'rust']);
const GRADERS = new Set(['stdin-output', 'c-function', null]);
const ID_PATTERN = /^[a-z][a-z0-9-]*$/;

function stringList(value, field, id, allowEmpty = false) {
  if (!Array.isArray(value) || (!allowEmpty && value.length === 0)) {
    throw new Error(`${id}: ${field}는 ${allowEmpty ? '' : '비어 있지 않은 '}배열이어야 합니다.`);
  }
  if (value.some(item => typeof item !== 'string' || !ID_PATTERN.test(item))) {
    throw new Error(`${id}: ${field}에는 유효한 ID만 사용할 수 있습니다.`);
  }
  if (new Set(value).size !== value.length) throw new Error(`${id}: ${field}에 중복 값이 있습니다.`);
  return [...value];
}

export function validateExerciseMetadata(definitions) {
  if (!Array.isArray(definitions) || definitions.length === 0) throw new Error('문제 정의 배열이 필요합니다.');
  const ids = new Set();
  const normalized = definitions.map((definition, index) => {
    if (!definition || typeof definition !== 'object' || Array.isArray(definition)) throw new Error(`${index}: 문제 정의가 객체가 아닙니다.`);
    const { id, kind, language, grader, concepts, prerequisites, publicExample } = definition;
    if (typeof id !== 'string' || !ID_PATTERN.test(id)) throw new Error(`${index}: 유효하지 않은 문제 ID입니다.`);
    if (ids.has(id)) throw new Error(`${id}: 중복 문제 ID입니다.`);
    ids.add(id);
    if (!KINDS.has(kind)) throw new Error(`${id}: 지원하지 않는 kind입니다.`);
    if (!LANGUAGES.has(language)) throw new Error(`${id}: 지원하지 않는 language입니다.`);
    if (!GRADERS.has(grader)) throw new Error(`${id}: 지원하지 않는 grader입니다.`);
    if (grader !== null && language !== 'c') throw new Error(`${id}: 현재 자동 채점기는 C만 지원합니다.`);
    if (!publicExample || typeof publicExample.input !== 'string' || typeof publicExample.output !== 'string') {
      throw new Error(`${id}: publicExample의 input과 output은 문자열이어야 합니다.`);
    }
    return {
      id, kind, language, grader,
      concepts: stringList(concepts, 'concepts', id),
      prerequisites: stringList(prerequisites, 'prerequisites', id, true),
      publicExample: { input: publicExample.input, output: publicExample.output }
    };
  });
  for (const exercise of normalized) {
    for (const prerequisite of exercise.prerequisites) {
      if (prerequisite === exercise.id) throw new Error(`${exercise.id}: 자기 자신을 선수 문제로 지정할 수 없습니다.`);
      if (!ids.has(prerequisite)) throw new Error(`${exercise.id}: 알 수 없는 선수 문제 ${prerequisite}입니다.`);
    }
  }
  return normalized.map(exercise => Object.freeze({
    ...exercise,
    concepts: Object.freeze(exercise.concepts),
    prerequisites: Object.freeze(exercise.prerequisites),
    publicExample: Object.freeze(exercise.publicExample)
  }));
}

export const exercises = Object.freeze(validateExerciseMetadata([
  { id:'c-hello', kind:'concept', language:'c', grader:'stdin-output', concepts:['program-structure','standard-output'], prerequisites:[], publicExample:{input:'입력 없음',output:'Hello, CodeWeave!'} },
  { id:'c-types', kind:'concept', language:'c', grader:'stdin-output', concepts:['variables','integer-arithmetic','standard-input'], prerequisites:['c-hello'], publicExample:{input:'4 7',output:'11'} },
  { id:'c-loops', kind:'concept', language:'c', grader:'stdin-output', concepts:['conditionals','for-loop','accumulator'], prerequisites:['c-types'], publicExample:{input:'5',output:'15'} },
  { id:'c-array', kind:'practice', language:'c', grader:'stdin-output', concepts:['arrays','iteration','maximum'], prerequisites:['c-loops'], publicExample:{input:'5\n2 9 -3 4 1',output:'9'} },
  { id:'c-pointer', kind:'concept', language:'c', grader:'stdin-output', concepts:['address','dereference','pointer-parameter'], prerequisites:['c-types'], publicExample:{input:'7',output:'8'} },
  { id:'c-functions', kind:'practice', language:'c', grader:'stdin-output', concepts:['function-prototype','parameters','return-value'], prerequisites:['c-loops','c-pointer'], publicExample:{input:'15 0 10',output:'10'} },
  { id:'c-clamp-function', kind:'practice', language:'c', grader:'c-function', concepts:['function-contract','separate-compilation','test-harness'], prerequisites:['c-functions'], publicExample:{input:'clamp(15, 0, 10)',output:'10'} },
  { id:'rust-mut', kind:'concept', language:'rust', grader:null, concepts:['binding','mutability'], prerequisites:[], publicExample:{input:'입력 없음',output:'4'} },
  { id:'ds-stack', kind:'practice', language:'c', grader:null, concepts:['stack','lifo','array-implementation'], prerequisites:['c-array','c-functions'], publicExample:{input:'—',output:'—'} },
  { id:'algo-binary', kind:'practice', language:'c', grader:null, concepts:['binary-search','sorted-precondition','logarithmic-complexity'], prerequisites:['c-array','c-loops'], publicExample:{input:'—',output:'—'} }
]));

const exercisesById = new Map(exercises.map(exercise => [exercise.id, exercise]));
export const exerciseById = id => exercisesById.get(id) ?? null;
export const isGradedExercise = id => exerciseById(id)?.grader !== null;
