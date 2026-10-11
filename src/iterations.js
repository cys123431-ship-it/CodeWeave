// Browser-only exercise attempt history. No cloud synchronization or secure grading claims.
import { normalizeCompilerFeedback } from './compiler-feedback.js';

export const ITERATIONS_KEY = 'codeweave.iterations.v1';
export const MAX_ITERATIONS = 10;
export const MAX_CODE_LENGTH = 25000;
const text = (value, max) => typeof value === 'string' ? value.slice(0, max) : '';
const sanitizeTest = test => ({
  passed: test?.passed === true,
  detail: text(test?.detail, 300)
});
const sanitizeEntry = entry => {
  if (!entry || typeof entry !== 'object' || typeof entry.code !== 'string') return null;
  if (!/^\d{4}-\d\d-\d\dT/.test(entry.at ?? '') || !Number.isFinite(Date.parse(entry.at))) return null;
  const cleaned = {
    at: entry.at,
    code: entry.code.slice(0, MAX_CODE_LENGTH),
    passed: entry.passed === true,
    message: text(entry.message, 300),
    compileOutput: text(entry.compileOutput, 2000),
    tests: Array.isArray(entry.tests) ? entry.tests.slice(0, 20).map(sanitizeTest) : []
  };
  const compilerFeedback = normalizeCompilerFeedback(entry.compilerFeedback);
  if (compilerFeedback) cleaned.compilerFeedback = compilerFeedback;
  return cleaned;
};
export function normalizeIterations(raw, knownIds = []) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const allowed = new Set(knownIds);
  const result = {};
  for (const [id, entries] of Object.entries(raw)) {
    if (!allowed.has(id) || !Array.isArray(entries)) continue;
    const cleaned = entries.slice(0, MAX_ITERATIONS).map(sanitizeEntry).filter(Boolean);
    if (cleaned.length) result[id] = cleaned;
  }
  return result;
}
export function recordIteration(history, lessonId, code, gradingResult, at = new Date().toISOString()) {
  if (typeof lessonId !== 'string' || typeof code !== 'string' || !gradingResult || typeof gradingResult !== 'object') {
    throw new TypeError('올바른 채점 기록이 아닙니다.');
  }
  const previous = Array.isArray(history?.[lessonId]) ? history[lessonId] : [];
  const entry = sanitizeEntry({
    at, code, passed: gradingResult.ok === true,
    message: gradingResult.message,
    compileOutput: gradingResult.compileOutput,
    compilerFeedback: gradingResult.compilerFeedback,
    tests: gradingResult.tests
  });
  if (!entry) throw new TypeError('올바른 제출 시각이 아닙니다.');
  return {...(history ?? {}), [lessonId]: [entry, ...previous].slice(0, MAX_ITERATIONS)};
}
export function passedExerciseIds(history) {
  if (!history || typeof history !== 'object') return [];
  return Object.entries(history).filter(([, entries]) => Array.isArray(entries) && entries.some(x => x?.passed === true)).map(([id]) => id);
}
