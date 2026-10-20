import { DRAFTS_KEY, escapeHtml, safeRead } from './logic.js';
import { ITERATIONS_KEY, MAX_CODE_LENGTH, MAX_ITERATIONS, normalizeIterations, recordIteration } from './iterations.js';
import { formatSubmissionForDisplay } from './multi-file.js';
import { formatCompilerFeedback, normalizeCompilerFeedback } from './compiler-feedback.js';
import { exerciseById } from './exercises.js';

const RUST_GRADING_IDS = Object.freeze(['rust-cargo', 'rust-mut', 'rust-control-flow']);

// This marker selects a local UI route, never grants server-side authority.
// Offline shells have neither marker nor token. Other Rust IDs remain ungraded.
export function hasRustGrading(document) {
  return document.querySelector('meta[name="codeweave-rust"]')?.content === 'rust-cargo'
    && /^[a-f0-9]{64}$/.test(document.querySelector('meta[name="codeweave-token"]')?.content ?? '');
}

export function rustGradingIds(document) {
  if (!hasRustGrading(document)) return Object.freeze([]);
  const marker = document.querySelector('meta[name="codeweave-rust-exercises"]');
  if (typeof marker?.content !== 'string') return Object.freeze(['rust-cargo']);
  const ids = marker.content.split(' ');
  if (!ids.includes('rust-cargo') || new Set(ids).size !== ids.length ||
      ids.some(id => !RUST_GRADING_IDS.includes(id))) return Object.freeze([]);
  return Object.freeze(ids);
}

export function gradingRequestFor(id, rustEnabled = false) {
  const enabled = Array.isArray(rustEnabled)
    ? RUST_GRADING_IDS.includes(id) && rustEnabled.includes(id)
    : id === 'rust-cargo' && rustEnabled === true;
  if (enabled) {
    return { endpoint: './api/grade/rust', timeout: 45000, expectedTests: 10 };
  }
  const exercise = exerciseById(id);
  if (exercise?.language === 'c' && exercise.grader) {
    return { endpoint: './api/grade', timeout: 10000 };
  }
  throw new Error('이 문제의 로컬 채점은 활성화되지 않았습니다.');
}

// A transport error or malformed response must never become a graded submission.
export function validateGradingResult(result, expectedTests) {
  if (!result || typeof result !== 'object' || Array.isArray(result) ||
      typeof result.ok !== 'boolean' || !Array.isArray(result.tests) ||
      Array.from(result.tests).some(test => !test || typeof test.passed !== 'boolean') ||
      (result.ok && (!result.tests.length || result.tests.some(test => !test.passed))) ||
      (expectedTests !== undefined && (result.tests.length !== expectedTests ||
        result.ok !== result.tests.every(test => test.passed) ||
        typeof result.message !== 'string' || result.message.length > 3000 ||
        typeof result.compileOutput !== 'string' || result.compileOutput.length > 3000 ||
        result.tests.some(test => typeof test.detail !== 'string' || test.detail.length > 300))) ||
      (result.compilerFeedback !== undefined && (result.ok || !normalizeCompilerFeedback(result.compilerFeedback)))) {
    throw new Error('잘못된 채점 결과입니다. 제출 기록은 저장하지 않았습니다.');
  }
  return result;
}

export function recordGradedSubmission(storage, knownIds, id, code, result, at) {
  validateGradingResult(result, RUST_GRADING_IDS.includes(id) ? 10 : undefined);
  if (!knownIds.includes(id) || typeof code !== 'string' || code.length > MAX_CODE_LENGTH) {
    throw new Error('지원하지 않는 문제 또는 코드 길이입니다.');
  }
  // Read at submission time so an open page does not overwrite another page's attempts.
  const history = normalizeIterations(safeRead(storage, ITERATIONS_KEY, {}), knownIds);
  const updated = recordIteration(history, id, code, result, at);
  storage.setItem(ITERATIONS_KEY, JSON.stringify(updated));
  return updated;
}

export function submissionCode(history, id, index) {
  if (!Number.isInteger(index) || index < 0 || typeof history?.[id]?.[index]?.code !== 'string') {
    throw new Error('복원할 제출 기록을 찾을 수 없습니다.');
  }
  return history[id][index].code;
}

export function formatGradingResult(result) {
  return [result.ok ? '✓ 모든 테스트 통과' : '× 채점 미통과', result.message || '',
    ...result.tests.map((test, index) => '테스트 ' + (index + 1) + ': ' +
      // The reserved detail survives existing v1 normalization and backups unchanged.
      (!test.passed && test.detail === '미실행' ? '미실행' :
        (test.passed ? '통과' : '실패') + ' — ' + (test.detail || ''))),
    formatCompilerFeedback(result.compilerFeedback), result.compileOutput || ''].filter(Boolean).join('\n');
}

export function attemptHistoryHtml(history, id, busy = false) {
  const entries = history[id] ?? [];
  const safe = value => escapeHtml(value ?? '');
  return '<section class="attempt-history" aria-labelledby="attempt-heading">' +
    '<h3 id="attempt-heading">반복 제출 기록</h3><p>문제별 최근 ' + MAX_ITERATIONS +
    '회 · 별도 연습장과 같은 기록을 사용합니다. 실습 통과는 개념 퀴즈 결과와 별도로 표시합니다.</p>' +
    (!entries.length ? '<p>아직 제출 기록이 없습니다.</p>' : '<ol class="attempt-list">' +
      entries.map((entry, index) => '<li><div class="attempt-header"><strong class="attempt-status ' +
        (entry.passed ? 'passed' : 'failed') + '">' + (entry.passed ? '✓ 실습 통과' : '× 실습 미통과') +
        '</strong><time datetime="' + safe(entry.at) + '">' +
        safe(new Date(entry.at).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })) + ' (KST)</time></div>' +
        '<p>' + safe(entry.message || '채점 결과 저장됨') + '</p>' +
        '<details><summary>제출 코드와 테스트 결과 보기</summary><pre class="terminal">' +
        safe(formatGradingResult({ ok: entry.passed, message: entry.message, tests: entry.tests,
          compilerFeedback: entry.compilerFeedback, compileOutput: entry.compileOutput })) + '</pre><pre class="attempt-code"><code>' +
        safe(formatSubmissionForDisplay(entry.code)) + '</code></pre></details>' +
        '<button class="secondary" type="button" data-restore-attempt="' + index + '"' +
        (busy ? ' disabled' : '') + '>이 제출 코드 복원</button></li>').join('') + '</ol>') + '</section>';
}

// Existing v1 drafts remain readable. Merge one exercise into the latest stored
// snapshot, rather than letting an older lesson/workbench tab replace all drafts.
export function readExerciseDrafts(storage, knownIds) {
  const raw = safeRead(storage, DRAFTS_KEY, {}), drafts = {};
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    for (const id of knownIds) {
      if (typeof raw[id] === 'string') drafts[id] = raw[id].slice(0, MAX_CODE_LENGTH);
    }
  }
  return drafts;
}
export function saveExerciseDraft(storage, knownIds, id, code) {
  if (!knownIds.includes(id) || typeof code !== 'string' || code.length > MAX_CODE_LENGTH) {
    throw new Error('지원하지 않는 문제 또는 코드 길이입니다(최대 25000자).');
  }
  const drafts = readExerciseDrafts(storage, knownIds);
  drafts[id] = code;
  storage.setItem(DRAFTS_KEY, JSON.stringify(drafts));
  return drafts;
}
