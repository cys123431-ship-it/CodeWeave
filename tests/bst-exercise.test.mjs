import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { gradingExercises } from '../server/grading-exercises.mjs';
import { writeSources, compile, runCases, buildResult } from '../server/grading-pipeline.mjs';
import { lessons } from '../src/catalog.js';
import { exerciseById } from '../src/exercises.js';
import { figureFor } from '../src/figures.js';

const gcc = spawnSync('gcc', ['--version']).status === 0;
const load = () => import('../server/bst-exercise.mjs');
const reference = `#include <stddef.h>
struct BstNode { int value; struct BstNode *left; struct BstNode *right; };
int bst_insert(struct BstNode **root, struct BstNode *node) {
    if (root == NULL || node == NULL || node->left != NULL || node->right != NULL) return 0;
    struct BstNode **link = root;
    while (*link != NULL) {
        if (node->value == (*link)->value) return 0;
        link = node->value < (*link)->value ? &(*link)->left : &(*link)->right;
    }
    *link = node;
    return 1;
}
const struct BstNode *bst_find(const struct BstNode *root, int target) {
    while (root != NULL) {
        if (target == root->value) return root;
        root = target < root->value ? root->left : root->right;
    }
    return NULL;
}
static size_t inorder_write(const struct BstNode *root, int values[],
                            size_t capacity, size_t offset) {
    if (root == NULL) return offset;
    offset = inorder_write(root->left, values, capacity, offset);
    if (offset < capacity) values[offset] = root->value;
    ++offset;
    return inorder_write(root->right, values, capacity, offset);
}
size_t bst_inorder(const struct BstNode *root, int values[], size_t capacity) {
    return inorder_write(root, values, capacity, 0);
}
`;

test('D06 delivers one public lesson, an accessible figure and the prepared GCC contract', async () => {
  const { bstExercise: exercise, bstMetadata: metadata, bstStarter } = await load();
  const lesson = lessons.find(item => item.id === exercise.id);
  assert.ok(lesson);
  assert.equal(lesson.track, 'ds');
  assert.equal(lesson.figure, 'bst-ordering');
  assert.equal(lesson.sections.length >= 10 && lesson.sections.length <= 15, true);
  assert.deepEqual(exerciseById(exercise.id), { ...metadata, requiredFiles: [] });
  assert.equal(gradingExercises.get(exercise.id), exercise);
  assert.equal(lesson.challenge.id, exercise.id);
  assert.equal(lesson.challenge.starter, bstStarter);
  assert.equal(lesson.challenge.input, metadata.publicExample.input);
  assert.equal(lesson.challenge.expected, metadata.publicExample.output);
  assert.deepEqual(lesson.quiz.options, ['왼쪽-현재-오른쪽', '현재-왼쪽-오른쪽', '오른쪽-현재-왼쪽', '현재 노드만']);
  assert.equal(lesson.quiz.answer, 0);
  const figure = figureFor(lesson.figure);
  assert.match(figure, /role="img"/);
  assert.match(figure, /aria-label="[^"]*이진 탐색 트리[^"]*"/);
  assert.doesNotMatch(figure, /<script|<animate|<foreignObject|onload=/i);
  assert.equal(exercise.id, 'ds-bst');
  assert.equal(exercise.grader, 'c-function');
  assert.equal(exercise.cases.length, 10);
  assert.equal(new Set(exercise.cases.map(item => item.args.join())).size, 10);
  assert.ok(Object.isFrozen(exercise) && Object.isFrozen(exercise.cases));
  assert.ok(exercise.cases.some(item => item.input === exercise.publicExample.input
    && item.expected === exercise.publicExample.output));
});

test('D06 completion records verified browser evidence and rotates to E06', async () => {
  const data = JSON.parse(await fs.readFile(new URL('../docs/roadmap.json', import.meta.url), 'utf8'));
  const unit = data.stages.find(stage => stage.id === 'D').units.find(item => item.id === 'D06');
  assert.equal(unit.status, '완료');
  assert.deepEqual(unit.lessonIds, ['ds-bst']);
  assert.ok(unit.manuscripts.includes('content/ds/06-binary-search-tree.md'));
  assert.ok(unit.tests.includes('tests/bst-exercise.test.mjs'));
  assert.ok(unit.tests.includes('tests/browser-practice.mjs'));
  assert.equal(unit.acceptance.scope, 'caller-owned-bst-insert-find-bounded-inorder');
  assert.equal(unit.acceptance.sourceSha, 'e6a915b3c873683aa14e86728dfbc63b8c99da81');
  assert.equal(unit.acceptance.ci, 'https://github.com/cys123431-ship-it/CodeWeave/actions/runs/39951878590');
  assert.deepEqual(unit.acceptance.platforms, ['linux']);
  assert.deepEqual(unit.acceptance.checks, ['theory', 'compiled-example', 'quiz-retry', 'actual-grading', 'correction-retry', 'shared-history', 'backup-restore', 'mastery-next', 'offline', '390px']);
  assert.deepEqual(data.next, { track: 'E', unit: 'E06' });
});

