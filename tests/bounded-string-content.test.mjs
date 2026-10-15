import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { lessons } from '../src/catalog.js';
import { figureFor } from '../src/figures.js';

test('bounded string lesson retains a direct-call interface without main', () => {
  const lesson = lessons.find(item => item.id === 'c-bounded-string-length');
  assert.ok(lesson);
  assert.equal(lesson.figure, 'bounded-string-contract');
  assert.doesNotMatch(lesson.challenge.starter, /main\s*\(/);
  assert.match(lesson.challenge.starter, /int bounded_length\(const char \*buffer, size_t capacity, size_t \*out_length\)/);
});

test('bounded string figure retains image semantics without executable markup', () => {
  const svg = figureFor('bounded-string-contract');
  assert.match(svg, /role="img"/);
  assert.doesNotMatch(svg, /<script|animate|onload=/i);
});

test('bounded string manuscript retains required learning headings', async () => {
  const manuscript = await readFile(new URL('../content/c/09-bounded-string-length.md', import.meta.url), 'utf8');
  for (const heading of ['## 단원 개요', '## 선수 지식', '## 학습 목표', '## 핵심 이론', '## 단계별 예제', '## 실행 결과', '## 흔한 오류', '## 중간 점검', '## 핵심 요약', '## 기초 코딩 연습', '## 응용 연습', '## 도전 문제', '## Mini Project', '## 테스트와 풀이 개선', '## 복습 연결']) {
    assert.ok(manuscript.includes(heading), heading);
  }
});
