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
const load = () => import('../server/array-list-exercise.mjs');
const reference = `#include <stddef.h>
struct IntList { int *values; size_t length; size_t capacity; };
int list_insert(struct IntList *list, size_t pos, int value, size_t *moved) {
    if (list == NULL || moved == NULL || list->values == NULL
        || list->length > list->capacity || pos > list->length
        || list->length == list->capacity) return 0;
    size_t count = 0;
    for (size_t i = list->length; i > pos; --i) {
        list->values[i] = list->values[i - 1];
        ++count;
    }
    list->values[pos] = value;
    ++list->length;
    *moved = count;
    return 1;
}
int list_erase(struct IntList *list, size_t pos, int *out, size_t *moved) {
    if (list == NULL || moved == NULL || out == NULL || list->values == NULL
        || list->length > list->capacity || pos >= list->length) return 0;
    int removed = list->values[pos];
    size_t count = 0;
    for (size_t i = pos; i + 1 < list->length; ++i) {
        list->values[i] = list->values[i + 1];
        ++count;
    }
    --list->length;
    *out = removed;
    *moved = count;
    return 1;
}
`;

test('D04 import preserves production registration and exposes ten immutable boundary cases', async () => {
  const before = gradingExercises.get('ds-array-list');
  const { arrayListExercise: e } = await load();
  assert.equal(gradingExercises.get(e.id), before);
  assert.equal(e.id, 'ds-array-list');
  assert.equal(e.grader, 'c-function');
  assert.equal(e.cases.length, 10);
  assert.equal(new Set(e.cases.map(c => c.args.join())).size, 10);
  assert.ok(Object.isFrozen(e) && Object.isFrozen(e.cases) && Object.isFrozen(e.cases[0]));
  assert.ok(e.cases.some(c => c.input === e.publicExample.input && c.expected === e.publicExample.output));
});

async function grade(t, code) {
  const { arrayListExercise: exercise } = await load();
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'codeweave-array-list-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  const workspace = await writeSources(dir, { code, exercise });
  const compiled = compile(workspace, exercise);
  assert.equal(compiled.status, 0, compiled.stderr);
  return buildResult(exercise, compiled, await runCases(workspace, exercise));
}

test('D04 accepts indexed insert erase shift counts invalid preservation extremes and independent reuse', { skip: !gcc }, async t => {
  const result = await grade(t, reference);
  assert.equal(result.ok, true, JSON.stringify(result));
  assert.equal(result.message, '10/10개 테스트 통과');
});

const mutants = [
  ['append instead of indexed insert', reference.replace('list->values[pos] = value;', 'list->values[list->length] = value;')],
  ['wrong insertion shift direction', reference.replace('list->values[i] = list->values[i - 1];', 'list->values[i - 1] = list->values[i];')],
  ['rejects final available slot', reference.replace('list->length == list->capacity)', 'list->length + 1 >= list->capacity)')],
  ['insertion off by one movement count', reference.replace('*moved = count;', '*moved = count + 1;')],
  ['erasure off by one movement count', reference.replaceAll('*moved = count;', '*moved = count + 1;')],
  ['erases without shifting', reference.replace('list->values[i] = list->values[i + 1];', '(void)i;')],
  ['returns shifted value as removed output', reference.replace('*out = removed;', '*out = list->values[pos];\n    (void)removed;')],
  ['clears unused erased tail', reference.replace('--list->length;', '--list->length;\n    list->values[list->length] = 0;')],
  ['overwrites movement output on rejected insert', reference.replace('if (list == NULL || moved == NULL', 'if (moved != NULL) *moved = 0;\n    if (list == NULL || moved == NULL')],
  ['rejects zero values', reference.replace('if (list == NULL || moved == NULL', 'if (value == 0) return 0;\n    if (list == NULL || moved == NULL')]
];
for (const [name, code] of mutants) {
  test('D04 rejects ' + name, { skip: !gcc }, async t => {
    const result = await grade(t, code);
    assert.equal(result.ok, false);
    assert.equal(result.tests.length, 10);
  });
}

test('D04 starter compiles with warnings treated as errors but does not pass', { skip: !gcc }, async t => {
  const { arrayListStarter } = await load();
  const result = await grade(t, arrayListStarter);
  assert.equal(result.compileOutput, '');
  assert.equal(result.ok, false);
});

test('D04 original static diagram exposes insert erase movement without executable markup', () => {
  const svg = figureFor('array-list-shifts');
  assert.match(svg, /^<svg[^>]+role="img"/);
  assert.match(svg, /aria-label="[^"]*삽입[^"]*삭제/);
  assert.doesNotMatch(svg, /<script|<animate|foreignObject|onload=/i);
});

test('D04 manuscript complete example compiles and prints measured insertion and erasure costs', { skip: !gcc }, async t => {
  const text = await fs.readFile(new URL('../content/ds/04-array-list.md', import.meta.url), 'utf8');
  for (const heading of ['개요', '이론', '도식', '완성 프로그램', '출력', '오류', '퀴즈', '직접 풀기', 'Mini Project', '복습']) {
    assert.ok(text.split('\n').some(line => line.startsWith('## ') && line.includes(heading)), heading);
  }
  const program = text.match(/```c\n([\s\S]*?)\n```/)[1];
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'codeweave-array-list-example-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  const source = path.join(dir, 'example.c');
  const binary = path.join(dir, process.platform === 'win32' ? 'example.exe' : 'example');
  await fs.writeFile(source, program);
  const built = spawnSync('gcc', ['-std=c11', '-Wall', '-Wextra', '-Wpedantic', '-Werror', source, '-o', binary], { encoding: 'utf8', timeout: 4500 });
  assert.equal(built.status, 0, built.stderr);
  const ran = spawnSync(binary, [], { encoding: 'utf8', timeout: 2000 });
  assert.equal(ran.status, 0, ran.stderr);
  assert.equal(ran.stdout.replaceAll('\r\n', '\n'), 'insert=1 moved=2: 10 15 20 30\nerase=1 removed=20 moved=1: 10 15 30\n');
});

test('D04 preparation records manuscript and executable evidence while keeping the selected turn', async () => {
  const data = JSON.parse(await fs.readFile(new URL('../docs/roadmap.json', import.meta.url), 'utf8'));
  const unit = data.stages.find(s => s.id === 'D').units.find(u => u.id === 'D04');
  assert.notEqual(unit.status, '미착수');
  assert.ok(unit.manuscripts.includes('content/ds/04-array-list.md'));
  assert.ok(unit.tests.includes('tests/array-list-exercise.test.mjs'));
});

test('D04 changed modules pass node syntax checks and generated roadmap remains synchronized', async () => {
  for (const file of ['../server/array-list-exercise.mjs', '../src/figures.js', './array-list-exercise.test.mjs']) {
    const checked = spawnSync(process.execPath, ['--check', new URL(file, import.meta.url).pathname], { encoding: 'utf8' });
    assert.equal(checked.status, 0, checked.stderr);
  }
  const checked = spawnSync(process.execPath, [new URL('../scripts/roadmap.mjs', import.meta.url).pathname, '--check'], { encoding: 'utf8' });
  assert.equal(checked.status, 0, checked.stderr);
});
