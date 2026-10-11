import test from 'node:test';
import assert from 'node:assert/strict';
import { ITERATIONS_KEY, MAX_ITERATIONS, normalizeIterations } from '../src/iterations.js';
import { recordGradedSubmission, submissionCode, validateGradingResult, attemptHistoryHtml, formatGradingResult } from '../src/practice.js';
import { classifyCompilerDiagnostic } from '../src/compiler-feedback.js';

const ids = ['c-hello', 'c-types'];
const at = '2026-10-11T02:00:00.000Z';
const pass = { ok: true, message: '1/1 통과', tests: [{ passed: true, detail: '출력 일치' }] };
const fail = { ok: false, message: '컴파일 실패', tests: [], compileOutput: 'expected ;' };
const compilerFail = { ...fail, compilerFeedback: classifyCompilerDiagnostic({ output: fail.compileOutput }) };
function memoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
}

test('lesson and workbench submissions share existing history without overwriting other problems', () => {
  const storage = memoryStorage();
  recordGradedSubmission(storage, ids, 'c-hello', 'old workbench code', fail, at);
  recordGradedSubmission(storage, ids, 'c-types', 'sum code', pass, at);
  const history = recordGradedSubmission(storage, ids, 'c-hello', 'new lesson code', pass, at);
  assert.deepEqual(history['c-hello'].map(entry => entry.code), ['new lesson code', 'old workbench code']);
  assert.equal(history['c-types'][0].code, 'sum code');
  assert.deepEqual(JSON.parse(storage.getItem(ITERATIONS_KEY)), history);
});

test('restoring a failed submission does not add or modify a grading result', () => {
  const storage = memoryStorage();
  recordGradedSubmission(storage, ids, 'c-hello', 'failed code', fail, at);
  const history = recordGradedSubmission(storage, ids, 'c-hello', 'passing code', pass, at);
  const before = storage.getItem(ITERATIONS_KEY);
  assert.equal(submissionCode(history, 'c-hello', 1), 'failed code');
  assert.equal(storage.getItem(ITERATIONS_KEY), before);
  assert.throws(() => submissionCode(history, 'c-hello', -1));
  assert.throws(() => submissionCode(history, 'c-hello', 0.5));
  assert.throws(() => submissionCode(history, 'missing', 0));
});

test('re-submission creates a new result and retains only the latest ten attempts', () => {
  const storage = memoryStorage();
  for (let index = 0; index < 12; index++) recordGradedSubmission(storage, ids, 'c-hello', 'code ' + index, pass, at);
  const history = JSON.parse(storage.getItem(ITERATIONS_KEY));
  assert.equal(history['c-hello'].length, MAX_ITERATIONS);
  assert.equal(history['c-hello'][0].code, 'code 11');
  assert.equal(history['c-hello'][9].code, 'code 2');
});

test('invalid grader responses cannot create a pass or change stored history', () => {
  const storage = memoryStorage();
  recordGradedSubmission(storage, ids, 'c-hello', 'valid', pass, at);
  const before = storage.getItem(ITERATIONS_KEY);
  for (const result of [null, {}, { ok: true, tests: [] }, { ok: true, tests: [{ passed: false }] },
    { ok: false, tests: [null] }, { ok: 'true', tests: [] }]) {
    assert.throws(() => recordGradedSubmission(storage, ids, 'c-hello', 'bad', result, at));
    assert.equal(storage.getItem(ITERATIONS_KEY), before);
  }
  assert.throws(() => recordGradedSubmission(storage, ids, 'unknown', 'code', pass, at));
  assert.throws(() => recordGradedSubmission(storage, ids, 'c-hello', 'x'.repeat(25001), pass, at));
  assert.equal(validateGradingResult(fail), fail);
});

test('storage exhaustion is reported instead of claiming a saved submission', () => {
  const storage = memoryStorage();
  storage.setItem = () => { throw new DOMException('full', 'QuotaExceededError'); };
  assert.throws(() => recordGradedSubmission(storage, ids, 'c-hello', 'code', pass, at), { name: 'QuotaExceededError' });
});

test('history view escapes code and diagnostics, supports legacy entries, and disables restore while grading', () => {
  const history = normalizeIterations({ 'c-hello': [{ at, code: '<script>alert(1)</script>', passed: true,
    message: '<img src=x onerror=alert(1)>', compileOutput: '<b>error</b>' }] }, ids);
  const html = attemptHistoryHtml(history, 'c-hello', true);
  assert.ok(html.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));
  assert.ok(html.includes('&lt;img src=x onerror=alert(1)&gt;'));
  assert.ok(html.includes('&lt;b&gt;error&lt;/b&gt;'));
  assert.ok(!html.includes('<script>') && !html.includes('<img'));
  assert.ok(html.includes('data-restore-attempt="0" disabled'));
  assert.ok(html.includes('✓ 실습 통과'));
  assert.ok(attemptHistoryHtml({}, 'c-types').includes('아직 제출 기록이 없습니다.'));
});

test('compiler learning feedback is validated, stored and shown before the untouched diagnostic', () => {
  const storage = memoryStorage();
  const history = recordGradedSubmission(storage, ids, 'c-hello', 'broken', compilerFail, at);
  assert.deepEqual(history['c-hello'][0].compilerFeedback, compilerFail.compilerFeedback);
  const text = formatGradingResult(compilerFail);
  assert.match(text, /컴파일 단계 · C 문법 또는 선언 오류/);
  assert.match(text, /먼저 나타난 error/);
  assert.ok(text.indexOf('C 문법 또는 선언 오류') < text.indexOf('expected ;'));
  const html = attemptHistoryHtml(history, 'c-hello');
  assert.match(html, /C 문법 또는 선언 오류/);
  assert.throws(() => validateGradingResult({ ...fail, compilerFeedback: { code: '<bad>' } }), /잘못된 채점 결과/);
});
