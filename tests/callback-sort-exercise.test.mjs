import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { gradingExercises } from '../server/grading-exercises.mjs';
import { writeSources, compile, runCases, buildResult } from '../server/grading-pipeline.mjs';
import { figureFor } from '../src/figures.js';
import { lessons } from '../src/catalog.js';
import { exerciseById } from '../src/exercises.js';
import { createLearningServer } from '../server/learning-server.mjs';

const gcc = spawnSync('gcc', ['--version']).status === 0;
const load = () => import('../server/callback-sort-exercise.mjs');
const reference = `#include <stddef.h>
#include <stdlib.h>
int sort_ints_with(int values[], size_t count,
                   int (*compare)(const void *, const void *)) {
    if (compare == NULL || count > 8 || (count > 0 && values == NULL)) return 0;
    if (count > 1) qsort(values, count, sizeof values[0], compare);
    return 1;
}
`;

async function grade(t, code) {
  const { callbackSortExercise: exercise } = await load();
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'codeweave-callback-sort-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  const workspace = await writeSources(dir, { code, exercise });
  const built = compile(workspace, exercise);
  assert.equal(built.status, 0, built.stderr);
  return buildResult(exercise, built, await runCases(workspace, exercise));
}

test('C08 delivery keeps twelve immutable callback-sort cases registered unchanged', async () => {
  const { callbackSortExercise: exercise, callbackSortMetadata: metadata } = await load();
  assert.equal(exercise.id, 'c-qsort-callback');
  assert.equal(exercise.cases.length, 12);
  assert.equal(new Set(exercise.cases.map(tc => tc.args.join())).size, 12);
  assert.ok(Object.isFrozen(exercise.cases));
  assert.ok(exercise.cases.every(Object.isFrozen));
  assert.ok(exercise.cases.some(tc => tc.input === metadata.publicExample.input
    && tc.expected === metadata.publicExample.output));
  assert.deepEqual(gradingExercises.get(exercise.id), exercise);
  assert.deepEqual(exercise.linkArgs, []);
});

test('C08 learner catalog exposes the compiled example, public contract and bounded lesson', async () => {
  const { callbackSortExercise: exercise, callbackSortMetadata: metadata, callbackSortStarter: starter } = await load();
  const markdown = await fs.readFile(new URL('../content/c/25-qsort-function-pointers.md', import.meta.url), 'utf8');
  const program = markdown.match(/```c\n([\s\S]*?)\n```/)[1];
  const lesson = lessons.find(item => item.id === exercise.id);
  assert.ok(lesson, 'C08 must be reachable from the learner catalog');
  assert.equal(lesson.track, 'c');
  assert.equal(lesson.figure, 'function-call');
  assert.ok(lesson.sections.length >= 10 && lesson.sections.length <= 15);
  assert.ok(lesson.sections.some(section => section.code?.trim() === program.trim()));
  assert.equal(lesson.challenge.starter, starter);
  assert.equal(lesson.challenge.input, metadata.publicExample.input);
  assert.equal(lesson.challenge.expected, metadata.publicExample.output);
  assert.deepEqual(exerciseById(exercise.id), { ...metadata, requiredFiles: [] });
  assert.equal(Object.hasOwn(exerciseById(exercise.id), 'harness'), false);
});

test('C08 reuses the accessible static function-call diagram without executable markup', () => {
  const svg = figureFor('function-call');
  assert.match(svg, /aria-label="[^"]*학습 개념 그림/);
  assert.match(svg, /role="img"/);
  assert.doesNotMatch(svg, /<script|<animate|foreignObject|onload=/i);
});

test('C08 reference delegates ordering to callbacks and preserves invalid inputs', { skip: !gcc }, async t => {
  const result = await grade(t, reference);
  assert.equal(result.ok, true, JSON.stringify(result));
  assert.equal(result.message, '12/12개 테스트 통과');
});

