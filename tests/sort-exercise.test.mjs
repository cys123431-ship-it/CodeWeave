import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { writeSources, compile, runCases, buildResult } from '../server/grading-pipeline.mjs';
import { gradingExercises } from '../server/grading-exercises.mjs';
import { figureFor } from '../src/figures.js';

const gcc = spawnSync('gcc', ['--version']).status === 0;
const load = async () => {
  const prepared = (await import('../server/sort-exercise.mjs')).sortExercise;
  const registered = gradingExercises.get(prepared.id);
  if (registered) {
    assert.deepEqual(registered.cases, prepared.cases);
    assert.equal(registered.harness, prepared.harness);
  }
  return registered || prepared;
};
const reference = `#include <stddef.h>
struct SortItem { int key; int tag; };
int stable_sort_counted(struct SortItem items[], size_t count,
                        size_t *out_comparisons, size_t *out_moves) {
    if (out_comparisons == NULL || out_moves == NULL || count > 8
        || (count > 0 && items == NULL)) return 0;
    size_t comparisons = 0;
    size_t moves = 0;
    for (size_t i = 1; i < count; ++i) {
        struct SortItem key = items[i];
        size_t j = i;
        while (j > 0) {
            ++comparisons;
            if (!(items[j - 1].key > key.key)) break;
            items[j] = items[j - 1];
            ++moves;
            --j;
        }
        items[j] = key;
        ++moves;
    }
    *out_comparisons = comparisons;
    *out_moves = moves;
    return 1;
}
`;

test('E02 preparation declares ten independent cases without activating the production registry', async () => {
  const before = gradingExercises.get('algo-stable-insertion');
  const exercise = await load();
  assert.equal(exercise.id, 'algo-stable-insertion');
  assert.equal(exercise.cases.length, 10);
  assert.equal(new Set(exercise.cases.map(tc => tc.args.join())).size, 10);
  assert.ok(exercise.cases.some(tc => tc.input === exercise.publicExample.input && tc.expected === exercise.publicExample.output));
  assert.equal(gradingExercises.get(exercise.id), before);
  assert.ok(Object.isFrozen(exercise.cases[0]));
});

async function grade(t, code) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'codeweave-sort-test-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  const exercise = await load();
  const workspace = await writeSources(dir, { code, exercise });
  const compiled = compile(workspace, exercise);
  assert.equal(compiled.status, 0, compiled.stderr);
  return buildResult(exercise, compiled, await runCases(workspace, exercise));
}

test('E02 counts comparisons and array writes while preserving stable tags, prefix boundaries and failed outputs', { skip: !gcc }, async t => {
  const result = await grade(t, reference);
  assert.equal(result.ok, true, JSON.stringify(result));
  assert.equal(result.message, '10/10개 테스트 통과');
});

const mutants = [
  ['unstable equality shifts', reference.replace('items[j - 1].key > key.key', 'items[j - 1].key >= key.key')],
  ['omits unsuccessful key comparisons', reference.replace('++comparisons;\n            if (!(items[j - 1].key > key.key)) break;', 'if (!(items[j - 1].key > key.key)) break;\n            ++comparisons;')],
  ['omits final array placement writes', reference.replace('items[j] = key;\n        ++moves;', 'items[j] = key;')],
  ['counts local key copies as moves', reference.replace('struct SortItem key = items[i];', 'struct SortItem key = items[i];\n        ++moves;')],
  ['sorts keys without moving tags', reference.replace('items[j] = items[j - 1];', 'items[j].key = items[j - 1].key;').replace('items[j] = key;', 'items[j].key = key.key;')],
  ['accumulates counts across calls', reference.replace('size_t comparisons = 0;', 'size_t comparisons = *out_comparisons;').replace('size_t moves = 0;', 'size_t moves = *out_moves;')],
  ['rejects valid empty NULL ranges', reference.replace('(count > 0 && items == NULL)', 'items == NULL')],
  ['overwrites outputs before failure validation', reference.replace('    if (out_comparisons == NULL', '    if (out_comparisons != NULL) *out_comparisons = 0;\n    if (out_moves != NULL) *out_moves = 0;\n    if (out_comparisons == NULL')]
];
for (const [name, code] of mutants) {
  test('E02 rejects ' + name, { skip: !gcc }, async t => {
    const result = await grade(t, code);
    assert.equal(result.ok, false);
    assert.ok(result.tests.some(tc => !tc.passed));
  });
}

test('E02 starter compiles warning-free but is not a passing solution', { skip: !gcc }, async t => {
  const { sortStarter } = await import('../server/sort-exercise.mjs');
  const result = await grade(t, sortStarter);
  assert.equal(result.compileOutput, '');
  assert.equal(result.ok, false);
});

test('E02 static stability diagram provides image semantics without executable markup', () => {
  const svg = figureFor('stable-insertion-counts');
  assert.match(svg, /^<svg[^>]+role="img"/);
  assert.doesNotMatch(svg, /<script|<animate|foreignObject|onload=/i);
});

test('E02 complete manuscript program compiles and prints stable records and explained counts', { skip: !gcc }, async t => {
  const markdown = await fs.readFile(new URL('../content/algo/02-stable-insertion.md', import.meta.url), 'utf8');
  for (const heading of ['개요', '이론', '도식', '완성 프로그램', '출력', '오류', '퀴즈', '직접 풀기', 'Mini Project', '복습']) {
    assert.ok(markdown.split('\n').some(line => line.startsWith('## ') && line.includes(heading)), heading);
  }
  const code = markdown.match(/```c\n([\s\S]*?)\n```/)[1];
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'codeweave-sort-example-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  const source = path.join(dir, 'example.c');
  const binary = path.join(dir, process.platform === 'win32' ? 'example.exe' : 'example');
  await fs.writeFile(source, code);
  const compiled = spawnSync('gcc', ['-std=c11', '-Wall', '-Wextra', '-Wpedantic', '-Werror', source, '-o', binary], { encoding: 'utf8' });
  assert.equal(compiled.status, 0, compiled.stderr);
  const ran = spawnSync(binary, [], { encoding: 'utf8', timeout: 2000 });
  assert.equal(ran.status, 0, ran.stderr);
  assert.equal(ran.stdout.replaceAll('\r\n', '\n'), '1:10 2:20 2:21\n2 3\n');
});
