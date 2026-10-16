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
  const prepared = (await import('../server/stream-exercise.mjs')).streamExercise;
  const registered = gradingExercises.get(prepared.id);
  if (registered) assert.deepEqual(registered, prepared, 'UI handoff must preserve the compiled contract');
  return registered || prepared;
};
const available = process.platform !== 'win32' && spawnSync('gcc', ['--version']).status === 0;
const reference = `#include <stdio.h>
#include <stddef.h>
int count_stream_bytes(FILE *stream, size_t *out_count) {
    if (stream == NULL || out_count == NULL || ferror(stream)) return 0;
    size_t count = 0;
    int ch;
    while ((ch = fgetc(stream)) != EOF) {
        if (count == 4096) return 0;
        ++count;
    }
    if (ferror(stream)) return 0;
    *out_count = count;
    return 1;
}
`;

test('C05 prepared contract has ten independent cases and importing it does not mutate the registry', async () => {
  const registered = gradingExercises.get('c-file-stream-count');
  const exercise = await load();
  assert.equal(exercise.id, 'c-file-stream-count');
  assert.equal(exercise.grader, 'c-function');
  assert.equal(exercise.cases.length, 10);
  assert.equal(new Set(exercise.cases.map(tc => tc.args.join())).size, 10);
  assert.ok(exercise.cases.some(tc => tc.input === exercise.publicExample.input && tc.expected === exercise.publicExample.output));
  assert.equal(gradingExercises.get(exercise.id), registered);
  assert.equal(Object.isFrozen(exercise.cases[0]), true);
});

test('C05 stream ownership and EOF diagram is static and accessible', () => {
  const svg = figureFor('stream-eof-error');
  assert.match(svg, /^<svg/);
  assert.match(svg, /role="img" aria-label="[^"]+"/);
  assert.doesNotMatch(svg, /<script|<animate|onload=|foreignObject/i);
});

async function temporary(t) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'codeweave-stream-test-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  return dir;
}
async function grade(t, code) {
  const exercise = await load();
  const workspace = await writeSources(await temporary(t), { code, exercise });
  const result = compile(workspace, exercise);
  assert.equal(result.status, 0, result.stderr);
  return buildResult(exercise, result, await runCases(workspace, exercise));
}

test('C05 accepts binary bytes, current position, exact bound, failed reads and repeated calls', { skip: !available }, async t => {
  const result = await grade(t, reference);
  assert.equal(result.ok, true, JSON.stringify(result));
  assert.equal(result.message, '10/10개 테스트 통과');
});

const mutants = [
  ['counts the EOF sentinel', reference.replace('*out_count = count;', '*out_count = count + 1;')],
  ['stops at embedded NUL', reference.replace('!= EOF)', '!= EOF && ch != 0)')],
  ['mistakes byte FF for EOF', reference.replace('int ch;', 'signed char ch;')],
  ['rewinds a borrowed stream', reference.replace('size_t count = 0;', 'rewind(stream);\n    size_t count = 0;')],
  ['publishes output before failure', reference.replace('size_t count = 0;', '*out_count = 0;\n    size_t count = 0;')],
  ['accepts a stream longer than the contract', reference.replace('if (count == 4096) return 0;', '')],
  ['accepts a fresh read error as EOF', reference.replace('    if (ferror(stream)) return 0;\n    *out_count', '    *out_count')],
  ['closes a borrowed stream', reference.replace('*out_count = count;', 'fclose(stream);\n    *out_count = count;')]
];
for (const [name, code] of mutants) {
  test('C05 rejects ' + name, { skip: !available }, async t => {
    const result = await grade(t, code);
    assert.equal(result.ok, false);
    assert.ok(result.tests.some(tc => !tc.passed));
  });
}

test('C05 starter is warning-free C11 but is not a passing answer', { skip: !available }, async t => {
  const { streamStarter } = await import('../server/stream-exercise.mjs');
  const result = await grade(t, streamStarter);
  assert.equal(result.ok, false);
  assert.equal(result.compileOutput, '');
});

test('C05 manuscript retains learning headings and its complete program really prints the byte count', { skip: !available }, async t => {
  const text = await fs.readFile(new URL('../content/c/22-file-streams.md', import.meta.url), 'utf8');
  for (const heading of ['개요', '상세 이론', '예제', '흔한 오류', '퀴즈', '연습', '복습']) assert.ok(text.includes(heading));
  const program = text.match(/```c\n([\s\S]*?)```/)?.[1];
  assert.ok(program);
  const dir = await temporary(t);
  const file = path.join(dir, 'example.c');
  const exe = path.join(dir, 'example');
  await fs.writeFile(file, program);
  const result = spawnSync('gcc', ['-std=c11', '-Wall', '-Wextra', '-Wpedantic', '-Werror', file, '-o', exe], { encoding: 'utf8', timeout: 4500 });
  assert.equal(result.status, 0, result.stderr);
  const out = spawnSync(exe, [], { cwd: dir, encoding: 'utf8', timeout: 1300 });
  assert.equal(out.status, 0, out.stderr);
  assert.equal(out.stdout, '1 4\n');
});