const mutants = [
  ['hard-codes ascending order', reference.replace('compare);', 'ascending);').replace(
    '#include <stdlib.h>', '#include <stdlib.h>\nstatic int ascending(const void *a, const void *b) {\n    int x = *(const int *)a, y = *(const int *)b;\n    return (x > y) - (x < y);\n}')],
  ['sorts one fewer element', reference.replace('qsort(values, count,', 'qsort(values, count - 1,')],
  ['uses the wrong element width', reference.replace('sizeof values[0]', 'sizeof(short)')],
  ['rejects the valid empty NULL range', reference.replace('count > 0 && values == NULL', 'values == NULL')],
  ['accepts a missing callback', reference.replace('compare == NULL || ', '')],
  ['allows an oversized range', reference.replace('count > 8 || ', '')]
];
for (const [name, code] of mutants) {
  test('C08 rejects ' + name, { skip: !gcc }, async t => {
    assert.notEqual(code, reference);
    const result = await grade(t, code);
    assert.equal(result.ok, false);
    assert.equal(result.tests.length, 12);
    assert.ok(result.tests.some(tc => !tc.passed));
  });
}

test('C08 warning-free starter cannot claim a practice pass', { skip: !gcc }, async t => {
  const { callbackSortStarter } = await load();
  const result = await grade(t, callbackSortStarter);
  assert.equal(result.compileOutput, '');
  assert.equal(result.ok, false);
});

test('C08 manuscript program compiles, runs callback orders, and documents a Make recipe', { skip: !gcc }, async t => {
  const markdown = await fs.readFile(new URL('../content/c/25-qsort-function-pointers.md', import.meta.url), 'utf8');
  for (const heading of ['개요', '이론', '도식', '완성 프로그램', '출력', '오류', '퀴즈', '직접 풀기', 'Mini Project', '복습']) {
    assert.ok(markdown.split('\n').some(line => line.startsWith('## ') && line.includes(heading)), heading);
  }
  assert.ok(markdown.split('\n').length <= 150, 'new manuscript must stay within 150 lines');
  assert.match(markdown, /```make\n[\s\S]*?\n```/);
  const program = markdown.match(/```c\n([\s\S]*?)\n```/)[1];
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'codeweave-callback-example-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  const source = path.join(dir, 'example.c');
  const binary = path.join(dir, process.platform === 'win32' ? 'example.exe' : 'example');
  await fs.writeFile(source, program);
  const built = spawnSync('gcc', ['-std=c11', '-Wall', '-Wextra', '-Wpedantic', '-Werror', source, '-o', binary],
    { encoding: 'utf8', timeout: 4500 });
  assert.equal(built.status, 0, built.stderr);
  const ran = spawnSync(binary, [], { encoding: 'utf8', timeout: 2000 });
  assert.equal(ran.status, 0, ran.stderr);
  assert.equal(ran.stdout.replaceAll('\r\n', '\n'), '-1 2 3\n3 2 -1\n');
});

test('C08 authenticated HTTP rejects a shortened range then accepts the corrected twelve-case submission', { timeout: 60000, skip: !gcc }, async () => {
  const { callbackSortExercise: exercise } = await load();
  const wrong = reference.replace('qsort(values, count,', 'qsort(values, count - 1,');
  const app = createLearningServer({ root: fileURLToPath(new URL('../', import.meta.url)) });
  try {
    const { port } = await app.listen(0);
    const base = 'http://127.0.0.1:' + port;
    const response = await fetch(base);
    const token = (await response.text()).match(/name="codeweave-token" content="([a-f0-9]{64})"/)?.[1];
    assert.match(token, /^[a-f0-9]{64}$/);
    for (const [code, ok] of [[wrong, false], [reference, true]]) {
      const graded = await fetch(base + '/api/grade', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CodeWeave-Token': token },
        body: JSON.stringify({ exerciseId: exercise.id, code }), signal: AbortSignal.timeout(15000)
      });
      assert.equal(graded.status, 200);
      const result = await graded.json();
      assert.equal(result.ok, ok, JSON.stringify(result));
      assert.equal(result.tests.length, 12);
    }
  } finally { await app.close(); }
});
