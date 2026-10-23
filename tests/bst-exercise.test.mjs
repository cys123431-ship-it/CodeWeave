import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { gradingExercises } from '../server/grading-exercises.mjs';
import { writeSources, compile, runCases, buildResult } from '../server/grading-pipeline.mjs';

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

test('D06 import exposes ten immutable cases without public registration', async () => {
  const before = gradingExercises.get('ds-bst');
  const { bstExercise: exercise } = await load();
  assert.equal(exercise.id, 'ds-bst');
  assert.equal(exercise.grader, 'c-function');
  assert.equal(exercise.cases.length, 10);
  assert.equal(new Set(exercise.cases.map(item => item.args.join())).size, 10);
  assert.ok(Object.isFrozen(exercise) && Object.isFrozen(exercise.cases));
  assert.ok(exercise.cases.some(item => item.input === exercise.publicExample.input
    && item.expected === exercise.publicExample.output));
  assert.equal(gradingExercises.get(exercise.id), before);
});

test('D06 preparation records manuscript and executable evidence but remains in progress', async () => {
  const data = JSON.parse(await fs.readFile(new URL('../docs/roadmap.json', import.meta.url), 'utf8'));
  const unit = data.stages.find(stage => stage.id === 'D').units.find(item => item.id === 'D06');
  assert.equal(unit.status, '진행 중');
  assert.deepEqual(unit.lessonIds, []);
  assert.ok(unit.manuscripts.includes('content/ds/06-binary-search-tree.md'));
  assert.ok(unit.tests.includes('tests/bst-exercise.test.mjs'));
  assert.deepEqual(data.next, { track: 'D', unit: 'D06' });
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
