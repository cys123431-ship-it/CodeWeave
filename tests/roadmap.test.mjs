import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { lessons } from '../src/catalog.js';
import { exerciseById } from '../src/exercises.js';
import { gradingExercises } from '../server/grading-exercises.mjs';
import { listExercise } from '../server/ds-list-exercise.mjs';
import { spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';

const dataURL = new URL('../docs/roadmap.json', import.meta.url);
const moduleURL = new URL('../scripts/roadmap.mjs', import.meta.url);
const load = async () => ({ data: JSON.parse(await readFile(dataURL, 'utf8')), api: await import(moduleURL) });

test('confirmed roadmap validates all nine stages and counts only evidenced completed units', async () => {
  const { data, api } = await load();
  assert.doesNotThrow(() => api.validateRoadmap(data));
  assert.deepEqual(api.summarize(data).map(row => row.id), [...'ABCDEFGHI']);
  for (const row of api.summarize(data)) {
    assert.ok(row.total >= 5 && row.total <= 12);
    assert.equal(row.percent, Number((100 * row.completed / row.total).toFixed(1)));
    assert.equal(row.total, row.completed + row.inProgress + row.notStarted);
  }
});

test('ungraded samples cannot be promoted to completed and catalog entries cannot be double counted', async () => {
  const { data, api } = await load();
  const sample = structuredClone(data);
  sample.stages.find(stage => stage.id === 'D').units.find(unit => unit.lessonIds.includes('ds-stack')).status = '완료';
  assert.throws(() => api.validateRoadmap(sample), /graded|채점/);
  const duplicate = structuredClone(data);
  duplicate.stages[0].units[0].lessonIds = ['c-hello'];
  assert.throws(() => api.validateRoadmap(duplicate), /duplicate|중복/);
});

test('missing evidence and an invalid next unit fail instead of inflating progress', async () => {
  const { data, api } = await load();
  const missing = structuredClone(data);
  missing.stages[0].units.find(unit => unit.status === '완료').tests = [];
  assert.throws(() => api.validateRoadmap(missing), /evidence|근거/);
  const cursor = structuredClone(data);
  cursor.next.unit = 'D99';
  assert.throws(() => api.validateRoadmap(cursor), /next|다음/);
});

test('published roadmap is generated from the same states and denominators', async () => {
  const { data, api } = await load();
  const markdown = await readFile(new URL('../docs/ROADMAP.md', import.meta.url), 'utf8');
  assert.equal(markdown, api.renderRoadmap(data));
});

test('rotation keeps D E Rust C order and skips already completed units within a turn', async () => {
  const { data, api } = await load();
  assert.equal(api.nextTurn('D'), 'E');
  assert.equal(api.nextTurn('E'), 'F-G');
  assert.equal(api.nextTurn('F-G'), 'C');
  assert.equal(api.nextTurn('C'), 'D');
  assert.throws(() => api.nextTurn('unknown'), /track|트랙/);
  assert.equal(api.selectUnit(data, data.next.track).id, data.next.unit);
  const changed = structuredClone(data);
  changed.stages.find(stage => stage.id === 'D').units[0].status = '완료';
  assert.equal(api.selectUnit(changed, 'D').id, 'D02');
});

test('D01 exposes the prepared first-match contract through the DS lesson and production grader', () => {
  const lesson = lessons.find(lesson => lesson.id === 'ds-list-find');
  assert.ok(lesson, 'D01 must have a learner-facing lesson');
  assert.equal(lesson.track, 'ds');
  assert.equal(lesson.figure, 'list-first-match');
  assert.equal(lesson.challenge.id, listExercise.id);
  assert.equal(exerciseById(lesson.challenge.id).grader, 'c-function');
  const actual = gradingExercises.get(lesson.challenge.id);
  assert.deepEqual(actual.cases, listExercise.cases);
  assert.equal(actual.harness, listExercise.harness, 'production must preserve the previously compiled contract');
  assert.equal(lesson.quiz.options.length > lesson.quiz.answer, true);
  assert.doesNotMatch(lesson.challenge.starter, /int main\s*\(/);
});

test('D01 live API rejects last-match code then accepts corrected code and the published starter compiles', {
  skip: spawnSync('gcc', ['--version']).status !== 0, timeout: 20000
}, async t => {
  const child = spawn(process.execPath, ['dev-server.mjs'], { env: { ...process.env, PORT: '0' }, stdio: ['ignore', 'pipe', 'pipe'] });
  t.after(async () => {
    if (child.exitCode === null) { const ended = once(child, 'exit'); child.kill(); await ended; }
  });
  const base = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(Error('D01 server startup timed out')), 5000);
    let text = '';
    child.once('error', reject);
    child.stdout.on('data', chunk => {
      text += chunk;
      const match = text.match(/http:\/\/127\.0\.0\.1:\d+/);
      if (match) { clearTimeout(timer); resolve(match[0]); }
    });
  });
  const html = await (await fetch(base)).text();
  const token = html.match(/name="codeweave-token" content="([0-9a-f]{64})"/)?.[1];
  const submit = async code => {
    const response = await fetch(base + '/api/grade', { method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-CodeWeave-Token': token },
      body: JSON.stringify({ exerciseId: 'ds-list-find', code }), signal: AbortSignal.timeout(10000) });
    assert.equal(response.status, 200);
    return response.json();
  };
  const correct = '#include <stddef.h>\nstruct Node { int value; const struct Node *next; };\nconst struct Node *list_find(const struct Node *head, int target) { for (const struct Node *p = head; p != NULL; p = p->next) { if (p->value == target) return p; } return NULL; }';
  const wrong = correct.replace('for (const struct', 'const struct Node *found = NULL; for (const struct').replace('return p;', 'found = p;').replace('return NULL;', 'return found;');
  const bad = await submit(wrong);
  assert.equal(bad.ok, false);
  assert.equal(bad.tests[7].passed, false, 'duplicate case must reject last match');
  const good = await submit(correct);
  assert.equal(good.ok, true);
  assert.equal(good.message, '10/10개 테스트 통과');
  const starter = await submit(lessons.find(lesson => lesson.id === 'ds-list-find').challenge.starter);
  assert.equal(starter.ok, false);
  assert.equal(starter.compileOutput, '', 'starter must be valid C11, not a compiler-error puzzle');
});
