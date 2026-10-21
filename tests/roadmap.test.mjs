import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { lessons } from '../src/catalog.js';
import { exerciseById } from '../src/exercises.js';
import { gradingExercises } from '../server/grading-exercises.mjs';
import { listExercise } from '../server/ds-list-exercise.mjs';
import { stackExercise, stackMetadata, stackStarter } from '../server/stack-exercise.mjs';
import { mergeExercise, mergeMetadata, mergeStarter } from '../server/merge-exercise.mjs';
import { spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';

const dataURL = new URL('../docs/roadmap.json', import.meta.url);
const moduleURL = new URL('../scripts/roadmap.mjs', import.meta.url);
const load = async () => ({ data: JSON.parse(await readFile(dataURL, 'utf8')), api: await import(moduleURL) });

test('E03 publishes its prepared merge contract and compiled example without private client cases', async () => {
  const lesson = lessons.find(item => item.id === 'algo-merge');
  assert.ok(lesson, 'E03 must be reachable from the learner catalog');
  assert.equal(lesson.track, 'algo');
  assert.equal(lesson.figure, 'merge-auxiliary');
  assert.deepEqual(exerciseById(lesson.id), { ...mergeMetadata, requiredFiles: [] });
  assert.deepEqual(gradingExercises.get(lesson.id), mergeExercise);
  assert.equal(Object.hasOwn(exerciseById(lesson.id), 'harness'), false);
  assert.equal(lesson.challenge.starter, mergeStarter);
  assert.equal(lesson.challenge.input, mergeMetadata.publicExample.input);
  assert.equal(lesson.challenge.expected, mergeMetadata.publicExample.output);
  const manuscript = await readFile(new URL('../content/algo/03-merge-sort.md', import.meta.url), 'utf8');
  const program = manuscript.match(/```c\n([\s\S]*?)\n```/)[1];
  assert.ok(lesson.sections.some(section => section.code?.trim() === program.trim()));
  assert.deepEqual(lesson.quiz.options, ['1', '2', '3', '5']);
  assert.equal(lesson.quiz.answer, 1);
});

test('README algorithm counts match delivered lessons and runnable grading contracts', async () => {
  const readme = await readFile(new URL('../README.md', import.meta.url), 'utf8');
  const algorithm = lessons.filter(lesson => lesson.track === 'algo');
  const runnable = algorithm.filter(lesson => gradingExercises.has(lesson.challenge.id));
  assert.ok(readme.split('\n').includes(`| 알고리즘 | ${algorithm.length} | ${runnable.length} |`));
});

test('accepted E03 preserves the original ten cases and hands the E turn to unfinished Rust work', async () => {
  const { data, api } = await load();
  const unit = data.stages.find(stage => stage.id === 'E').units.find(item => item.id === 'E03');
  assert.equal(unit.status, '완료');
  assert.deepEqual(unit.lessonIds, ['algo-merge']);
  assert.ok(unit.manuscripts.includes('content/algo/03-merge-sort.md'));
  for (const file of ['tests/merge-exercise.test.mjs', 'tests/roadmap.test.mjs', 'tests/browser-practice.mjs']) {
    assert.ok(unit.tests.includes(file));
  }
  assert.deepEqual(gradingExercises.get('algo-merge'), mergeExercise);
  assert.equal(mergeExercise.cases.length, 10);
  const handoff = structuredClone(data);
  const track = api.nextTurn('E');
  assert.equal(track, 'F-G');
  handoff.next = { track, unit: api.selectUnit(handoff, track).id };
  assert.equal(api.validateRoadmap(handoff), true);
});

function historicalDSRotation(source) {
  const changed = structuredClone(source);
  changed.stages.find(stage => stage.id === 'D').units[0].status = '완료';
  changed.stages.find(stage => stage.id === 'D').units[1].status = '진행 중';
  // Replay the D02 → D03 scenario, not the subsequently published completion.
  changed.stages.find(stage => stage.id === 'D').units.find(unit => unit.id === 'D03').status = '진행 중';
  return changed;
}

test('historical DS rotation keeps its D03 handoff while live selection respects later completion', async () => {
  const { data, api } = await load();
  const progressed = structuredClone(data);
  progressed.stages.find(stage => stage.id === 'D').units.find(unit => unit.id === 'D03').status = '완료';
  progressed.stages.find(stage => stage.id === 'D').units.find(unit => unit.id === 'D04').status = '진행 중';
  const before = structuredClone(progressed);
  assert.equal(api.selectUnit(progressed, 'D').id, 'D04');
  const historical = historicalDSRotation(progressed);
  assert.equal(api.selectUnit(historical, 'D').id, 'D02');
  historical.stages.find(stage => stage.id === 'D').units[1].status = '완료';
  assert.equal(api.selectUnit(historical, 'D').id, 'D03');
  assert.deepEqual(progressed, before);
});

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

test('accepted D03 keeps its prepared evidence and rotates the D turn to unfinished algorithm work', async () => {
  const { data, api } = await load();
  const unit = data.stages.find(stage => stage.id === 'D').units.find(item => item.id === 'D03');
  assert.equal(unit.status, '완료');
  assert.deepEqual(unit.lessonIds, ['ds-queue']);
  assert.ok(unit.manuscripts.includes('content/ds/03-queue.md'));
  for (const file of ['tests/queue-exercise.test.mjs', 'tests/roadmap.test.mjs', 'tests/browser-practice.mjs']) {
    assert.ok(unit.tests.includes(file));
  }
  assert.equal(gradingExercises.get('ds-queue').cases.length, 10);
  assert.equal(exerciseById('ds-queue').grader, 'c-function');
  const handoff = structuredClone(data);
  const track = api.nextTurn('D');
  assert.equal(track, 'E');
  handoff.next = { track, unit: api.selectUnit(handoff, track).id };
  assert.equal(api.validateRoadmap(handoff), true);
});

test('accepted C06 retains its grading evidence and the C turn hands off to the next unfinished DS unit', async () => {
  const { data, api } = await load();
  const unit = data.stages.find(stage => stage.id === 'C').units.find(item => item.id === 'C06');
  assert.equal(unit.status, '완료');
  assert.deepEqual(unit.lessonIds, ['c-preprocessor-once']);
  assert.ok(unit.manuscripts.includes('content/c/23-preprocessor-once.md'));
  assert.ok(unit.tests.includes('tests/preprocessor-exercise.test.mjs'));
  assert.ok(unit.tests.includes('tests/browser-practice.mjs'));
  const handoff = structuredClone(data);
  const track = api.nextTurn('C');
  handoff.next = { track, unit: api.selectUnit(handoff, track).id };
  assert.equal(track, 'D');
  assert.equal(api.validateRoadmap(handoff), true);
  assert.equal(gradingExercises.get('c-preprocessor-once').cases.length, 10);
});

test('ungraded samples cannot be promoted to completed and catalog entries cannot be double counted', async () => {
  const { data, api } = await load();
  const sample = structuredClone(data);
  const ungraded = sample.stages.flatMap(stage => stage.units).find(unit => unit.lessonIds.includes('rust-cargo'));
  ungraded.status = '완료';
  ungraded.manuscripts = ['content/ds/02-stack.md'];
  ungraded.tests = ['tests/roadmap.test.mjs'];
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
  assert.equal(api.selectUnit(data, data.next.track).id, data.next.unit);
  const changed = historicalDSRotation(data);
  assert.equal(api.selectUnit(changed, 'D').id, 'D02');
  changed.stages.find(stage => stage.id === 'D').units[1].status = '완료';
  assert.equal(api.selectUnit(changed, 'D').id, 'D03');
});

test('D02 publishes the prepared stack contract without changing legacy quiz meaning', async () => {
  const lesson = lessons.find(item => item.id === 'ds-stack');
  assert.equal(lesson.figure, 'stack-bounded-lifo');
  assert.deepEqual(exerciseById('ds-stack'), { ...stackMetadata, requiredFiles: [] });
  assert.deepEqual(gradingExercises.get('ds-stack').cases, stackExercise.cases);
  assert.equal(gradingExercises.get('ds-stack').harness, stackExercise.harness);
  assert.equal(lesson.challenge.starter, stackStarter);
  assert.equal(lesson.challenge.input, stackMetadata.publicExample.input);
  assert.equal(lesson.challenge.expected, stackMetadata.publicExample.output);
  assert.deepEqual(lesson.quiz.options, ['2', '5', '7', '알 수 없다']);
  assert.equal(lesson.quiz.answer, 2);
  const manuscript = await readFile(new URL('../content/ds/02-stack.md', import.meta.url), 'utf8');
  const program = manuscript.match(/```c\n([\s\S]*?)```/)[1].trim();
  assert.ok(lesson.sections.some(section => section.code?.trim() === program), 'screen example must be the compiled complete program');
});

test('D01 exposes the prepared first-match contract through the DS lesson and production grader', () => {
  const lesson = lessons.find(lesson => lesson.id === 'ds-list-find');
  assert.ok(lesson, 'D01 must have a learner-facing lesson');
  assert.equal(lesson.track, 'ds');
  assert.equal(lesson.figure, 'list-first-match');
  assert.equal(lesson.challenge.id, listExercise.id);
  assert.equal(exerciseById(lesson.challenge.id).grader, 'c-function');
  const actual = gradingExercises.get(lesson.challenge.id);
  assert.deepEqual(actual.cases, listExercise.cases);
  assert.equal(actual.harness, listExercise.harness, 'production must preserve the previously compiled contract');
  assert.equal(lesson.quiz.options.length > lesson.quiz.answer, true);
  assert.doesNotMatch(lesson.challenge.starter, /int main\s*\(/);
});

test('D01 live API rejects last-match code then accepts corrected code and the published starter compiles', {
  skip: spawnSync('gcc', ['--version']).status !== 0, timeout: 20000
}, async t => {
  const child = spawn(process.execPath, ['dev-server.mjs'], { env: { ...process.env, PORT: '0' }, stdio: ['ignore', 'pipe', 'pipe'] });
  t.after(async () => {
    if (child.exitCode === null) { const ended = once(child, 'exit'); child.kill(); await ended; }
  });
  const base = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(Error('D01 server startup timed out')), 5000);
    let text = '';
    child.once('error', reject);
    child.stdout.on('data', chunk => {
      text += chunk;
      const match = text.match(/http:\/\/127\.0\.0\.1:\d+/);
      if (match) { clearTimeout(timer); resolve(match[0]); }
    });
  });
  const html = await (await fetch(base)).text();
  const token = html.match(/name="codeweave-token" content="([0-9a-f]{64})"/)?.[1];
  const submit = async code => {
    const response = await fetch(base + '/api/grade', { method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-CodeWeave-Token': token },
      body: JSON.stringify({ exerciseId: 'ds-list-find', code }), signal: AbortSignal.timeout(10000) });
    assert.equal(response.status, 200);
    return response.json();
  };
  const correct = '#include <stddef.h>\nstruct Node { int value; const struct Node *next; };\nconst struct Node *list_find(const struct Node *head, int target) { for (const struct Node *p = head; p != NULL; p = p->next) { if (p->value == target) return p; } return NULL; }';
  const wrong = correct.replace('for (const struct', 'const struct Node *found = NULL; for (const struct').replace('return p;', 'found = p;').replace('return NULL;', 'return found;');
  const bad = await submit(wrong);
  assert.equal(bad.ok, false);
  assert.equal(bad.tests[7].passed, false, 'duplicate case must reject last match');
  const good = await submit(correct);
  assert.equal(good.ok, true);
  assert.equal(good.message, '10/10개 테스트 통과');
  const starter = await submit(lessons.find(lesson => lesson.id === 'ds-list-find').challenge.starter);
  assert.equal(starter.ok, false);
  assert.equal(starter.compileOutput, '', 'starter must be valid C11, not a compiler-error puzzle');
});