test('D06 browser acceptance includes the real GCC HTTP boundary', { skip: !gcc }, () => {
  const result = spawnSync(process.execPath, [fileURLToPath(new URL('./browser-practice.mjs', import.meta.url)), '--bst-http-only'], {
    encoding: 'utf8', timeout: 30000
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /D06 BST HTTP acceptance passed/);
});

async function grade(t, code) {
  const { bstExercise: exercise } = await load();
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'codeweave-bst-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  const workspace = await writeSources(dir, { code, exercise });
  const compiled = compile(workspace, exercise);
  assert.equal(compiled.status, 0, compiled.stderr);
  return buildResult(exercise, compiled, await runCases(workspace, exercise));
}

test('D06 accepts caller-owned insert search inorder bounds and repeats', { skip: !gcc }, async t => {
  const result = await grade(t, reference);
  assert.equal(result.ok, true, JSON.stringify(result));
  assert.equal(result.message, '10/10개 테스트 통과');
});

const mutants = [
  ['routes smaller values right', code => code.replace("node->value < (*link)->value ? &(*link)->left : &(*link)->right", "node->value < (*link)->value ? &(*link)->right : &(*link)->left")],
  ['accepts duplicate values', code => code.replace('if (node->value == (*link)->value) return 0;', 'if (node->value == (*link)->value) return 1;')],
  ['accepts prelinked nodes', code => code.replace(' || node->left != NULL || node->right != NULL', '')],
  ['searches the wrong branch', code => code.replace('target < root->value ? root->left : root->right', 'target < root->value ? root->right : root->left')],
  ['uses preorder output', code => code.replace('offset = inorder_write(root->left, values, capacity, offset);\n    if (offset < capacity) values[offset] = root->value;', 'if (offset < capacity) values[offset] = root->value;\n    offset = inorder_write(root->left, values, capacity, offset + 1);').replace('    ++offset;\n    return inorder_write(root->right, values, capacity, offset);', '    return inorder_write(root->right, values, capacity, offset);')],
  ['ignores output capacity', code => code.replace('if (offset < capacity) values[offset] = root->value;', 'values[offset] = root->value;')],
  ['returns only the written count', code => code.replace('return inorder_write(root, values, capacity, 0);', 'size_t count = inorder_write(root, values, capacity, 0); return count < capacity ? count : capacity;')],
  ['skips the right subtree', code => code.replace('return inorder_write(root->right, values, capacity, offset);', 'return offset;')]
];
for (const [name, mutate] of mutants) {
  test('D06 rejects ' + name, { skip: !gcc }, async t => {
    const code = mutate(reference);
    assert.notEqual(code, reference);
    const result = await grade(t, code);
    assert.equal(result.ok, false);
    assert.equal(result.tests.length, 10);
  });
}

test('D06 starter compiles without warnings but fails tree cases', { skip: !gcc }, async t => {
  const { bstStarter } = await load();
  const result = await grade(t, bstStarter);
  assert.equal(result.compileOutput, '');
  assert.equal(result.ok, false);
});

test('D06 manuscript has required learning path, stays within 150 lines, and example compiles', { skip: !gcc }, async t => {
  const markdown = await fs.readFile(new URL('../content/ds/06-binary-search-tree.md', import.meta.url), 'utf8');
  assert.ok(markdown.split('\n').length <= 150);
  for (const heading of ['개요', '이론', '도식', '완성 프로그램', '출력', '오류', '퀴즈', '직접 풀기', 'Mini Project', '복습']) {
    assert.ok(markdown.split('\n').some(line => line.startsWith('## ') && line.includes(heading)), heading);
  }
  const program = markdown.match(/\x60\x60\x60c\n([\s\S]*?)\n\x60\x60\x60/)[1];
  assert.ok(program.startsWith(reference.trimEnd()));
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'codeweave-bst-example-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  const source = path.join(dir, 'example.c');
  const binary = path.join(dir, process.platform === 'win32' ? 'example.exe' : 'example');
  await fs.writeFile(source, program);
  const built = spawnSync('gcc', ['-std=c11', '-Wall', '-Wextra', '-Wpedantic', '-Werror', source, '-o', binary], { encoding: 'utf8', timeout: 4500 });
  assert.equal(built.status, 0, built.stderr);
  const ran = spawnSync(binary, [], { encoding: 'utf8', timeout: 2000 });
  assert.equal(ran.status, 0, ran.stderr);
  assert.equal(ran.stdout.replaceAll('\r\n', '\n'), 'found=6\ncount=4\n1 2 4 6\n');
});

test('D06 changed modules pass syntax checks and roadmap stays synchronized', () => {
  for (const file of ['../server/bst-exercise.mjs', './bst-exercise.test.mjs']) {
    const result = spawnSync(process.execPath, ['--check', fileURLToPath(new URL(file, import.meta.url))], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
  }
  const result = spawnSync(process.execPath, [fileURLToPath(new URL('../scripts/roadmap.mjs', import.meta.url)), '--check'], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
});
