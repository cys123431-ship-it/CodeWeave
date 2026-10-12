import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { lessons } from '../src/catalog.js';
import { figureFor } from '../src/figures.js';

test('strtol lesson separates conversion, range and trailing-input validation', () => {
  const lesson = lessons.find(item => item.id === 'c-strtol-integer-input');
  assert.ok(lesson);
  assert.equal(lesson.figure, 'strtol-parse-contract');
  assert.ok(lesson.sections.length >= 12);
  const text = lesson.sections.map(section => `${section.heading} ${section.text}`).join('\n');
  for (const concept of ['fgets', 'strtol', 'endptr', 'errno', 'ERANGE', 'LONG_MIN', 'LONG_MAX', '10진수', 'isspace', 'unsigned char', 'TOO LONG']) {
    assert.match(text, new RegExp(concept.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
  assert.match(lesson.challenge.starter, /char line\[64\]/);
  assert.match(lesson.challenge.description, /NO INPUT/);
  assert.match(lesson.challenge.description, /INVALID/);
  assert.match(lesson.challenge.description, /RANGE/);
  assert.match(lesson.challenge.description, /TOO LONG/);
});

test('strtol figure is static and marks the conversion and validation boundaries', () => {
  const svg = figureFor('strtol-parse-contract');
  assert.match(svg, /role="img"/);
  assert.match(svg, /endptr/);
  assert.match(svg, /-42/);
  assert.match(svg, /ERANGE/);
  assert.match(svg, /뒤따르는 공백/);
  assert.doesNotMatch(svg, /<script|animate|onload=/i);
});

test('strtol manuscript contains the complete original learning path and portability boundary', async () => {
  const manuscript = await readFile(new URL('../content/c/11-strtol-integer-input.md', import.meta.url), 'utf8');
  for (const heading of ['## 단원 개요', '## 선수 지식', '## 학습 목표', '## 핵심 이론', '## 단계별 예제', '## 실행 결과', '## 흔한 오류', '## 중간 점검', '## 핵심 요약', '## 기초 코딩 연습', '## 응용 연습', '## 도전 문제', '## Mini Project', '## 테스트와 풀이 개선', '## 복습 연결']) {
    assert.ok(manuscript.includes(heading), heading);
  }
  assert.match(manuscript, /long의 비트 수나 최댓값을 고정해 가정하지/);
  assert.match(manuscript, /errno = 0/);
  assert.match(manuscript, /\(unsigned char\)/);
  assert.match(manuscript, /완성 프로그램/);
});
