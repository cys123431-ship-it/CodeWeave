import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { lessons } from '../src/catalog.js';
import { figureFor } from '../src/figures.js';

test('C function lesson provides a complete textbook-to-practice path', () => {
  const lesson = lessons.find(item => item.id === 'c-functions');
  assert.ok(lesson, 'c-functions lesson must be registered');
  assert.equal(lesson.track, 'c');
  assert.equal(lesson.figure, 'function-scope-duration');
  assert.ok(lesson.sections.length >= 8, 'theory must be deeper than a short summary');
  const headings = lesson.sections.map(section => section.heading).join(' ');
  for (const topic of ['선수 지식', '학습 목표', '선언', '값 전달', '지역 변수', '흔한 오류', '핵심 요약', '복습']) {
    assert.match(headings, new RegExp(topic), topic);
  }
  assert.equal(lesson.quiz.options[lesson.quiz.answer], '호출하기 전에 함수의 이름·매개변수·반환형을 컴파일러에 알린다');
  assert.equal(lesson.challenge.id, lesson.id);
  assert.match(lesson.challenge.description, /clamp/);
  assert.match(lesson.challenge.starter, /int clamp\(int value, int low, int high\);/);
  assert.match(lesson.challenge.starter, /int clamp\(int value, int low, int high\) \{/);
});

test('function call figure is static, labeled and independently authored SVG', () => {
  const svg = figureFor('function-call');
  assert.match(svg, /^<svg/);
  assert.match(svg, /main/);
  assert.match(svg, /clamp/);
  assert.match(svg, /return/);
  assert.doesNotMatch(svg, /<animate|<script/);
});

test('function manuscript includes checks, errors, summary and original practice tiers', () => {
  const manuscript = readFileSync('content/c/06-functions.md', 'utf8');
  for (const heading of ['선수 지식', '학습 목표', '실행 결과', '흔한 오류', '중간 점검', '핵심 요약', '기초 연습', '응용 연습', '도전 문제', 'Mini Project', '복습 연결']) {
    assert.match(manuscript, new RegExp(heading), heading);
  }
  assert.doesNotMatch(manuscript, /후속 작업: 이 원고를 학습 UI/);
});

test('function-only clamp practice keeps the harness out of starter code', () => {
  const lesson = lessons.find(item => item.id === 'c-clamp-function');
  assert.ok(lesson, 'function-only practice lesson must be registered separately');
  assert.equal(lesson.track, 'c');
  assert.equal(lesson.figure, 'function-call');
  assert.ok(lesson.sections.length >= 5);
  assert.match(lesson.sections.map(section => section.heading).join(' '), /계약.*하네스.*부작용.*오류.*복습/);
  assert.equal(lesson.challenge.id, lesson.id);
  assert.match(lesson.challenge.starter, /int clamp\(int value, int low, int high\) \{/);
  assert.doesNotMatch(lesson.challenge.starter, /\bmain\s*\(/);
  assert.doesNotMatch(lesson.challenge.starter, /printf|puts/);
  assert.match(lesson.challenge.description, /main.*출력.*작성하지/);
});
