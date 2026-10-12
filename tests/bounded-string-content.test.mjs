import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { lessons } from '../src/catalog.js';
import { figureFor } from '../src/figures.js';

test('bounded string lesson connects readable capacity, terminator search and fgets', () => {
  const lesson = lessons.find(item => item.id === 'c-bounded-string-length');
  assert.ok(lesson);
  assert.equal(lesson.figure, 'bounded-string-contract');
  assert.ok(lesson.sections.length >= 11);
  const text = lesson.sections.map(section => `${section.heading} ${section.text}`).join('\n');
  for (const concept of ['[0, capacity)', '읽기 가능한', '종료 문자', '출력 보존', 'fgets', '개행 문자', 'NULL']) {
    assert.match(text, new RegExp(concept.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
  assert.doesNotMatch(lesson.challenge.starter, /main\s*\(/);
  assert.match(lesson.challenge.starter, /int bounded_length\(const char \*buffer, size_t capacity, size_t \*out_length\)/);
});

test('bounded string figure is static and distinguishes the exact capacity boundary', () => {
  const svg = figureFor('bounded-string-contract');
  assert.match(svg, /role="img"/);
  assert.match(svg, /\[0, capacity\)/);
  assert.match(svg, /capacity = 4/);
  assert.match(svg, /capacity = 3/);
  assert.match(svg, /성공/);
  assert.match(svg, /실패/);
  assert.doesNotMatch(svg, /<script|animate|onload=/i);
});

test('bounded string manuscript contains the complete original learning path', async () => {
  const manuscript = await readFile(new URL('../content/c/09-bounded-string-length.md', import.meta.url), 'utf8');
  for (const heading of ['## 단원 개요', '## 선수 지식', '## 학습 목표', '## 핵심 이론', '## 단계별 예제', '## 실행 결과', '## 흔한 오류', '## 중간 점검', '## 핵심 요약', '## 기초 코딩 연습', '## 응용 연습', '## 도전 문제', '## Mini Project', '## 테스트와 풀이 개선', '## 복습 연결']) {
    assert.ok(manuscript.includes(heading), heading);
  }
  assert.match(manuscript, /호출자는 `buffer`부터 `capacity`개의 `char` 객체가 읽기 가능함을 보장/);
  assert.match(manuscript, /fgets[^\n]*성공하면/);
  assert.match(manuscript, /종료 문자가 범위 안에 없으면/);
});
