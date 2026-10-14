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

const id = 'c-recursion-factorial';
const manuscriptURL = new URL('../content/c/20-recursion-factorial.md', import.meta.url);
const lesson = () => lessons.find(item => item.id === id);
const gccAvailable = spawnSync('gcc', ['--version']).status === 0;
const flags = ['-std=c11', '-Wall', '-Wextra', '-Werror', '-Wpedantic'];
const factorials = [1, 1, 2, 6, 24, 120, 720, 5040, 40320, 362880, 3628800, 39916800, 479001600];

test('recursion lesson has a bounded function contract and a full original learning path', () => {
  assert.ok(lesson());
  assert.equal(lesson().track, 'c');
  assert.ok(lesson().sections.length >= 20);
  assert.equal(lesson().figure, 'recursion-unwind');
  const text = lesson().sections.map(section => section.heading + '\n' + section.text).join('\n');
  for (const topic of ['단원 개요', '필요한 이유', '선수 지식', '학습 목표', '종료 조건', '진행 척도', '자동 객체', 'static', '13', 'ULONG_MAX', 'unsigned long', '꼬리 호출', '반복', '완성 프로그램 A', '완성 프로그램 B', '흔한 오류', '중간 점검', '핵심 요약', 'Mini Project', '복습', '재귀 사용을 증명하지']) assert.ok(text.includes(topic), topic);
  assert.deepEqual(exerciseById(id).prerequisites, ['c-clamp-function', 'c-pointer']);
  assert.equal(exerciseById(id).grader, 'c-function');
  assert.doesNotMatch(lesson().challenge.starter, /\bmain\s*\(/);
  assert.match(lesson().challenge.starter, /int factorial_checked\(unsigned int n, unsigned long \*out_value\)/);
  for (const topic of ['0..12', 'NULL', '보존', 'main', '출력']) assert.ok(lesson().challenge.description.includes(topic), topic);
});

test('recursion diagram uses readable static call and return snapshots rather than a physical stack promise', () => {
  const svg = figureFor('recursion-unwind');
  for (const label of ['role="img"', 'viewBox="0 0 340 460"', 'max-width:340px', 'n=3', 'n=2', 'n=1', 'n=0', 'return 1', '3 × 2 = 6', '물리 스택']) assert.ok(svg.includes(label), label);
  assert.doesNotMatch(svg, /<script|animate|onload=/i);
});

test('factorial grader enumerates every accepted n and rejects bounds/null while exercising repeated state', () => {
  const definition = gradingExercises.get(id);
  assert.ok(definition);
  assert.equal(definition.cases.length, 20);
  for (let n = 0; n <= 12; n++) {
    assert.deepEqual(definition.cases[n].args, [String(n)]);
    assert.equal(definition.cases[n].expected, `1 ${factorials[n]}`);
  }
  for (const topic of ['UINT_MAX', 'ULONG_MAX', 'NULL', '반복', '서로 다른']) assert.ok(definition.cases.map(example => example.input).join(' ').includes(topic), topic);
  assert.match(definition.harness, /int factorial_checked\(unsigned int n, unsigned long \*out_value\);/);
});

test('recursion manuscript contains the complete learning path and explicit numeric/resource limits', async () => {
  const text = await readFile(manuscriptURL, 'utf8');
  for (const topic of ['## 단원 개요', '## 필요한 이유', '## 선수 지식', '## 학습 목표', '## 정적 도식 읽기', '## 단계별 예제', '## 완성 프로그램 A', '## 완성 프로그램 B', '## 실행 결과', '## 왜 이런 결과가 나오는가', '## 흔한 오류', '## 중간 점검', '## 핵심 요약', '## 개념 확인', '## 기초 연습', '## 응용 연습', '## 도전 문제', '## Mini Project', '## 테스트 및 풀이 개선', '## 복습 연결', '4294967295', '479001600', '13개', '꼬리 호출', 'N1570']) assert.ok(text.includes(topic), topic);
});

async function compiled(t, code, harness = '') {
  const root = await mkdtemp(path.join(os.tmpdir(), 'codeweave-recursion-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const source = path.join(root, 'submission.c'), executable = path.join(root, 'program');
  await writeFile(source, code);
  const sources = [source];
  if (harness) {
    const harnessPath = path.join(root, 'harness.c');
    await writeFile(harnessPath, harness);
    sources.push(harnessPath);
  }
  const result = spawnSync('gcc', [...flags, ...sources, '-o', executable], { encoding: 'utf8', timeout: 10000 });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, '');
  return args => spawnSync(executable, args, { encoding: 'utf8', timeout: 2000 });
}

async function program(letter) {
  const text = await readFile(manuscriptURL, 'utf8');
  const match = text.match(new RegExp('## 완성 프로그램 ' + letter + '[\\s\\S]*?\x60\x60\x60c\n([\\s\\S]*?)\x60\x60\x60'));
  assert.ok(match, letter);
  assert.equal(lesson().sections.find(section => section.heading.includes('완성 프로그램 ' + letter)).code.trim(), match[1].trim());
  return match[1];
}

test('recursive complete program matches screen and prints independent successes and preserved failures', { skip: !gccAvailable }, async t => {
  const run = await compiled(t, await program('A'));
  const result = run([]);
  assert.equal(result.status, 0);
  assert.equal(result.stderr, '');
  assert.equal(result.stdout, 'n=5 status=1 value=120\nn=0 status=1 value=1\nn=12 status=1 value=479001600\nn=13 status=0 value=479001600\nNULL status=0\n');
});

test('call-local observation program matches screen and records descent before reverse returns', { skip: !gccAvailable }, async t => {
  const run = await compiled(t, await program('B'));
  const result = run([]);
  assert.equal(result.status, 0);
  assert.equal(result.stderr, '');
  assert.equal(result.stdout, 'enter 3\nenter 2\nenter 1\nenter 0\nleave 0 = 1\nleave 1 = 1\nleave 2 = 2\nleave 3 = 6\nresult = 6\n');
});

test('reference function links separately and passes all 20 actual GCC harness cases', { skip: !gccAvailable }, async t => {
  const code = (await program('A')).split('\nint main(void)')[0];
  const definition = gradingExercises.get(id);
  const run = await compiled(t, code, definition.harness);
  for (const example of definition.cases) {
    const result = run(example.args);
    assert.equal(result.status, 0, example.input);
    assert.equal(result.stderr, '', example.input);
    assert.equal(result.stdout.trim(), example.expected, example.input);
  }
});

test('starter compiles without main but does not pretend to solve the contract', { skip: !gccAvailable }, async t => {
  const definition = gradingExercises.get(id);
  const run = await compiled(t, lesson().challenge.starter, definition.harness);
  const result = run(['5']);
  assert.equal(result.status, 0);
  assert.notEqual(result.stdout.trim(), definition.cases[5].expected);
});
