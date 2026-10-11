import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeProgress } from '../src/logic.js';
import { lessonLearningStatus, trackLearningSummary, setProgressFlag } from '../src/mastery.js';

const pass = { at: '2026-10-11T04:40:00.000Z', code: 'pass', passed: true };
const fail = { at: '2026-10-11T04:41:00.000Z', code: 'fail', passed: false };

test('legacy progress migrates without inventing theory or review completion', () => {
  assert.deepEqual(normalizeProgress({ completed: ['c-types'], results: {} }), {
    completed: ['c-types'], results: {}, theoryRead: [], review: []
  });
});

test('theory, quiz and practice remain independent until every mastery condition passes', () => {
  const id = 'c-types';
  const base = { completed: [], results: {}, theoryRead: [], review: [] };
  assert.deepEqual(lessonLearningStatus(id, base, {}, true), {
    theoryRead: false, quizPassed: false, practiceAvailable: true,
    practicePassed: false, reviewNeeded: false, mastered: false
  });
  assert.equal(lessonLearningStatus(id, { ...base, theoryRead: [id] }, {}, true).mastered, false);
  assert.equal(lessonLearningStatus(id, { ...base, completed: [id] }, {}, true).mastered, false);
  assert.equal(lessonLearningStatus(id, base, { [id]: [pass] }, true).mastered, false);
  assert.equal(lessonLearningStatus(id, {
    ...base, completed: [id], theoryRead: [id], results: { [id]: { correct: true } }
  }, { [id]: [pass] }, true).mastered, true);
});

test('latest failed quiz or practice and manual review prevent mastery', () => {
  const id = 'c-types';
  const complete = { completed: [id], theoryRead: [id], review: [], results: { [id]: { correct: true } } };
  assert.equal(lessonLearningStatus(id, { ...complete, review: [id] }, { [id]: [pass] }, true).reviewNeeded, true);
  const quizFailed = lessonLearningStatus(id, { ...complete, results: { [id]: { correct: false } } }, { [id]: [pass] }, true);
  assert.equal(quizFailed.quizPassed, true, 'past quiz pass remains recorded');
  assert.equal(quizFailed.reviewNeeded, true);
  assert.equal(quizFailed.mastered, false);
  const practiceFailed = lessonLearningStatus(id, complete, { [id]: [fail, pass] }, true);
  assert.equal(practiceFailed.practicePassed, true, 'past practice pass remains recorded');
  assert.equal(practiceFailed.reviewNeeded, true);
  assert.equal(practiceFailed.mastered, false);
  assert.equal(lessonLearningStatus(id, complete, { [id]: [pass, fail] }, true).mastered, true);
});

test('tracks without grading cannot claim practice pass or full mastery', () => {
  const id = 'rust-mut';
  const progress = { completed: [id], theoryRead: [id], review: [], results: { [id]: { correct: true } } };
  const status = lessonLearningStatus(id, progress, { [id]: [pass] }, false);
  assert.equal(status.practiceAvailable, false);
  assert.equal(status.practicePassed, false);
  assert.equal(status.mastered, false);
});

test('track summary counts each learning dimension separately', () => {
  const lessons = [{ id: 'a', track: 'c' }, { id: 'b', track: 'rust' }];
  const progress = { completed: ['a', 'b'], theoryRead: ['a'], review: [], results: { a: { correct: true }, b: { correct: true } } };
  assert.deepEqual(trackLearningSummary(lessons, progress, { a: [pass] }), {
    total: 2, theory: 1, quiz: 2, practice: 1, review: 0, mastered: 1
  });
});

test('progress flags add and remove one lesson without mutating the source', () => {
  const source = ['a'];
  assert.deepEqual(setProgressFlag(source, 'b', true), ['a', 'b']);
  assert.deepEqual(setProgressFlag(['a', 'b'], 'a', false), ['b']);
  assert.deepEqual(source, ['a']);
});
