import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { lessons } from '../src/catalog.js';
import { figureFor } from '../src/figures.js';

test('student vector push lesson connects reserve reuse, geometric growth and atomic publication', () => {
  const lesson = lessons.find(item => item.id === 'c-student-vector-push');
  assert.ok(lesson);
  assert.equal(lesson.figure, 'student-vector-push');
  assert.ok(lesson.sections.length >= 12);
  const text = lesson.sections.map(section => `${section.heading} ${section.text}`).join('\n');
  for (const concept of ['push_student', 'reserve_students', 'length', 'capacity', '0 → 4', '두 배', 'SIZE_MAX', '실패', '성공한 뒤']) {
    assert.ok(text.includes(concept), concept);
  }
  assert.match(lesson.challenge.starter, /int push_student\(struct Student \*\*students, size_t \*length,/);
  assert.match(lesson.challenge.starter, /int reserve_students\(struct Student \*\*students, size_t length,/);
  assert.doesNotMatch(lesson.challenge.starter, /int main\s*\(/);
});

test('student vector push figure is static and separates spare capacity, growth and failure', () => {
  const svg = figureFor('student-vector-push');
  assert.match(svg, /role="img"/);
  for (const label of ['빈 슬롯', '0 → 4', 'capacity × 2', 'reserve_students', '길이 공개', '실패 · 원본 유지']) {
    assert.match(svg, new RegExp(label));
  }
  assert.doesNotMatch(svg, /<script|animate|onload=/i);
});

test('student vector push manuscript contains the complete original learning path and C boundaries', async () => {
  const manuscript = await readFile(new URL('../content/c/19-student-vector-push.md', import.meta.url), 'utf8');
  for (const heading of ['## 단원 개요', '## 필요한 이유', '## 선수 지식', '## 학습 목표', '## 핵심 이론', '## 정적 도식 읽기', '## 단계별 예제', '## 완성 함수', '## 완성 프로그램', '## 실행 결과', '## 왜 이런 결과가 나오는가', '## 흔한 오류', '## 중간 점검', '## 개념 확인 퀴즈', '## 핵심 요약', '## 기초 코딩 연습', '## 응용 연습', '## 도전 문제', '## Mini Project', '## 테스트와 풀이 개선', '## 복습 연결']) {
    assert.ok(manuscript.includes(heading), heading);
  }
  assert.match(manuscript, /\*capacity > SIZE_MAX \/ 2/);
  assert.match(manuscript, /reserve_students[\s\S]*성공[\s\S]*\(\*length\)\+\+/);
  assert.match(manuscript, /검증된 `reserve_students`/);
  assert.match(manuscript, /공개 실행 격리/);
});
