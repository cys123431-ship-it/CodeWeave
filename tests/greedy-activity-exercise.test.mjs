import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { gradingExercises } from '../server/grading-exercises.mjs';
import { writeSources, compile, runCases, buildResult } from '../server/grading-pipeline.mjs';
import { exercises } from '../src/exercises.js';

const gcc = spawnSync('gcc', ['--version']).status === 0;
const load = () => import('../server/greedy-activity-exercise.mjs');
const reference = `#include <stddef.h>
struct Activity { int start; int finish; };
int select_activities(const struct Activity activities[], size_t count,
                      size_t selected_indices[], size_t capacity,
                      size_t *selected_count) {
    if (selected_count == NULL || count > 16 || capacity < count
        || (count > 0 && (activities == NULL || selected_indices == NULL))) {
        return 0;
    }
    for (size_t i = 0; i < count; ++i) {
        if (activities[i].start >= activities[i].finish
            || (i > 0 && activities[i - 1].finish > activities[i].finish)) {
            return 0;
        }
    }
    size_t written = 0;
    int last_finish = 0;
    for (size_t i = 0; i < count; ++i) {
        if (written == 0 || activities[i].start >= last_finish) {
            selected_indices[written++] = i;
            last_finish = activities[i].finish;
        }
    }
    *selected_count = written;
    return 1;
}
`;

test('E05 import exposes ten immutable, registrable cases without public registration', async () => {
  const before = gradingExercises.get('algo-activity-selection');
  const { activitySelectionExercise: exercise, activitySelectionMetadata,
    activitySelectionHarness } = await load();
  assert.equal(exercise.id, 'algo-activity-selection');
  assert.equal(exercise.grader, 'c-function');
  assert.equal(exercise.cases.length, 10);
  assert.equal(new Set(exercise.cases.map(item => item.args.join())).size, 10);
  assert.ok(Object.isFrozen(exercise) && Object.isFrozen(exercise.cases));
  assert.ok(exercise.cases.some(item => item.input === exercise.publicExample.input
    && item.expected === exercise.publicExample.output));
  assert.ok(activitySelectionMetadata.prerequisites.every(prerequisite =>
    exercises.some(candidate => candidate.id === prerequisite)));
  assert.ok(activitySelectionMetadata.prerequisites.includes('algo-stable-insertion'));
  assert.match(activitySelectionHarness, /\{\{0,3\},\{2,4\},\{3,6\}\}/);
  assert.equal(gradingExercises.get(exercise.id), before);
});

test('E05 retains full acceptance after the cycle advances to E06', async () => {
  const data = JSON.parse(await fs.readFile(new URL('../docs/roadmap.json', import.meta.url), 'utf8'));
  const unit = data.stages.find(stage => stage.id === 'E').units.find(item => item.id === 'E05');
  const { activitySelectionExercise, activitySelectionMetadata, activitySelectionStarter } = await load();
  const lesson = (await import('../src/catalog.js')).lessons.find(item => item.id === activitySelectionMetadata.id);
  assert.ok(lesson, 'E05 must be learner-facing');
  assert.equal(unit.status, '완료');
  assert.deepEqual(unit.lessonIds, [lesson.id]);
  assert.ok(unit.manuscripts.includes('content/algo/05-greedy-activity-selection.md'));
  assert.ok(unit.tests.includes('tests/greedy-activity-exercise.test.mjs'));
  assert.ok(unit.tests.includes('tests/browser-practice.mjs'));
  assert.equal(unit.acceptance.scope, 'earliest-finish-activity-selection');
  assert.deepEqual(unit.acceptance.checks, ['theory', 'compiled-example', 'quiz-retry', 'actual-grading',
    'correction-retry', 'shared-history', 'backup-restore', 'mastery-next', 'offline', '390px']);
  assert.equal(lesson.challenge.starter, activitySelectionStarter);
  assert.deepEqual(gradingExercises.get(lesson.id), activitySelectionExercise);
  assert.deepEqual(data.next, { track: 'E', unit: 'E06' });
});

