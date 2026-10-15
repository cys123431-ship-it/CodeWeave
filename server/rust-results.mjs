// Result observation only. No default executor, subprocess import or HTTP route.
const unexecuted = () => ({ passed: false, detail: '미실행' });
const fatal = detail => ({ passed: false, fatal: true, detail });

export function formatRustProcessFailure(output) {
  return JSON.stringify({
    status: output?.status ?? null, signal: output?.signal ?? null,
    code: output?.error?.code ?? null,
    observation: output?.observation,
    stdout: typeof output?.stdout === 'string' ? output.stdout.slice(-2000) : '',
    stderr: typeof output?.stderr === 'string' ? output.stderr.slice(-3000) : ''
  });
}

function declaredCases(plan) {
  const cases = plan?.runCases;
  if (!Array.isArray(cases) || cases.length < 8 || cases.length > 12
      || cases.some(tc => !tc || !/^case_\d{2}$/.test(tc.id))
      || new Set(cases.map(tc => tc.id)).size !== cases.length) {
    throw new TypeError('Rust 결과의 선언 사례가 올바르지 않습니다.');
  }
  return cases;
}

export function classifyRustCase(id, output, total) {
  if (['ENOENT', 'ELIMIT'].includes(output?.error?.code)) {
    throw new Error('Rust 운영 오류: 실행 도구 또는 제한 설정을 확인하세요.');
  }
  if (output?.error) {
    return fatal(output.error.code === 'ETIMEDOUT' ? '시간 제한 초과'
      : output.error.code === 'ENOBUFS' ? '출력 크기 제한 초과' : '실행 오류');
  }
  if (output?.signal || ![0, 101].includes(output?.status)) return fatal('비정상 종료');
  if (typeof output.stdout !== 'string' || typeof output.stderr !== 'string'
      || Buffer.byteLength(output.stdout + output.stderr, 'utf8') > 80000) {
    return fatal('출력 크기 또는 결과 형식 오류');
  }
  const lines = output.stdout.replace(/\r\n/g, '\n').split('\n');
  const summaries = lines.filter(line => line.startsWith('test result:'));
  const reports = lines.filter(line => /^test .+ \.\.\. /.test(line));
  const headers = lines.filter(line => /^running /.test(line));
  const summary = summaries.length === 1 && /^test result: (ok|FAILED)\. (\d+) passed; (\d+) failed; 0 ignored; 0 measured; (\d+) filtered out; finished in [\d.]+s$/.exec(summaries[0]);
  if (!summary || reports.length !== 1 || headers.length !== 1 || headers[0] !== 'running 1 test'
      || Number(summary[4]) !== total - 1) {
    return fatal('테스트 결과 형식 오류 · 1개 사례 실행을 확인하지 못했습니다.');
  }
  const passed = summary[1] === 'ok' && summary[2] === '1' && summary[3] === '0'
    && reports[0] === `test ${id} ... ok` && output.status === 0;
  if (passed) return { passed: true, fatal: false, detail: '테스트 통과' };
  const failed = summary[1] === 'FAILED' && summary[2] === '0' && summary[3] === '1'
    && reports[0] === `test ${id} ... FAILED` && output.status === 101;
  if (failed) {
    return { passed: false, fatal: false, detail: ('단언 실패 · ' + output.stdout.trim()).slice(0, 300) };
  }
  return fatal('테스트 결과와 종료 상태 불일치');
}

export async function runRustCases(plan, observe) {
  const cases = declaredCases(plan);
  if (typeof observe !== 'function') throw new TypeError('Rust 실행 관찰 함수가 필요합니다. 기본 호스트 실행기는 없습니다.');
  const tests = [];
  for (const tc of cases) {
    // Exceptions are infrastructure errors, not fabricated failed submissions.
    const verdict = classifyRustCase(tc.id, await observe(tc), cases.length);
    tests.push({ passed: verdict.passed, detail: verdict.detail });
    if (verdict.fatal) {
      tests.push(...cases.slice(tests.length).map(unexecuted));
      break;
    }
  }
  return tests;
}

function compileDiagnostic(compilation) {
  const diagnostics = [];
  for (const line of (compilation?.stdout || '').split('\n')) {
    try {
      const value = JSON.parse(line);
      if (value?.reason === 'compiler-message' && typeof value.message?.rendered === 'string') {
        diagnostics.push(value.message.rendered);
      }
    } catch {
      if (line) diagnostics.push(line);
    }
  }
  if (compilation?.stderr) diagnostics.push(compilation.stderr);
  if (compilation?.error?.message) diagnostics.push(compilation.error.message);
  return diagnostics.join('\n').slice(0, 3000);
}

export function buildRustResult(plan, compilation, tests = []) {
  const cases = declaredCases(plan);
  if (['ENOENT', 'ELIMIT'].includes(compilation?.error?.code)) {
    throw new Error('Rust 운영 오류: 컴파일 도구 또는 제한 설정을 확인하세요.');
  }
  if (compilation?.status !== 0 || compilation.error || compilation.signal) {
    return {
      ok: false, message: `0/${cases.length}개 테스트 통과 · 컴파일 실패`,
      compileOutput: compileDiagnostic(compilation), tests: cases.map(unexecuted)
    };
  }
  if (!Array.isArray(tests) || tests.length !== cases.length
      || tests.some(tc => typeof tc?.passed !== 'boolean' || typeof tc.detail !== 'string')) {
    throw new TypeError('Rust 채점 결과는 전체 선언 사례와 일치해야 합니다.');
  }
  const passed = tests.filter(tc => tc.passed).length;
  return {
    ok: passed === cases.length, message: `${passed}/${cases.length}개 테스트 통과`,
    compileOutput: compileDiagnostic(compilation),
    tests: tests.map(tc => ({ passed: tc.passed, detail: tc.detail.slice(0, 300) }))
  };
}