test('E02 exposes the prepared sorting contract and compiled example through the learner catalog', async () => {
  const { sortExercise, sortMetadata, sortStarter } = await import('../server/sort-exercise.mjs');
  const lesson = lessons.find(item => item.id === sortExercise.id);
  assert.ok(lesson, 'E02 needs a learner-facing lesson');
  assert.equal(lesson.track, 'algo');
  assert.equal(lesson.figure, 'stable-insertion-counts');
  assert.deepEqual(exerciseById(lesson.id), { ...sortMetadata, requiredFiles: [] });
  assert.deepEqual(gradingExercises.get(lesson.id).cases, sortExercise.cases);
  assert.equal(gradingExercises.get(lesson.id).harness, sortExercise.harness);
  assert.equal(lesson.challenge.starter, sortStarter);
  assert.equal(lesson.challenge.input, sortMetadata.publicExample.input);
  assert.equal(lesson.challenge.expected, sortMetadata.publicExample.output);
  assert.equal(lesson.quiz.answer, 2);
  assert.equal(lessons[lessons.findIndex(item => item.id === 'algo-binary') + 1].id, lesson.id);
  const markdown = await readFile(new URL('../content/algo/02-stable-insertion.md', import.meta.url), 'utf8');
  const program = markdown.match(/```c\n([\s\S]*?)```/)[1].trim();
  assert.ok(lesson.sections.some(section => section.code?.trim() === program));
});

