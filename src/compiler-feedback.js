const DEFINITIONS = Object.freeze({
  'missing-header': Object.freeze({
    phase: 'compile', title: '헤더 파일을 찾을 수 없음',
    guidance: '#include의 파일명, 대소문자, 제출한 헤더 파일 이름이 정확히 같은지 확인하세요.'
  }),
  'declaration-mismatch': Object.freeze({
    phase: 'compile', title: '선언과 정의의 형식이 다름',
    guidance: '헤더의 함수 원형과 소스의 반환형, 매개변수 개수·자료형·순서를 정확히 맞추세요.'
  }),
  'undefined-reference': Object.freeze({
    phase: 'link', title: '함수나 변수의 정의를 연결하지 못함',
    guidance: '선언만 있고 정의가 빠졌는지, 정의한 소스 파일이 함께 컴파일되는지, 이름 철자가 같은지 확인하세요.'
  }),
  'duplicate-definition': Object.freeze({
    phase: 'link', title: '같은 이름이 두 번 정의됨',
    guidance: 'main 함수나 전역 함수·변수를 여러 파일에서 중복 정의하지 않았는지 확인하세요.'
  }),
  'link-error': Object.freeze({
    phase: 'link', title: '링크 단계 오류',
    guidance: '필요한 함수 정의가 들어 있는 소스 파일과 라이브러리가 모두 연결되는지 확인하세요.'
  }),
  'compile-error': Object.freeze({
    phase: 'compile', title: 'C 문법 또는 선언 오류',
    guidance: '원문에서 가장 먼저 나타난 error 줄부터 확인하고 세미콜론, 괄호, 이름, 자료형을 점검하세요.'
  }),
  'compiler-unavailable': Object.freeze({
    phase: 'environment', title: 'GCC를 실행할 수 없음',
    guidance: 'GCC가 설치되어 있고 터미널의 PATH에서 gcc 명령을 실행할 수 있는지 확인하세요.'
  }),
  'compiler-timeout': Object.freeze({
    phase: 'environment', title: '컴파일 시간 제한 초과',
    guidance: '지나치게 큰 소스나 전처리기 반복이 없는지 확인한 뒤 다시 시도하세요.'
  })
});

const feedback = code => ({ code, ...DEFINITIONS[code] });

// GCC/ld 원문을 교체하지 않고, 학습자가 먼저 살펴볼 범주만 덧붙인다.
export function classifyCompilerDiagnostic({ output = '', error } = {}) {
  if (error?.code === 'ETIMEDOUT') return feedback('compiler-timeout');
  if (error) return feedback('compiler-unavailable');
  const diagnostic = typeof output === 'string' ? output.toLowerCase() : '';
  if (/fatal error:.*no such file or directory/.test(diagnostic)) return feedback('missing-header');
  if (/conflicting types? for|conflicting type qualifiers/.test(diagnostic)) return feedback('declaration-mismatch');
  if (/undefined reference to|unresolved external symbol/.test(diagnostic)) return feedback('undefined-reference');
  if (/multiple definition of|duplicate symbol/.test(diagnostic)) return feedback('duplicate-definition');
  if (/collect2: error: ld returned|(?:^|\n)ld(?:\.exe)?:/.test(diagnostic)) return feedback('link-error');
  return feedback('compile-error');
}

export function normalizeCompilerFeedback(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const definition = DEFINITIONS[value.code];
  if (!definition || value.phase !== definition.phase || value.title !== definition.title ||
      value.guidance !== definition.guidance) return null;
  return feedback(value.code);
}

export function formatCompilerFeedback(value) {
  const normalized = normalizeCompilerFeedback(value);
  if (!normalized) return '';
  const phase = normalized.phase === 'link' ? '링크' : normalized.phase === 'environment' ? '실행 환경' : '컴파일';
  return `학습 피드백: ${phase} 단계 · ${normalized.title}\n확인할 점: ${normalized.guidance}`;
}
