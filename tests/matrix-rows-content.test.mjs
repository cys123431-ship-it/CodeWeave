import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { lessons } from '../src/catalog.js';
import { exerciseById } from '../src/exercises.js';
import { gradingExercises } from '../server/grading-exercises.mjs';
import { figureFor } from '../src/figures.js';

const id = 'c-matrix-row-sums';
const manuscriptURL = new URL('../content/c/21-matrix-row-sums.md', import.meta.url);
const lesson = () => lessons.find(item => item.id === id);
const gccAvailable = spawnSync('gcc', ['--version']).status === 0;
const flags = ['-std=c11', '-Wall', '-Wextra', '-Werror', '-Wpedantic'];

test('matrix lesson retains required headings and function interface', () => {
  assert.ok(lesson());
  assert.equal(lesson().figure, 'matrix-row-contract');
  const headings = lesson().sections.map(section => section.heading).join('\n');
  for (const topic of ['단원 개요', '필요한 이유', '선수 지식', '학습 목표', '완성 프로그램 A', '완성 프로그램 B', '흔한 오류', '중간 점검', '핵심 요약', 'Mini Project', '복습']) assert.ok(headings.includes(topic), topic);
  assert.deepEqual(exerciseById(id).prerequisites, ['c-array-max-function']);
  assert.equal(exerciseById(id).grader, 'c-function');
  assert.doesNotMatch(lesson().challenge.starter, /\bmain\s*\(/);
  assert.match(lesson().challenge.starter, /int sum_rows3\(const int matrix\[\]\[3\], size_t rows, long \*out_sums\)/);
});

test('matrix figure retains image semantics without executable markup', () => {
  const svg = figureFor('matrix-row-contract');
  assert.match(svg, /role="img"/);
  assert.doesNotMatch(svg, /<script|animate|onload=/i);
});

test('matrix grader has independent shape, bounds, empty/null, preservation and repeated-call cases', () => {
  const d = gradingExercises.get(id);
  assert.ok(d);
  assert.equal(d.cases.length, 20);
  assert.match(d.harness, /int sum_rows3\(const int matrix\[\]\[3\], size_t rows, long \*out_sums\);/);
});

test('matrix manuscript retains required learning headings', async () => {
  const text = await readFile(manuscriptURL, 'utf8');
  for (const topic of ['## 단원 개요', '## 필요한 이유', '## 선수 지식', '## 학습 목표', '## 정적 도식 읽기', '## 단계별 예제', '## 완성 프로그램 A', '## 완성 프로그램 B', '## 실행 결과', '## 왜 이런 결과가 나오는가', '## 흔한 오류', '## 중간 점검', '## 핵심 요약', '## 개념 확인', '## 기초 연습', '## 응용 연습', '## 도전 문제', '## Mini Project', '## 테스트 및 풀이 개선', '## 복습 연결']) assert.ok(text.includes(topic), topic);
});

async function compiled(t, code, harness = '') {
  const root = await mkdtemp(path.join(os.tmpdir(), 'codeweave-matrix-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const source = path.join(root, 'submission.c'), executable = path.join(root, 'program');
  await writeFile(source, code);
  const sources = [source];
  if (harness) { const h = path.join(root, 'harness.c'); await writeFile(h, harness); sources.push(h); }
  const result = spawnSync('gcc', [...flags, ...sources, '-o', executable], { encoding: 'utf8', timeout: 10000 });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, '');
  return args => spawnSync(executable, args, { encoding: 'utf8', timeout: 2000 });
}

test('matrix declaration fragments compile with their required header and are not complete programs', { skip: !gccAvailable }, async t => {
  const fragments = lesson().sections.filter(section => section.code && !section.heading.includes('완성 프로그램') && !section.heading.includes('실행 결과'));
  assert.ok(fragments.length > 0, 'at least one fragment must actually be compiled');
  for (const section of fragments) {
    assert.doesNotMatch(section.code, /\bmain\s*\(/);
  }
  const run = await compiled(t, '#include <stddef.h>\n' + fragments.map(section => section.code).join('\n') + '\nint main(void) { return matrix[0][0] == 1 ? 0 : 1; }\n');
  assert.equal(run([]).status, 0);
});

async function program(letter) {
  const text = await readFile(manuscriptURL, 'utf8');
  const match = text.match(new RegExp('## 완성 프로그램 ' + letter + '[\\s\\S]*?\x60\x60\x60c\n([\\s\\S]*?)\x60\x60\x60'));
  assert.ok(match, letter);
  assert.equal(lesson().sections.find(x => x.heading.includes('완성 프로그램 ' + letter)).code.trim(), match[1].trim());
  return match[1];
}

test('matrix initialization program matches screen and actual GCC traversal/sizeof ratios', { skip: !gccAvailable }, async t => {
  const run = await compiled(t, await program('A'));
  const result = run([]);
  assert.equal(result.status, 0);
  assert.equal(result.stderr, '');
  assert.equal(result.stdout, 'rows=2 cols=3\nrow 0: 1 2 3\nrow 1: 4 0 0\n');
});

test('complete row-sum program matches screen and preserves all output after a later invalid cell', { skip: !gccAvailable }, async t => {
  const run = await compiled(t, await program('B'));
  const result = run([]);
  assert.equal(result.status, 0);
  assert.equal(result.stderr, '');
  assert.equal(result.stdout, 'valid status=1 sums=6,15 tail=77\ninvalid status=0 sums=6,15 tail=77\nempty status=1\n');
});

test('row-sum reference links separately and passes all 20 GCC harness cases', { skip: !gccAvailable }, async t => {
  const code = (await program('B')).split('\nint main(void)')[0];
  const d = gradingExercises.get(id), run = await compiled(t, code, d.harness);
  for (const example of d.cases) {
    const result = run(example.args);
    assert.equal(result.status, 0, example.input);
    assert.equal(result.stderr, '', example.input);
    assert.equal(result.stdout.trim(), example.expected, example.input);
  }
});

test('matrix starter compiles with the array-pointer contract but is not a finished answer', { skip: !gccAvailable }, async t => {
  const d = gradingExercises.get(id), run = await compiled(t, lesson().challenge.starter, d.harness);
  assert.notEqual(run(['0']).stdout.trim(), d.cases[0].expected);
});

test('GCC rejects mismatched column widths and pre-C23 array qualifier conversions before execution', { skip: !gccAvailable }, async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'codeweave-matrix-types-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const programs = [
    'void f(const int a[][3]); int main(void){const int a[1][2]={{1,2}};f(a);}',
    'void f(int **a); int main(void){int a[1][3]={{1,2,3}};f(a);}',
    'void f(const int a[][3]); int main(void){int a[1][3]={{1,2,3}};f(a);}'
  ];
  for (let i = 0; i < programs.length; i++) {
    const source = path.join(root, 'bad-' + i + '.c'); await writeFile(source, programs[i]);
    const result = spawnSync('gcc', [...flags, '-c', source, '-o', path.join(root, 'bad-' + i + '.o')], { encoding: 'utf8' });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /incompatible|qualifier/i);
  }
});
