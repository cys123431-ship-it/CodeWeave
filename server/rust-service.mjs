// Internal admission contract only: no executor, HTTP registration or environment activation.
import { createRustPlan } from './rust-contract.mjs';
import { gradingAdmission } from './grading-admission.mjs';

const messages = {
  RUST_DISABLED: [503, 'Rust 실행은 비활성 상태입니다.'],
  RUST_INVALID: [400, 'Rust 제출 요청이 올바르지 않습니다.'],
  RUST_BUSY: [429, '다른 Rust 코드를 채점하고 있습니다. 잠시 후 다시 시도하세요.'],
  RUST_CANCELLED: [499, 'Rust 채점 요청이 취소되었습니다.'],
  RUST_UNAVAILABLE: [503, 'Rust 채점 도구를 사용할 수 없습니다.']
};
function failure(code) {
  const [statusCode, message] = messages[code];
  return Object.assign(new Error(message), { code, statusCode });
}
function validResult(value, count) {
  return value && typeof value.ok === 'boolean'
    && typeof value.message === 'string' && value.message.length <= 3000
    && typeof value.compileOutput === 'string' && value.compileOutput.length <= 3000
    && Array.isArray(value.tests) && value.tests.length === count
    && value.tests.every(tc => typeof tc?.passed === 'boolean'
      && typeof tc.detail === 'string' && tc.detail.length <= 300)
    && value.ok === value.tests.every(tc => tc.passed);
}

export function createRustGradingService({ enabled = false, definitions, grade, onCleanupFailure } = {}) {
  if (typeof enabled !== 'boolean') throw new TypeError('Rust activation must be boolean');
  if (onCleanupFailure !== undefined && typeof onCleanupFailure !== 'function') {
    throw new TypeError('Cleanup supervision must be a trusted function');
  }
  if (enabled && (!(definitions instanceof Map) || typeof grade !== 'function')) {
    throw new TypeError('Enabled Rust service requires a trusted registry and grader');
  }
  return Object.freeze({
    async submit(request, options = {}) {
      if (!enabled) throw failure('RUST_DISABLED');
      if (!options || typeof options !== 'object'
          || (options.signal !== undefined && !(options.signal instanceof AbortSignal))) {
        throw failure('RUST_INVALID');
      }
      const { signal } = options;
      let plan;
      try { plan = createRustPlan(request, definitions); }
      catch { throw failure('RUST_INVALID'); }
      if (signal?.aborted) throw failure('RUST_CANCELLED');
      const snapshot = Object.freeze({ exerciseId: plan.exerciseId,
        code: plan.files.find(file => file.path === 'src/lib.rs').content });
      const releaseSlot = gradingAdmission.tryAcquire();
      if (!releaseSlot) throw failure('RUST_BUSY');
      try {
        let value;
        try { value = await grade(snapshot, definitions, { signal }); }
        catch (error) {
          if (['ERUSTCLEANUP', 'ECLEANUP'].includes(error?.code)) {
            if (onCleanupFailure) {
              const resume = releaseSlot.quarantine();
              try { await onCleanupFailure(Object.freeze({ error, resume })); }
              catch { /* Reporting failure never reopens admission or leaks its exception. */ }
            }
            throw failure('RUST_UNAVAILABLE');
          }
          if (error?.name === 'AbortError' || error?.code === 'ABORT_ERR') {
            throw failure('RUST_CANCELLED');
          }
          // Do not expose paths, arbitrary exception messages or cleanup recovery metadata.
          throw failure('RUST_UNAVAILABLE');
        }
        if (signal?.aborted) throw failure('RUST_CANCELLED');
        try {
          const { ok, message, compileOutput, tests } = value ?? {};
          if (!Array.isArray(tests) || tests.length !== plan.runCases.length) {
            throw new TypeError('Invalid Rust case count');
          }
          const answer = { ok, message, compileOutput,
            tests: Array.from({ length: plan.runCases.length }, (_, index) => {
              const tc = tests[index];
              return { passed: tc?.passed, detail: tc?.detail };
            }) };
          if (!validResult(answer, plan.runCases.length)) throw new TypeError('Invalid Rust result');
          answer.tests = Object.freeze(answer.tests.map(tc => Object.freeze(tc)));
          return Object.freeze(answer);
        } catch {
          throw failure('RUST_UNAVAILABLE');
        }
      } finally {
        // An abort never frees the slot before the underlying grader/cleanup settles.
        releaseSlot();
      }
    }
  });
}
