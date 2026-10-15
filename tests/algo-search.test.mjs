import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { writeSources, compile, runCases, buildResult } from '../server/grading-pipeline.mjs';
import { buildGradingExercises as legacyBuilder, gradingExercises } from '../server/grading-exercises.mjs';
import { figureFor } from '../src/figures.js';

const available = spawnSync('gcc', ['--version']).status === 0;
const load = async () => (await import('../server/search-exercise.mjs')).searchExercise;
const linear = `size_t linear_find_first(const int values[], size_t count, int target) {
    for (size_t i = 0; i < count; ++i) {
        if (values[i] == target) return i;
    }
    return count;
}`;
const binary = `size_t binary_find_first(const int values[], size_t count, int target) {
    size_t left = 0;
    size_t right = count;
    while (left < right) {
        size_t mid = left + (right - left) / 2;
        if (values[mid] < target) left = mid + 1;
        else right = mid;
    }
    if (left < count && values[left] == target) return left;
    return count;
}`;
const source = (a = linear, b = binary) => '#include <stddef.h>\n' + a + '\n' + b;

test('E01 reusable builder preserves the legacy export and frozen grading contracts', async () => {
  const { buildGradingExercises } = await import('../server/exercise-contract.mjs');
  assert.equal(buildGradingExercises, legacyBuilder);
  const original = gradingExercises.get('c-clamp-function');
  const copy = buildGradingExercises([original], { [original.id]: original.cases }, { [original.id]: original.harness });
  assert.deepEqual(copy.get(original.id), original);
  assert.equal(Object.isFrozen(copy.get(original.id).cases[0]), true);
});

test('E01 has a static accessible half-open-range diagram', () => {
  const svg = figureFor('search-half-open');
  assert.match(svg, /^<svg/);
  assert.match(svg, /role="img" aria-label="[^"]+"/);
  assert.doesNotMatch(svg, /<script|<animate|onload=/i);
});

test('E01 declares ten independent cases and mirrors its public example', async () => {
  const exercise = await load();
  assert.equal(exercise.id, 'algo-binary');
  assert.equal(exercise.grader, 'c-function');
  assert.equal(exercise.cases.length, 10);
  assert.equal(new Set(exercise.cases.map(tc => tc.args.join())).size, 10);
  assert.ok(exercise.cases.some(tc => tc.input === exercise.publicExample.input && tc.expected === exercise.publicExample.output));
});

async function grade(t, code) {
  const exercise = await load();
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'codeweave-search-test-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  const workspace = await writeSources(dir, { code, exercise });
  const compilation = compile(workspace, exercise);
  assert.equal(compilation.status, 0, compilation.stderr);
  return buildResult(exercise, compilation, await runCases(workspace, exercise));
}

test('E01 accepts both first-match searches across empty, boundary, duplicate and repeat cases', { skip: !available }, async t => {
  const result = await grade(t, source());
  assert.equal(result.ok, true, JSON.stringify(result));
  assert.equal(result.message, '10/10개 테스트 통과');
});

const mutants = [
  ['binary arbitrary duplicate', source(linear, binary.replace('if (values[mid] < target)', 'if (values[mid] == target) return mid;\n        if (values[mid] < target)'))],
  ['binary zero for a missing value', source(linear, binary.replace('return count;', 'return 0;'))],
  ['linear skips the head', source(linear.replace('i = 0', 'i = 1'))],
  ['linear assumes sorted input', source(linear.replace('if (values[i] == target)', 'if (values[i] > target) return count;\n        if (values[i] == target)'))],
  ['linear mutates caller input', source(linear.replace('return i;', '{ ((int *)values)[i] = 42; return i; }'))],
  ['binary upper bound instead of first match', source(linear, binary.replace('values[mid] < target', 'values[mid] <= target'))]
];
for (const [name, code] of mutants) {
  test('E01 rejects ' + name, { skip: !available }, async t => {
    const result = await grade(t, code);
    assert.equal(result.ok, false);
    assert.ok(result.tests.some(tc => !tc.passed));
  });
}

test('E01 manuscript complete program compiles and prints the explained indices', { skip: !available }, async t => {
  const text = await fs.readFile(new URL('../content/algo/01-search.md', import.meta.url), 'utf8');
  const program = text.match(/```c\n([\s\S]*?)```/)?.[1];
  assert.ok(program, 'a runnable complete example is required');
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'codeweave-search-example-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  const file = path.join(dir, 'example.c');
  const exe = path.join(dir, 'example');
  await fs.writeFile(file, program);
  const compilation = spawnSync('gcc', ['-std=c11', '-Wall', '-Wextra', '-Werror', '-Wpedantic', file, '-o', exe], { encoding: 'utf8', timeout: 4500 });
  assert.equal(compilation.status, 0, compilation.stderr);
  const output = spawnSync(exe, [], { encoding: 'utf8', timeout: 1300 });
  assert.equal(output.status, 0);
  assert.equal(output.stdout, '1 1\n5 5\n');
});
