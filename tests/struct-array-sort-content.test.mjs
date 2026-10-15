import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { lessons } from '../src/catalog.js';
import { figureFor } from '../src/figures.js';

test('struct-array-sort lesson retains its starter interface', () => {
  const lesson = lessons.find(item => item.id === 'c-struct-array-sort');
  assert.ok(lesson);
  assert.equal(lesson.figure, 'struct-array-sort');
  assert.match(lesson.challenge.starter, /int stable_sort_students_by_id\(struct Student students\[\], size_t count\)/);
  assert.doesNotMatch(lesson.challenge.starter, /int main\s*\(/);
});

test('struct-array-sort figure retains image semantics without executable markup', () => {
  const svg = figureFor('struct-array-sort');
  assert.match(svg, /role="img"/);
  assert.doesNotMatch(svg, /<script|animate|onload=/i);
});

test('struct-array-sort manuscript retains required learning headings', async () => {
  const manuscript = await readFile(new URL('../content/c/14-struct-array-sort.md', import.meta.url), 'utf8');
  for (const heading of ['## 단원 개요', '## 선수 지식', '## 학습 목표', '## 핵심 이론', '## 단계별 예제', '## 실행 결과', '## 흔한 오류', '## 중간 점검', '## 핵심 요약', '## 기초 코딩 연습', '## 응용 연습', '## 도전 문제', '## Mini Project', '## 테스트와 풀이 개선', '## 복습 연결']) {
    assert.ok(manuscript.includes(heading), heading);
  }
});
