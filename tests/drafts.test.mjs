import test from 'node:test';
import assert from 'node:assert/strict';
import { DRAFTS_KEY } from '../src/logic.js';
import { readExerciseDrafts, saveExerciseDraft } from '../src/practice.js';

const ids = ['c-hello', 'c-types', 'rust-mut'];
function memoryStorage() {
  const values = new Map();
  return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
}
test('draft editing in a stale tab preserves another exercise and track', () => {
  const storage = memoryStorage();
  saveExerciseDraft(storage, ids, 'rust-mut', 'original rust');
  const stale = readExerciseDrafts(storage, ids);
  saveExerciseDraft(storage, ids, 'rust-mut', 'updated rust');
  saveExerciseDraft(storage, ids, 'c-types', 'sum from other tab');
  saveExerciseDraft(storage, ids, 'c-hello', 'greeting from stale tab');
  assert.equal(stale['rust-mut'], 'original rust');
  assert.deepEqual(readExerciseDrafts(storage, ids), {
    'rust-mut': 'updated rust', 'c-types': 'sum from other tab', 'c-hello': 'greeting from stale tab'
  });
});
test('legacy drafts load with bounded code and malformed values are filtered', () => {
  const storage = memoryStorage();
  storage.setItem(DRAFTS_KEY, JSON.stringify({ 'c-hello': 'legacy', 'c-types': 'x'.repeat(25001), 'rust-mut': 12, unknown: 'ignored' }));
  const drafts = readExerciseDrafts(storage, ids);
  assert.equal(drafts['c-hello'], 'legacy');
  assert.equal(drafts['c-types'].length, 25000);
  assert.equal(drafts['rust-mut'], undefined);
  assert.equal(drafts.unknown, undefined);
  for (const invalid of ['[]', '{broken', 'null', '"text"']) {
    storage.setItem(DRAFTS_KEY, invalid);
    assert.deepEqual(readExerciseDrafts(storage, ids), {});
  }
});
test('invalid edits and storage errors do not claim a successful save', () => {
  const storage = memoryStorage();
  saveExerciseDraft(storage, ids, 'c-hello', 'preserved');
  for (const [id, code] of [['unknown', 'code'], ['c-hello', 3], ['c-hello', 'x'.repeat(25001)]]) {
    assert.throws(() => saveExerciseDraft(storage, ids, id, code));
  }
  assert.equal(readExerciseDrafts(storage, ids)['c-hello'], 'preserved');
  assert.throws(() => saveExerciseDraft({ ...storage, setItem() { throw Error('quota'); } }, ids, 'c-hello', 'new'), /quota/);
});
