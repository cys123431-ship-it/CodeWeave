import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { lessons } from '../src/catalog.js';
import { figureFor } from '../src/figures.js';

test('first C program lesson connects the full build and execution contract', () => {
  const lesson = lessons.find(item => item.id === 'c-hello');
  assert.ok(lesson);
  assert.equal(lesson.figure, 'hello-build-pipeline');
  assert.ok(lesson.sections.length >= 12, 'the first lesson must be more than a short sample');

  const headings = lesson.sections.map(section => section.heading).join(' ');
  for (const topic of ['단원 개요', '필요한 이유', '선수 지식', '학습 목표', '전처리', '번역', '링크', 'main', '문자열', '실행 결과', '흔한 오류', '중간 점검', '핵심 요약', '연습', '복습']) {
    assert.match(headings, new RegExp(topic), topic);
  }

  const text = lesson.sections.map(section => `${section.heading} ${section.text}`).join('\n');
  for (const concept of ['int main(void)', 'return 0', 'C99', 'printf', '음수', '문자열 리터럴', '정의되지 않은 동작', '목적 파일']) {
    assert.ok(text.includes(concept), concept);
  }
  assert.equal(lesson.challenge.id, 'c-hello');
  assert.match(lesson.challenge.starter, /int main\(void\)/);
  assert.equal(lesson.challenge.expected, 'Hello, CodeWeave!');
});

test('hello build figure is static and separates translation, linking and execution', () => {
  const svg = figureFor('hello-build-pipeline');
  assert.match(svg, /^<svg/);
  for (const label of ['hello.c', '전처리', '번역', '목적 파일', '링크', '실행', '종료 상태']) {
    assert.match(svg, new RegExp(label));
  }
  assert.doesNotMatch(svg, /<script|animate|onload=/i);
});

test('hello manuscript contains the complete original learning path and C boundaries', async () => {
  const manuscript = await readFile(new URL('../content/c/01-hello.md', import.meta.url), 'utf8');
  for (const heading of ['## 단원 개요', '## 필요한 이유', '## 선수 지식', '## 학습 목표', '## 핵심 이론', '## 정적 도식 읽기', '## 단계별 예제', '## 완성 프로그램', '## 실행 결과', '## 왜 이런 결과가 나오는가', '## 흔한 오류', '## 중간 점검', '## 개념 확인 퀴즈', '## 핵심 요약', '## 기초 코딩 연습', '## 응용 연습', '## 도전 문제', '## Mini Project', '## 테스트와 풀이 개선', '## 복습 연결']) {
    assert.ok(manuscript.includes(heading), heading);
  }
  assert.match(manuscript, /int main\(void\)/);
  assert.match(manuscript, /C99[\s\S]*return 0/);
  assert.match(manuscript, /printf[\s\S]*음수[\s\S]*출력 오류/);
  assert.match(manuscript, /문자열 리터럴[\s\S]*수정[\s\S]*정의되지 않은 동작/);
  assert.match(manuscript, /전처리[\s\S]*목적 파일[\s\S]*링크/);
});

test('hello manuscript complete program compiles cleanly and produces its stated output', { skip: spawnSync('gcc', ['--version']).status !== 0 }, async t => {
  const manuscript = await readFile(new URL('../content/c/01-hello.md', import.meta.url), 'utf8');
  const match = manuscript.match(/## 완성 프로그램[\s\S]*?```c\n([\s\S]*?)```/);
  assert.ok(match, 'a fenced complete C program must follow the complete-program heading');

  const directory = await mkdtemp(path.join(os.tmpdir(), 'codeweave-hello-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const source = path.join(directory, 'hello.c');
  const executable = path.join(directory, process.platform === 'win32' ? 'hello.exe' : 'hello');
  await writeFile(source, match[1]);

  const compiled = spawnSync('gcc', ['-std=c11', '-Wall', '-Wextra', '-Werror', '-Wpedantic', source, '-o', executable], { encoding: 'utf8' });
  assert.equal(compiled.status, 0, compiled.stderr);
  assert.equal(compiled.stderr, '');

  const executed = spawnSync(executable, [], { encoding: 'utf8' });
  assert.equal(executed.status, 0, executed.stderr);
  assert.equal(executed.stdout, 'Hello, CodeWeave!\n');
});
