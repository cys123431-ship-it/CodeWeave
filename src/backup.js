import { DRAFTS_KEY, PROGRESS_KEY, normalizeProgress, safeRead } from './logic.js';
import { ITERATIONS_KEY, normalizeIterations } from './iterations.js';
import { ATTEMPT_BACKUP_KIND, cleanBackupDrafts, parseAttemptBackup } from './attempt-backup.js';

export const FULL_BACKUP_KIND = 'full-backup';
export const FULL_BACKUP_VERSION = 1;
export const MAX_BACKUP_FILE_SIZE = 5_000_000;

function validateIds(knownIds, attemptIds) {
  if (!Array.isArray(knownIds) || knownIds.some(id => typeof id !== 'string') ||
      !Array.isArray(attemptIds) || attemptIds.some(id => typeof id !== 'string') ||
      attemptIds.some(id => !knownIds.includes(id))) {
    throw new TypeError('유효한 단원과 문제 목록이 필요합니다.');
  }
}

function cleanProgress(raw, knownIds) {
  const normalized = normalizeProgress(raw);
  const allowed = new Set(knownIds);
  const completed = normalized.completed.filter(id => allowed.has(id));
  const theoryRead = normalized.theoryRead.filter(id => allowed.has(id));
  const review = normalized.review.filter(id => allowed.has(id));
  const results = {};
  for (const [id, value] of Object.entries(normalized.results)) {
    if (!allowed.has(id) || !value || typeof value !== 'object' || Array.isArray(value) ||
        typeof value.correct !== 'boolean' || !Number.isInteger(value.selected)) continue;
    const entry = { correct: value.correct, selected: value.selected };
    if (typeof value.explanation === 'string') entry.explanation = value.explanation.slice(0, 2000);
    if (typeof value.at === 'string' && Number.isFinite(Date.parse(value.at))) entry.at = value.at;
    results[id] = entry;
  }
  return { completed, results, theoryRead, review };
}

export function createFullBackup({ progress, drafts, iterations }, knownIds, at = new Date().toISOString()) {
  validateIds(knownIds, knownIds);
  return {
    app: 'CodeWeave', kind: FULL_BACKUP_KIND, version: FULL_BACKUP_VERSION,
    exportedAt: at,
    progress: cleanProgress(progress, knownIds),
    drafts: cleanBackupDrafts(drafts, knownIds),
    iterations: normalizeIterations(iterations, knownIds)
  };
}

export function parseCodeWeaveBackup(input, { knownIds, attemptIds = knownIds }) {
  validateIds(knownIds, attemptIds);
  if (!input || typeof input !== 'object' || Array.isArray(input) || input.app !== 'CodeWeave') {
    throw new Error('CodeWeave 백업 파일이 아닙니다.');
  }
  if (input.kind === FULL_BACKUP_KIND && input.version === FULL_BACKUP_VERSION) {
    return {
      format: 'full', progress: cleanProgress(input.progress, knownIds),
      drafts: cleanBackupDrafts(input.drafts, knownIds),
      iterations: normalizeIterations(input.iterations, knownIds)
    };
  }
  if (input.kind === ATTEMPT_BACKUP_KIND) {
    const parsed = parseAttemptBackup(input, attemptIds);
    return { format: 'legacy-attempt', ...parsed };
  }
  // Original dashboard backups have no kind field. Do not reinterpret an
  // unknown future format as this legacy schema.
  if (input.kind === undefined && input.version === 1) {
    return {
      format: 'legacy-progress',
      progress: cleanProgress(input.progress, knownIds),
      drafts: cleanBackupDrafts(input.drafts, knownIds)
    };
  }
  throw new Error('지원하지 않는 CodeWeave 백업 형식 또는 버전입니다.');
}

function restoreValues(storage, values) {
  const previous = new Map();
  for (const [key] of values) previous.set(key, storage.getItem(key));
  const touched = [];
  try {
    for (const [key, value] of values) {
      touched.push(key);
      storage.setItem(key, JSON.stringify(value));
    }
  } catch (error) {
    let rolledBack = true;
    for (const key of touched.reverse()) {
      try {
        const value = previous.get(key);
        if (value === null) storage.removeItem(key);
        else storage.setItem(key, value);
      } catch { rolledBack = false; }
    }
    throw new Error(rolledBack
      ? '브라우저 저장에 실패하여 기존 기록을 유지했습니다.'
      : '브라우저 저장과 자동 복구에 실패했습니다. 기존 백업 파일을 보관하고 페이지를 새로고침하세요.',
    { cause: error });
  }
}

export function restoreCodeWeaveBackup(storage, input, { knownIds, attemptIds = knownIds }) {
  const parsed = parseCodeWeaveBackup(input, { knownIds, attemptIds });
  const current = {
    progress: cleanProgress(safeRead(storage, PROGRESS_KEY, {}), knownIds),
    drafts: cleanBackupDrafts(safeRead(storage, DRAFTS_KEY, {}), knownIds),
    iterations: normalizeIterations(safeRead(storage, ITERATIONS_KEY, {}), knownIds)
  };
  let next;
  if (parsed.format === 'full') {
    next = { progress: parsed.progress, drafts: parsed.drafts, iterations: parsed.iterations };
  } else if (parsed.format === 'legacy-progress') {
    next = { progress: parsed.progress, drafts: parsed.drafts, iterations: current.iterations };
  } else {
    const scope = new Set(attemptIds);
    const drafts = Object.fromEntries(Object.entries(current.drafts).filter(([id]) => !scope.has(id)));
    const iterations = Object.fromEntries(Object.entries(current.iterations).filter(([id]) => !scope.has(id)));
    next = {
      progress: current.progress,
      drafts: { ...drafts, ...parsed.drafts },
      iterations: { ...iterations, ...parsed.iterations }
    };
  }
  restoreValues(storage, [
    [PROGRESS_KEY, next.progress], [DRAFTS_KEY, next.drafts], [ITERATIONS_KEY, next.iterations]
  ]);
  return { format: parsed.format, ...next };
}
