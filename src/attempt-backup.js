import { MAX_CODE_LENGTH, normalizeIterations } from './iterations.js';

export const ATTEMPT_BACKUP_KIND = 'attempt-history';
export const ATTEMPT_BACKUP_VERSION = 1;

export function cleanBackupDrafts(raw, knownIds) {
  const drafts = {};
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return drafts;
  for (const id of knownIds) {
    if (typeof raw[id] === 'string') drafts[id] = raw[id].slice(0, MAX_CODE_LENGTH);
  }
  return drafts;
}

export function createAttemptBackup({ drafts, iterations }, knownIds, at = new Date().toISOString()) {
  return {
    app: 'CodeWeave', kind: ATTEMPT_BACKUP_KIND, version: ATTEMPT_BACKUP_VERSION,
    exportedAt: at,
    drafts: cleanBackupDrafts(drafts, knownIds),
    iterations: normalizeIterations(iterations, knownIds)
  };
}

export function parseAttemptBackup(input, knownIds) {
  if (!input || typeof input !== 'object' || Array.isArray(input) ||
      input.app !== 'CodeWeave' || input.kind !== ATTEMPT_BACKUP_KIND ||
      input.version !== ATTEMPT_BACKUP_VERSION) {
    throw new Error('CodeWeave 제출 기록 백업 파일이 아닙니다.');
  }
  if (!Array.isArray(knownIds) || knownIds.some(id => typeof id !== 'string')) {
    throw new TypeError('유효한 문제 목록이 필요합니다.');
  }
  return {
    drafts: cleanBackupDrafts(input.drafts, knownIds),
    iterations: normalizeIterations(input.iterations, knownIds)
  };
}
