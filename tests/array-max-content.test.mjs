import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { lessons } from '../src/catalog.js';
import { figureFor } from '../src/figures.js';

test('array maximum lesson retains headings and function interface', () => {
  const lesson = lessons.find(item => item.id === 'c-array-max-function');
  assert.ok(lesson, 'c-array-max-function lesson must be registered');
  assert.equal(lesson.track, 'c');
  assert.equal(lesson.figure, 'array-output-contract');
  const headings = lesson.sections.map(section => section.heading).join(' ');
  for (const topic of ['선수 지식', '학습 목표', '함수 계약', '배열', '출력 포인터', '단계별', '흔한 오류', '중간 점검', '핵심 요약', '복습']) {
    assert.match(headings, new RegExp(topic), topic);
  }
  assert.equal(lesson.challenge.id, lesson.id);
  assert.match(lesson.challenge.starter, /int find_max\(const int values\[\], size_t length, int \*out_max\)/);
  assert.doesNotMatch(lesson.challenge.starter, /\bmain\s*\(/);
  assert.doesNotMatch(lesson.challenge.starter, /printf|puts/);
});

test('array output figure is static SVG without executable markup', () => {
  const svg = figureFor('array-output-contract');
  assert.match(svg, /^<svg/);
  assert.doesNotMatch(svg, /<animate|<script/);
});

test('array maximum manuscript retains required learning headings', () => {
  const manuscript = readFileSync('content/c/07-array-max-function.md', 'utf8');
  for (const heading of ['단원 개요', '선수 지식', '학습 목표', '핵심 이론', '실행 결과', '흔한 오류', '중간 점검', '핵심 요약', '기초 코딩 연습', '응용 연습', '도전 문제', 'Mini Project', '테스트와 풀이 개선', '복습 연결']) {
    assert.match(manuscript, new RegExp(heading), heading);
  }
});
