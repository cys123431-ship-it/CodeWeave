import { escapeHtml, safeRead } from './logic.js';
import { ITERATIONS_KEY, MAX_CODE_LENGTH, MAX_ITERATIONS, normalizeIterations, recordIteration } from './iterations.js';

// A transport error or malformed response must never become a graded submission.
export function validateGradingResult(result) {
  if (!result || typeof result !== 'object' || Array.isArray(result) ||
      typeof result.ok !== 'boolean' || !Array.isArray(result.tests) ||
      result.tests.some(test => !test || typeof test.passed !== 'boolean') ||
      (result.ok && (!result.tests.length || result.tests.some(test => !test.passed)))) {
    throw new Error('잘못된 채점 결과입니다. 제출 기록은 저장하지 않았습니다.');
  }
  return result;
}

export function recordGradedSubmission(storage, knownIds, id, code, result, at) {
  validateGradingResult(result);
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
      (test.passed ? '통과' : '실패') + ' — ' + (test.detail || '')),
    result.compileOutput || ''].filter(Boolean).join('\n');
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
          compileOutput: entry.compileOutput })) + '</pre><pre class="attempt-code"><code>' +
        safe(entry.code) + '</code></pre></details>' +
        '<button class="secondary" type="button" data-restore-attempt="' + index + '"' +
        (busy ? ' disabled' : '') + '>이 제출 코드 복원</button></li>').join('') + '</ol>') + '</section>';
}
