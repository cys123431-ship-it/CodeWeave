import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { lessons } from '../src/catalog.js';
import { figureFor } from '../src/figures.js';

test('realloc capacity lesson connects invariants, temporary ownership and initialization', () => {
  const lesson = lessons.find(item => item.id === 'c-realloc-student-capacity');
  assert.ok(lesson);
  assert.equal(lesson.figure, 'realloc-student-capacity');
  assert.ok(lesson.sections.length >= 12);
  const text = lesson.sections.map(section => `${section.heading} ${section.text}`).join('\n');
  for (const concept of ['length', 'capacity', 'realloc', 'SIZE_MAX', '임시 포인터', '실패', '새 슬롯', '축소']) {
    assert.ok(text.includes(concept), concept);
  }
  assert.match(lesson.challenge.starter, /int reserve_students\(struct Student \*\*students, size_t length,/);
  assert.doesNotMatch(lesson.challenge.starter, /int main\s*\(/);
});

test('realloc figure is static and separates success publication from preserved failure', () => {
  const svg = figureFor('realloc-student-capacity');
  assert.match(svg, /role="img"/);
  for (const label of ['capacity', 'realloc', '원본 보존', '새 슬롯', '포인터 · 용량 공개']) {
    assert.match(svg, new RegExp(label));
  }
  assert.doesNotMatch(svg, /<script|animate|onload=/i);
});

test('realloc manuscript contains the complete original learning path and C boundaries', async () => {
  const manuscript = await readFile(new URL('../content/c/18-realloc-student-capacity.md', import.meta.url), 'utf8');
  for (const heading of ['## 단원 개요', '## 필요한 이유', '## 선수 지식', '## 학습 목표', '## 핵심 이론', '## 정적 도식 읽기', '## 단계별 예제', '## 완성 함수', '## 완성 프로그램', '## 실행 결과', '## 왜 이런 결과가 나오는가', '## 흔한 오류', '## 중간 점검', '## 개념 확인 퀴즈', '## 핵심 요약', '## 기초 코딩 연습', '## 응용 연습', '## 도전 문제', '## Mini Project', '## 테스트와 풀이 개선', '## 복습 연결']) {
    assert.ok(manuscript.includes(heading), heading);
  }
  assert.match(manuscript, /new_capacity > SIZE_MAX \/ sizeof \*\*students/);
  assert.match(manuscript, /임시 포인터[\s\S]*realloc/);
  assert.match(manuscript, /성공 후 주소가 달라질 수/);
  assert.match(manuscript, /--wrap=realloc/);
});
