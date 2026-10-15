import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { lessons } from '../src/catalog.js';
import { figureFor } from '../src/figures.js';
import { exerciseById } from '../src/exercises.js';
import { gradingExercises } from '../server/grading-exercises.mjs';

const manuscriptURL = new URL('../content/c/04-arrays.md', import.meta.url);
const gccAvailable = spawnSync('gcc', ['--version']).status === 0;
const oldStarter = '#include <stdio.h>\n\nint main(void) {\n    int n, a[20];\n    if (scanf("%d", &n) != 1) return 1;\n    for (int i = 0; i < n; i++) scanf("%d", &a[i]);\n    // TODO: 가장 큰 값을 찾아 출력하세요.\n    return 0;\n}';

test('array lesson retains required headings and practice identity', () => {
  const lesson = lessons.find(item => item.id === 'c-array');
  assert.equal(lesson.figure, 'array-half-open');
  const headings = lesson.sections.map(section => section.heading).join(' ');
  for (const topic of ['단원 개요', '필요한 이유', '선수 지식', '학습 목표', '객체', '인덱스', '초기화', 'sizeof', '매개변수', '길이', '불변식', '완성 프로그램 A', '완성 프로그램 B', '실행 결과', '흔한 오류', '중간 점검', '핵심 요약', '연습', '복습']) assert.ok(headings.includes(topic), topic);
  assert.equal(lesson.quiz.answer, 2);
  assert.equal(lesson.quiz.options[2], '4');
  assert.equal(lesson.challenge.id, 'c-array');
  assert.equal(lesson.challenge.starter, oldStarter);
  assert.equal(lesson.challenge.input, '5\n2 9 -3 4 1');
  assert.equal(lesson.challenge.expected, '9');
  assert.deepEqual(exerciseById('c-array').prerequisites, ['c-loops']);
});

test('array figure retains image semantics without executable markup', () => {
  const svg = figureFor('array-half-open');
  assert.match(svg, /role="img"/);
  assert.doesNotMatch(svg, /<script|animate|onload=/i);
});

test('array introduction grader covers first maximum, duplicates with zero and portable integer limits', () => {
  const cases = gradingExercises.get('c-array').cases;
  for (const [input, expected] of [
    ['4\n9 2 -3 1\n', '9'],
    ['6\n-7 0 -7 0 -9 -2\n', '0'],
    ['3\n-32767 0 32767\n', '32767']
  ]) assert.ok(cases.some(example => example.input === input && example.expected === expected), input);
});

test('array manuscript retains required learning headings', async () => {
  const text = await readFile(manuscriptURL, 'utf8');
  for (const heading of ['## 단원 개요', '## 필요한 이유', '## 선수 지식', '## 학습 목표', '## 핵심 이론', '## 정적 도식 읽기', '## 단계별 예제', '## 완성 프로그램 A', '## 완성 프로그램 B', '## 실행 결과', '## 왜 이런 결과가 나오는가', '## 흔한 오류', '## 중간 점검', '## 개념 확인 퀴즈', '## 핵심 요약', '## 기초 코딩 연습', '## 응용 연습', '## 도전 문제', '## Mini Project', '## 테스트와 풀이 개선', '## 복습 연결']) assert.ok(text.includes(heading), heading);
});

function program(text, id) {
  const match = text.match(new RegExp('## 완성 프로그램 ' + id + '[\\s\\S]*?```c\\n([\\s\\S]*?)```'));
  assert.ok(match, 'complete program ' + id);
  return match[1];
}

async function compile(t, sourceText) {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'codeweave-arrays-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const source = path.join(directory, 'arrays.c');
  const executable = path.join(directory, process.platform === 'win32' ? 'arrays.exe' : 'arrays');
  await writeFile(source, sourceText);
  const result = spawnSync('gcc', ['-std=c11', '-Wall', '-Wextra', '-Werror', '-Wpedantic', source, '-o', executable], { encoding: 'utf8', timeout: 10000 });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, '');
  return input => spawnSync(executable, [], { input, encoding: 'utf8', timeout: 2000 });
}

test('array initialization complete program matches the screen and actual GCC output', { skip: !gccAvailable }, async t => {
  const source = program(await readFile(manuscriptURL, 'utf8'), 'A');
  const screen = lessons.find(item => item.id === 'c-array').sections.find(section => section.heading.includes('완성 프로그램 A'));
  assert.equal(screen.code.trim(), source.trim());
  const result = (await compile(t, source))('');
  assert.equal(result.status, 0);
  assert.equal(result.stdout, 'count=5\na[0]=4\na[1]=-2\na[2]=0\na[3]=0\na[4]=0\n');
  assert.equal(result.stderr, '');
});

test('array maximum complete program matches screen, grading cases and deterministic count/position combinations', { skip: !gccAvailable }, async t => {
  const source = program(await readFile(manuscriptURL, 'utf8'), 'B');
  const screen = lessons.find(item => item.id === 'c-array').sections.find(section => section.heading.includes('완성 프로그램 B'));
  assert.equal(screen.code.trim(), source.trim());
  const run = await compile(t, source);
  for (const example of gradingExercises.get('c-array').cases) {
    const result = run(example.input);
    assert.equal(result.status, 0, example.input);
    assert.equal(result.stdout, example.expected + '\n', example.input);
    assert.equal(result.stderr, '');
  }
  // Every permitted count and maximum position, with portable representative values.
  // This finite family is not all integer arrays, all text inputs or a memory-safety proof.
  for (let count = 1; count <= 20; count++) {
    for (let maximumAt = 0; maximumAt < count; maximumAt++) {
      const values = Array.from({ length: count }, (_, i) => i === maximumAt ? -1 : -20 - i);
      const result = run(count + '\n' + values.join(' ') + '\n');
      assert.equal(result.status, 0, count + ':' + maximumAt);
      assert.equal(result.stdout, '-1\n', count + ':' + maximumAt);
      assert.equal(result.stderr, '');
    }
  }
  for (const input of ['0\n', '21\n', '-1\n', 'abc\n', '', '2\n7\n', '2\n7 x\n']) {
    const result = run(input);
    assert.equal(result.status, 1, JSON.stringify(input));
    assert.equal(result.stdout, '');
  }
});
