// Trusted loopback HTTP adapter only. Not registered by dev-server or enabled by environment.
import { MAX_CODE_LENGTH } from '../src/iterations.js';
import { gradingAdmission } from './grading-admission.mjs';
import { createRequestCancellation } from './request-cancellation.mjs';

const MAX_REQUEST_BYTES = MAX_CODE_LENGTH * 4 + 4096;
const failures = Object.freeze({
  RUST_DISABLED: [503, 'Rust 채점은 아직 활성화되지 않았습니다.'],
  RUST_INVALID: [400, 'Rust 제출 형식 또는 문제를 확인하세요.'],
  RUST_BUSY: [429, '다른 코드를 채점하고 있어요. 잠시 후 다시 시도하세요.'],
  RUST_CANCELLED: [499, 'Rust 채점 요청이 취소되었습니다.'],
  RUST_UNAVAILABLE: [503, 'Rust 채점 도구를 사용할 수 없습니다.']
});
function send(res, status, data) {
  if (res.destroyed || res.writableEnded) return;
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
  res.end(JSON.stringify(data));
}
function reject(res, code) {
  const [status, message] = failures[code] ?? failures.RUST_UNAVAILABLE;
  send(res, status, { ok: false, message });
}
export function createRustHttpHandler({ enabled = false, service, auth, allowedIds } = {}) {
  if (typeof enabled !== 'boolean') throw new TypeError('HTTP Rust activation must be boolean');
  if (!auth || typeof auth.authorizeGrade !== 'function') throw new TypeError('Trusted local authentication is required');
  if (enabled && (!service || typeof service.submit !== 'function')) {
    throw new TypeError('An explicitly supplied trusted Rust service is required');
  }
  if (allowedIds !== undefined && (!Array.isArray(allowedIds) || allowedIds.length === 0
      || Array.from(allowedIds).some(id => typeof id !== 'string' || !/^[a-z][a-z0-9-]{0,79}$/.test(id))
      || new Set(allowedIds).size !== allowedIds.length)) {
    throw new TypeError('Explicit Rust HTTP IDs must be unique trusted identifiers');
  }
  const allowed = allowedIds === undefined ? undefined : Object.freeze([...allowedIds]);
  return async function handleRustGrade(req, res) {
    if (req.method !== 'POST') return send(res, 405, { ok: false, message: 'POST 요청만 가능합니다.' });
    if (!auth.authorizeGrade(req, res)) return;
    if (!enabled) return reject(res, 'RUST_DISABLED');
    if (gradingAdmission.busy) return reject(res, 'RUST_BUSY');
    const lifetime = createRequestCancellation(req, res);
    try {
      const chunks = [];
      let size = 0;
      for await (const chunk of req) {
        size += chunk.length;
        if (size > MAX_REQUEST_BYTES) return send(res, 413, { ok: false, message: '요청 크기가 너무 큽니다.' });
        chunks.push(chunk);
      }
      lifetime.signal.throwIfAborted();
      let value;
      try { value = JSON.parse(Buffer.concat(chunks).toString('utf8')); }
      catch { return reject(res, 'RUST_INVALID'); }
      if (allowed && !allowed.includes(value?.exerciseId)) return reject(res, 'RUST_INVALID');
      // Service rechecks the shared lease after asynchronous body parsing and owns cleanup.
      const result = await service.submit(value, { signal: lifetime.signal });
      lifetime.signal.throwIfAborted();
      return send(res, 200, result);
    } catch (error) {
      if (lifetime.signal.aborted || req.aborted || res.destroyed) return;
      // Never trust arbitrary statusCode/message/cause/workspace metadata from an exception.
      return reject(res, Object.hasOwn(failures, error?.code) ? error.code : 'RUST_UNAVAILABLE');
    } finally {
      lifetime.dispose();
    }
  };
}

