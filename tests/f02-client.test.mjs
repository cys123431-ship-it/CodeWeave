import test from 'node:test';
import assert from 'node:assert/strict';
import * as practice from '../src/practice.js';
import { lessons } from '../src/catalog.js';
import { mutDefinition } from '../server/rust-mut-exercise.mjs';
import { readFile } from 'node:fs/promises';

const doc = (ids, token = 'a'.repeat(64), marker = 'rust-cargo') => ({
  querySelector(selector) {
    const content = { 'codeweave-token': token, 'codeweave-rust': marker,
      'codeweave-rust-exercises': ids }[selector.match(/name="([^"]+)"/)[1]];
    return content === undefined ? null : { content };
  }
});

test('F02 client requires an explicit authenticated per-exercise marker', () => {
  const legacy = doc(undefined);
  const query = legacy.querySelector.bind(legacy);
  legacy.querySelector = selector => query(selector) ?? {};
  assert.deepEqual(practice.rustGradingIds(legacy), ['rust-cargo']);
  assert.deepEqual(practice.rustGradingIds(doc(undefined)), ['rust-cargo']);
  const ids = practice.rustGradingIds(doc('rust-cargo rust-mut'));
  assert.deepEqual(ids, ['rust-cargo', 'rust-mut']);
  assert.ok(Object.isFrozen(ids));
  assert.equal(practice.gradingRequestFor('rust-mut', ids).expectedTests, 10);
  assert.throws(() => practice.gradingRequestFor('rust-mut', true));
  for (const value of ['', 'rust-mut', 'rust-cargo rust-mut rust-mut', 'rust-cargo unknown']) {
    assert.deepEqual(practice.rustGradingIds(doc(value)), []);
  }
  assert.deepEqual(practice.rustGradingIds(doc('rust-cargo rust-mut', '')), []);
  assert.deepEqual(practice.rustGradingIds(doc('rust-cargo rust-mut', 'a'.repeat(64), '')), []);
});

test('F02 malformed or short successful results never enter existing v1 history', () => {
  let writes = 0;
  const storage = { getItem: () => '{}', setItem: () => ++writes };
  assert.throws(() => practice.recordGradedSubmission(storage, ['rust-mut'], 'rust-mut', 'code',
    { ok: true, tests: [{ passed: true }] }));
  assert.equal(writes, 0);
});

test('F02 lesson uses prepared functions and compiled manuscript without changing quiz numbering', async () => {
  const lesson = lessons.find(l => l.id === 'rust-mut');
  assert.equal(lesson.challenge.starter, mutDefinition.starter);
  assert.equal(lesson.figure, 'rust-binding-copy');
  assert.deepEqual(lesson.quiz.options, ['let mut', 'var', 'dynamic', 'constant']);
  assert.equal(lesson.quiz.answer, 0);
  const manuscript = await readFile(new URL('../content/rust/02-bindings.md', import.meta.url), 'utf8');
  const program = manuscript.match(/```rust\n([\s\S]*?)\n```/)[1];
  assert.ok(lesson.sections.some(s => s.code === program));
});
