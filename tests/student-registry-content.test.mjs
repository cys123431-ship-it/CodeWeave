import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { lessons } from '../src/catalog.js';
import { figureFor } from '../src/figures.js';
import { parseMultiFileSubmission } from '../src/multi-file.js';

const requiredFiles = ['main.c', 'student.c', 'student.h'];

test('student registry mini project connects three files, stable sort and first-match search', () => {
  const lesson = lessons.find(item => item.id === 'c-struct-student-registry');
  assert.ok(lesson);
  assert.equal(lesson.figure, 'student-registry-project');
  assert.ok(lesson.sections.length >= 12);
  const text = lesson.sections.map(section => `${section.heading} ${section.text}`).join('\n');
  for (const concept of ['student.h', 'student.c', 'main.c', '안정 정렬', '첫 위치', '[left, right)', '빈 입력', '링크']) {
    assert.ok(text.includes(concept), concept);
  }
  const files = parseMultiFileSubmission(lesson.challenge.starter, { requiredNames: requiredFiles });
  assert.deepEqual(files.map(file => file.name), requiredFiles);
  assert.match(files.find(file => file.name === 'student.h').content, /struct Student/);
  assert.match(files.find(file => file.name === 'student.c').content, /stable_sort_students_by_id/);
  assert.match(files.find(file => file.name === 'main.c').content, /int main\(void\)/);
});

test('student registry figure is static and shows the three-file data path', () => {
  const svg = figureFor('student-registry-project');
  assert.match(svg, /role="img"/);
  for (const label of ['student.h', 'student.c', 'main.c', '안정 정렬', '첫 위치']) assert.match(svg, new RegExp(label.replace('.', '\\.')));
  assert.doesNotMatch(svg, /<script|animate|onload=/i);
});

test('student registry manuscript contains the complete original learning path', async () => {
  const manuscript = await readFile(new URL('../content/c/16-struct-student-registry.md', import.meta.url), 'utf8');
  for (const heading of ['## 단원 개요', '## 선수 지식', '## 학습 목표', '## 핵심 이론', '## 단계별 예제', '## 실행 결과', '## 흔한 오류', '## 중간 점검', '## 핵심 요약', '## 기초 코딩 연습', '## 응용 연습', '## 도전 문제', '## Mini Project', '## 테스트와 풀이 개선', '## 복습 연결']) {
    assert.ok(manuscript.includes(heading), heading);
  }
  assert.match(manuscript, /student\.h[\s\S]*student\.c[\s\S]*main\.c/);
  assert.match(manuscript, /같은 id[\s\S]*상대 순서/);
  assert.match(manuscript, /완성 프로그램/);
});
