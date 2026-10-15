import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const dataURL = new URL('../docs/roadmap.json', import.meta.url);
const moduleURL = new URL('../scripts/roadmap.mjs', import.meta.url);
const load = async () => ({ data: JSON.parse(await readFile(dataURL, 'utf8')), api: await import(moduleURL) });

test('confirmed roadmap validates all nine stages and counts only evidenced completed units', async () => {
  const { data, api } = await load();
  assert.doesNotThrow(() => api.validateRoadmap(data));
  assert.deepEqual(api.summarize(data).map(row => row.id), [...'ABCDEFGHI']);
  for (const row of api.summarize(data)) {
    assert.ok(row.total >= 5 && row.total <= 12);
    assert.equal(row.percent, Number((100 * row.completed / row.total).toFixed(1)));
    assert.equal(row.total, row.completed + row.inProgress + row.notStarted);
  }
});

test('ungraded samples cannot be promoted to completed and catalog entries cannot be double counted', async () => {
  const { data, api } = await load();
  const sample = structuredClone(data);
  sample.stages.find(stage => stage.id === 'D').units.find(unit => unit.lessonIds.includes('ds-stack')).status = '완료';
  assert.throws(() => api.validateRoadmap(sample), /graded|채점/);
  const duplicate = structuredClone(data);
  duplicate.stages[0].units[0].lessonIds = ['c-hello'];
  assert.throws(() => api.validateRoadmap(duplicate), /duplicate|중복/);
});

test('missing evidence and an invalid next unit fail instead of inflating progress', async () => {
  const { data, api } = await load();
  const missing = structuredClone(data);
  missing.stages[0].units.find(unit => unit.status === '완료').tests = [];
  assert.throws(() => api.validateRoadmap(missing), /evidence|근거/);
  const cursor = structuredClone(data);
  cursor.next.unit = 'D99';
  assert.throws(() => api.validateRoadmap(cursor), /next|다음/);
});

test('published roadmap is generated from the same states and denominators', async () => {
  const { data, api } = await load();
  const markdown = await readFile(new URL('../docs/ROADMAP.md', import.meta.url), 'utf8');
  assert.equal(markdown, api.renderRoadmap(data));
});

test('rotation keeps D E Rust C order and skips already completed units within a turn', async () => {
  const { data, api } = await load();
  assert.equal(api.nextTurn('D'), 'E');
  assert.equal(api.nextTurn('E'), 'F-G');
  assert.equal(api.nextTurn('F-G'), 'C');
  assert.equal(api.nextTurn('C'), 'D');
  assert.throws(() => api.nextTurn('unknown'), /track|트랙/);
  assert.equal(api.selectUnit(data, 'D').id, data.next.unit);
  const changed = structuredClone(data);
  changed.stages.find(stage => stage.id === 'D').units[0].status = '완료';
  assert.equal(api.selectUnit(changed, 'D').id, 'D02');
});
