import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { gradingExercises } from '../server/grading-exercises.mjs';
import { writeSources, compile, runCases, buildResult } from '../server/grading-pipeline.mjs';

const gcc = spawnSync('gcc', ['--version']).status === 0;
const load = () => import('../server/owned-list-exercise.mjs');
const reference = `#include <stddef.h>
#include <stdlib.h>
struct Node { int value; struct Node *next; };
int list_prepend(struct Node **head, int value) {
    if (head == NULL) return 0;
    struct Node *node = malloc(sizeof *node);
    if (node == NULL) return 0;
    node->value = value;
    node->next = *head;
    *head = node;
    return 1;
}
int list_remove_first(struct Node **head, int target, int *removed) {
    if (head == NULL || removed == NULL) return 0;
    struct Node **link = head;
    while (*link != NULL && (*link)->value != target) link = &(*link)->next;
    if (*link == NULL) return 0;
    struct Node *victim = *link;
    *link = victim->next;
    *removed = victim->value;
    free(victim);
    return 1;
}
void list_destroy(struct Node **head) {
    if (head == NULL) return;
    while (*head != NULL) {
        struct Node *victim = *head;
        *head = victim->next;
        free(victim);
    }
}
`;

test('D05 preparation exposes ten immutable ownership cases without public registration', async () => {
  const before = gradingExercises.get('ds-owned-list');
  const { ownedListExercise: exercise, ownedListMetadata: metadata } = await load();
  assert.equal(before, undefined);
  assert.equal(gradingExercises.get(exercise.id), undefined);
  assert.equal(exercise.id, 'ds-owned-list');
  assert.equal(exercise.grader, 'c-function');
  assert.equal(exercise.cases.length, 10);
  assert.equal(new Set(exercise.cases.map(c => c.args.join())).size, 10);
  assert.ok(Object.isFrozen(exercise) && Object.isFrozen(exercise.cases) && exercise.cases.every(Object.isFrozen));
  assert.deepEqual(exercise.linkArgs, ['-Wl,--wrap=malloc', '-Wl,--wrap=free']);
  assert.ok(exercise.cases.some(c => c.input === metadata.publicExample.input && c.expected === metadata.publicExample.output));
});

async function grade(t, code) {
  const { ownedListExercise: exercise } = await load();
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'codeweave-owned-list-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  const workspace = await writeSources(dir, { code, exercise });
  const built = compile(workspace, exercise);
  assert.equal(built.status, 0, built.stderr);
  return buildResult(exercise, built, await runCases(workspace, exercise));
}

test('D05 accepts prepend first-match removal failure preservation and complete cleanup', { skip: !gcc }, async t => {
  const result = await grade(t, reference);
  assert.equal(result.ok, true, JSON.stringify(result));
  assert.equal(result.message, '10/10개 테스트 통과');
});

const mutants = [
  ['drops the old head during prepend', reference.replace('node->next = *head;', 'node->next = NULL;')],
  ['publishes allocation before initialization', reference.replace('node->value = value;\n    node->next = *head;', '*head = node;\n    node->value = value;\n    node->next = NULL;')],
  ['removes the last duplicate instead of first', reference.replace('while (*link != NULL && (*link)->value != target) link = &(*link)->next;', 'struct Node **found = NULL; while (*link != NULL) { if ((*link)->value == target) found = link; link = &(*link)->next; } link = found;')],
  ['returns success without freeing removed ownership', reference.replace('free(victim);', '(void)victim;', 1)],
  ['frees the successor instead of the victim', reference.replace('free(victim);', 'free(victim->next);', 1)],
  ['overwrites output for a missing target', reference.replace('if (*link == NULL) return 0;', 'if (*link == NULL) { *removed = target; return 0; }')],
  ['destroy leaks the final node', reference.replace('while (*head != NULL) {', 'while (*head != NULL && (*head)->next != NULL) {')],
  ['destroy leaves a dangling head', reference.replace('*head = victim->next;\n        free(victim);', 'free(victim);\n        if (victim->next != NULL) *head = victim->next;')]
];
for (const [name, code] of mutants) {
  test('D05 rejects ' + name, { skip: !gcc }, async t => {
    assert.notEqual(code, reference);
    const result = await grade(t, code);
    assert.equal(result.ok, false);
    assert.equal(result.tests.length, 10);
  });
}

test('D05 starter is warning-free but cannot claim ownership mastery', { skip: !gcc }, async t => {
  const { ownedListStarter } = await load();
  const result = await grade(t, ownedListStarter);
  assert.equal(result.compileOutput, '');
  assert.equal(result.ok, false);
});

test('D05 manuscript complete program compiles and demonstrates insert remove destroy ownership', { skip: !gcc }, async t => {
  const text = await fs.readFile(new URL('../content/ds/05-owned-linked-list.md', import.meta.url), 'utf8');
  for (const heading of ['개요', '이론', '도식', '완성 프로그램', '출력', '오류', '퀴즈', '직접 풀기', 'Mini Project', '복습']) {
    assert.ok(text.split('\n').some(line => line.startsWith('## ') && line.includes(heading)), heading);
  }
  assert.ok(text.split('\n').length <= 150);
  const program = text.match(/```c\n([\s\S]*?)\n```/)[1];
  assert.ok(program.startsWith(reference.trimEnd()));
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'codeweave-owned-list-example-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  const source = path.join(dir, 'example.c'), binary = path.join(dir, process.platform === 'win32' ? 'example.exe' : 'example');
  await fs.writeFile(source, program);
  const built = spawnSync('gcc', ['-std=c11', '-Wall', '-Wextra', '-Wpedantic', '-Werror', source, '-o', binary], { encoding: 'utf8', timeout: 4500 });
  assert.equal(built.status, 0, built.stderr);
  const ran = spawnSync(binary, [], { encoding: 'utf8', timeout: 2000 });
  assert.equal(ran.status, 0, ran.stderr);
  assert.equal(ran.stdout.replaceAll('\r\n', '\n'), 'list: 5 10 20\nremoved=10\nafter: 5 20\ndestroyed=1\n');
});

test('D05 preparation records manuscript and executable evidence while retaining the selected turn', async () => {
  const data = JSON.parse(await fs.readFile(new URL('../docs/roadmap.json', import.meta.url), 'utf8'));
  const unit = data.stages.find(s => s.id === 'D').units.find(u => u.id === 'D05');
  assert.equal(unit.status, '진행 중');
  assert.deepEqual(unit.lessonIds, []);
  assert.ok(unit.manuscripts.includes('content/ds/05-owned-linked-list.md'));
  assert.ok(unit.tests.includes('tests/owned-list-exercise.test.mjs'));
  assert.deepEqual(data.next, { track: 'D', unit: 'D05' });
});

test('D05 changed modules pass syntax checks and generated roadmap stays synchronized', async () => {
  for (const file of ['../server/owned-list-exercise.mjs', './owned-list-exercise.test.mjs']) {
    const checked = spawnSync(process.execPath, ['--check', fileURLToPath(new URL(file, import.meta.url))], { encoding: 'utf8' });
    assert.equal(checked.status, 0, checked.stderr);
  }
  const checked = spawnSync(process.execPath, [fileURLToPath(new URL('../scripts/roadmap.mjs', import.meta.url)), '--check'], { encoding: 'utf8' });
  assert.equal(checked.status, 0, checked.stderr);
});
