import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { lessons } from '../src/catalog.js';
import { figureFor } from '../src/figures.js';

test('dynamic student array lesson connects checked allocation, ownership and cleanup', () => {
  const lesson = lessons.find(item => item.id === 'c-dynamic-student-array');
  assert.ok(lesson);
  assert.equal(lesson.figure, 'dynamic-student-array');
  assert.ok(lesson.sections.length >= 12);
  const text = lesson.sections.map(section => `${section.heading} ${section.text}`).join('\n');
  for (const concept of ['malloc', 'free', 'SIZE_MAX', 'sizeof', '0개', '소유권', '할당 실패', '이중 해제']) {
    assert.ok(text.includes(concept), concept);
  }
  assert.match(lesson.challenge.starter, /int create_students\(size_t count, int initial_score, struct Student \*\*out_students\)/);
  assert.match(lesson.challenge.starter, /void destroy_students\(struct Student \*\*students\)/);
  assert.doesNotMatch(lesson.challenge.starter, /int main\s*\(/);
});

test('dynamic allocation figure is static and shows checked size through cleanup', () => {
  const svg = figureFor('dynamic-student-array');
  assert.match(svg, /role="img"/);
  for (const label of ['SIZE_MAX', 'malloc', '소유권', 'free', 'NULL']) assert.match(svg, new RegExp(label));
  assert.doesNotMatch(svg, /<script|animate|onload=/i);
});

test('dynamic memory manuscript contains a complete original learning path and portability boundaries', async () => {
  const manuscript = await readFile(new URL('../content/c/17-dynamic-student-array.md', import.meta.url), 'utf8');
  for (const heading of ['## 단원 개요', '## 선수 지식', '## 학습 목표', '## 핵심 이론', '## 단계별 예제', '## 실행 결과', '## 흔한 오류', '## 중간 점검', '## 핵심 요약', '## 기초 코딩 연습', '## 응용 연습', '## 도전 문제', '## Mini Project', '## 테스트와 풀이 개선', '## 복습 연결']) {
    assert.ok(manuscript.includes(heading), heading);
  }
  assert.match(manuscript, /count > SIZE_MAX \/ sizeof \*students/);
  assert.match(manuscript, /malloc\(0\)[\s\S]*의존하지/);
  assert.match(manuscript, /할당 실패[\s\S]*주입/);
  assert.match(manuscript, /완성 프로그램/);
});
