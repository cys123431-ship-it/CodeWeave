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
const load = () => import('../server/merge-exercise.mjs');
const manuscript = () => fs.readFile(new URL('../content/algo/03-merge-sort.md', import.meta.url), 'utf8');
async function reference() {
  return (await manuscript()).match(/```c\n([\s\S]*?)\n```/)[1].split('int main(void)')[0];
}
async function grade(t, code) {
  const { mergeExercise: exercise } = await load();
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'codeweave-merge-test-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  const workspace = await writeSources(dir, { code, exercise });
  const compiled = compile(workspace, exercise);
  assert.equal(compiled.status, 0, compiled.stderr);
  return buildResult(exercise, compiled, await runCases(workspace, exercise));
}

test('E03 preparation keeps ten immutable cases without registering a public exercise', async () => {
  const before = gradingExercises.get('algo-merge');
  const { mergeExercise: exercise } = await load();
  assert.equal(exercise.id, 'algo-merge');
  assert.equal(exercise.grader, 'c-function');
  assert.equal(exercise.cases.length, 10);
  assert.equal(new Set(exercise.cases.map(item => item.args.join())).size, 10);
  assert.ok(Object.isFrozen(exercise.cases) && Object.isFrozen(exercise.cases[0]));
  assert.ok(exercise.cases.some(item => item.input === exercise.publicExample.input && item.expected === exercise.publicExample.output));
  assert.equal(gradingExercises.get(exercise.id), before);
});

test('E03 preparation records manuscript and executable evidence without claiming completion', async () => {
  const data = JSON.parse(await fs.readFile(new URL('../docs/roadmap.json', import.meta.url), 'utf8'));
  const unit = data.stages.find(stage => stage.id === 'E').units.find(item => item.id === 'E03');
  assert.notEqual(unit.status, '미착수');
  assert.ok(unit.manuscripts.includes('content/algo/03-merge-sort.md'));
  assert.ok(unit.tests.includes('tests/merge-exercise.test.mjs'));
});

test('E03 accepts odd/even, extremes, capacity64, guards, scratch output and repeated calls', { skip: !gcc }, async t => {
  const result = await grade(t, await reference());
  assert.equal(result.ok, true, JSON.stringify(result));
  assert.equal(result.message, '10/10개 테스트 통과');
});

const mutations = [
  ['descending comparison', code => code.replace('values[i] <= values[j]', 'values[i] >= values[j]')],
  ['drops the right remainder', code => code.replace('while (j < right) scratch[k++] = values[j++];', 'while (j < right) { ++k; ++j; }')],
  ['drops the left remainder', code => code.replace('while (i < mid) scratch[k++] = values[i++];', 'while (i < mid) { ++k; ++i; }')],
  ['leaves the final value unmerged', code => code.replace('divide(values, scratch, 0, n);', 'divide(values, scratch, 0, n - 1);')],
  ['rejects the full capacity', code => code.replace('n > 64', 'n >= 64')],
  ['rejects an empty NULL array', code => code.replace('if (n == 0) return 1;', 'if (n == 0) return 0;')],
  ['writes on insufficient capacity', code => code.replace('if (scratch == NULL || capacity < n)', 'if (scratch != NULL && capacity < n) scratch[0] = 0;\n    if (scratch == NULL || capacity < n)')],
  ['writes beyond the declared input prefix', code => code.replace('divide(values, scratch, 0, n);', 'divide(values, scratch, 0, n);\n    values[n] = 0;')]
];
for (const [name, mutate] of mutations) {
  test('E03 rejects ' + name, { skip: !gcc }, async t => {
    const code = await reference();
    assert.notEqual(mutate(code), code, 'mutation must actually change the solution');
    const result = await grade(t, mutate(code));
    assert.equal(result.ok, false);
    assert.equal(result.tests.length, 10);
    assert.ok(result.tests.some(item => !item.passed));
  });
}

test('E03 starter compiles warning-free but fails the sorting contract', { skip: !gcc }, async t => {
  const { mergeStarter } = await load();
  const result = await grade(t, mergeStarter);
  assert.equal(result.compileOutput, '');
  assert.equal(result.ok, false);
});

test('E03 static diagram provides an accessible split/merge explanation without executable content', () => {
  const svg = figureFor('merge-auxiliary');
  assert.match(svg, /^<svg[^>]+role="img"/);
  assert.match(svg, /aria-label="[^"]*병합/);
  assert.doesNotMatch(svg, /<script|<animate|foreignObject|onload=/i);
});

test('E03 manuscript complete program compiles and prints both sorted buffers', { skip: !gcc }, async t => {
  const markdown = await manuscript();
  for (const heading of ['개요', '이론', '도식', '완성 프로그램', '출력', '오류', '퀴즈', '직접 풀기', 'Mini Project', '복습']) {
    assert.ok(markdown.split('\n').some(line => line.startsWith('## ') && line.includes(heading)), heading);
  }
  const program = markdown.match(/```c\n([\s\S]*?)\n```/)[1];
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'codeweave-merge-example-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  const source = path.join(dir, 'example.c');
  const binary = path.join(dir, process.platform === 'win32' ? 'example.exe' : 'example');
  await fs.writeFile(source, program);
  const built = spawnSync('gcc', ['-std=c11', '-Wall', '-Wextra', '-Wpedantic', '-Werror', source, '-o', binary], { encoding: 'utf8', timeout: 4500 });
  assert.equal(built.status, 0, built.stderr);
  const ran = spawnSync(binary, [], { encoding: 'utf8', timeout: 2000 });
  assert.equal(ran.status, 0, ran.stderr);
  assert.equal(ran.stdout.replaceAll('\r\n', '\n'), '1\n1 2 3 4 5\n1 2 3 4 5\n');
});
