import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { gradingExercises } from '../server/grading-exercises.mjs';
import { writeSources, compile, runCases, buildResult } from '../server/grading-pipeline.mjs';
import { figureFor } from '../src/figures.js';

const load = () => import('../server/owned-stream-exercise.mjs');
const gcc = spawnSync('gcc', ['--version']).status === 0;
const posix = ['linux', 'darwin'].includes(process.platform);
const reference = `#include <stdio.h>
#include <errno.h>
int read_owned_byte(FILE *stream, int *out_byte, int *out_error) {
    if (stream == NULL || out_byte == NULL || out_error == NULL || out_byte == out_error) return -1;
    int status = -1, value = 0, saved = 0;
    if (ferror(stream)) saved = EIO;
    else {
        errno = 0;
        value = fgetc(stream);
        if (value == EOF) {
            if (ferror(stream)) saved = errno != 0 ? errno : EIO;
            else status = 0;
        } else status = 1;
    }
    errno = 0;
    int closed = fclose(stream);
    if (closed != 0 && saved == 0) {
        saved = errno != 0 ? errno : EIO;
        status = -1;
    }
    if (saved != 0) status = -1;
    if (status == 1) *out_byte = value;
    *out_error = saved;
    return status;
}
`;
async function grade(t, code) {
  const { ownedStreamExercise: exercise } = await load();
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'codeweave-owned-stream-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  const workspace = await writeSources(dir, { code, exercise });
  const built = compile(workspace, exercise);
  assert.equal(built.status, 0, built.stderr);
  return buildResult(exercise, built, await runCases(workspace, exercise));
}
test('C07 preparation keeps ten immutable owned-resource cases outside production grading', async () => {
  for (const file of ['../server/owned-stream-exercise.mjs', '../src/figures.js', './owned-stream-exercise.test.mjs']) {
    const checked = spawnSync(process.execPath, ['--check', fileURLToPath(new URL(file, import.meta.url))],
      { encoding: 'utf8', timeout: 4500 });
    assert.equal(checked.status, 0, checked.stderr);
  }
  const { ownedStreamExercise: exercise, ownedStreamMetadata: metadata } = await load();
  assert.equal(exercise.cases.length, 10);
  assert.equal(new Set(exercise.cases.map(c => c.args.join())).size, 10);
  assert.ok(Object.isFrozen(exercise.cases));
  assert.ok(exercise.cases.every(Object.isFrozen));
  assert.equal(gradingExercises.has(exercise.id), false);
  assert.ok(exercise.cases.some(c => c.input === metadata.publicExample.input && c.expected === metadata.publicExample.output));
  assert.deepEqual(exercise.linkArgs, []);
});
test('C07 static ownership diagram has accessible image semantics and no executable markup', () => {
  const svg = figureFor('owned-stream-cleanup');
  assert.match(svg, /aria-label="[^"]*소유권/);
  assert.match(svg, /role="img"/);
  assert.doesNotMatch(svg, /<script|<animate|foreignObject|onload=/i);
});
test('C07 reference preserves failure outputs, closes transferred resources and ignores stale errno', { skip: !gcc || !posix }, async t => {
  const result = await grade(t, reference);
  assert.equal(result.ok, true, JSON.stringify(result));
  assert.equal(result.message, '10/10개 테스트 통과');
});
const mutants = [
  ['leaks the transferred stream', reference.replace('int closed = fclose(stream);', 'int closed = 0;')],
  ['publishes EOF as a byte', reference.replace('if (status == 1) *out_byte = value;', 'if (status != -1) *out_byte = value;')],
  ['loses the saved read error during cleanup', reference.replace('*out_error = saved;', '*out_error = errno;')],
  ['treats stale incoming errno as failure', reference.replace('if (ferror(stream)) saved = EIO;', 'if (errno != 0) saved = errno; else if (ferror(stream)) saved = EIO;')],
  ['confuses byte FF with EOF', reference.replace('*out_byte = value;', '*out_byte = value == 255 ? EOF : value;')],
  ['consumes two bytes', reference.replace('value = fgetc(stream);', 'value = fgetc(stream);\n        if (value != EOF) value = fgetc(stream);')],
  ['reads after a preexisting stream error', reference.replace('if (ferror(stream)) saved = EIO;', 'if (0) saved = EIO;')],
  ['closes before argument validation transfers ownership', reference.replace('out_byte == out_error) return -1;', 'out_byte == out_error) { if (stream != NULL) (void)fclose(stream); return -1; }')]
];
for (const [name, code] of mutants) {
  test('C07 rejects ' + name, { skip: !gcc || !posix }, async t => {
    assert.notEqual(code, reference, 'mutation must change the actual source');
    const result = await grade(t, code);
    assert.equal(result.ok, false);
    assert.equal(result.tests.length, 10);
    assert.ok(result.tests.some(c => !c.passed));
  });
}
test('C07 warning-free starter cannot claim a practice pass', { skip: !gcc || !posix }, async t => {
  const { ownedStreamStarter } = await load();
  const result = await grade(t, ownedStreamStarter);
  assert.equal(result.ok, false);
  assert.equal(result.compileOutput, '');
});
test('C07 independent manuscript complete program compiles and prints byte then normal EOF', { skip: !gcc }, async t => {
  const md = await fs.readFile(new URL('../content/c/24-owned-stream-errors.md', import.meta.url), 'utf8');
  for (const heading of ['개요', '이론', '도식', '완성 프로그램', '출력', '오류', '퀴즈', '직접 풀기', 'Mini Project', '복습']) {
    assert.ok(md.split('\n').some(line => line.startsWith('## ') && line.includes(heading)), heading);
  }
  const program = md.match(/```c\n([\s\S]*?)\n```/)[1];
  assert.ok(program.startsWith(reference.trimEnd()));
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'codeweave-owned-example-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  const source = path.join(dir, 'example.c'), binary = path.join(dir, 'example');
  await fs.writeFile(source, program);
  const built = spawnSync('gcc', ['-std=c11', '-Wall', '-Wextra', '-Wpedantic', '-Werror', source, '-o', binary], { encoding: 'utf8', timeout: 4500 });
  assert.equal(built.status, 0, built.stderr);
  const ran = spawnSync(binary, [], { encoding: 'utf8', timeout: 2000 });
  assert.equal(ran.status, 0, ran.stderr);
  assert.equal(ran.stdout.replaceAll('\r\n', '\n'), '1 65 0\n0 777 0\n');
});
