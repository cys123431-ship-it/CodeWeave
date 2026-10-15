import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { lessons } from '../src/catalog.js';
import { figureFor } from '../src/figures.js';

test('dynamic-memory lesson retains its starter interface', () => {
  const lesson = lessons.find(item => item.id === 'c-dynamic-student-array');
  assert.ok(lesson);
  assert.equal(lesson.figure, 'dynamic-student-array');
  assert.match(lesson.challenge.starter, /int create_students\(size_t count, int initial_score, struct Student \*\*out_students\)/);
  assert.match(lesson.challenge.starter, /void destroy_students\(struct Student \*\*students\)/);
  assert.doesNotMatch(lesson.challenge.starter, /int main\s*\(/);
});

test('dynamic-memory figure retains image semantics without executable markup', () => {
  const svg = figureFor('dynamic-student-array');
  assert.match(svg, /role="img"/);
  assert.doesNotMatch(svg, /<script|animate|onload=/i);
});

test('dynamic-memory manuscript retains required learning headings', async () => {
  const manuscript = await readFile(new URL('../content/c/17-dynamic-student-array.md', import.meta.url), 'utf8');
  for (const heading of ['## 단원 개요', '## 선수 지식', '## 학습 목표', '## 핵심 이론', '## 단계별 예제', '## 실행 결과', '## 흔한 오류', '## 중간 점검', '## 핵심 요약', '## 기초 코딩 연습', '## 응용 연습', '## 도전 문제', '## Mini Project', '## 테스트와 풀이 개선', '## 복습 연결']) {
    assert.ok(manuscript.includes(heading), heading);
  }
});
