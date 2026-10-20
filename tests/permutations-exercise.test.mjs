import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { gradingExercises } from '../server/grading-exercises.mjs';
import { writeSources, compile, runCases, buildResult } from '../server/grading-pipeline.mjs';
import { figureFor } from '../src/figures.js';

const gcc = spawnSync('gcc', ['--version']).status === 0;
const load = () => import('../server/permutations-exercise.mjs');
const reference = "#include <stddef.h>\nstatic void exchange(int *a, int *b) {\n    int saved = *a;\n    *a = *b;\n    *b = saved;\n}\nstatic void explore(int values[], size_t count, size_t pos,\n                    int rows[][4], size_t *written) {\n    if (pos == count) {\n        for (size_t k = 0; k < count; ++k) {\n            rows[*written][k] = values[k];\n        }\n        ++*written;\n        return;\n    }\n    for (size_t i = pos; i < count; ++i) {\n        exchange(values + pos, values + i);\n        explore(values, count, pos + 1, rows, written);\n        exchange(values + pos, values + i); /* undo */\n    }\n}\nint enumerate_permutations(int values[], size_t count,\n                           int rows[][4], size_t capacity,\n                           size_t *out_count) {\n    if (out_count == NULL || rows == NULL || count > 4\n        || (count > 0 && values == NULL)) {\n        return 0;\n    }\n    size_t required = 1;\n    for (size_t i = 2; i <= count; ++i) {\n        required *= i;\n    }\n    if (capacity < required) {\n        return 0;\n    }\n    size_t written = 0;\n    explore(values, count, 0, rows, &written);\n    *out_count = written;\n    return 1;\n}\n";

test('E04 import exposes ten immutable cases and never mutates production registration', async () => {
  const before = gradingExercises.get('algo-permutations');
  const { permutationsExercise: e } = await load();
  assert.equal(e.id, 'algo-permutations');
  assert.equal(e.grader, 'c-function');
  assert.equal(e.cases.length, 10);
  assert.equal(new Set(e.cases.map(c => c.args.join())).size, 10);
  assert.ok(Object.isFrozen(e) && Object.isFrozen(e.cases) && Object.isFrozen(e.cases[0]));
  assert.ok(e.cases.some(c => c.input === e.publicExample.input && c.expected === e.publicExample.output));
  assert.equal(gradingExercises.get(e.id), before);
});

test('E04 preparation records manuscript and executable evidence without remaining unstarted', async () => {
  const data = JSON.parse(await fs.readFile(new URL('../docs/roadmap.json', import.meta.url), 'utf8'));
  const unit = data.stages.find(s => s.id === 'E').units.find(u => u.id === 'E04');
  assert.notEqual(unit.status, '미착수');
  assert.ok(unit.manuscripts.includes('content/algo/04-backtracking-permutations.md'));
  assert.ok(unit.tests.includes('tests/permutations-exercise.test.mjs'));
});

async function grade(t, code) {
  const { permutationsExercise: exercise } = await load();
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'codeweave-permutations-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  const workspace = await writeSources(dir, { code, exercise });
  const compiled = compile(workspace, exercise);
  assert.equal(compiled.status, 0, compiled.stderr);
  return buildResult(exercise, compiled, await runCases(workspace, exercise));
}

test('E04 accepts exact traversal order input restoration empty extremes duplicates guards and repeated calls', { skip: !gcc }, async t => {
  const result = await grade(t, reference);
  assert.equal(result.ok, true, JSON.stringify(result));
  assert.equal(result.message, '10/10개 테스트 통과');
});

const mutants = [
  ['omitted undo', code => code.replace('exchange(values + pos, values + i); /* undo */', '(void)0; /* undo omitted */')],
  ['skips the first candidate', code => code.replace('size_t i = pos;', 'size_t i = pos + 1;')],
  ['skips the last candidate', code => code.replace('i < count; ++i', 'i + 1 < count; ++i')],
  ['publishes only the unchanged root', code => code.replace('if (pos == count)', 'if (pos == 0)')],
  ['resets the row counter on each leaf', code => code.replace('++*written;', '*written = 1;')],
  ['omits the last output column', code => code.replace('k < count;', 'k + 1 < count;')],
  ['clears an unused output column', code => code.replace('++*written;', 'if (count < 4) rows[*written][count] = 0;\n        ++*written;')],
  ['overwrites output on rejection', code => code.replace('if (out_count == NULL', 'if (out_count != NULL) *out_count = 0;\n    if (out_count == NULL')],
  ['rejects exact capacity', code => code.replace('capacity < required', 'capacity <= required')]
];
for (const [name, mutate] of mutants) {
  test('E04 rejects ' + name, { skip: !gcc }, async t => {
    const code = mutate(reference);
    assert.notEqual(code, reference);
    const result = await grade(t, code);
    assert.equal(result.ok, false);
    assert.equal(result.tests.length, 10);
  });
}

test('E04 starter compiles without warnings but does not pass enumeration', { skip: !gcc }, async t => {
  const { permutationsStarter } = await load();
  const result = await grade(t, permutationsStarter);
  assert.equal(result.compileOutput, '');
  assert.equal(result.ok, false);
});

test('E04 original static diagram exposes choice recursion undo without executable markup', () => {
  const svg = figureFor('permutation-backtrack');
  assert.match(svg, /^<svg[^>]+role="img"/);
  assert.match(svg, /aria-label="[^"]*재귀[^"]*복원/);
  assert.doesNotMatch(svg, /<script|<animate|foreignObject|onload=/i);
});

test('E04 manuscript complete example compiles prints six rows and restores the input', { skip: !gcc }, async t => {
  const markdown = await fs.readFile(new URL('../content/algo/04-backtracking-permutations.md', import.meta.url), 'utf8');
  for (const heading of ['개요', '이론', '도식', '완성 프로그램', '출력', '오류', '퀴즈', '직접 풀기', 'Mini Project', '복습']) {
    assert.ok(markdown.split('\n').some(line => line.startsWith('## ') && line.includes(heading)), heading);
  }
  const program = markdown.match(/\x60\x60\x60c\n([\s\S]*?)\n\x60\x60\x60/)[1];
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'codeweave-permutations-example-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  const source = path.join(dir, 'example.c');
  const binary = path.join(dir, process.platform === 'win32' ? 'example.exe' : 'example');
  await fs.writeFile(source, program);
  const built = spawnSync('gcc', ['-std=c11', '-Wall', '-Wextra', '-Wpedantic', '-Werror', source, '-o', binary], { encoding: 'utf8', timeout: 4500 });
  assert.equal(built.status, 0, built.stderr);
  const ran = spawnSync(binary, [], { encoding: 'utf8', timeout: 2000 });
  assert.equal(ran.status, 0, ran.stderr);
  assert.equal(ran.stdout.replaceAll('\r\n', '\n'), 'count=6\n1 2 3\n1 3 2\n2 1 3\n2 3 1\n3 2 1\n3 1 2\nrestored: 1 2 3\n');
});

test('E04 changed modules pass node syntax checks and roadmap stays synchronized', () => {
  for (const file of ['../server/permutations-exercise.mjs', '../src/figures.js', './permutations-exercise.test.mjs']) {
    const result = spawnSync(process.execPath, ['--check', fileURLToPath(new URL(file, import.meta.url))], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
  }
  const result = spawnSync(process.execPath, [fileURLToPath(new URL('../scripts/roadmap.mjs', import.meta.url)), '--check'], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
});
