import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { lessons } from '../src/catalog.js';
import { figureFor } from '../src/figures.js';

test('fgets lesson distinguishes a buffer chunk from one logical line', () => {
  const lesson = lessons.find(item => item.id === 'c-fgets-logical-line');
  assert.ok(lesson);
  assert.equal(lesson.figure, 'fgets-chunks');
  assert.ok(lesson.sections.length >= 11);
  const text = lesson.sections.map(section => `${section.heading} ${section.text}`).join('\n');
  for (const concept of ['논리적 한 줄', 'sizeof chunk - 1', '개행', '정확히 7바이트', 'EOF', 'ferror', '바이트']) {
    assert.match(text, new RegExp(concept.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
  assert.match(lesson.challenge.starter, /int main\(void\)/);
  assert.match(lesson.challenge.starter, /char chunk\[8\]/);
  assert.match(lesson.challenge.description, /NO INPUT/);
});

test('fgets chunk figure is static and shows accumulation through a newline', () => {
  const svg = figureFor('fgets-chunks');
  assert.match(svg, /role="img"/);
  assert.match(svg, /조각 1/);
  assert.match(svg, /조각 2/);
  assert.match(svg, /7 \+ 4/);
  assert.match(svg, /개행/);
  assert.doesNotMatch(svg, /<script|animate|onload=/i);
});

test('fgets manuscript contains the complete original learning path', async () => {
  const manuscript = await readFile(new URL('../content/c/10-fgets-logical-line.md', import.meta.url), 'utf8');
  for (const heading of ['## 단원 개요', '## 선수 지식', '## 학습 목표', '## 핵심 이론', '## 단계별 예제', '## 실행 결과', '## 흔한 오류', '## 중간 점검', '## 핵심 요약', '## 기초 코딩 연습', '## 응용 연습', '## 도전 문제', '## Mini Project', '## 테스트와 풀이 개선', '## 복습 연결']) {
    assert.ok(manuscript.includes(heading), heading);
  }
  assert.match(manuscript, /개행이 없다는 사실만으로[^\n]*잘렸다고 단정/);
  assert.match(manuscript, /EOF 전에 읽은 바이트가 하나도 없으면 `NO INPUT`/);
  assert.match(manuscript, /완성 프로그램/);
});
