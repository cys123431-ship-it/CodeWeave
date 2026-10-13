import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { lessons } from '../src/catalog.js';
import { figureFor } from '../src/figures.js';

test('structure binary search lesson connects sorted input, half-open bounds and first match', () => {
  const lesson = lessons.find(item => item.id === 'c-struct-array-binary-search');
  assert.ok(lesson);
  assert.equal(lesson.figure, 'struct-array-binary-search');
  assert.ok(lesson.sections.length >= 11);
  const text = lesson.sections.map(section => `${section.heading} ${section.text}`).join('\n');
  for (const concept of ['정렬 전제', '[left, right)', 'left + (right - left) / 2', '첫 위치', 'O(log n)', '출력값을 보존']) {
    assert.ok(text.includes(concept), concept);
  }
  assert.match(lesson.challenge.starter, /int find_first_student_by_id\(const struct Student students\[\], size_t count, int target_id, size_t \*out_index\)/);
  assert.doesNotMatch(lesson.challenge.starter, /int main\s*\(/);
});

test('structure binary search figure is static and narrows toward the first duplicate', () => {
  const svg = figureFor('struct-array-binary-search');
  assert.match(svg, /role="img"/);
  assert.match(svg, /\[left, right\)/);
  assert.match(svg, /7:A.*7:B.*7:C/);
  assert.match(svg, /첫 위치 1/);
  assert.doesNotMatch(svg, /<script|animate|onload=/i);
});

test('structure binary search manuscript contains the complete original learning path', async () => {
  const manuscript = await readFile(new URL('../content/c/15-struct-array-binary-search.md', import.meta.url), 'utf8');
  for (const heading of ['## 단원 개요', '## 선수 지식', '## 학습 목표', '## 핵심 이론', '## 단계별 예제', '## 실행 결과', '## 흔한 오류', '## 중간 점검', '## 핵심 요약', '## 기초 코딩 연습', '## 응용 연습', '## 도전 문제', '## Mini Project', '## 테스트와 풀이 개선', '## 복습 연결']) {
    assert.ok(manuscript.includes(heading), heading);
  }
  assert.match(manuscript, /정렬되지 않은 배열[\s\S]*보장/);
  assert.match(manuscript, /첫 위치[\s\S]*right = mid/);
  assert.match(manuscript, /완성 프로그램/);
});
