import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import { gradingExercises } from '../server/grading-exercises.mjs';
import { writeSources, compile, runCases, buildResult } from '../server/grading-pipeline.mjs';

const gcc = spawnSync('gcc', ['--version']).status === 0;
const load = async () => import('../server/preprocessor-exercise.mjs');
const reference = `#include <stddef.h>
int take_nonnegative(int *cursor, int *out) {
    if (cursor == NULL || out == NULL || cursor == out) return 0;
    const int value = *cursor;
    if (value < -10000 || value > 10000) return 0;
    *out = value < 0 ? 0 : value;
    *cursor = value + 1;
    return 1;
}
`;

test('C06 prepared contract preserves ten immutable cases and does not activate production on import', async () => {
  const before = gradingExercises.get('c-preprocessor-once');
  const { preprocessorExercise: exercise } = await load();
  assert.equal(exercise.cases.length, 10);
  assert.equal(new Set(exercise.cases.map(item => item.args.join())).size, 10);
  assert.equal(exercise.grader, 'c-function');
  assert.ok(exercise.cases.some(item => item.input === exercise.publicExample.input && item.expected === exercise.publicExample.output));
  assert.ok(Object.isFrozen(exercise.cases[0]));
  assert.equal(gradingExercises.get(exercise.id), before);
});

async function grade(t, source) {
  const { preprocessorExercise: exercise } = await load();
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'codeweave-preprocessor-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  const workspace = await writeSources(dir, { code: source, exercise });
  const built = compile(workspace, exercise);
  assert.equal(built.status, 0, built.stderr);
  return buildResult(exercise, built, await runCases(workspace, exercise));
}

test('C06 reference accepts one consumption, zero, bounds, rejected state preservation and independent calls', { skip: !gcc }, async t => {
  const result = await grade(t, reference);
  assert.equal(result.ok, true, JSON.stringify(result));
  assert.equal(result.message, '10/10개 테스트 통과');
});

const duplicated = `#include <stddef.h>
#define CW_NONNEG(value) ((value) < 0 ? 0 : (value))
static int read_next(int *cursor) { int value = *cursor; *cursor = value + 1; return value; }
int take_nonnegative(int *cursor, int *out) {
    if (cursor == NULL || out == NULL || cursor == out) return 0;
    if (*cursor < -10000 || *cursor > 10000) return 0;
    *out = CW_NONNEG(read_next(cursor));
    return 1;
}
`;
const mutants = [
  ['parenthesized macro consumes a positive cursor twice', duplicated],
  ['negative value is not consumed', reference.replace('*cursor = value + 1;', '*cursor = value < 0 ? value : value + 1;')],
  ['clamps the incremented value instead of the original', reference.replace('*out = value < 0 ? 0 : value;', '*out = value + 1 < 0 ? 0 : value + 1;')],
  ['overwrites output before rejecting an invalid range', reference.replace('const int value = *cursor;', '*out = 0;\n    const int value = *cursor;')],
  ['allows aliased input and output', reference.replace(' || cursor == out', '')]
];
for (const [name, source] of mutants) {
  test('C06 rejects ' + name, { skip: !gcc }, async t => {
    const result = await grade(t, source);
    assert.equal(result.ok, false);
    assert.ok(result.tests.some(item => !item.passed));
    assert.equal(result.tests.length, 10);
  });
}

test('C06 starter compiles cleanly but cannot claim practical success', { skip: !gcc }, async t => {
  const { preprocessorStarter } = await load();
  const result = await grade(t, preprocessorStarter);
  assert.equal(result.ok, false);
  assert.equal(result.compileOutput, '');
});

for (const trace of [0, 1]) {
  test('C06 complete manuscript example compiles and runs with CW_TRACE=' + trace, { skip: !gcc }, async t => {
    const markdown = await fs.readFile(new URL('../content/c/23-preprocessor-once.md', import.meta.url), 'utf8');
    for (const heading of ['개요', '이론', '도식', '완성 프로그램', '출력', '오류', '퀴즈', '직접 풀기', 'Mini Project', '복습']) {
      assert.ok(markdown.split('\n').some(line => line.startsWith('## ') && line.includes(heading)), heading);
    }
    const program = markdown.match(/```c\n([\s\S]*?)\n```/)[1];
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'codeweave-preprocessor-example-'));
    t.after(() => fs.rm(dir, { recursive: true, force: true }));
    const source = path.join(dir, 'example.c'), binary = path.join(dir, process.platform === 'win32' ? 'example.exe' : 'example');
    await fs.writeFile(source, program);
    const built = spawnSync('gcc', ['-std=c11', '-Wall', '-Wextra', '-Wpedantic', '-Werror', '-DCW_TRACE=' + trace, source, '-o', binary], { encoding: 'utf8', timeout: 4500 });
    assert.equal(built.status, 0, built.stderr);
    const ran = spawnSync(binary, [], { encoding: 'utf8', timeout: 2000 });
    assert.equal(ran.status, 0, ran.stderr);
    assert.equal(ran.stdout.replaceAll('\r\n', '\n'), (trace ? 'trace: enabled\n' : '') + '7 8\n');
  });
}

test('C06 demonstrated duplicate-read variant prints 8 9 and the original program restores 7 8', { skip: !gcc }, async t => {
  const markdown = await fs.readFile(new URL('../content/c/23-preprocessor-once.md', import.meta.url), 'utf8');
  const original = markdown.match(/```c\n([\s\S]*?)\n```/)[1];
  const duplicate = original.replace('int once = read_next(&cursor);\n    int result = CW_NONNEG(once);',
    'int result = CW_NONNEG(read_next(&cursor));');
  assert.notEqual(duplicate, original);
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'codeweave-preprocessor-retry-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  const source = path.join(dir, 'example.c'), binary = path.join(dir, process.platform === 'win32' ? 'example.exe' : 'example');
  for (const [program, output] of [[duplicate, '8 9\n'], [original, '7 8\n']]) {
    await fs.writeFile(source, program);
    const built = spawnSync('gcc', ['-std=c11', '-Wall', '-Wextra', '-Wpedantic', '-Werror', source, '-o', binary], { encoding: 'utf8', timeout: 4500 });
    assert.equal(built.status, 0, built.stderr);
    const ran = spawnSync(binary, [], { encoding: 'utf8', timeout: 2000 });
    assert.equal(ran.status, 0, ran.stderr);
    assert.equal(ran.stdout.replaceAll('\r\n', '\n'), output);
  }
});
