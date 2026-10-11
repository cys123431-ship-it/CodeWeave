import test from 'node:test';
import assert from 'node:assert/strict';
import { PROGRESS_KEY, DRAFTS_KEY } from '../src/logic.js';
import { ITERATIONS_KEY } from '../src/iterations.js';
import { createFullBackup, parseCodeWeaveBackup, restoreCodeWeaveBackup } from '../src/backup.js';

const allIds = ['c-types', 'c-loops', 'rust-mut'];
const cIds = ['c-types', 'c-loops'];
const at = '2026-10-11T04:05:00.000Z';
const attempt = (code, passed = true) => ({ at, code, passed, message: passed ? 'pass' : 'fail', tests: [] });

function memoryStorage(initial = {}, failAt = Infinity) {
  const values = new Map(Object.entries(initial));
  let writes = 0;
  return {
    getItem: key => values.get(key) ?? null,
    setItem(key, value) {
      writes += 1;
      if (writes === failAt) throw Object.assign(new Error('quota'), { name: 'QuotaExceededError' });
      values.set(key, String(value));
    },
    removeItem: key => values.delete(key),
    snapshot: () => Object.fromEntries(values)
  };
}

test('full backup round trip keeps only bounded known learning data', () => {
  const backup = createFullBackup({
    progress: {
      completed: ['c-types', 'c-types', 'unknown'],
      results: {
        'c-types': { correct: true, selected: 1, explanation: 'good', at },
        unknown: { correct: true, selected: 0, explanation: 'drop', at }
      }
    },
    drafts: { 'c-types': 'a'.repeat(30000), 'rust-mut': 'let mut x = 1;', unknown: 'drop' },
    iterations: { 'c-types': [attempt('int main(void){}')], unknown: [attempt('drop')] }
  }, allIds, at);
  assert.equal(backup.kind, 'full-backup');
  assert.equal(backup.drafts['c-types'].length, 25000);
  const parsed = parseCodeWeaveBackup(backup, { knownIds: allIds, attemptIds: cIds });
  assert.equal(parsed.format, 'full');
  assert.deepEqual(parsed.progress.completed, ['c-types']);
  assert.deepEqual(Object.keys(parsed.progress.results), ['c-types']);
  assert.equal(parsed.drafts['rust-mut'], 'let mut x = 1;');
  assert.equal(parsed.iterations['c-types'][0].passed, true);
  assert.equal(parsed.drafts.unknown, undefined);
});

test('legacy progress v1 restores progress and drafts while preserving attempts', () => {
  const storage = memoryStorage({
    [PROGRESS_KEY]: JSON.stringify({ completed: ['c-loops'], results: {} }),
    [DRAFTS_KEY]: JSON.stringify({ 'c-loops': 'old', 'rust-mut': 'old rust' }),
    [ITERATIONS_KEY]: JSON.stringify({ 'c-types': [attempt('keep attempt')] })
  });
  const restored = restoreCodeWeaveBackup(storage, {
    app: 'CodeWeave', version: 1,
    progress: { completed: ['c-types'], results: { 'c-types': { correct: true, selected: 0, explanation: 'ok', at } } },
    drafts: { 'c-types': 'legacy progress code', 'rust-mut': 'legacy rust' }
  }, { knownIds: allIds, attemptIds: cIds });
  assert.equal(restored.format, 'legacy-progress');
  assert.deepEqual(restored.progress.completed, ['c-types']);
  assert.deepEqual(restored.drafts, { 'c-types': 'legacy progress code', 'rust-mut': 'legacy rust' });
  assert.equal(restored.iterations['c-types'][0].code, 'keep attempt');
});

test('legacy attempt v1 replaces C scope but preserves progress and other tracks', () => {
  const originalProgress = { completed: ['rust-mut'], results: {} };
  const storage = memoryStorage({
    [PROGRESS_KEY]: JSON.stringify(originalProgress),
    [DRAFTS_KEY]: JSON.stringify({ 'c-types': 'old C', 'c-loops': 'remove C', 'rust-mut': 'keep rust' }),
    [ITERATIONS_KEY]: JSON.stringify({ 'c-types': [attempt('old C')], 'c-loops': [attempt('remove C')], 'rust-mut': [attempt('keep rust attempt')] })
  });
  const restored = restoreCodeWeaveBackup(storage, {
    app: 'CodeWeave', kind: 'attempt-history', version: 1,
    drafts: { 'c-types': 'legacy attempt code' },
    iterations: { 'c-types': [attempt('new C', false)] }
  }, { knownIds: allIds, attemptIds: cIds });
  assert.equal(restored.format, 'legacy-attempt');
  assert.deepEqual(restored.progress, originalProgress);
  assert.equal(restored.drafts['c-types'], 'legacy attempt code');
  assert.equal(restored.drafts['c-loops'], undefined);
  assert.equal(restored.drafts['rust-mut'], 'keep rust');
  assert.equal(restored.iterations['c-types'][0].code, 'new C');
  assert.equal(restored.iterations['c-loops'], undefined);
  assert.equal(restored.iterations['rust-mut'][0].code, 'keep rust attempt');
});

test('full backup replaces all three stores with normalized data', () => {
  const storage = memoryStorage({
    [PROGRESS_KEY]: JSON.stringify({ completed: ['c-loops'], results: {} }),
    [DRAFTS_KEY]: JSON.stringify({ 'rust-mut': 'remove me' }),
    [ITERATIONS_KEY]: JSON.stringify({ 'c-loops': [attempt('remove me')] })
  });
  const backup = createFullBackup({
    progress: { completed: ['c-types'], results: {} },
    drafts: { 'c-types': 'only draft' },
    iterations: { 'c-types': [attempt('only attempt')] }
  }, allIds, at);
  const restored = restoreCodeWeaveBackup(storage, backup, { knownIds: allIds, attemptIds: cIds });
  assert.deepEqual(restored.progress.completed, ['c-types']);
  assert.deepEqual(restored.drafts, { 'c-types': 'only draft' });
  assert.deepEqual(Object.keys(restored.iterations), ['c-types']);
});

test('failed multi-key restore rolls back every original value', () => {
  const original = {
    [PROGRESS_KEY]: JSON.stringify({ completed: ['c-loops'], results: {} }),
    [DRAFTS_KEY]: JSON.stringify({ 'rust-mut': 'original rust' }),
    [ITERATIONS_KEY]: JSON.stringify({ 'c-loops': [attempt('original attempt')] })
  };
  const storage = memoryStorage(original, 2);
  const backup = createFullBackup({
    progress: { completed: ['c-types'], results: {} }, drafts: { 'c-types': 'new' }, iterations: {}
  }, allIds, at);
  assert.throws(
    () => restoreCodeWeaveBackup(storage, backup, { knownIds: allIds, attemptIds: cIds }),
    /기존 기록을 유지했습니다/
  );
  assert.deepEqual(storage.snapshot(), original);
});

test('unknown kinds, versions and invalid id lists are rejected', () => {
  assert.throws(() => parseCodeWeaveBackup({ app: 'CodeWeave', kind: 'mystery', version: 1 }, { knownIds: allIds, attemptIds: cIds }));
  assert.throws(() => parseCodeWeaveBackup({ app: 'CodeWeave', kind: 'full-backup', version: 2 }, { knownIds: allIds, attemptIds: cIds }));
  assert.throws(() => parseCodeWeaveBackup({ app: 'CodeWeave', version: 1 }, { knownIds: [null], attemptIds: cIds }), TypeError);
});