test('E02 live API rejects unstable code then accepts corrected code and the published starter compiles', {
  skip: spawnSync('gcc', ['--version']).status !== 0, timeout: 20000
}, async t => {
  const child = spawn(process.execPath, ['dev-server.mjs'], { env: { ...process.env, PORT: '0' }, stdio: ['ignore', 'pipe', 'pipe'] });
  t.after(async () => {
    if (child.exitCode === null) { const ended = once(child, 'exit'); child.kill(); await ended; }
  });
  const base = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(Error('E02 server startup timed out')), 5000);
    let text = '';
    child.once('error', reject);
    child.stdout.on('data', chunk => {
      text += chunk;
      const match = text.match(/http:\/\/127\.0\.0\.1:\d+/);
      if (match) { clearTimeout(timer); resolve(match[0]); }
    });
  });
  const html = await (await fetch(base)).text();
  const token = html.match(/name="codeweave-token" content="([0-9a-f]{64})"/)?.[1];
  const submit = async code => {
    const response = await fetch(base + '/api/grade', { method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-CodeWeave-Token': token },
      body: JSON.stringify({ exerciseId: 'algo-stable-insertion', code }), signal: AbortSignal.timeout(10000) });
    assert.equal(response.status, 200);
    return response.json();
  };
  const correct = "#include <stddef.h>\nstruct SortItem { int key; int tag; };\nint stable_sort_counted(struct SortItem items[], size_t count,\n                        size_t *out_comparisons, size_t *out_moves) {\n    if (out_comparisons == NULL || out_moves == NULL || count > 8\n        || (count > 0 && items == NULL)) return 0;\n    size_t comparisons = 0;\n    size_t moves = 0;\n    for (size_t i = 1; i < count; ++i) {\n        struct SortItem key = items[i];\n        size_t j = i;\n        while (j > 0) {\n            ++comparisons;\n            if (!(items[j - 1].key > key.key)) break;\n            items[j] = items[j - 1];\n            ++moves;\n            --j;\n        }\n        items[j] = key;\n        ++moves;\n    }\n    *out_comparisons = comparisons;\n    *out_moves = moves;\n    return 1;\n}\n";
  const wrong = correct.replace('items[j - 1].key > key.key', 'items[j - 1].key >= key.key');
  const bad = await submit(wrong);
  assert.equal(bad.ok, false);
  assert.equal(bad.tests[5].passed, false, 'equal keys must keep original tag order and comparison counts');
  assert.equal(bad.tests.length, 10);
  const good = await submit(correct);
  assert.equal(good.ok, true);
  assert.equal(good.message, '10/10개 테스트 통과');
  const starter = await submit(lessons.find(lesson => lesson.id === 'algo-stable-insertion').challenge.starter);
  assert.equal(starter.ok, false);
  assert.equal(starter.compileOutput, '', 'starter must be valid C11, not a compiler-error puzzle');
});
test('D02 live API rejects FIFO code then accepts corrected code and the published starter compiles', {
  skip: spawnSync('gcc', ['--version']).status !== 0, timeout: 20000
}, async t => {
  const child = spawn(process.execPath, ['dev-server.mjs'], { env: { ...process.env, PORT: '0' }, stdio: ['ignore', 'pipe', 'pipe'] });
  t.after(async () => {
    if (child.exitCode === null) { const ended = once(child, 'exit'); child.kill(); await ended; }
  });
  const base = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(Error('D02 server startup timed out')), 5000);
    let text = '';
    child.once('error', reject);
    child.stdout.on('data', chunk => {
      text += chunk;
      const match = text.match(/http:\/\/127\.0\.0\.1:\d+/);
      if (match) { clearTimeout(timer); resolve(match[0]); }
    });
  });
  const html = await (await fetch(base)).text();
  const token = html.match(/name="codeweave-token" content="([0-9a-f]{64})"/)?.[1];
  const submit = async code => {
    const response = await fetch(base + '/api/grade', { method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-CodeWeave-Token': token },
      body: JSON.stringify({ exerciseId: 'ds-stack', code }), signal: AbortSignal.timeout(10000) });
    assert.equal(response.status, 200);
    return response.json();
  };
  const correct = "#include <stddef.h>\nstruct IntStack { int values[4]; size_t length; };\nint stack_push(struct IntStack *stack, int value) { if (stack == NULL || stack->length >= 4) return 0; stack->values[stack->length] = value; ++stack->length; return 1; }\nint stack_pop(struct IntStack *stack, int *out_value) { if (stack == NULL || out_value == NULL || stack->length == 0 || stack->length > 4) return 0; int value = stack->values[stack->length - 1]; --stack->length; *out_value = value; return 1; }\n";
  const wrong = correct.replace('stack->values[stack->length - 1]', 'stack->values[0]');
  const bad = await submit(wrong);
  assert.equal(bad.ok, false);
  assert.equal(bad.tests[2].passed, false, 'public two-element case must reject FIFO');
  assert.equal(bad.tests.length, 10);
  const good = await submit(correct);
  assert.equal(good.ok, true);
  assert.equal(good.message, '10/10개 테스트 통과');
  const starter = await submit(lessons.find(lesson => lesson.id === 'ds-stack').challenge.starter);
  assert.equal(starter.ok, false);
  assert.equal(starter.compileOutput, '', 'starter must be valid C11, not a compiler-error puzzle');
});