async function grade(t, code) {
  const { activitySelectionExercise: exercise } = await load();
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'codeweave-greedy-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  const workspace = await writeSources(dir, { code, exercise });
  const compiled = compile(workspace, exercise);
  assert.equal(compiled.status, 0, compiled.stderr);
  return buildResult(exercise, compiled, await runCases(workspace, exercise));
}

test('E05 accepts earliest-finish choice, counterexamples, ties, guards, rejection preservation and repeats', { skip: !gcc }, async t => {
  const result = await grade(t, reference);
  assert.equal(result.ok, true, JSON.stringify(result));
  assert.equal(result.message, '10/10개 테스트 통과');
});

const mutants = [
  ['chooses overlapping activities', code => code.replace('activities[i].start >= last_finish', 'activities[i].start <= last_finish')],
  ['rejects touching endpoints', code => code.replace('activities[i].start >= last_finish', 'activities[i].start > last_finish')],
  ['skips the first activity', code => code.replace('size_t i = 0; i < count', 'size_t i = 1; i < count')],
  ['stores finish values as indices', code => code.replace('selected_indices[written++] = i;', 'selected_indices[written++] = (size_t)activities[i].finish;')],
  ['updates finish for rejected activity', code => code.replace('last_finish = activities[i].finish;', 'last_finish = activities[i + (i + 1 < count ? 1 : 0)].finish;')],
  ['accepts unsorted input', code => code.replace("\n            || (i > 0 && activities[i - 1].finish > activities[i].finish)", '')],
  ['accepts zero-length activity', code => code.replace('activities[i].start >= activities[i].finish', 'activities[i].start > activities[i].finish')],
  ['overwrites count before rejection', code => code.replace('if (selected_count == NULL', 'if (selected_count != NULL) *selected_count = 0;\n    if (selected_count == NULL')]
];
for (const [name, mutate] of mutants) {
  test('E05 rejects ' + name, { skip: !gcc }, async t => {
    const code = mutate(reference);
    assert.notEqual(code, reference);
    const result = await grade(t, code);
    assert.equal(result.ok, false);
    assert.equal(result.tests.length, 10);
  });
}

test('E05 starter compiles without warnings but fails selection cases', { skip: !gcc }, async t => {
  const { activitySelectionStarter } = await load();
  const result = await grade(t, activitySelectionStarter);
  assert.equal(result.compileOutput, '');
  assert.equal(result.ok, false);
});

test('E05 manuscript has required learning path, stays within 150 lines, and example compiles', { skip: !gcc }, async t => {
  const markdown = await fs.readFile(new URL('../content/algo/05-greedy-activity-selection.md', import.meta.url), 'utf8');
  assert.ok(markdown.split('\n').length <= 150);
  for (const heading of ['개요', '이론', '반례', '도식', '완성 프로그램', '출력', '오류', '퀴즈', '직접 풀기', 'Mini Project', '복습']) {
    assert.ok(markdown.split('\n').some(line => line.startsWith('## ') && line.includes(heading)), heading);
  }
  const program = markdown.match(/\x60\x60\x60c\n([\s\S]*?)\n\x60\x60\x60/)[1];
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'codeweave-greedy-example-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  const source = path.join(dir, 'example.c');
  const binary = path.join(dir, process.platform === 'win32' ? 'example.exe' : 'example');
  await fs.writeFile(source, program);
  const built = spawnSync('gcc', ['-std=c11', '-Wall', '-Wextra', '-Wpedantic', '-Werror', source, '-o', binary], { encoding: 'utf8', timeout: 4500 });
  assert.equal(built.status, 0, built.stderr);
  const ran = spawnSync(binary, [], { encoding: 'utf8', timeout: 2000 });
  assert.equal(ran.status, 0, ran.stderr);
  assert.equal(ran.stdout.replaceAll('\r\n', '\n'), 'count=3\n0 3 4\n');
});

test('E05 changed modules pass syntax checks and roadmap stays synchronized', () => {
  for (const file of ['../server/greedy-activity-exercise.mjs', './greedy-activity-exercise.test.mjs']) {
    const result = spawnSync(process.execPath, ['--check', fileURLToPath(new URL(file, import.meta.url))], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
  }
  const result = spawnSync(process.execPath, [fileURLToPath(new URL('../scripts/roadmap.mjs', import.meta.url)), '--check'], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
});
