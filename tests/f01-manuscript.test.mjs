import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { lessons } from '../src/catalog.js';
import { exerciseById } from '../src/exercises.js';

const manuscript = 'content/rust/01-cargo.md';
const lesson = lessons.find(item => item.id === 'rust-cargo');

test('F01 manuscript preserves the exact complete Cargo files exercised by the screen compile test', async () => {
  const text = await readFile(new URL('../' + manuscript, import.meta.url), 'utf8');
  for (const section of lesson.sections.filter(section => section.fileName)) {
    const start = text.indexOf('## ' + section.fileName + '\n');
    assert.notEqual(start, -1, section.fileName);
    const block = text.slice(start).match(/```(?:toml|rust)\n([\s\S]*?)```/);
    assert.ok(block, section.fileName);
    assert.equal(block[1].trim(), section.code.trim(), section.fileName);
  }
  for (const heading of ['개요·목표·선수 지식', '실제 실행과 결과', '오류 수정·재제출', '개념 확인', '연습·작은 프로젝트', '복습·다음 단원']) {
    assert.ok(text.includes('## ' + heading + '\n'), heading);
  }
});

test('F01 screen identifies its independent manuscript without enabling the default Rust grader', () => {
  assert.ok(lesson.source.includes(manuscript));
  assert.equal(lesson.challenge.id, 'rust-cargo');
  assert.equal(exerciseById(lesson.challenge.id).grader, null);
});

test('F01 roadmap retains the reviewed manuscript and its executable parity evidence', async () => {
  const data = JSON.parse(await readFile(new URL('../docs/roadmap.json', import.meta.url), 'utf8'));
  const unit = data.stages.flatMap(stage => stage.units).find(unit => unit.id === 'F01');
  assert.ok(unit.manuscripts.includes(manuscript));
  assert.ok(unit.tests.includes('tests/f01-manuscript.test.mjs'));
});