test('accepted C07 retains its owned-stream contract and replays its historical D04 handoff', async () => {
  const { data, api } = await load();
  const unit = data.stages.find(stage => stage.id === 'C').units.find(item => item.id === 'C07');
  assert.equal(unit.status, '완료');
  assert.deepEqual(unit.lessonIds, ['c-owned-stream-byte']);
  assert.ok(unit.tests.includes('tests/roadmap.test.mjs'));
  assert.equal(unit.acceptance.review, 'docs/C07_ACCEPTANCE.md');
  await readFile(new URL('../' + unit.acceptance.review, import.meta.url), 'utf8');
  assert.deepEqual(unit.acceptance.platforms, ['linux-glibc', 'macos']);
  assert.equal(unit.acceptance.sourceSha, 'f57b8b520b0b6a6a4a5375d6008e22e71dbad876');
  assert.equal(unit.acceptance.ci, 'https://github.com/cys123431-ship-it/CodeWeave/actions/runs/39390328907');
  const { ownedStreamExercise } = await import('../server/owned-stream-exercise.mjs');
  assert.deepEqual(gradingExercises.get('c-owned-stream-byte'), ownedStreamExercise);
  assert.equal(ownedStreamExercise.cases.length, 12);
  const historical = structuredClone(data);
  historical.stages.find(stage => stage.id === 'D').units.find(item => item.id === 'D04').status = '진행 중';
  historical.next = { track: 'D', unit: 'D04' };
  assert.equal(api.selectUnit(historical, 'D').id, 'D04');
  assert.equal(api.validateRoadmap(historical), true);
  assert.equal(api.validateRoadmap(data), true);
  const checked = spawnSync(process.execPath, ['--check', (await import('node:url')).fileURLToPath(import.meta.url)], { encoding: 'utf8' });
  assert.equal(checked.status, 0, checked.stderr);
  const rendered = spawnSync(process.execPath, ['scripts/roadmap.mjs', '--check'], { encoding: 'utf8' });
  assert.equal(rendered.status, 0, rendered.stderr);
});

