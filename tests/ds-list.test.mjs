import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { writeSources, compile, runCases, buildResult } from '../server/grading-pipeline.mjs';
import { figureFor } from '../src/figures.js';

const available = spawnSync('gcc', ['--version']).status === 0;
const load = async () => (await import('../server/ds-list-exercise.mjs')).listExercise;
test('D01 provides a static accessible pointer-chain diagram', () => {
  const svg = figureFor('list-first-match');
  assert.match(svg, /^<svg/);
  assert.match(svg, /role="img" aria-label="[^"]+"/);
  assert.doesNotMatch(svg, /<script|<animate|onload=/i);
});
const prefix = '#include <stddef.h>\nstruct Node { int value; const struct Node *next; };\n';
const correct = prefix + 'const struct Node *list_find(const struct Node *head, int target) { for (const struct Node *p = head; p != NULL; p = p->next) { if (p->value == target) return p; } return NULL; }';

async function grade(t, code) {
  const exercise = await load();
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'codeweave-list-test-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  const workspace = await writeSources(dir, { code, exercise });
  const compilation = compile(workspace, exercise);
  assert.equal(compilation.status, 0, compilation.stderr);
  return buildResult(exercise, compilation, await runCases(workspace, exercise));
}

test('D01 contract has ten independent linked-list cases and uses the existing C function pipeline', async () => {
  const exercise = await load();
  assert.equal(exercise.id, 'ds-list-find');
  assert.equal(exercise.grader, 'c-function');
  assert.equal(exercise.cases.length, 10);
  assert.equal(new Set(exercise.cases.map(tc => tc.args.join())).size, 10);
  assert.ok(exercise.cases.some(tc => tc.input === exercise.publicExample.input && tc.expected === exercise.publicExample.output));
});

test('D01 accepts correct traversal across noncontiguous nodes, boundaries and repeated calls', { skip: !available }, async t => {
  const result = await grade(t, correct);
  assert.equal(result.ok, true, JSON.stringify(result));
  assert.equal(result.message, '10/10개 테스트 통과');
});

const mutants = [
  ['last duplicate instead of first identity', correct.replace('for (const struct', 'const struct Node *found = NULL; for (const struct').replace('return p;', 'found = p;').replace('return NULL;', 'return found;')],
  ['skips the head', correct.replace('p = head;', 'p = head ? head->next : NULL;')],
  ['skips the tail', correct.replace('p != NULL;', 'p != NULL && p->next != NULL;')],
  ['returns a value-equivalent foreign node', correct.replace('return p;', '{ static struct Node fake; fake.value = p->value; return &fake; }')],
  ['mutates caller-owned nodes', correct.replace('return p;', '{ ((struct Node *)p)->value = 42; return p; }')],
  ['retains a cursor across calls', correct.replace('for (const struct Node *p = head;', 'static const struct Node *cursor; if (!cursor) cursor = head; for (const struct Node *p = cursor;').replace('return p;', '{ cursor = p; return p; }')]
];
for (const [name, code] of mutants) {
  test('D01 rejects ' + name, { skip: !available }, async t => {
    const result = await grade(t, code);
    assert.equal(result.ok, false);
    assert.ok(result.tests.some(tc => !tc.passed));
  });
}

test('D01 original complete example compiles and produces its explained output', { skip: !available }, async t => {
  const text = await fs.readFile(new URL('../content/ds/01-linked-list.md', import.meta.url), 'utf8');
  const programs = [...text.matchAll(/```c\n([\s\S]*?)```/g)].map(match => match[1]);
  assert.equal(programs.length, 1, 'only the runnable complete example is tagged c');
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'codeweave-list-example-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  const source = path.join(dir, 'example.c');
  const binary = path.join(dir, 'example');
  await fs.writeFile(source, programs[0]);
  const result = spawnSync('gcc', ['-std=c11', '-Wall', '-Wextra', '-Werror', '-Wpedantic', source, '-o', binary], { encoding: 'utf8', timeout: 4500 });
  assert.equal(result.status, 0, result.stderr);
  const output = spawnSync(binary, [], { encoding: 'utf8', timeout: 1300 });
  assert.equal(output.status, 0);
  assert.equal(output.stdout, '7 2 7\nfirst\nmissing\n');
});
