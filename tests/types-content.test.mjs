import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { lessons } from '../src/catalog.js';
import { figureFor } from '../src/figures.js';
import { gradingExercises } from '../server/grading-exercises.mjs';

const manuscriptURL = new URL('../content/c/02-variables-types.md', import.meta.url);
const gccAvailable = spawnSync('gcc', ['--version']).status === 0;

test('types lesson retains required headings and practice contract', () => {
  const lesson = lessons.find(item => item.id === 'c-types');
  assert.equal(lesson.figure, 'types-conversion');
  const headings = lesson.sections.map(section => section.heading).join(' ');
  for (const topic of ['단원 개요', '필요한 이유', '선수 지식', '학습 목표', '초기화', '대입', '표현 범위', '부동소수', '나눗셈', '변환', 'scanf', '완성 프로그램', '실행 결과', '흔한 오류', '중간 점검', '핵심 요약', '연습', '복습']) {
    assert.ok(headings.includes(topic), topic);
  }
  assert.equal(lesson.quiz.answer, 1);
  assert.equal(lesson.quiz.options[1], '3');
  assert.equal(lesson.challenge.id, 'c-types');
  assert.equal(lesson.challenge.input, '4 7');
  assert.equal(lesson.challenge.expected, '11');
  assert.match(lesson.challenge.starter, /scanf\("%d%d", &a, &b\) != 2/);
});

test('type conversion figure retains image semantics without executable markup', () => {
  const svg = figureFor('types-conversion');
  assert.match(svg, /role="img"/);
  assert.doesNotMatch(svg, /<script|animate|onload=/i);
});

test('types manuscript retains required learning headings', async () => {
  const text = await readFile(manuscriptURL, 'utf8');
  for (const heading of ['## 단원 개요', '## 필요한 이유', '## 선수 지식', '## 학습 목표', '## 핵심 이론', '## 정적 도식 읽기', '## 단계별 예제', '## 완성 프로그램 A', '## 완성 프로그램 B', '## 실행 결과', '## 왜 이런 결과가 나오는가', '## 흔한 오류', '## 중간 점검', '## 개념 확인 퀴즈', '## 핵심 요약', '## 기초 코딩 연습', '## 응용 연습', '## 도전 문제', '## Mini Project', '## 테스트와 풀이 개선', '## 복습 연결']) {
    assert.ok(text.includes(heading), heading);
  }
});

function program(text, id) {
  const match = text.match(new RegExp('## 완성 프로그램 ' + id + '[\\s\\S]*?```c\\n([\\s\\S]*?)```'));
  assert.ok(match, 'complete program ' + id);
  return match[1];
}

async function compile(t, sourceText) {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'codeweave-types-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const source = path.join(directory, 'types.c');
  const executable = path.join(directory, process.platform === 'win32' ? 'types.exe' : 'types');
  await writeFile(source, sourceText);
  const result = spawnSync('gcc', ['-std=c11', '-Wall', '-Wextra', '-Werror', '-Wpedantic', source, '-o', executable], { encoding: 'utf8', timeout: 10000 });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, '');
  return input => spawnSync(executable, [], { input, encoding: 'utf8', timeout: 2000 });
}

test('types arithmetic complete program matches both screen code and actual GCC output', { skip: !gccAvailable }, async t => {
  const text = await readFile(manuscriptURL, 'utf8');
  const source = program(text, 'A');
  const screen = lessons.find(item => item.id === 'c-types').sections.find(section => section.heading.includes('완성 프로그램'));
  assert.equal(screen.code.trim(), source.trim(), 'screen and manuscript example must not drift');
  const run = await compile(t, source);
  const result = run('');
  assert.equal(result.status, 0);
  assert.equal(result.stderr, '');
  assert.equal(result.stdout, 'count=4\ninteger=3 negative=-3 remainder=-1\nlate=3.0 early=3.5\ncast=-3\n');
});

test('types sum complete program passes every existing case and checks scanf conversion count', { skip: !gccAvailable }, async t => {
  const run = await compile(t, program(await readFile(manuscriptURL, 'utf8'), 'B'));
  for (const example of gradingExercises.get('c-types').cases) {
    const result = run(example.input);
    assert.equal(result.status, 0, example.input);
    assert.equal(result.stdout, example.expected + '\n', example.input);
    assert.equal(result.stderr, '');
  }
  for (const input of ['abc\n', '4\n', '']) {
    const result = run(input);
    assert.equal(result.status, 1, JSON.stringify(input));
    assert.equal(result.stdout, '');
  }
});