test('historical C07 replay remains pending while live C selection advances to C08 without mutating progress', async () => {
  const { data, api } = await load();
  const live = structuredClone(data);
  live.stages.find(stage => stage.id === 'C').units.find(unit => unit.id === 'C08').status = '진행 중';
  const before = structuredClone(live);
  assert.equal(api.selectUnit(live, 'C').id, 'C08');
  const historical = structuredClone(live);
  historical.stages.find(stage => stage.id === 'C').units.find(unit => unit.id === 'C07').status = '진행 중';
  assert.equal(api.selectUnit(historical, 'C').id, 'C07');
  assert.deepEqual(live, before);
});

test('D04 delivers the prepared array list contract through catalog without leaking harness cases', async () => {
  const { arrayListExercise, arrayListMetadata, arrayListStarter } = await import('../server/array-list-exercise.mjs');
  const lesson = lessons.find(item => item.id === 'ds-array-list');
  assert.ok(lesson, 'D04 must be learner-facing');
  assert.equal(lesson.track, 'ds');
  assert.equal(lesson.figure, 'array-list-shifts');
  assert.deepEqual(exerciseById(lesson.id), { ...arrayListMetadata, requiredFiles: [] });
  assert.deepEqual(gradingExercises.get(lesson.id), arrayListExercise);
  assert.equal(Object.hasOwn(exerciseById(lesson.id), 'harness'), false);
  assert.equal(lesson.challenge.starter, arrayListStarter);
  assert.equal(lesson.challenge.input, arrayListMetadata.publicExample.input);
  assert.equal(lesson.challenge.expected, arrayListMetadata.publicExample.output);
  const manuscript = await readFile(new URL('../content/ds/04-array-list.md', import.meta.url), 'utf8');
  const program = manuscript.match(/\x60\x60\x60c\n([\s\S]*?)\n\x60\x60\x60/)[1];
  assert.ok(lesson.sections.some(section => section.code?.trim() === program.trim()));
  assert.deepEqual(lesson.quiz.options, ['0', '2', '3', '4']);
  assert.equal(lesson.quiz.answer, 1);
  const { data, api } = await load();
  const unit = data.stages.find(stage => stage.id === 'D').units.find(item => item.id === 'D04');
  assert.deepEqual(unit.lessonIds, [lesson.id]);
  for (const file of ['tests/array-list-exercise.test.mjs', 'tests/roadmap.test.mjs', 'tests/browser-practice.mjs']) assert.ok(unit.tests.includes(file));
  assert.equal(api.validateRoadmap(data), true);
  for (const file of ['src/catalog.js', 'src/exercises.js', 'server/grading-exercises.mjs', 'tests/browser-practice.mjs', 'tests/roadmap.test.mjs']) {
    const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
  }
});

