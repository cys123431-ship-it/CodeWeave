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

const manuscriptURL = new URL('../content/c/05-pointers.md', import.meta.url);
const gccAvailable = spawnSync('gcc', ['--version']).status === 0;
const oldStarter = '#include <stdio.h>\n\nvoid add_one(int *value) {\n    // TODO: 포인터로 가리키는 값을 1 증가시키세요.\n}\n\nint main(void) {\n    int n;\n    if (scanf("%d", &n) != 1) return 1;\n    add_one(&n);\n    printf("%d\\n", n);\n    return 0;\n}';

test('pointer introduction separates pointer objects, referents, aliases, lifetime and array bounds', () => {
  const lesson = lessons.find(item => item.id === 'c-pointer');
  assert.equal(lesson.figure, 'pointer-alias-contract');
  assert.ok(lesson.sections.length >= 20);
  const headings = lesson.sections.map(section => section.heading).join(' ');
  for (const topic of ['단원 개요', '필요한 이유', '선수 지식', '학습 목표', '주소', '역참조', '초기화', 'NULL', '수명', '별칭', '배열', 'sizeof', '호출자', '완성 프로그램 A', '완성 프로그램 B', '완성 프로그램 C', '흔한 오류', '중간 점검', '핵심 요약', '연습', '복습']) assert.ok(headings.includes(topic), topic);
  const text = lesson.sections.map(section => section.text).join('\n');
  for (const concept of ['포인터도 값 전달', 'NULL 검사만', 'p++', '(*p)++', '%p', 'INT_MAX', 'fgets', 'strtol']) assert.ok(text.includes(concept), concept);
});

test('pointer practice identity, starter, quiz, prerequisites and all five grading cases are preserved', () => {
  const lesson = lessons.find(item => item.id === 'c-pointer');
  assert.equal(lesson.quiz.answer, 1);
  assert.equal(lesson.quiz.options[1], '8');
  assert.equal(lesson.challenge.id, 'c-pointer');
  assert.equal(lesson.challenge.starter, oldStarter);
  assert.equal(lesson.challenge.input, '7');
  assert.equal(lesson.challenge.expected, '8');
  assert.deepEqual(exerciseById('c-pointer').prerequisites, ['c-types']);
  assert.deepEqual(gradingExercises.get('c-pointer').cases.map(({ input, expected }) => [input, expected]), [['7\n','8'],['-4\n','-3'],['0\n','1'],['9999\n','10000'],['-10000\n','-9999']]);
});

test('pointer alias figure contrasts changing a referent with reassigning one pointer', () => {
  const svg = figureFor('pointer-alias-contract');
  for (const label of ['role="img"', '시점 A', '시점 B', 'p', 'alias', 'value=8', 'other=21', '재대입', '그대로']) assert.ok(svg.includes(label), label);
  assert.doesNotMatch(svg, /<script|animate|onload=/i);
});

test('pointer manuscript contains original textbook sections and does not equate non-null with validity', async () => {
  const text = await readFile(manuscriptURL, 'utf8');
  for (const heading of ['## 단원 개요', '## 필요한 이유', '## 선수 지식', '## 학습 목표', '## 핵심 이론', '## 정적 도식 읽기', '## 단계별 예제', '## 완성 프로그램 A', '## 완성 프로그램 B', '## 완성 프로그램 C', '## 실행 결과', '## 왜 이런 결과가 나오는가', '## 흔한 오류', '## 중간 점검', '## 개념 확인 퀴즈', '## 핵심 요약', '## 기초 코딩 연습', '## 응용 연습', '## 도전 문제', '## Mini Project', '## 테스트와 풀이 개선', '## 복습 연결']) assert.ok(text.includes(heading), heading);
  for (const concept of ['NULL 검사만', '수명', '별칭', '포인터도 값 전달', 'sizeof', 'void *', 'INT_MAX', '정의되지 않은 동작', 'N1570']) assert.ok(text.includes(concept), concept);
});

function program(text, id) {
  const match = text.match(new RegExp('## 완성 프로그램 ' + id + '[\\s\\S]*?```c\\n([\\s\\S]*?)```'));
  assert.ok(match, 'complete program ' + id);
  return match[1];
}

async function compile(t, id) {
  const sourceText = program(await readFile(manuscriptURL, 'utf8'), id);
  const screen = lessons.find(item => item.id === 'c-pointer').sections.find(section => section.heading.includes('완성 프로그램 ' + id));
  assert.equal(screen.code.trim(), sourceText.trim());
  const directory = await mkdtemp(path.join(os.tmpdir(), 'codeweave-pointers-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const source = path.join(directory, 'pointers.c');
  const executable = path.join(directory, process.platform === 'win32' ? 'pointers.exe' : 'pointers');
  await writeFile(source, sourceText);
  const result = spawnSync('gcc', ['-std=c11', '-Wall', '-Wextra', '-Werror', '-Wpedantic', source, '-o', executable], { encoding: 'utf8', timeout: 10000 });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, '');
  return input => spawnSync(executable, [], { input, encoding: 'utf8', timeout: 2000 });
}

test('pointer alias program compiles and observes values without hardcoding address representation', { skip: !gccAvailable }, async t => {
  const result = (await compile(t, 'A'))('');
  assert.equal(result.status, 0);
  assert.match(result.stdout, /^address=[^\n]+\nvalue=8 p=8 alias=8\nvalue=8 other=21 alias=8\n$/);
  assert.equal(result.stderr, '');
});

test('pointer increment program compiles and passes the unchanged input contract and safe failure examples', { skip: !gccAvailable }, async t => {
  const run = await compile(t, 'B');
  for (const example of gradingExercises.get('c-pointer').cases) {
    const result = run(example.input);
    assert.equal(result.status, 0, example.input);
    assert.equal(result.stdout, example.expected + '\n', example.input);
    assert.equal(result.stderr, '');
  }
  for (const n of [-9999, -1, 1, 9998]) {
    const result = run(n + '\n');
    assert.equal(result.status, 0);
    assert.equal(result.stdout, (n + 1) + '\n');
  }
  for (const input of ['-10001\n', '10000\n', 'abc\n', '']) {
    const result = run(input);
    assert.equal(result.status, 1, JSON.stringify(input));
    assert.equal(result.stdout, '');
  }
});

test('pointer status program compiles and rejects NULL and INT_MAX before modifying the object', { skip: !gccAvailable }, async t => {
  const result = (await compile(t, 'C'))('');
  assert.equal(result.status, 0);
  assert.equal(result.stdout, 'normal=1 value=8\nlimit=0 preserved=1\nnull=0\n');
  assert.equal(result.stderr, '');
});
