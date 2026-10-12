import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { lessons } from '../src/catalog.js';
import { figureFor } from '../src/figures.js';

test('structure array search lesson connects count, member access and first-match policy', () => {
  const lesson = lessons.find(item => item.id === 'c-struct-array-search');
  assert.ok(lesson);
  assert.equal(lesson.figure, 'struct-array-search');
  assert.ok(lesson.sections.length >= 11);
  const text = lesson.sections.map(section => `${section.heading} ${section.text}`).join('\n');
  for (const concept of ['students[i].id', '[0, count)', '첫 번째', '배열 매개변수', '출력 객체', 'O(n)']) {
    assert.match(text, new RegExp(concept.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
  assert.match(lesson.challenge.starter, /int find_student_index\(const struct Student students\[\], size_t count, int target_id, size_t \*out_index\)/);
  assert.doesNotMatch(lesson.challenge.starter, /int main\s*\(/);
});

test('structure array search figure is static and marks first match and preserved failure', () => {
  const svg = figureFor('struct-array-search');
  assert.match(svg, /role="img"/);
  assert.match(svg, /target_id = 205/);
  assert.match(svg, /첫 일치.*index = 1/);
  assert.match(svg, /실패.*출력 보존/);
  assert.doesNotMatch(svg, /<script|animate|onload=/i);
});

test('structure array search manuscript contains the complete original learning path', async () => {
  const manuscript = await readFile(new URL('../content/c/13-struct-array-search.md', import.meta.url), 'utf8');
  for (const heading of ['## 단원 개요', '## 선수 지식', '## 학습 목표', '## 핵심 이론', '## 단계별 예제', '## 실행 결과', '## 흔한 오류', '## 중간 점검', '## 핵심 요약', '## 기초 코딩 연습', '## 응용 연습', '## 도전 문제', '## Mini Project', '## 테스트와 풀이 개선', '## 복습 연결']) {
    assert.ok(manuscript.includes(heading), heading);
  }
  assert.match(manuscript, /sizeof students[\s\S]*포인터/);
  assert.match(manuscript, /중복[\s\S]*첫 번째/);
  assert.match(manuscript, /실패[\s\S]*출력 객체[\s\S]*보존/);
  assert.match(manuscript, /완성 프로그램/);
});