test('D04 authenticated API grades actual starter wrong shift and corrected code against all ten cases', () => {
  const result = spawnSync(process.execPath, ['tests/browser-practice.mjs', '--array-list-http-only'], { encoding: 'utf8', timeout: 30000 });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /PASS: D04 authenticated actual GCC/);
});

test('accepted D04 records verified delivery and preserves its E04 handoff through later rotations', async () => {
  const { data, api } = await load();
  const unit = data.stages.find(stage => stage.id === 'D').units.find(item => item.id === 'D04');
  assert.equal(unit.status, '완료');
  assert.deepEqual(unit.lessonIds, ['ds-array-list']);
  assert.equal(unit.acceptance.scope, 'existing-capacity-insert-erase');
  assert.equal(unit.acceptance.sourceSha, 'ae5760f52cf813946248875c6e932fcd7fa1bdda');
  assert.equal(unit.acceptance.ci, 'https://github.com/cys123431-ship-it/CodeWeave/actions/runs/39413773136');
  assert.deepEqual(unit.acceptance.checks, ['theory', 'compiled-example', 'quiz-retry', 'actual-grading', 'correction-retry', 'shared-history', 'backup-restore', 'mastery-next', 'offline', '390px']);
  assert.equal(gradingExercises.get('ds-array-list').cases.length, 10);
  const historical = structuredClone(data);
  historical.stages.find(stage => stage.id === 'E').units.find(item => item.id === 'E04').status = '진행 중';
  const track = api.nextTurn('D');
  assert.equal(track, 'E');
  assert.equal(api.selectUnit(historical, track).id, 'E04');
  historical.next = { track, unit: 'E04' };
  assert.equal(api.validateRoadmap(historical), true);
  assert.equal(api.validateRoadmap(data), true);
});

