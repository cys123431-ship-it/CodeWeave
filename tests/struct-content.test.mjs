import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { lessons } from '../src/catalog.js';
import { figureFor } from '../src/figures.js';

test('student structure lesson connects object state, pointer mutation and validation', () => {
  const lesson = lessons.find(item => item.id === 'c-struct-student-score');
  assert.ok(lesson);
  assert.equal(lesson.figure, 'struct-update-contract');
  assert.ok(lesson.sections.length >= 11);
  const text = lesson.sections.map(section => `${section.heading} ${section.text}`).join('\n');
  for (const concept of ['struct Student', '값 복사', '주소', 'student->score', '0 이상 100 이하', '실패', '원본']) {
    assert.match(text, new RegExp(concept.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
  assert.match(lesson.challenge.starter, /struct Student\s*\{/);
  assert.match(lesson.challenge.starter, /int update_score\(struct Student \*student, int delta\)/);
  assert.doesNotMatch(lesson.challenge.starter, /int main\s*\(/);
});

test('student update figure is static and distinguishes success from preserved failure', () => {
  const svg = figureFor('struct-update-contract');
  assert.match(svg, /role="img"/);
  assert.match(svg, /student-&gt;score/);
  assert.match(svg, /id 유지/);
  assert.match(svg, /실패.*원본 보존/);
  assert.doesNotMatch(svg, /<script|animate|onload=/i);
});

test('student structure manuscript contains the complete original learning path', async () => {
  const manuscript = await readFile(new URL('../content/c/12-struct-student-score.md', import.meta.url), 'utf8');
  for (const heading of ['## 단원 개요', '## 선수 지식', '## 학습 목표', '## 핵심 이론', '## 단계별 예제', '## 실행 결과', '## 흔한 오류', '## 중간 점검', '## 핵심 요약', '## 기초 코딩 연습', '## 응용 연습', '## 도전 문제', '## Mini Project', '## 테스트와 풀이 개선', '## 복습 연결']) {
    assert.ok(manuscript.includes(heading), heading);
  }
  assert.match(manuscript, /구조체의 패딩|padding/i);
  assert.match(manuscript, /덧셈하기 전에[^\n]*범위/);
  assert.match(manuscript, /실패[^\n]*원본[^\n]*보존/);
  assert.match(manuscript, /완성 프로그램/);
});
