import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { lessons } from '../src/catalog.js';
import { figureFor } from '../src/figures.js';

test('stable structure sort lesson connects whole-record movement and equal-key order', () => {
  const lesson = lessons.find(item => item.id === 'c-struct-array-sort');
  assert.ok(lesson);
  assert.equal(lesson.figure, 'struct-array-sort');
  assert.ok(lesson.sections.length >= 11);
  const text = lesson.sections.map(section => `${section.heading} ${section.text}`).join('\n');
  for (const concept of ['안정 정렬', '구조체 전체', 'students[j - 1].id > key.id', 'count == 0', 'O(n²)', 'INT_MIN']) {
    assert.match(text, new RegExp(concept.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
  assert.match(lesson.challenge.starter, /int stable_sort_students_by_id\(struct Student students\[\], size_t count\)/);
  assert.doesNotMatch(lesson.challenge.starter, /int main\s*\(/);
});

test('stable structure sort figure is static and preserves duplicate order', () => {
  const svg = figureFor('struct-array-sort');
  assert.match(svg, /role="img"/);
  assert.match(svg, /205:A.*205:B/);
  assert.match(svg, /엄격한 &gt;/);
  assert.match(svg, /101.*205:A.*205:B/);
  assert.doesNotMatch(svg, /<script|animate|onload=/i);
});

test('stable structure sort manuscript contains the complete original learning path', async () => {
  const manuscript = await readFile(new URL('../content/c/14-struct-array-sort.md', import.meta.url), 'utf8');
  for (const heading of ['## 단원 개요', '## 선수 지식', '## 학습 목표', '## 핵심 이론', '## 단계별 예제', '## 실행 결과', '## 흔한 오류', '## 중간 점검', '## 핵심 요약', '## 기초 코딩 연습', '## 응용 연습', '## 도전 문제', '## Mini Project', '## 테스트와 풀이 개선', '## 복습 연결']) {
    assert.ok(manuscript.includes(heading), heading);
  }
  assert.match(manuscript, /안정 정렬[\s\S]*같은 학번/);
  assert.match(manuscript, /구조체 전체[\s\S]*대입/);
  assert.match(manuscript, /빼기[\s\S]*오버플로/);
  assert.match(manuscript, /완성 프로그램/);
});