test('E04 delivers original permutation contract through catalog and roadmap without leaking cases', async () => {
  const { permutationsExercise, permutationsMetadata, permutationsStarter } = await import('../server/permutations-exercise.mjs');
  const lesson = lessons.find(item => item.id === 'algo-permutations');
  assert.ok(lesson, 'E04 must be learner-facing');
  assert.equal(lesson.track, 'algo');
  assert.equal(lesson.figure, 'permutation-backtrack');
  assert.deepEqual(exerciseById(lesson.id), { ...permutationsMetadata, requiredFiles: [] });
  assert.deepEqual(gradingExercises.get(lesson.id), permutationsExercise);
  assert.equal(Object.hasOwn(exerciseById(lesson.id), 'harness'), false);
  assert.equal(lesson.challenge.starter, permutationsStarter);
  assert.equal(lesson.challenge.input, permutationsMetadata.publicExample.input);
  assert.equal(lesson.challenge.expected, permutationsMetadata.publicExample.output);
  const manuscript = await readFile(new URL('../content/algo/04-backtracking-permutations.md', import.meta.url), 'utf8');
  const program = manuscript.match(/\x60\x60\x60c\n([\s\S]*?)\n\x60\x60\x60/)[1];
  assert.ok(lesson.sections.some(section => section.code?.trim() === program.trim()));
  assert.deepEqual(lesson.quiz.options, ['행 개수 증가', '재귀 뒤 같은 두 칸 재교환', 'pos를 전역에 저장', '출력을 정렬']);
  assert.equal(lesson.quiz.answer, 1);
  assert.equal(lessons[lessons.findIndex(item => item.id === 'algo-merge') + 1].id, lesson.id);
  const { data, api } = await load();
  const unit = data.stages.find(stage => stage.id === 'E').units.find(item => item.id === 'E04');
  assert.deepEqual(unit.lessonIds, [lesson.id]);
  for (const file of ['tests/permutations-exercise.test.mjs', 'tests/roadmap.test.mjs', 'tests/browser-practice.mjs']) assert.ok(unit.tests.includes(file));
  assert.equal(api.validateRoadmap(data), true);
  for (const file of ['src/catalog.js', 'src/exercises.js', 'server/grading-exercises.mjs', 'tests/browser-practice.mjs', 'tests/roadmap.test.mjs']) {
    const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
  }
});

test('E04 authenticated API rejects starter and missing undo then accepts correction across ten cases', () => {
  const result = spawnSync(process.execPath, ['tests/browser-practice.mjs', '--permutations-http-only'], { encoding: 'utf8', timeout: 30000 });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /PASS: E04 authenticated actual GCC/);
});

test('accepted E04 records verified permutation delivery and preserves its F03 handoff through later rotations', async () => {
  const { data, api } = await load();
  const unit = data.stages.find(stage => stage.id === 'E').units.find(item => item.id === 'E04');
  assert.equal(unit.status, '완료');
  assert.deepEqual(unit.lessonIds, ['algo-permutations']);
  assert.equal(unit.acceptance.scope, 'swap-dfs-permutations-and-restoration');
  assert.equal(unit.acceptance.sourceSha, '1b58a5d2a71a56b0759a0f0c6c0639bd4928d48b');
  assert.equal(unit.acceptance.ci, 'https://github.com/cys123431-ship-it/CodeWeave/actions/runs/39446801185/job/118710743631');
  assert.deepEqual(unit.acceptance.platforms, ['linux']);
  assert.deepEqual(unit.acceptance.checks, ['theory', 'compiled-example', 'quiz-retry', 'actual-grading', 'correction-retry', 'shared-history', 'backup-restore', 'mastery-next', 'offline', '390px']);
  assert.equal(gradingExercises.get('algo-permutations').cases.length, 10);
  const historical = structuredClone(data);
  const historicalF03 = historical.stages.find(stage => stage.id === 'F').units.find(item => item.id === 'F03');
  historicalF03.status = '진행 중';
  delete historicalF03.practiceDelivery;
  const track = api.nextTurn('E');
  assert.equal(track, 'F-G');
  assert.equal(api.selectUnit(historical, track).id, 'F03');
  historical.next = { track, unit: 'F03' };
  assert.equal(api.validateRoadmap(historical), true);
  assert.equal(api.validateRoadmap(data), true);
});
