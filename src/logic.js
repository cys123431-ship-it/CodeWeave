export const PROGRESS_KEY = 'codeweave.progress.v1';
export const DRAFTS_KEY = 'codeweave.drafts.v1';

export function safeRead(storage, key, fallback) {
  try { const parsed = JSON.parse(storage.getItem(key)); return parsed ?? fallback; } catch { return fallback; }
}
export function normalizeProgress(value) {
  const valid = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const completed = Array.isArray(valid.completed) ? valid.completed.filter(x => typeof x === 'string') : [];
  const results = valid.results && typeof valid.results === 'object' && !Array.isArray(valid.results) ? valid.results : {};
  return { completed: [...new Set(completed)], results };
}
export function percentDone(lessons, completed) {
  if (!lessons.length) return 0;
  return Math.round((lessons.filter(x => completed.includes(x.id)).length / lessons.length) * 100);
}
export function scoreChoice(question, choice) {
  if (!question || !Array.isArray(question.options)) return { correct:false, explanation:'문제를 불러올 수 없습니다.' };
  return { correct: choice === question.answer, explanation: question.explanation };
}
export function validateImport(input, knownIds) {
  if (!input || input.app !== 'CodeWeave' || input.version !== 1) throw new Error('CodeWeave 백업 파일이 아닙니다.');
  const completed = normalizeProgress(input.progress).completed.filter(id => knownIds.includes(id));
  const results = normalizeProgress(input.progress).results;
  const drafts = {};
  for (const [id, val] of Object.entries(input.drafts ?? {})) {
    if (knownIds.includes(id) && typeof val === 'string' && val.length <= 20000) drafts[id] = val;
  }
  return {progress:{completed, results}, drafts};
}
export function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
}
