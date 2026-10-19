import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { gradingExercises } from '../server/grading-exercises.mjs';
import { writeSources, compile, runCases, buildResult } from '../server/grading-pipeline.mjs';
import { figureFor } from '../src/figures.js';

const gcc = spawnSync('gcc', ['--version']).status === 0;
const load = () => import('../server/queue-exercise.mjs');
const reference = `#include <stddef.h>
struct IntQueue { int values[4]; size_t head; size_t length; };
int queue_enqueue(struct IntQueue *q, int value) {
    if (q == NULL || q->head >= 4 || q->length >= 4) return 0;
    size_t tail = (q->head + q->length) % 4;
    q->values[tail] = value;
    ++q->length;
    return 1;
}
int queue_dequeue(struct IntQueue *q, int *out_value) {
    if (q == NULL || out_value == NULL || q->head >= 4
        || q->length == 0 || q->length > 4) return 0;
    int value = q->values[q->head];
    q->head = (q->head + 1) % 4;
    --q->length;
    *out_value = value;
    return 1;
}
`;

test('D03 prepared queue keeps ten immutable cases and import never registers execution', async () => {
  const before = gradingExercises.get('ds-queue');
  const { queueExercise: exercise } = await load();
  assert.equal(exercise.id, 'ds-queue');
  assert.equal(exercise.grader, 'c-function');
  assert.equal(exercise.cases.length, 10);
  assert.equal(new Set(exercise.cases.map(item => item.args.join())).size, 10);
  assert.ok(exercise.cases.some(item => item.input === exercise.publicExample.input && item.expected === exercise.publicExample.output));
  assert.ok(Object.isFrozen(exercise.cases) && Object.isFrozen(exercise.cases[0]));
  assert.equal(gradingExercises.get(exercise.id), before);
});

test('D03 preparation has roadmap manuscript and executable evidence instead of remaining unstarted', async () => {
  const data = JSON.parse(await fs.readFile(new URL('../docs/roadmap.json', import.meta.url), 'utf8'));
  const unit = data.stages.find(stage => stage.id === 'D').units.find(item => item.id === 'D03');
  assert.notEqual(unit.status, '미착수');
  assert.ok(unit.manuscripts.includes('content/ds/03-queue.md'));
  assert.ok(unit.tests.includes('tests/queue-exercise.test.mjs'));
});

async function grade(t, code) {
  const { queueExercise: exercise } = await load();
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'codeweave-queue-test-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  const workspace = await writeSources(dir, { code, exercise });
  const compiled = compile(workspace, exercise);
  assert.equal(compiled.status, 0, compiled.stderr);
  return buildResult(exercise, compiled, await runCases(workspace, exercise));
}

test('D03 accepts FIFO, wraparound, all four slots, extremes, invalid state preservation and reuse', { skip: !gcc }, async t => {
  const result = await grade(t, reference);
  assert.equal(result.ok, true, JSON.stringify(result));
  assert.equal(result.message, '10/10개 테스트 통과');
});

const mutants = [
  ['rejects INT_MIN insertion', reference.replace('#include <stddef.h>', '#include <stddef.h>\n#include <limits.h>').replace('q == NULL || q->head >= 4', 'value == INT_MIN || q == NULL || q->head >= 4')],
  ['LIFO instead of FIFO', reference.replace('q->values[q->head];', 'q->values[(q->head + q->length - 1) % 4];')],
  ['reserves an unnecessary fourth slot', reference.replace('q->length >= 4', 'q->length >= 3')],
  ['uses length as the insertion index', reference.replace('(q->head + q->length) % 4', 'q->length')],
  ['resets head after removing the last value', reference.replace('--q->length;', '--q->length;\n    if (q->length == 0) q->head = 0;')],
  ['clears the removed physical slot', reference.replace('q->head = (q->head + 1) % 4;', 'q->values[q->head] = 0;\n    q->head = (q->head + 1) % 4;')],
  ['overwrites output on empty failure', reference.replace('if (q == NULL || out_value == NULL', 'if (q != NULL && out_value != NULL && q->length == 0) *out_value = 0;\n    if (q == NULL || out_value == NULL')],
  ['normalizes an invalid head before rejecting it', reference.replace('if (q == NULL || q->head >= 4', 'if (q != NULL) q->head %= 4;\n    if (q == NULL || q->head >= 4')]
];
for (const [name, code] of mutants) {
  test('D03 rejects ' + name, { skip: !gcc }, async t => {
    const result = await grade(t, code);
    assert.equal(result.ok, false);
    assert.equal(result.tests.length, 10);
    assert.ok(result.tests.some(item => !item.passed));
  });
}

test('D03 starter compiles without warnings but cannot claim practice success', { skip: !gcc }, async t => {
  const { queueStarter } = await load();
  const result = await grade(t, queueStarter);
  assert.equal(result.compileOutput, '');
  assert.equal(result.ok, false);
});

test('D03 static diagram describes physical indices and logical FIFO without executable content', () => {
  const svg = figureFor('queue-circular-fifo');
  assert.match(svg, /^<svg[^>]+role="img"/);
  assert.match(svg, /aria-label="[^"]*FIFO/);
  assert.doesNotMatch(svg, /<script|<animate|foreignObject|onload=/i);
});

test('D03 manuscript complete program compiles and prints wraparound FIFO then failed empty preservation', { skip: !gcc }, async t => {
  const markdown = await fs.readFile(new URL('../content/ds/03-queue.md', import.meta.url), 'utf8');
  for (const heading of ['개요', '이론', '도식', '완성 프로그램', '출력', '오류', '퀴즈', '직접 풀기', 'Mini Project', '복습']) {
    assert.ok(markdown.split('\n').some(line => line.startsWith('## ') && line.includes(heading)), heading);
  }
  const program = markdown.match(/```c\n([\s\S]*?)\n```/)[1];
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'codeweave-queue-example-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  const source = path.join(dir, 'example.c');
  const binary = path.join(dir, process.platform === 'win32' ? 'example.exe' : 'example');
  await fs.writeFile(source, program);
  const built = spawnSync('gcc', ['-std=c11', '-Wall', '-Wextra', '-Wpedantic', '-Werror', source, '-o', binary], { encoding: 'utf8', timeout: 4500 });
  assert.equal(built.status, 0, built.stderr);
  const ran = spawnSync(binary, [], { encoding: 'utf8', timeout: 2000 });
  assert.equal(ran.status, 0, ran.stderr);
  assert.equal(ran.stdout.replaceAll('\r\n', '\n'), '2 5\nhead=1 length=0\n0 777\n');
});
