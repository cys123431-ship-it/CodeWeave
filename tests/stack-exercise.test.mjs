import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { writeSources, compile, runCases, buildResult } from '../server/grading-pipeline.mjs';
import { gradingExercises } from '../server/grading-exercises.mjs';
import { figureFor } from '../src/figures.js';

const load = async () => {
  const prepared = (await import('../server/stack-exercise.mjs')).stackExercise;
  const registered = gradingExercises.get(prepared.id);
  if (registered) {
    assert.deepEqual(registered.cases, prepared.cases);
    assert.equal(registered.harness, prepared.harness);
  }
  return registered || prepared;
};
const gcc = spawnSync('gcc', ['--version']).status === 0;
const reference = `#include <stddef.h>
struct IntStack { int values[4]; size_t length; };
int stack_push(struct IntStack *stack, int value) {
    if (stack == NULL || stack->length >= 4) return 0;
    stack->values[stack->length] = value;
    ++stack->length;
    return 1;
}
int stack_pop(struct IntStack *stack, int *out_value) {
    if (stack == NULL || out_value == NULL || stack->length == 0 || stack->length > 4) return 0;
    int value = stack->values[stack->length - 1];
    --stack->length;
    *out_value = value;
    return 1;
}
`;

test('D02 prepared stack contract has ten unique cases and mirrors the public example', async () => {
  const before = gradingExercises.get('ds-stack');
  const exercise = await load();
  assert.equal(exercise.id, 'ds-stack');
  assert.equal(exercise.cases.length, 10);
  assert.equal(new Set(exercise.cases.map(tc => tc.args.join())).size, 10);
  assert.ok(exercise.cases.some(tc => tc.input === exercise.publicExample.input && tc.expected === exercise.publicExample.output));
  assert.equal(gradingExercises.get('ds-stack'), before, 'preparation must not activate a sample');
  assert.equal(Object.isFrozen(exercise.cases[0]), true);
});

async function grade(t, code) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'codeweave-stack-test-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  const exercise = await load();
  const workspace = await writeSources(dir, { code, exercise });
  const compiled = compile(workspace, exercise);
  assert.equal(compiled.status, 0, compiled.stderr);
  return buildResult(exercise, compiled, await runCases(workspace, exercise));
}

test('D02 accepts LIFO, zero/extremes, exact capacity, failed state preservation and independent stacks', { skip: !gcc }, async t => {
  const result = await grade(t, reference);
  assert.equal(result.ok, true, JSON.stringify(result));
  assert.equal(result.message, '10/10개 테스트 통과');
});

const mutants = [
  ['FIFO instead of LIFO', reference.replace('stack->values[stack->length - 1]', 'stack->values[0]')],
  ['rejects negative values', reference.replace('stack == NULL || stack->length >= 4', 'value < 0 || stack == NULL || stack->length >= 4')],
  ['claims a full push succeeded', reference.replace('if (stack == NULL || stack->length >= 4) return 0;', 'if (stack == NULL) return 0;\n    if (stack->length >= 4) return 1;')],
  ['publishes output on empty failure', reference.replace('if (stack == NULL || out_value == NULL', 'if (stack != NULL && out_value != NULL && stack->length == 0) *out_value = 0;\n    if (stack == NULL || out_value == NULL')],
  ['clears the popped slot', reference.replace('--stack->length;', '--stack->length;\n    stack->values[stack->length] = 0;')],
  ['overwrites a spare slot', reference.replace('++stack->length;', '++stack->length;\n    if (stack->length < 4) stack->values[stack->length] = 0;')]
];
for (const [name, code] of mutants) {
  test('D02 rejects ' + name, { skip: !gcc }, async t => {
    const result = await grade(t, code);
    assert.equal(result.ok, false);
    assert.ok(result.tests.some(tc => !tc.passed));
  });
}

test('D02 starter compiles under strict C11 but does not pass', { skip: !gcc }, async t => {
  const { stackStarter } = await import('../server/stack-exercise.mjs');
  const result = await grade(t, stackStarter);
  assert.equal(result.compileOutput, '');
  assert.equal(result.ok, false);
});

test('D02 capacity and LIFO diagram has accessible static SVG semantics', () => {
  const svg = figureFor('stack-bounded-lifo');
  assert.match(svg, /^<svg[^>]+role="img"/);
  assert.doesNotMatch(svg, /<script|<animate|foreignObject|onload=/i);
});

test('D02 manuscript retains learning headings and its complete example really prints 1 5', { skip: !gcc }, async t => {
  const markdown = await fs.readFile(new URL('../content/ds/02-stack.md', import.meta.url), 'utf8');
  for (const heading of ['개요', '이론', '도식', '완성 프로그램', '출력', '오류', '퀴즈', '직접 풀기', 'Mini Project', '복습']) {
    assert.ok(markdown.split('\n').some(line => line.startsWith('## ') && line.includes(heading)), heading);
  }
  const code = markdown.match(/```c\n([\s\S]*?)\n```/)[1];
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'codeweave-stack-example-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  const source = path.join(dir, 'example.c');
  const binary = path.join(dir, process.platform === 'win32' ? 'example.exe' : 'example');
  await fs.writeFile(source, code);
  const compiled = spawnSync('gcc', ['-std=c11', '-Wall', '-Wextra', '-Wpedantic', '-Werror', source, '-o', binary], { encoding: 'utf8' });
  assert.equal(compiled.status, 0, compiled.stderr);
  const ran = spawnSync(binary, [], { encoding: 'utf8', timeout: 2000 });
  assert.equal(ran.status, 0, ran.stderr);
  assert.equal(ran.stdout.replaceAll('\r\n', '\n'), '1 5\n');
});
