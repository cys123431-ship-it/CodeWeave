import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { lessons } from '../src/catalog.js';
import { figureFor } from '../src/figures.js';

test('string function lesson connects terminators, bounds and a direct-call contract', () => {
  const lesson = lessons.find(item => item.id === 'c-string-count-function');
  assert.ok(lesson);
  assert.equal(lesson.figure, 'string-terminator-contract');
  assert.ok(lesson.sections.length >= 10);
  const text = lesson.sections.map(section => `${section.heading} ${section.text}`).join('\n');
  for (const concept of ['널 종료', "'\\0'", '문자 배열', '문자열 리터럴', '정의되지 않은 동작', 'const', 'out_count']) {
    assert.match(text, new RegExp(concept.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
  assert.doesNotMatch(lesson.challenge.starter, /main\s*\(/);
  assert.match(lesson.challenge.starter, /int count_char\(const char \*text, char target, size_t \*out_count\)/);
});

test('string terminator figure is static and marks scan boundary and count output', () => {
  const svg = figureFor('string-terminator-contract');
  assert.match(svg, /role="img"/);
  assert.match(svg, /\\0/);
  assert.match(svg, /여기서 중지/);
  assert.match(svg, /out_count/);
  assert.doesNotMatch(svg, /<script|animate|onload=/i);
});

test('string manuscript contains the complete original learning path', async () => {
  const manuscript = await readFile(new URL('../content/c/08-strings-count-function.md', import.meta.url), 'utf8');
  for (const heading of ['## 단원 개요', '## 선수 지식', '## 학습 목표', '## 핵심 이론', '## 단계별 예제', '## 실행 결과', '## 흔한 오류', '## 중간 점검', '## 핵심 요약', '## 기초 코딩 연습', '## 응용 연습', '## 도전 문제', '## Mini Project', '## 테스트와 풀이 개선', '## 복습 연결']) {
    assert.ok(manuscript.includes(heading), heading);
  }
  assert.match(manuscript, /종료 문자를 찾기 전에 읽을 수 있는 객체가 끝나면 정의되지 않은 동작/);
  assert.match(manuscript, /문자열 리터럴을 수정/);
});
