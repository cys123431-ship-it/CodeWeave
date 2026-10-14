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

const manuscriptURL = new URL('../content/c/06-functions.md', import.meta.url);
const gccAvailable = spawnSync('gcc', ['--version']).status === 0;
const original = {"challenge":{"id":"c-functions","title":"범위 제한 함수 clamp 구현","description":"정수 value, low, high를 입력받아 low <= high일 때 value를 [low, high] 범위로 제한하세요. int clamp(int value, int low, int high)를 구현하고 main에서 호출해야 합니다. 범위 안 값은 그대로, 하한보다 작으면 low, 상한보다 크면 high를 출력합니다.","starter":"#include <stdio.h>\n\nint clamp(int value, int low, int high);\n\nint main(void) {\n    int value, low, high;\n    if (scanf(\"%d%d%d\", &value, &low, &high) != 3) return 1;\n    printf(\"%d\\n\", clamp(value, low, high));\n    return 0;\n}\n\nint clamp(int value, int low, int high) {\n    // TODO: value를 [low, high] 범위로 제한해 반환하세요.\n    return value;\n}","input":"15 0 10","expected":"10"},"quiz":{"question":"함수 원형(prototype)의 가장 중요한 역할은?","options":["호출하기 전에 함수의 이름·매개변수·반환형을 컴파일러에 알린다","함수의 지역 변수를 프로그램이 끝날 때까지 유지한다","함수의 실행 결과를 자동으로 출력한다","모든 입력값이 유효한지 자동으로 검사한다"],"answer":0,"explanation":"원형은 컴파일러가 호출 식의 인수와 반환형을 검사할 수 있게 하는 자료형 계약입니다."},"prerequisites":["c-loops","c-pointer"],"cases":[{"input":"5 0 10\n","expected":"5","args":[]},{"input":"-3 0 10\n","expected":"0","args":[]},{"input":"15 0 10\n","expected":"10","args":[]},{"input":"-20 -10 -1\n","expected":"-10","args":[]},{"input":"-1 -10 -1\n","expected":"-1","args":[]},{"input":"5 5 5\n","expected":"5","args":[]}]};
const lesson = () => lessons.find(item => item.id === 'c-functions');

test('function lesson separates declaration, scope, storage duration and call state', () => {
  assert.equal(lesson().figure, 'function-scope-duration');
  assert.ok(lesson().sections.length >= 20);
  const headings = lesson().sections.map(section => section.heading).join(' ');
  for (const topic of ['단원 개요', '필요한 이유', '선수 지식', '학습 목표', '선언', '지역 변수', '가림', '저장기간', 'static', '호출', '완성 프로그램 A', '완성 프로그램 B', '완성 프로그램 C', '흔한 오류', '중간 점검', '핵심 요약', '연습', '복습']) assert.ok(headings.includes(topic), topic);
  const text = lesson().sections.map(section => section.text).join('\n');
  for (const topic of ['C11', 'int f(void)', 'int f()', '범위', '저장기간', '연결', '스택', '상수 식', '값 전달', 'low <= high', '재귀', 'fgets', 'strtol']) assert.ok(text.includes(topic), topic);
});

test('function lesson retains the whole challenge, quiz, prerequisites and six grading cases', () => {
  assert.deepEqual(lesson().challenge, original.challenge);
  assert.deepEqual(lesson().quiz, original.quiz);
  assert.deepEqual(exerciseById('c-functions').prerequisites, original.prerequisites);
  assert.deepEqual(gradingExercises.get('c-functions').cases, original.cases);
});

test('function scope diagram uses explicit code in readable stacked snapshots', () => {
  const svg = figureFor('function-scope-duration');
  for (const label of ['role="img"', 'int age = 15;', 'int age = 30;', '출력 30', '출력 15', '가려짐', '같은 이름', 'viewBox="0 0 340 480"', 'max-width:340px']) assert.ok(svg.includes(label), label);
  assert.doesNotMatch(svg, /<script|animate|onload=/i);
});

test('function manuscript contains full learning sections and removes the obsolete multi-file claim', async () => {
  const text = await readFile(manuscriptURL, 'utf8');
  for (const topic of ['## 단원 개요', '## 필요한 이유', '## 선수 지식', '## 학습 목표', '## 정적 도식 읽기', '## 단계별 예제', '## 완성 프로그램 A', '## 완성 프로그램 B', '## 완성 프로그램 C', '## 실행 결과', '## 왜 이런 결과가 나오는가', '## 흔한 오류', '## 중간 점검', '## 핵심 요약', '## 개념 확인', '## 기초 연습', '## 응용 연습', '## 도전 문제', '## Mini Project', '## 테스트 및 풀이 개선', '## 복습 연결', '상수 식', '저장기간', '스택', 'N1570']) assert.ok(text.includes(topic), topic);
  assert.doesNotMatch(text, /다중 파일형 채점은 별도의 인터페이스와 테스트 격리를 갖춘 뒤 확장/);
});

async function directory(t) {
  const result = await mkdtemp(path.join(os.tmpdir(), 'codeweave-functions-'));
  t.after(() => rm(result, { recursive: true, force: true }));
  return result;
}

