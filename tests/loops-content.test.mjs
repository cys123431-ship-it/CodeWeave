import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { lessons } from '../src/catalog.js';
import { figureFor } from '../src/figures.js';
import { gradingExercises } from '../server/grading-exercises.mjs';

const manuscriptURL = new URL('../content/c/03-conditionals-loops.md', import.meta.url);
const gccAvailable = spawnSync('gcc', ['--version']).status === 0;

test('loop lesson retains required headings and practice contract', () => {
  const lesson = lessons.find(item => item.id === 'c-loops');
  assert.equal(lesson.figure, 'loop-invariant');
  const headings = lesson.sections.map(section => section.heading).join(' ');
  for (const topic of ['단원 개요', '필요한 이유', '선수 지식', '학습 목표', '조건', '분기', 'for', 'while', '불변식', '범위', '완성 프로그램', '실행 결과', '흔한 오류', '중간 점검', '핵심 요약', '연습', '복습']) {
    assert.ok(headings.includes(topic), topic);
  }
  assert.equal(lesson.quiz.answer, 1);
  assert.equal(lesson.quiz.options[1], '4번');
  assert.equal(lesson.challenge.id, 'c-loops');
  assert.equal(lesson.challenge.input, '5');
  assert.equal(lesson.challenge.expected, '15');
  assert.match(lesson.challenge.starter, /scanf\("%d", &n\) != 1/);
});

test('loop grader explicitly distinguishes zero iterations, one iteration and the upper bound', () => {
  const cases = gradingExercises.get('c-loops').cases;
  for (const [input, expected] of [['0\n', '0'], ['1\n', '1'], ['1000\n', '500500']]) {
    assert.ok(cases.some(example => example.input === input && example.expected === expected), JSON.stringify(input));
  }
});

test('loop figure retains image semantics without executable markup', () => {
  const svg = figureFor('loop-invariant');
  assert.match(svg, /role="img"/);
  assert.doesNotMatch(svg, /<script|animate|onload=/i);
});

test('loop manuscript retains required learning headings', async () => {
  const text = await readFile(manuscriptURL, 'utf8');
  for (const heading of ['## 단원 개요', '## 필요한 이유', '## 선수 지식', '## 학습 목표', '## 핵심 이론', '## 정적 도식 읽기', '## 단계별 예제', '## 완성 프로그램 A', '## 완성 프로그램 B', '## 실행 결과', '## 왜 이런 결과가 나오는가', '## 흔한 오류', '## 중간 점검', '## 개념 확인 퀴즈', '## 핵심 요약', '## 기초 코딩 연습', '## 응용 연습', '## 도전 문제', '## Mini Project', '## 테스트와 풀이 개선', '## 복습 연결']) assert.ok(text.includes(heading), heading);
});

function program(text, id) {
  const match = text.match(new RegExp('## 완성 프로그램 ' + id + '[\\s\\S]*?```c\\n([\\s\\S]*?)```'));
  assert.ok(match, 'complete program ' + id);
  return match[1];
}

async function compile(t, sourceText) {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'codeweave-loops-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const source = path.join(directory, 'loops.c');
  const executable = path.join(directory, process.platform === 'win32' ? 'loops.exe' : 'loops');
  await writeFile(source, sourceText);
  const result = spawnSync('gcc', ['-std=c11', '-Wall', '-Wextra', '-Werror', '-Wpedantic', source, '-o', executable], { encoding: 'utf8', timeout: 10000 });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, '');
  return input => spawnSync(executable, [], { input, encoding: 'utf8', timeout: 2000 });
}

test('loop trace complete program compiles and makes state transitions observable', { skip: !gccAvailable }, async t => {
  const run = await compile(t, program(await readFile(manuscriptURL, 'utf8'), 'A'));
  const result = run('');
  assert.equal(result.status, 0);
  assert.equal(result.stdout, 'i=1 before=0 after=1\ni=2 before=1 after=3\ni=3 before=3 after=6\nsum=6\n');
});

test('loop sum complete program matches the screen and every allowed n on the current GCC', { skip: !gccAvailable }, async t => {
  const source = program(await readFile(manuscriptURL, 'utf8'), 'B');
  const screen = lessons.find(item => item.id === 'c-loops').sections.find(section => section.heading.includes('완성 프로그램'));
  assert.equal(screen.code.trim(), source.trim());
  const run = await compile(t, source);
  for (const example of gradingExercises.get('c-loops').cases) {
    const result = run(example.input);
    assert.equal(result.status, 0, example.input);
    assert.equal(result.stdout, example.expected + '\n', example.input);
    assert.equal(result.stderr, '');
  }
  // Exhaust this finite numeric contract, not arbitrary input text or every C implementation.
  for (let n = 0; n <= 1000; n++) {
    const result = run(n + '\n');
    assert.equal(result.status, 0, 'n=' + n);
    assert.equal(result.stdout, (n * (n + 1) / 2) + '\n', 'n=' + n);
    assert.equal(result.stderr, '');
  }
  for (const input of ['-1\n', '1001\n', 'abc\n', '']) {
    const result = run(input);
    assert.equal(result.status, 1, JSON.stringify(input));
    assert.equal(result.stdout, '');
  }
});
