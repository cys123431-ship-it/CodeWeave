import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { lessons } from '../src/catalog.js';
import { exerciseById } from '../src/exercises.js';
import { gradingExercises } from '../server/grading-exercises.mjs';
import { ownedStreamExercise, ownedStreamMetadata, ownedStreamStarter } from '../server/owned-stream-exercise.mjs';
import { createLearningServer } from '../server/learning-server.mjs';

const id = ownedStreamExercise.id;
const manuscript = await readFile(new URL('../content/c/24-owned-stream-errors.md', import.meta.url), 'utf8');
const program = manuscript.match(/\x60\x60\x60c\n([\s\S]*?)\n\x60\x60\x60/)[1];
const correct = program.split('int main(void)')[0];
const wrong = correct.replace('int closed = fclose(stream);', '(void)fclose(stream);\n    int closed = 0;');

test('C07 learner catalog and public exercise reuse the compiled program and private grading contract', () => {
  const lesson = lessons.find(item => item.id === id);
  assert.ok(lesson, 'C07 must be reachable');
  assert.equal(lesson.track, 'c');
  assert.equal(lesson.figure, 'owned-stream-cleanup');
  assert.equal(lesson.challenge.starter, ownedStreamStarter);
  assert.equal(lesson.challenge.input, ownedStreamMetadata.publicExample.input);
  assert.equal(lesson.challenge.expected, ownedStreamMetadata.publicExample.output);
  assert.ok(lesson.sections.some(section => section.code?.trim() === program.trim()));
  assert.deepEqual(exerciseById(id), { ...ownedStreamMetadata, requiredFiles: [] });
  assert.deepEqual(gradingExercises.get(id), ownedStreamExercise);
  assert.equal(Object.hasOwn(exerciseById(id), 'harness'), false);
});

test('C07 authenticated HTTP rejects ignored close failure then accepts the corrected twelve-case submission', { timeout: 60000 }, async () => {
  const app = createLearningServer({ root: fileURLToPath(new URL('../', import.meta.url)) });
  try {
    const { port } = await app.listen(0);
    const base = 'http://127.0.0.1:' + port;
    const response = await fetch(base);
    const token = (await response.text()).match(/name="codeweave-token" content="([a-f0-9]{64})"/)?.[1];
    assert.match(token, /^[a-f0-9]{64}$/);
    assert.notEqual(wrong, correct);
    for (const [code, ok] of [[wrong, false], [correct, true]]) {
      const response = await fetch(base + '/api/grade', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CodeWeave-Token': token },
        body: JSON.stringify({ exerciseId: id, code }), signal: AbortSignal.timeout(15000)
      });
      assert.equal(response.status, 200);
      const result = await response.json();
      assert.equal(result.ok, ok, JSON.stringify(result));
      assert.equal(result.tests.length, 12);
      if (!ok) assert.equal(result.tests[10].passed, false, 'close failure case must reject the mutant');
    }
  } finally { await app.close(); }
});
