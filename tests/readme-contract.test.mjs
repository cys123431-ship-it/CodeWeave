import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import { tracks, lessons } from '../src/catalog.js';
import { gradingExercises } from '../server/grading-exercises.mjs';

const root = new URL('../', import.meta.url);
const readmeURL = new URL('README.md', root);

test('README exposes the five requested entrypoint sections within its explicit line budget', async () => {
  const text = await readFile(readmeURL, 'utf8');
  assert.ok(text.trimEnd().split('\n').length <= 150);
  const headings = [...text.matchAll(/^## (.+)$/gm)].map(match => match[1]);
  assert.deepEqual(headings, ['소개', '빠른 시작', '기능 요약', '꼭 확인할 제한', '문서 링크']);
});

test('README track counts reflect lessons and actual runnable grading definitions', async () => {
  const text = await readFile(readmeURL, 'utf8');
  const rows = [...text.matchAll(/^\| ([^|]+) \| (\d+) \| (\d+) \|$/gm)]
    .map(([, name, count, graded]) => ({ name: name.trim(), count: Number(count), graded: Number(graded) }));
  assert.equal(rows.length, tracks.length);
  for (const track of tracks) {
    const group = lessons.filter(lesson => lesson.track === track.id);
    assert.deepEqual(rows.find(row => row.name === track.name), {
      name: track.name,
      count: group.length,
      graded: group.filter(lesson => gradingExercises.has(lesson.challenge.id)).length
    });
  }
});

test('README local documentation links resolve and include audit and local operations', async () => {
  const text = await readFile(readmeURL, 'utf8');
  const targets = [...text.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)]
    .map(match => match[1]).filter(target => !/^(?:https?:|#)/.test(target));
  const paths = targets.map(target => target.replace(/^\.\//, '').split('#')[0]);
  for (const required of ['docs/C_EXERCISE_AUDIT.md', 'docs/LOCAL_DEVELOPMENT.md',
    'docs/AUTONOMOUS_DEVELOPMENT.md', 'docs/DEVELOPMENT_LOG.md']) {
    assert.ok(paths.includes(required), required);
  }
  for (const target of paths) await access(new URL(target, root));
});

test('README npm entry commands exist in package scripts without executing document text', async () => {
  const text = await readFile(readmeURL, 'utf8');
  const { scripts } = JSON.parse(await readFile(new URL('package.json', root), 'utf8'));
  const commands = [...text.matchAll(/^npm (?:run )?([a-z][a-z:-]*)$/gm)].map(match => match[1]);
  assert.ok(commands.includes('start'));
  assert.ok(commands.includes('test'));
  for (const command of commands) assert.ok(Object.hasOwn(scripts, command), command);
});