const flags = ['-std=c11', '-Wall', '-Wextra', '-Werror', '-Wpedantic'];
async function compile(t, id) {
  const text = await readFile(manuscriptURL, 'utf8');
  const match = text.match(new RegExp('## 완성 프로그램 ' + id + '[\\s\\S]*?\\x60\\x60\\x60c\\n([\\s\\S]*?)\\x60\\x60\\x60'));
  assert.ok(match, 'complete program ' + id);
  const screen = lesson().sections.find(section => section.heading.includes('완성 프로그램 ' + id));
  assert.equal(screen.code.trim(), match[1].trim());
  const root = await directory(t), source = path.join(root, 'program.c'), executable = path.join(root, 'program');
  await writeFile(source, match[1]);
  const result = spawnSync('gcc', [...flags, source, '-o', executable], { encoding: 'utf8', timeout: 10000 });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, '');
  return input => spawnSync(executable, [], { input, encoding: 'utf8', timeout: 2000 });
}

test('function clamp program matches screen and passes original and deterministic boundary cases', { skip: !gccAvailable }, async t => {
  const run = await compile(t, 'A');
  for (const example of original.cases) {
    const result = run(example.input);
    assert.equal(result.status, 0);
    assert.equal(result.stdout, example.expected + '\n');
    assert.equal(result.stderr, '');
  }
  let checked = 0;
  for (const low of [-9, -1, 0, 1, 9]) for (const high of [-9, -1, 0, 1, 9]) {
    if (low > high) continue;
    for (let value = -12; value <= 12; value++) {
      const result = run(value + ' ' + low + ' ' + high + '\n');
      assert.equal(result.status, 0);
      assert.equal(result.stdout, Math.min(high, Math.max(low, value)) + '\n');
      checked++;
    }
  }
  assert.equal(checked, 375);
  for (const input of ['abc\n', '', '15 0\n']) {
    const result = run(input);
    assert.equal(result.status, 1);
    assert.equal(result.stdout, '');
  }
});

test('function scope program observes hidden outer names and fresh versus persistent objects', { skip: !gccAvailable }, async t => {
  const result = (await compile(t, 'B'))('');
  assert.equal(result.status, 0);
  assert.equal(result.stderr, '');
  assert.equal(result.stdout, 'outer=15\ninner=30\nafter=15\nfresh=1 persistent=1\nfresh=1 persistent=2\n');
});

test('function copy program separates returned value from caller mutation through a copied pointer', { skip: !gccAvailable }, async t => {
  const result = (await compile(t, 'C'))('');
  assert.equal(result.status, 0);
  assert.equal(result.stderr, '');
  assert.equal(result.stdout, 'returned=30 caller=15\ncaller=30\n');
});

test('function-only code fragments compile as objects without pretending to be complete programs', { skip: !gccAvailable }, async t => {
  const root = await directory(t);
  const fragments = lesson().sections.filter(section => section.code && !section.heading.includes('완성 프로그램'));
  assert.equal(fragments.length, 2);
  const manuscript = await readFile(manuscriptURL, 'utf8');
  for (let i = 0; i < fragments.length; i++) {
    assert.ok(manuscript.includes(fragments[i].code), 'fragment source matches manuscript');
    const source = path.join(root, 'fragment-' + i + '.c');
    await writeFile(source, fragments[i].code);
    const result = spawnSync('gcc', [...flags, '-c', source, '-o', path.join(root, 'fragment-' + i + '.o')], { encoding: 'utf8', timeout: 10000 });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stderr, '');
  }
});

test('function scope and declaration constraints fail before execution', { skip: !gccAvailable }, async t => {
  const root = await directory(t);
  const examples = [
    'int limit(int value);\ndouble limit(int value){return value;}\n',
    'int main(void){{int hidden=7;(void)hidden;}return hidden;}\n',
    'int make(void){return 3;}\nint total=make();\nint main(void){return total;}\n'
  ];
  for (let i = 0; i < examples.length; i++) {
    const source = path.join(root, 'invalid-' + i + '.c');
    await writeFile(source, examples[i]);
    const result = spawnSync('gcc', [...flags, '-c', source, '-o', path.join(root, 'invalid-' + i + '.o')], { encoding: 'utf8', timeout: 10000 });
    assert.notEqual(result.status, 0);
    assert.ok(result.stderr.length > 0);
  }
});

test('visible prototype can compile an object while absent definition still fails the link', { skip: !gccAvailable }, async t => {
  const root = await directory(t), source = path.join(root, 'missing.c'), object = path.join(root, 'missing.o');
  await writeFile(source, 'int missing(int value);\nint main(void){return missing(7);}\n');
  const compiled = spawnSync('gcc', [...flags, '-c', source, '-o', object], { encoding: 'utf8', timeout: 10000 });
  assert.equal(compiled.status, 0, compiled.stderr);
  assert.equal(compiled.stderr, '');
  const linked = spawnSync('gcc', [object, '-o', path.join(root, 'missing')], { encoding: 'utf8', timeout: 10000 });
  assert.notEqual(linked.status, 0);
  assert.ok(linked.stderr.length > 0);
});
