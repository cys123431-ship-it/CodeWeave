// Optional integration suite: Node.js, GCC, Playwright and Chromium required.
// Run with: npm run test:browser. No browser dependency enters the shipped app.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';
import { mkdir, mkdtemp, realpath, readdir, rm, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import os from 'node:os';
import { serializeMultiFileSubmission } from '../src/multi-file.js';
import { createLearningServer } from '../server/learning-server.mjs';
import { createRustGradingService } from '../server/rust-service.mjs';
import { createRustGradingDefinitions, createRustBindingDefinitions } from '../server/rust-exercises.mjs';
import { controlDefinition, controlMetadata, createRustControlDefinitions } from '../server/rust-control-flow-exercise.mjs';
import { functionDefinition, functionMetadata, createRustFunctionDefinitions } from '../server/rust-functions-exercise.mjs';
import { parseRustArgs } from '../scripts/start-rust.mjs';
import { recordRustPracticeDelivery, renderRoadmap } from '../scripts/roadmap.mjs';
import { createAttemptBackup } from '../src/attempt-backup.js';
import { createLocalRustGradingService } from '../server/rust-executor.mjs';
import { trustedRustTools } from './helpers/rust-tools.mjs';
import { lessons as c06Lessons } from '../src/catalog.js';
import { exerciseById as c06ExerciseById } from '../src/exercises.js';
import { gradingExercises as c06Graders } from '../server/grading-exercises.mjs';
import { preprocessorExercise, preprocessorStarter } from '../server/preprocessor-exercise.mjs';
import { queueExercise, queueMetadata, queueStarter } from '../server/queue-exercise.mjs';
import { mergeExercise, mergeMetadata, mergeStarter } from '../server/merge-exercise.mjs';

import { ownedStreamStarter } from '../server/owned-stream-exercise.mjs';
const ownedManuscript = await readFile(new URL('../content/c/24-owned-stream-errors.md', import.meta.url), 'utf8');
const ownedCorrect = ownedManuscript.match(/\x60\x60\x60c\n([\s\S]*?)\n\x60\x60\x60/)[1].split('int main(void)')[0];
const ownedWrong = ownedCorrect.replace('int closed = fclose(stream);', '(void)fclose(stream);\n    int closed = 0;');

import { callbackSortStarter } from '../server/callback-sort-exercise.mjs';
const callbackManuscript = await readFile(new URL('../content/c/25-qsort-function-pointers.md', import.meta.url), 'utf8');
const callbackProgram = callbackManuscript.match(/\x60\x60\x60c\n([\s\S]*?)\n\x60\x60\x60/)[1];
const callbackCorrect = callbackProgram.split('static int ascending')[0];
const callbackWrong = callbackCorrect.replace('qsort(values, count,', 'qsort(values, count - 1,');


const mergeManuscript = await readFile(new URL('../content/algo/03-merge-sort.md', import.meta.url), 'utf8');
const mergeProgram = mergeManuscript.match(/```c\n([\s\S]*?)\n```/)[1];
const mergeCorrect = mergeProgram.split('int main(void)')[0];
const mergeWrong = mergeCorrect.replace('while (j < right) scratch[k++] = values[j++];', 'while (j < right) { ++k; ++j; }');

import { arrayListExercise, arrayListMetadata, arrayListStarter } from '../server/array-list-exercise.mjs';
const arrayListManuscript = await readFile(new URL('../content/ds/04-array-list.md', import.meta.url), 'utf8');
const arrayListProgram = arrayListManuscript.match(/\x60\x60\x60c\n([\s\S]*?)\n\x60\x60\x60/)[1];
const arrayListCorrect = arrayListProgram.split('int main(void)')[0];
const arrayListWrong = arrayListCorrect.replace('list->values[i] = list->values[i - 1];', 'list->values[i - 1] = list->values[i];');
import { ownedListExercise, ownedListMetadata, ownedListStarter } from '../server/owned-list-exercise.mjs';
const ownedListManuscript = await readFile(new URL('../content/ds/05-owned-linked-list.md', import.meta.url), 'utf8');
const ownedListProgram = ownedListManuscript.match(/\x60\x60\x60c\n([\s\S]*?)\n\x60\x60\x60/)[1];
const ownedListCorrect = ownedListProgram.split('#include <stdio.h>')[0];
const ownedListWrong = ownedListCorrect.replace('node->next = *head;', 'node->next = NULL;');
import { permutationsExercise, permutationsMetadata, permutationsStarter } from '../server/permutations-exercise.mjs';
const permutationsManuscript = await readFile(new URL('../content/algo/04-backtracking-permutations.md', import.meta.url), 'utf8');
const permutationsProgram = permutationsManuscript.match(/\x60\x60\x60c\n([\s\S]*?)\n\x60\x60\x60/)[1];
const permutationsCorrect = permutationsProgram.split('int main(void)')[0];
const permutationsWrong = permutationsCorrect.replace('exchange(values + pos, values + i); /* undo */', '(void)0; /* undo omitted */');
import { activitySelectionExercise, activitySelectionMetadata, activitySelectionStarter } from '../server/greedy-activity-exercise.mjs';
const activityManuscript = await readFile(new URL('../content/algo/05-greedy-activity-selection.md', import.meta.url), 'utf8');
const activityProgram = activityManuscript.match(/\x60\x60\x60c\n([\s\S]*?)\n\x60\x60\x60/)[1];
const activityCorrect = activityProgram.split('int main(void)')[0];
const activityWrong = activityCorrect.replace('activities[i].start >= last_finish', 'activities[i].start > last_finish');
const controlManuscript = await readFile(new URL('../content/rust/03-control-flow.md', import.meta.url), 'utf8');
const controlProgram = controlManuscript.match(/```rust\n([\s\S]*?)\n```/)[1];
const controlCorrect = controlProgram.split('fn main()')[0].trim();
const controlWrong = controlCorrect.replace('0..=end', '0..end');
const functionManuscript = await readFile(new URL('../content/rust/04-functions.md', import.meta.url), 'utf8');
const functionProgram = functionManuscript.match(/```rust\n([\s\S]*?)\n```/)[1];
const functionCorrect = functionProgram.split('fn main()')[0].trim();
const functionWrong = functionCorrect.replace('line_total(unit_price, quantity) + shipping', 'line_total(unit_price, quantity)');
const roadmapData = JSON.parse(await readFile(new URL('../docs/roadmap.json', import.meta.url), 'utf8'));

function verifyControlFlowAcceptanceContract() {
  const cliBase = ['--trusted-personal-code', '--sysroot', '/trusted/tools',
    '--workspace-parent', '/trusted/work'];
  assert.deepEqual(parseRustArgs([...cliBase, '--include-control-flow']), {
    port: 4173, sysroot: '/trusted/tools', parent: '/trusted/work', includeControlFlow: true
  });
  assert.throws(() => parseRustArgs([...cliBase, '--include-f03']), TypeError);
  assert.throws(() => parseRustArgs([...cliBase, '--include-f02', '--include-control-flow']), TypeError);
  const lesson = c06Lessons.find(item => item.id === controlMetadata.id);
  assert.ok(lesson, 'F03 must be reachable from the learner catalog');
  assert.equal(lesson.track, 'rust');
  assert.equal(lesson.figure, 'rust-control-flow');
  assert.equal(lesson.sections.length, 14);
  assert.deepEqual(c06ExerciseById(lesson.id), {
    ...controlMetadata, kind: 'concept', language: 'rust', grader: null, requiredFiles: []
  });
  assert.equal(lesson.challenge.starter, controlDefinition.starter.trimEnd());
  assert.equal(lesson.challenge.input, controlMetadata.publicExample.input);
  assert.equal(lesson.challenge.expected, controlMetadata.publicExample.output);
  assert.ok(lesson.sections.some(section => section.code?.trim() === controlProgram.trim()));
  assert.deepEqual(lesson.quiz.options, ['2', '2·4', '1·3', '2·4·6·8·10']);
  assert.equal(lesson.quiz.answer, 0);
  assert.deepEqual(createRustControlDefinitions().get(lesson.id), controlDefinition);
  assert.equal(Object.hasOwn(c06ExerciseById(lesson.id), 'harness'), false);

  const prepared = JSON.parse(JSON.stringify(roadmapData));
  // Freeze this historical F03 handoff at its delivery-time state. The live roadmap
  // now has C08 completed and rotates to D05, but F03 originally handed off to C08.
  const c08 = prepared.stages.find(stage => stage.id === 'C').units.find(unit => unit.id === 'C08');
  c08.status = '진행 중';
  const f03 = prepared.stages.find(stage => stage.id === 'F').units.find(unit => unit.id === 'F03');
  f03.status = '진행 중';
  delete f03.practiceDelivery;
  f03.lessonIds = ['rust-control-flow'];
  if (!f03.tests.includes('tests/browser-practice.mjs')) f03.tests.push('tests/browser-practice.mjs');
  prepared.next = { track: 'F-G', unit: 'F03' };
  const evidence = {
    unitId: 'F03', scope: 'trusted-local-cargo', exerciseId: 'rust-control-flow',
    commit: 'a'.repeat(40),
    ci: 'https://github.com/cys123431-ship-it/CodeWeave/actions/runs/1',
    checks: ['theory', 'example-tests', 'quiz-retry', 'actual-grading', 'correction-retry',
      'backup', 'mastery-next', 'explicit-start', 'offline'],
    platforms: ['linux'], review: 'docs/ROADMAP.md',
    operatorFlags: ['--include-control-flow']
  };
  const accepted = recordRustPracticeDelivery(prepared, evidence);
  const acceptedF03 = accepted.stages.find(stage => stage.id === 'F').units.find(unit => unit.id === 'F03');
  assert.equal(acceptedF03.status, '완료');
  assert.deepEqual(accepted.next, { track: 'C', unit: 'C08' });
  assert.match(renderRoadmap(accepted), /F03 로컬 Cargo 인수 범위/);
  assert.throws(() => recordRustPracticeDelivery(prepared, {
    ...evidence, checks: evidence.checks.filter(check => check !== 'backup')
  }), /채점 인수/);
  assert.throws(() => recordRustPracticeDelivery(prepared, {
    ...evidence, operatorFlags: ['--include-f03']
  }), /채점 인수/);
  console.log('PASS: F03 catalog, explicit CLI flag and evidence-gated acceptance contract match');
}
function verifyPermutationsContract() {
  const lesson = c06Lessons.find(item => item.id === 'algo-permutations');
  assert.ok(lesson, 'E04 must be reachable from the learner catalog');
  assert.equal(lesson.track, 'algo');
  assert.equal(lesson.figure, 'permutation-backtrack');
  assert.deepEqual(c06ExerciseById(lesson.id), { ...permutationsMetadata, requiredFiles: [] });
  assert.deepEqual(c06Graders.get(lesson.id), permutationsExercise);
  assert.equal(lesson.challenge.starter, permutationsStarter);
  assert.equal(lesson.challenge.input, permutationsMetadata.publicExample.input);
  assert.equal(lesson.challenge.expected, permutationsMetadata.publicExample.output);
  assert.ok(lesson.sections.some(section => section.code?.trim() === permutationsProgram.trim()));
  assert.deepEqual(lesson.quiz.options, ['행 개수 증가', '재귀 뒤 같은 두 칸 재교환', 'pos를 전역에 저장', '출력을 정렬']);
  assert.equal(lesson.quiz.answer, 1);
  assert.equal(Object.hasOwn(c06ExerciseById(lesson.id), 'harness'), false);
  console.log('PASS: E04 learner catalog, compiled original example, starter and private ten-case definition match');
}
async function verifyPermutationsHTTP() {
  const app = createLearningServer({ root: fileURLToPath(new URL('../', import.meta.url)) });
  try {
    const { port } = await app.listen(0);
    const base = 'http://127.0.0.1:' + port;
    const response = await fetch(base);
    assert.equal(response.status, 200);
    const token = (await response.text()).match(/name="codeweave-token" content="([a-f0-9]{64})"/)?.[1];
    assert.match(token, /^[a-f0-9]{64}$/);
    assert.notEqual(permutationsWrong, permutationsCorrect);
    for (const [code, ok] of [[permutationsStarter, false], [permutationsWrong, false], [permutationsCorrect, true]]) {
      const response = await fetch(base + '/api/grade', { method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CodeWeave-Token': token },
        body: JSON.stringify({ exerciseId: permutationsExercise.id, code }), signal: AbortSignal.timeout(10000) });
      assert.equal(response.status, 200);
      const result = await response.json();
      assert.equal(result.ok, ok, JSON.stringify(result));
      assert.equal(result.tests.length, 10);
      assert.equal(result.compileOutput, '');
      if (ok) assert.equal(result.message, '10/10개 테스트 통과');
    }
    console.log('PASS: E04 authenticated actual GCC rejects starter/missing undo and accepts correction 10/10');
  } finally {
    await app.close();
  }
}
if (process.argv.includes('--permutations-http-only')) {
  await verifyPermutationsHTTP();
  process.exit(0);
}
verifyControlFlowAcceptanceContract();

function verifyFunctionAcceptanceContract() {
  const cliBase = ['--trusted-personal-code', '--sysroot', '/trusted/tools',
    '--workspace-parent', '/trusted/work'];
  assert.deepEqual(parseRustArgs([...cliBase, '--include-functions']), {
    port: 4173, sysroot: '/trusted/tools', parent: '/trusted/work', includeFunctions: true
  });
  assert.throws(() => parseRustArgs([...cliBase, '--include-control-flow', '--include-functions']), TypeError);
  const lesson = c06Lessons.find(item => item.id === functionMetadata.id);
  assert.ok(lesson, 'F04 must be reachable from the learner catalog');
  assert.equal(lesson.track, 'rust');
  assert.equal(lesson.figure, 'rust-function-return');
  assert.equal(lesson.sections.length, 13);
  assert.deepEqual(c06ExerciseById(lesson.id), {
    ...functionMetadata, kind: 'concept', language: 'rust', grader: null, requiredFiles: []
  });
  assert.equal(lesson.challenge.starter, functionDefinition.starter);
  assert.equal(lesson.challenge.input, functionMetadata.publicExample.input);
  assert.equal(lesson.challenge.expected, functionMetadata.publicExample.output);
  assert.ok(lesson.sections.some(section => section.code?.trim() === functionProgram.trim()));
  assert.deepEqual(createRustFunctionDefinitions().get(lesson.id), functionDefinition);

  const prepared = structuredClone(roadmapData);
  const f04 = prepared.stages.find(stage => stage.id === 'F').units.find(unit => unit.id === 'F04');
  f04.lessonIds = ['rust-functions'];
  if (!f04.tests.includes('tests/browser-practice.mjs')) f04.tests.push('tests/browser-practice.mjs');
  prepared.next = { track: 'F-G', unit: 'F04' };
  const evidence = {
    unitId: 'F04', scope: 'trusted-local-cargo', exerciseId: 'rust-functions',
    commit: 'b'.repeat(40), ci: 'https://github.com/cys123431-ship-it/CodeWeave/actions/runs/2',
    checks: ['theory', 'example-tests', 'quiz-retry', 'actual-grading', 'correction-retry',
      'backup', 'mastery-next', 'explicit-start', 'offline'],
    platforms: ['linux'], review: 'docs/ROADMAP.md', operatorFlags: ['--include-functions']
  };
  const accepted = recordRustPracticeDelivery(prepared, evidence);
  assert.equal(accepted.stages.find(stage => stage.id === 'F').units.find(unit => unit.id === 'F04').status, '완료');
  assert.deepEqual(accepted.next, { track: 'D', unit: 'D06' });
  assert.throws(() => recordRustPracticeDelivery(prepared, {
    ...evidence, operatorFlags: ['--include-control-flow']
  }), /채점 인수/);
  console.log('PASS: F04 catalog, explicit CLI flag and evidence-gated acceptance contract match');
}
verifyFunctionAcceptanceContract();
function verifyActivitySelectionContract() {
  const lesson = c06Lessons.find(item => item.id === activitySelectionMetadata.id);
  assert.ok(lesson, 'E05 must be reachable from the learner catalog');
  assert.equal(lesson.track, 'algo');
  assert.deepEqual(c06ExerciseById(lesson.id), { ...activitySelectionMetadata, requiredFiles: [] });
  assert.deepEqual(c06Graders.get(lesson.id), activitySelectionExercise);
  assert.equal(lesson.challenge.starter, activitySelectionStarter);
  assert.equal(lesson.challenge.input, activitySelectionMetadata.publicExample.input);
  assert.equal(lesson.challenge.expected, activitySelectionMetadata.publicExample.output);
  assert.ok(lesson.sections.some(section => section.code?.trim() === activityProgram.trim()));
  assert.equal(lesson.sections.length, 12);
  assert.deepEqual(lesson.quiz.options, ['가장 이른 시작', '가장 짧은 길이', '가장 이른 종료', '가장 늦은 종료']);
  assert.equal(lesson.quiz.answer, 2);
  assert.equal(Object.hasOwn(c06ExerciseById(lesson.id), 'harness'), false);
  console.log('PASS: E05 learner catalog, compiled example, starter and private ten-case definition match');
}
async function verifyActivitySelectionHTTP() {
  const app = createLearningServer({ root: fileURLToPath(new URL('../', import.meta.url)) });
  try {
    const { port } = await app.listen(0);
    const base = 'http://127.0.0.1:' + port;
    const response = await fetch(base);
    assert.equal(response.status, 200);
    const token = (await response.text()).match(/name="codeweave-token" content="([a-f0-9]{64})"/)?.[1];
    assert.match(token, /^[a-f0-9]{64}$/);
    assert.notEqual(activityWrong, activityCorrect);
    for (const [code, ok] of [[activitySelectionStarter, false], [activityWrong, false], [activityCorrect, true]]) {
      const graded = await fetch(base + '/api/grade', { method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CodeWeave-Token': token },
        body: JSON.stringify({ exerciseId: activitySelectionExercise.id, code }), signal: AbortSignal.timeout(10000) });
      assert.equal(graded.status, 200);
      const result = await graded.json();
      assert.equal(result.ok, ok, JSON.stringify(result));
      assert.equal(result.tests.length, 10);
      assert.equal(result.compileOutput, '');
      if (ok) assert.equal(result.message, '10/10개 테스트 통과');
    }
    console.log('PASS: E05 authenticated actual GCC rejects starter/strict endpoint and accepts correction 10/10');
  } finally {
    await app.close();
  }
}
if (process.argv.includes('--activity-http-only')) {
  await verifyActivitySelectionHTTP();
  process.exit(0);
}
verifyActivitySelectionContract();
await verifyActivitySelectionHTTP();
if (process.argv.includes('--activity-contract-only')) process.exit(0);
verifyPermutationsContract();
await verifyPermutationsHTTP();
if (process.argv.includes('--permutations-contract-only')) process.exit(0);

function verifyArrayListContract() {
  const lesson = c06Lessons.find(item => item.id === 'ds-array-list');
  assert.ok(lesson, 'D04 must be reachable from the learner catalog');
  assert.equal(lesson.track, 'ds');
  assert.equal(lesson.figure, 'array-list-shifts');
  assert.deepEqual(c06ExerciseById(lesson.id), { ...arrayListMetadata, requiredFiles: [] });
  assert.deepEqual(c06Graders.get(lesson.id), arrayListExercise);
  assert.equal(lesson.challenge.starter, arrayListStarter);
  assert.equal(lesson.challenge.input, arrayListMetadata.publicExample.input);
  assert.equal(lesson.challenge.expected, arrayListMetadata.publicExample.output);
  assert.ok(lesson.sections.some(section => section.code?.trim() === arrayListProgram.trim()));
  assert.deepEqual(lesson.quiz.options, ['0', '2', '3', '4']);
  assert.equal(lesson.quiz.answer, 1);
  assert.equal(Object.hasOwn(c06ExerciseById(lesson.id), 'harness'), false);
  console.log('PASS: D04 learner catalog, compiled original example, starter and private ten-case definition match');
}
async function verifyArrayListHTTP() {
  const app = createLearningServer({ root: fileURLToPath(new URL('../', import.meta.url)) });
  try {
    const { port } = await app.listen(0);
    const base = 'http://127.0.0.1:' + port;
    const response = await fetch(base);
    assert.equal(response.status, 200);
    const token = (await response.text()).match(/name="codeweave-token" content="([a-f0-9]{64})"/)?.[1];
    assert.match(token, /^[a-f0-9]{64}$/);
    assert.notEqual(arrayListWrong, arrayListCorrect);
    for (const [code, ok] of [[arrayListStarter, false], [arrayListWrong, false], [arrayListCorrect, true]]) {
      const response = await fetch(base + '/api/grade', { method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CodeWeave-Token': token },
        body: JSON.stringify({ exerciseId: arrayListExercise.id, code }), signal: AbortSignal.timeout(10000) });
      assert.equal(response.status, 200);
      const result = await response.json();
      assert.equal(result.ok, ok, JSON.stringify(result));
      assert.equal(result.tests.length, 10);
      assert.equal(result.compileOutput, '');
      if (ok) assert.equal(result.message, '10/10개 테스트 통과');
    }
    console.log('PASS: D04 authenticated actual GCC rejects starter/wrong shift and accepts correction 10/10');
  } finally {
    await app.close();
  }
}
if (process.argv.includes('--array-list-http-only')) {
  await verifyArrayListHTTP();
  process.exit(0);
}
verifyArrayListContract();
await verifyArrayListHTTP();
if (process.argv.includes('--array-list-contract-only')) process.exit(0);

function verifyOwnedListContract() {
  const lesson = c06Lessons.find(item => item.id === ownedListMetadata.id);
  assert.ok(lesson, 'D05 must be reachable from the learner catalog');
  assert.equal(lesson.track, 'ds');
  assert.equal(lesson.figure, 'list-first-match');
  assert.deepEqual(c06ExerciseById(lesson.id), { ...ownedListMetadata, requiredFiles: [] });
  assert.deepEqual(c06Graders.get(lesson.id), ownedListExercise);
  assert.equal(lesson.challenge.starter, ownedListStarter);
  assert.equal(lesson.challenge.input, ownedListMetadata.publicExample.input);
  assert.equal(lesson.challenge.expected, ownedListMetadata.publicExample.output);
  assert.ok(lesson.sections.some(section => section.code?.trim() === ownedListCorrect.trim()));
  assert.deepEqual(lesson.quiz.options, ['머리를 NULL로 설정', '이전 링크를 다음 노드에 연결', '값을 0으로 변경', '다음 노드도 해제']);
  assert.equal(lesson.quiz.answer, 1);
  assert.equal(Object.hasOwn(c06ExerciseById(lesson.id), 'harness'), false);
  console.log('PASS: D05 learner catalog, compiled example, starter and private ten-case definition match');
}
async function verifyOwnedListHTTP() {
  const app = createLearningServer({ root: fileURLToPath(new URL('../', import.meta.url)) });
  try {
    const { port } = await app.listen(0);
    const base = 'http://127.0.0.1:' + port;
    const response = await fetch(base);
    assert.equal(response.status, 200);
    const token = (await response.text()).match(/name="codeweave-token" content="([a-f0-9]{64})"/)?.[1];
    assert.match(token, /^[a-f0-9]{64}$/);
    assert.notEqual(ownedListWrong, ownedListCorrect);
    for (const [code, ok] of [[ownedListStarter, false], [ownedListWrong, false], [ownedListCorrect, true]]) {
      const graded = await fetch(base + '/api/grade', { method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CodeWeave-Token': token },
        body: JSON.stringify({ exerciseId: ownedListExercise.id, code }), signal: AbortSignal.timeout(10000) });
      assert.equal(graded.status, 200);
      const result = await graded.json();
      assert.equal(result.ok, ok, JSON.stringify(result));
      assert.equal(result.tests.length, 10);
      assert.equal(result.compileOutput, '');
      if (ok) assert.equal(result.message, '10/10개 테스트 통과');
    }
    console.log('D05 owned-list HTTP acceptance passed');
  } finally {
    await app.close();
  }
}
if (process.argv.includes('--owned-list-http-only')) {
  await verifyOwnedListHTTP();
  process.exit(0);
}
verifyOwnedListContract();
await verifyOwnedListHTTP();
if (process.argv.includes('--owned-list-contract-only')) process.exit(0);

function verifyMergeContract() {
  const lesson = c06Lessons.find(item => item.id === 'algo-merge');
  assert.ok(lesson, 'E03 must be reachable from the learner catalog');
  assert.equal(lesson.track, 'algo');
  assert.equal(lesson.figure, 'merge-auxiliary');
  assert.deepEqual(c06ExerciseById(lesson.id), { ...mergeMetadata, requiredFiles: [] });
  assert.deepEqual(c06Graders.get(lesson.id), mergeExercise);
  assert.equal(lesson.challenge.starter, mergeStarter);
  assert.equal(lesson.challenge.input, mergeMetadata.publicExample.input);
  assert.equal(lesson.challenge.expected, mergeMetadata.publicExample.output);
  assert.ok(lesson.sections.some(section => section.code?.trim() === mergeProgram.trim()));
  assert.deepEqual(lesson.quiz.options, ['1', '2', '3', '5']);
  assert.equal(lesson.quiz.answer, 1);
  assert.equal(Object.hasOwn(c06ExerciseById(lesson.id), 'harness'), false);
  console.log('PASS: E03 catalog, compiled manuscript, starter, public example and original ten-case private contract match');
}
async function verifyMergeHTTP() {
  const app = createLearningServer({ root: fileURLToPath(new URL('../', import.meta.url)) });
  try {
    const { port } = await app.listen(0);
    const base = 'http://127.0.0.1:' + port;
    const response = await fetch(base);
    assert.equal(response.status, 200);
    const token = (await response.text()).match(/name="codeweave-token" content="([a-f0-9]{64})"/)?.[1];
    assert.match(token, /^[a-f0-9]{64}$/);
    assert.notEqual(mergeWrong, mergeCorrect);
    for (const [code, ok] of [[mergeWrong, false], [mergeCorrect, true]]) {
      const response = await fetch(base + '/api/grade', { method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CodeWeave-Token': token },
        body: JSON.stringify({ exerciseId: mergeExercise.id, code }), signal: AbortSignal.timeout(10000) });
      assert.equal(response.status, 200);
      const result = await response.json();
      assert.equal(result.ok, ok, JSON.stringify(result));
      assert.equal(result.tests.length, 10);
    }
    console.log('PASS: E03 authenticated real GCC HTTP rejects missing remainder then accepts correction 10/10');
  } finally {
    await app.close();
  }
}
if (process.argv.includes('--merge-http-only')) {
  await verifyMergeHTTP();
  process.exit(0);
}
verifyMergeContract();
await verifyMergeHTTP();
if (process.argv.includes('--merge-contract-only')) process.exit(0);

const queueManuscript = await readFile(new URL('../content/ds/03-queue.md', import.meta.url), 'utf8');
const queueCorrect = queueManuscript.match(/```c\n([\s\S]*?)\n```/)[1].split('int main(void)')[0];
const queueLIFO = queueCorrect.replace('q->values[q->head];', 'q->values[(q->head + q->length - 1) % 4];');

async function verifyQueueContract() {
  const lesson = c06Lessons.find(item => item.id === 'ds-queue');
  assert.ok(lesson, 'D03 must be reachable from the learner catalog');
  assert.equal(lesson.track, 'ds');
  assert.equal(lesson.figure, 'queue-circular-fifo');
  assert.deepEqual(c06ExerciseById(lesson.id), { ...queueMetadata, requiredFiles: [] });
  assert.deepEqual(c06Graders.get(lesson.id), queueExercise);
  assert.equal(lesson.challenge.starter, queueStarter);
  assert.equal(lesson.challenge.input, queueMetadata.publicExample.input);
  assert.equal(lesson.challenge.expected, queueMetadata.publicExample.output);
  const program = queueManuscript.match(/```c\n([\s\S]*?)\n```/)[1];
  assert.ok(lesson.sections.some(section => section.code?.trim() === program.trim()));
  assert.deepEqual(lesson.quiz.options, ['3', '0', '1', '4']);
  assert.equal(lesson.quiz.answer, 1);
  assert.equal(Object.hasOwn(c06ExerciseById(lesson.id), 'harness'), false);
  console.log('PASS: D03 catalog, compiled manuscript, starter, public example and original private contract match');
  const app = createLearningServer({ root: fileURLToPath(new URL('../', import.meta.url)) });
  try {
    const { port } = await app.listen(0);
    const base = 'http://127.0.0.1:' + port;
    const response = await fetch(base);
    assert.equal(response.status, 200);
    const token = (await response.text()).match(/name="codeweave-token" content="([a-f0-9]{64})"/)?.[1];
    assert.match(token, /^[a-f0-9]{64}$/);
    assert.notEqual(queueLIFO, queueCorrect);
    for (const [code, ok] of [[queueLIFO, false], [queueCorrect, true]]) {
      const response = await fetch(base + '/api/grade', { method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CodeWeave-Token': token },
        body: JSON.stringify({ exerciseId: queueExercise.id, code }), signal: AbortSignal.timeout(10000) });
      assert.equal(response.status, 200);
      const result = await response.json();
      assert.equal(result.ok, ok, JSON.stringify(result));
      assert.equal(result.tests.length, 10);
    }
    console.log('PASS: D03 authenticated real GCC HTTP rejects LIFO then accepts FIFO correction 10/10');
  } finally {
    await app.close();
  }
}
await verifyQueueContract();
if (process.argv.includes('--queue-contract-only')) process.exit(0);

const c06Correct = '#include <stddef.h>\nint take_nonnegative(int *cursor,int *out){if(!cursor||!out||cursor==out)return 0;int value=*cursor;if(value < -10000 || value > 10000)return 0;*out=value<0?0:value;*cursor=value+1;return 1;}';
const c06Wrong = c06Correct.replace('*cursor=value+1;', '*cursor=value<0?value:value+1;');
// Fast non-UI acceptance is also available without loading Playwright/Chromium.
// The regular browser suite runs the same contract and then the real UI flow.
async function verifyC06Contract() {
  const lesson = c06Lessons.find(lesson => lesson.id === 'c-preprocessor-once');
  assert.ok(lesson, 'C06 must be a learner-facing lesson');
  assert.equal(lesson.track, 'c');
  assert.equal(lesson.challenge.starter, preprocessorStarter);
  assert.equal(lesson.challenge.input, preprocessorExercise.publicExample.input);
  assert.equal(lesson.challenge.expected, preprocessorExercise.publicExample.output);
  const metadata = c06ExerciseById(lesson.id);
  assert.equal(metadata.grader, 'c-function');
  assert.deepEqual(metadata.prerequisites, preprocessorExercise.prerequisites);
  assert.deepEqual(c06Graders.get(lesson.id), preprocessorExercise);
  const manuscript = await readFile(new URL('../content/c/23-preprocessor-once.md', import.meta.url), 'utf8');
  const program = manuscript.match(/```c\n([\s\S]*?)\n```/)[1];
  assert.ok(lesson.sections.some(section => section.code?.trim() === program.trim()));
  console.log('PASS: C06 catalog, starter, public example, prepared registry and compiled manuscript remain identical');
  const app = createLearningServer({ root: fileURLToPath(new URL('../', import.meta.url)) });
  try {
    const address = await app.listen(0);
    const url = 'http://127.0.0.1:' + address.port;
    const response = await fetch(url);
    assert.equal(response.status, 200);
    const html = await response.text();
    const token = html.match(/name="codeweave-token" content="([a-f0-9]{64})"/)?.[1];
    assert.match(token, /^[a-f0-9]{64}$/);
    for (const [code, ok] of [[c06Wrong, false], [c06Correct, true]]) {
      const response = await fetch(url + '/api/grade', { method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CodeWeave-Token': token },
        body: JSON.stringify({ exerciseId: lesson.id, code }) });
      assert.equal(response.status, 200);
      const result = await response.json();
      assert.equal(result.ok, ok, JSON.stringify(result));
      assert.equal(result.tests.length, 10);
    }
    console.log('PASS: C06 authenticated real GCC HTTP rejects negative non-consumption then accepts correction 10/10');
  } finally {
    await app.close();
  }
}
await verifyC06Contract();
if (process.argv.includes('--c06-contract-only')) process.exit(0);

const require = createRequire(import.meta.url);
let playwright, expect;
try { playwright = require('playwright'); expect = require('playwright/test').expect; }
catch {
  if (!process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES) throw Error('Playwright is required for this optional suite.');
  playwright = require(path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES, 'playwright'));
  expect = require(path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES, 'playwright/test')).expect;
}
const { chromium } = playwright;
const root = fileURLToPath(new URL('../', import.meta.url));
const port = process.env.CODEWEAVE_TEST_PORT || '4187';
const base = 'http://127.0.0.1:' + port;
const server = spawn(process.execPath, ['dev-server.mjs'], { cwd: root, env: { ...process.env, PORT: port }, stdio: ['ignore', 'pipe', 'pipe'] });
let output = '';
server.stdout.on('data', chunk => { output += chunk; });
server.stderr.on('data', chunk => { output += chunk; });
let browser, context, page;
const errors = [];
const qaDir = process.env.CODEWEAVE_QA_DIR;
const correct = '#include <stdio.h>\nint main(void){int a,b;if(scanf("%d %d",&a,&b)!=2)return 1;printf("%d\\n",a+b);return 0;}';
const sortCounted = "#include <stddef.h>\nstruct SortItem { int key; int tag; };\nint stable_sort_counted(struct SortItem items[], size_t count,\n                        size_t *out_comparisons, size_t *out_moves) {\n    if (out_comparisons == NULL || out_moves == NULL || count > 8\n        || (count > 0 && items == NULL)) return 0;\n    size_t comparisons = 0;\n    size_t moves = 0;\n    for (size_t i = 1; i < count; ++i) {\n        struct SortItem key = items[i];\n        size_t j = i;\n        while (j > 0) {\n            ++comparisons;\n            if (!(items[j - 1].key > key.key)) break;\n            items[j] = items[j - 1];\n            ++moves;\n            --j;\n        }\n        items[j] = key;\n        ++moves;\n    }\n    *out_comparisons = comparisons;\n    *out_moves = moves;\n    return 1;\n}\n";
const sortUnstable = sortCounted.replace('items[j - 1].key > key.key', 'items[j - 1].key >= key.key');
const failed = '#include <stdio.h>\nint main(void){puts("0");return 0;}';
const streamCount = '#include <stdio.h>\n#include <stddef.h>\nint count_stream_bytes(FILE *stream, size_t *out_count) {\n    if (stream == NULL || out_count == NULL || ferror(stream)) return 0;\n    size_t count = 0;\n    int ch;\n    while ((ch = fgetc(stream)) != EOF) {\n        if (count == 4096) return 0;\n        ++count;\n    }\n    if (ferror(stream)) return 0;\n    *out_count = count;\n    return 1;\n}\n';
const searchFunctions = "#include <stddef.h>\n#include <stdio.h>\n\nsize_t linear_find_first(const int values[], size_t count, int target) {\n    for (size_t i = 0; i < count; ++i) {\n        if (values[i] == target) return i;\n    }\n    return count;\n}\n\nsize_t binary_find_first(const int values[], size_t count, int target) {\n    size_t left = 0;\n    size_t right = count;\n    while (left < right) {\n        size_t mid = left + (right - left) / 2;\n        if (values[mid] < target) left = mid + 1;\n        else right = mid;\n    }\n    if (left < count && values[left] == target) return left;\n    return count;\n}\n";
const searchWrong = searchFunctions.replace('if (values[mid] < target)', 'if (values[mid] == target) return mid;\n        if (values[mid] < target)');
const listFind = '#include <stddef.h>\nstruct Node { int value; const struct Node *next; };\nconst struct Node *list_find(const struct Node *head, int target) { for (const struct Node *p = head; p != NULL; p = p->next) { if (p->value == target) return p; } return NULL; }';
const listLast = listFind.replace('for (const struct', 'const struct Node *found = NULL; for (const struct').replace('return p;', 'found = p;').replace('return NULL;', 'return found;');
const stackFunctions = "#include <stddef.h>\nstruct IntStack { int values[4]; size_t length; };\nint stack_push(struct IntStack *stack, int value) { if (stack == NULL || stack->length >= 4) return 0; stack->values[stack->length] = value; ++stack->length; return 1; }\nint stack_pop(struct IntStack *stack, int *out_value) { if (stack == NULL || out_value == NULL || stack->length == 0 || stack->length > 4) return 0; int value = stack->values[stack->length - 1]; --stack->length; *out_value = value; return 1; }\n";
const stackFIFO = stackFunctions.replace('stack->values[stack->length - 1]', 'stack->values[0]');
const functionOnly = 'int clamp(int value,int low,int high){if(value<low)return low;if(value>high)return high;return value;}';
const arrayMaxFunction = '#include <stddef.h>\nint find_max(const int values[],size_t length,int *out_max){if(!values||length==0||!out_max)return 0;int maximum=values[0];for(size_t i=1;i<length;i++)if(values[i]>maximum)maximum=values[i];*out_max=maximum;return 1;}';
const arrayMaxWrong = '#include <stddef.h>\nint find_max(const int values[],size_t length,int *out_max){if(!values||length==0||!out_max)return 0;int maximum=0;for(size_t i=0;i<length;i++)if(values[i]>maximum)maximum=values[i];*out_max=maximum;return 1;}';
const stringCountFunction = '#include <stddef.h>\nint count_char(const char *text,char target,size_t *out_count){if(!text||!out_count)return 0;size_t count=0;for(size_t i=0;text[i]!=\'\\0\';++i)if(text[i]==target)++count;*out_count=count;return 1;}';
const stringCountWrong = '#include <stddef.h>\nint count_char(const char *text,char target,size_t *out_count){if(!text||!out_count)return 0;size_t count=0;do{if(*text==target)++count;}while(*text++!=\'\\0\');*out_count=count;return 1;}';
const boundedStringFunction = '#include <stddef.h>\nint bounded_length(const char *buffer,size_t capacity,size_t *out_length){if(!buffer||capacity==0||!out_length)return 0;for(size_t i=0;i<capacity;++i)if(buffer[i]==\'\\0\'){*out_length=i;return 1;}return 0;}';
const boundedStringWrong = '#include <stddef.h>\nint bounded_length(const char *buffer,size_t capacity,size_t *out_length){if(!buffer||capacity==0||!out_length)return 0;size_t i=0;while(i<capacity&&buffer[i]!=\'\\0\')++i;*out_length=i;return 1;}';
const fgetsLogicalLine = '#include <stddef.h>\n#include <stdio.h>\nint main(void){char chunk[8];size_t total=0;int saw_input=0;for(;;){if(fgets(chunk,sizeof chunk,stdin)==NULL){if(ferror(stdin))return 1;if(!saw_input){puts("NO INPUT");return 0;}break;}saw_input=1;size_t i=0;while(chunk[i]!=\'\\0\'&&chunk[i]!=\'\\n\')++i;total+=i;if(chunk[i]==\'\\n\')break;}printf("%zu\\n",total);return 0;}';
const fgetsLogicalLineWrong = '#include <stdio.h>\n#include <string.h>\nint main(void){char chunk[8];if(!fgets(chunk,sizeof chunk,stdin)){puts("NO INPUT");return 0;}printf("%zu\\n",strcspn(chunk,"\\n"));return 0;}';
const strtolIntegerInput = '#include <ctype.h>\n#include <errno.h>\n#include <stdio.h>\n#include <stdlib.h>\nint main(void){char line[64];if(fgets(line,sizeof line,stdin)==NULL){if(ferror(stdin))return 1;puts("NO INPUT");return 0;}size_t i=0;while(line[i]!=\'\\0\'&&line[i]!=\'\\n\')++i;if(line[i]==\'\\0\'){int ch=getchar();if(ch!=EOF&&ch!=\'\\n\'){do{ch=getchar();}while(ch!=EOF&&ch!=\'\\n\');if(ch==EOF&&ferror(stdin))return 1;puts("TOO LONG");return 0;}if(ch==EOF&&ferror(stdin))return 1;}errno=0;char *end;long value=strtol(line,&end,10);if(end==line){puts("INVALID");return 0;}if(errno==ERANGE){puts("RANGE");return 0;}while(*end!=\'\\0\'&&isspace((unsigned char)*end))++end;if(*end!=\'\\0\'){puts("INVALID");return 0;}printf("%ld\\n",value);return 0;}';
const strtolIntegerWrong = '#include <stdio.h>\n#include <stdlib.h>\nint main(void){char line[64];if(!fgets(line,sizeof line,stdin)){puts("NO INPUT");return 0;}printf("%d\\n",atoi(line));return 0;}';
const structStudentScore = 'struct Student{int id;int score;};\nint update_score(struct Student *student,int delta){if(!student||student->score<0||student->score>100)return 0;if(delta < -student->score || delta > 100-student->score)return 0;student->score+=delta;return 1;}';
const structStudentWrong = 'struct Student{int id;int score;};\nint update_score(struct Student *student,int delta){if(!student)return 0;student->score+=delta;if(student->score<0||student->score>100)return 0;return 1;}';
const structArraySearch = '#include <stddef.h>\nstruct Student{int id;int score;};\nint find_student_index(const struct Student students[],size_t count,int target_id,size_t *out_index){if(!students||count==0||!out_index)return 0;for(size_t i=0;i<count;++i)if(students[i].id==target_id){*out_index=i;return 1;}return 0;}';
const structArraySearchWrong = '#include <stddef.h>\nstruct Student{int id;int score;};\nint find_student_index(const struct Student students[],size_t count,int target_id,size_t *out_index){if(!students||count==0||!out_index)return 0;int found=0;for(size_t i=0;i<count;++i)if(students[i].id==target_id){*out_index=i;found=1;}return found;}';
const structArraySort = '#include <stddef.h>\nstruct Student{int id;int score;};\nint stable_sort_students_by_id(struct Student students[],size_t count){if(count==0)return 1;if(!students)return 0;for(size_t i=1;i<count;++i){struct Student key=students[i];size_t j=i;while(j>0&&students[j-1].id>key.id){students[j]=students[j-1];--j;}students[j]=key;}return 1;}';
const structArraySortWrong = '#include <stddef.h>\nstruct Student{int id;int score;};\nint stable_sort_students_by_id(struct Student students[],size_t count){if(count==0)return 1;if(!students)return 0;for(size_t i=0;i<count;i++)for(size_t j=i+1;j<count;j++)if(students[j].id<students[i].id){struct Student t=students[i];students[i]=students[j];students[j]=t;}return 1;}';
const structArrayBinarySearch = '#include <stddef.h>\nstruct Student{int id;int score;};\nint find_first_student_by_id(const struct Student a[],size_t n,int id,size_t *out){if(n==0||!a||!out)return 0;size_t l=0,r=n;while(l<r){size_t m=l+(r-l)/2;if(a[m].id<id)l=m+1;else r=m;}if(l<n&&a[l].id==id){*out=l;return 1;}return 0;}';
const structArrayBinarySearchWrong = '#include <stddef.h>\nstruct Student{int id;int score;};\nint find_first_student_by_id(const struct Student a[],size_t n,int id,size_t *out){if(!a||!out||n==0)return 0;size_t l=0,r=n-1;while(l<=r){size_t m=l+(r-l)/2;if(a[m].id==id){*out=m;return 1;}if(a[m].id<id)l=m+1;else{if(m==0)break;r=m-1;}}return 0;}';
const dynamicStudentArray = '#include <stddef.h>\n#include <stdint.h>\n#include <stdlib.h>\nstruct Student{int id;int score;};\nint create_students(size_t count,int initial_score,struct Student **out_students){if(!out_students||initial_score<0||initial_score>100)return 0;if(count==0){*out_students=NULL;return 1;}struct Student *students=NULL;if(count>SIZE_MAX/sizeof *students)return 0;students=malloc(count*sizeof *students);if(!students)return 0;for(size_t i=0;i<count;++i){students[i].id=0;students[i].score=initial_score;}*out_students=students;return 1;}\nvoid destroy_students(struct Student **students){if(!students)return;free(*students);*students=NULL;}';
const reallocStudentCapacity = '#include <stddef.h>\n#include <stdint.h>\n#include <stdlib.h>\nstruct Student{int id;int score;};\nint reserve_students(struct Student **students,size_t length,size_t *capacity,size_t new_capacity){if(!students||!capacity||length>*capacity)return 0;if((*capacity==0)!=(*students==NULL))return 0;if(new_capacity<*capacity||new_capacity<length)return 0;if(new_capacity==*capacity)return 1;if(new_capacity>SIZE_MAX/sizeof **students)return 0;size_t old=*capacity;struct Student *grown=realloc(*students,new_capacity*sizeof *grown);if(!grown)return 0;for(size_t i=old;i<new_capacity;++i)grown[i]=(struct Student){0,0};*students=grown;*capacity=new_capacity;return 1;}';
const studentVectorPush = '#include <stddef.h>\n#include <stdint.h>\nstruct Student{int id;int score;};\nint reserve_students(struct Student **students,size_t length,size_t *capacity,size_t new_capacity);\nint push_student(struct Student **students,size_t *length,size_t *capacity,struct Student value){if(!students||!length||!capacity||*length>*capacity||((*capacity==0)!=(*students==NULL)))return 0;if(*length==*capacity){size_t next;if(*capacity==0)next=4;else{if(*capacity>SIZE_MAX/2)return 0;next=*capacity*2;}if(!reserve_students(students,*length,capacity,next))return 0;}(*students)[*length]=value;(*length)++;return 1;}';
const multiFileSolution = [
  {name:'main.c',content:'#include <stdio.h>\n#include "functions.h"\nint main(void){int v,l,h;if(scanf("%d%d%d",&v,&l,&h)!=3)return 1;printf("%d\\n",clamp(v,l,h));return 0;}'},
  {name:'functions.c',content:'#include "functions.h"\nint clamp(int v,int l,int h){if(v<l)return l;if(v>h)return h;return v;}'},
  {name:'functions.h',content:'#ifndef FUNCTIONS_H\n#define FUNCTIONS_H\nint clamp(int value,int low,int high);\n#endif'}
];
const multiFileWrong = multiFileSolution.map(file => file.name === 'functions.c'
  ? { ...file, content: '#include "functions.h"\nint clamp(int v,int l,int h){(void)v;(void)l;return h;}' }
  : file);
const studentRegistrySolution = [
  {name:'main.c',content:'#include <stdio.h>\n#include "student.h"\nenum{MAX_STUDENTS=16};\nint main(void){struct Student a[MAX_STUDENTS];int n_input,target;if(scanf("%d%d",&n_input,&target)!=2||n_input<0||n_input>MAX_STUDENTS){puts("INVALID");return 0;}size_t n=(size_t)n_input;for(size_t i=0;i<n;i++)if(scanf("%d%d",&a[i].id,&a[i].score)!=2){puts("INVALID");return 0;}if(!stable_sort_students_by_id(a,n))return 1;if(n==0)puts("EMPTY");else{for(size_t i=0;i<n;i++){if(i)putchar(\' \');printf("%d:%d",a[i].id,a[i].score);}putchar(\'\\n\');}size_t index;if(find_first_student_by_id(a,n,target,&index))printf("FOUND %zu %d\\n",index,a[index].score);else puts("NOT FOUND");return 0;}'},
  {name:'student.c',content:'#include "student.h"\nint stable_sort_students_by_id(struct Student a[],size_t n){if(n==0)return 1;if(!a)return 0;for(size_t i=1;i<n;i++){struct Student key=a[i];size_t j=i;while(j>0&&a[j-1].id>key.id){a[j]=a[j-1];--j;}a[j]=key;}return 1;}\nint find_first_student_by_id(const struct Student a[],size_t n,int id,size_t *out){if(n==0||!a||!out)return 0;size_t l=0,r=n;while(l<r){size_t m=l+(r-l)/2;if(a[m].id<id)l=m+1;else r=m;}if(l<n&&a[l].id==id){*out=l;return 1;}return 0;}'},
  {name:'student.h',content:'#ifndef STUDENT_H\n#define STUDENT_H\n#include <stddef.h>\nstruct Student{int id;int score;};\nint stable_sort_students_by_id(struct Student students[],size_t count);\nint find_first_student_by_id(const struct Student students[],size_t count,int target_id,size_t *out_index);\n#endif'}
];
const history = page => page.evaluate(() => JSON.parse(localStorage.getItem('codeweave.iterations.v1')));
const ready = async page => { await expect(page.locator('#grade-code')).toBeEnabled(); };
async function submit(page, code) {
  await page.locator('#code-input').fill(code);
  const response = page.waitForResponse(r => r.url().endsWith('/api/grade'));
  await page.locator('#grade-code').click();
  const graded = await response;
  const sentToken = graded.request().headers()['x-codeweave-token'];
  assert.equal(sentToken, await page.locator('meta[name="codeweave-token"]').getAttribute('content'));
  assert.match(sentToken, /^[0-9a-f]{64}$/);
  await ready(page);
}
async function fillMultiFile(page, files) {
  for (const file of files) await page.locator('[data-code-file="' + file.name + '"]').fill(file.content);
}
async function expectMultiFile(page, files) {
  for (const file of files) await expect(page.locator('[data-code-file="' + file.name + '"]')).toHaveValue(file.content);
}

try {
  for (let i = 0; i < 100 && !output.includes('CodeWeave local learning app:'); i++) {
    if (server.exitCode !== null) throw Error(output);
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  assert.match(output, /CodeWeave local learning app:/);
  // Compile our own reference solutions through the actual local API.
  const solutions = {
    'algo-stable-insertion': sortCounted,
    'ds-stack': stackFunctions,
    'c-file-stream-count': streamCount,
    'algo-binary': searchFunctions,
    'ds-list-find': listFind,
    'c-matrix-row-sums': "#include <stddef.h>\n#include <stdio.h>\n\nint sum_rows3(const int matrix[][3], size_t rows, long *out_sums) {\n    if (rows == 0) {\n        return 1;\n    }\n    if (rows > 4 || matrix == NULL || out_sums == NULL) {\n        return 0;\n    }\n    long totals[4];\n    for (size_t r = 0; r < rows; ++r) {\n        long sum = 0;\n        for (size_t c = 0; c < 3; ++c) {\n            if (matrix[r][c] < -10000 || matrix[r][c] > 10000) {\n                return 0;\n            }\n            sum += (long)matrix[r][c];\n        }\n        totals[r] = sum;\n    }\n    for (size_t r = 0; r < rows; ++r) {\n        out_sums[r] = totals[r];\n    }\n    return 1;\n}\n",
    'c-recursion-factorial': "#include <stddef.h>\n#include <stdio.h>\n\nstatic unsigned long factorial_small(unsigned int n) {\n    if (n == 0) {\n        return 1UL;\n    }\n    unsigned long smaller = factorial_small(n - 1);\n    return (unsigned long)n * smaller;\n}\n\nint factorial_checked(unsigned int n, unsigned long *out_value) {\n    if (out_value == NULL || n > 12) {\n        return 0;\n    }\n    unsigned long result = factorial_small(n);\n    *out_value = result;\n    return 1;\n}\n",
    'c-hello': '#include <stdio.h>\nint main(void){puts("Hello, CodeWeave!");return 0;}',
    'c-types': correct,
    'c-loops': '#include <stdio.h>\nint main(void){int n;if(scanf("%d",&n)!=1)return 1;long sum=0;for(int i=1;i<=n;i++)sum+=i;printf("%ld\\n",sum);return 0;}',
    'c-array': "#include <stddef.h>\n#include <stdio.h>\n\nstatic int max_nonempty(const int values[], size_t count) {\n    int maximum = values[0];\n    for (size_t i = 1; i < count; ++i) {\n        if (values[i] > maximum) {\n            maximum = values[i];\n        }\n    }\n    return maximum;\n}\n\nint main(void) {\n    enum { CAPACITY = 20 };\n    int values[CAPACITY];\n    int count_input;\n    if (scanf(\"%d\", &count_input) != 1 || count_input < 1 || count_input > CAPACITY) {\n        return 1;\n    }\n    size_t count = (size_t)count_input;\n    for (size_t i = 0; i < count; ++i) {\n        if (scanf(\"%d\", &values[i]) != 1) {\n            return 1;\n        }\n    }\n    printf(\"%d\\n\", max_nonempty(values, count));\n    return 0;\n}",
    'c-pointer': "#include <stdio.h>\n\nvoid add_one(int *value) {\n    ++(*value);\n}\n\nint main(void) {\n    int n;\n    if (scanf(\"%d\", &n) != 1) {\n        return 1;\n    }\n    if (n < -10000 || n > 9999) {\n        return 1;\n    }\n    add_one(&n);\n    printf(\"%d\\n\", n);\n    return 0;\n}",
    'c-functions': "#include <stdio.h>\n\nint clamp(int value, int low, int high);\n\nint main(void) {\n    int value, low, high;\n    if (scanf(\"%d%d%d\", &value, &low, &high) != 3) return 1;\n    printf(\"%d\\n\", clamp(value, low, high));\n    return 0;\n}\n\nint clamp(int value, int low, int high) {\n    if (value < low) return low;\n    if (value > high) return high;\n    return value;\n}\n",
    'c-clamp-function': functionOnly,
    'c-array-max-function': arrayMaxFunction,
    'c-string-count-function': stringCountFunction,
    'c-bounded-string-length': boundedStringFunction,
    'c-fgets-logical-line': fgetsLogicalLine,
    'c-strtol-integer-input': strtolIntegerInput,
    'c-struct-student-score': structStudentScore,
    'c-struct-array-search': structArraySearch,
    'c-struct-array-sort': structArraySort,
    'c-struct-array-binary-search': structArrayBinarySearch,
    'c-multi-file': serializeMultiFileSubmission(multiFileSolution, { requiredNames: ['main.c','functions.c','functions.h'] }),
    'c-struct-student-registry': serializeMultiFileSubmission(studentRegistrySolution, { requiredNames: ['main.c','student.c','student.h'] }),
    'c-dynamic-student-array': dynamicStudentArray,
    'c-realloc-student-capacity': reallocStudentCapacity,
    'c-student-vector-push': studentVectorPush
  };
  const html = await (await fetch(base + '/')).text();
  const token = html.match(/<meta name="codeweave-token" content="([0-9a-f]{64})">/)?.[1];
  assert.match(token ?? '', /^[0-9a-f]{64}$/);
  for (const [exerciseId, code] of Object.entries(solutions)) {
    const response = await fetch(base + '/api/grade', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CodeWeave-Token': token }, body: JSON.stringify({ exerciseId, code }) });
    const result = await response.json();
    assert.equal(result.ok, true, exerciseId + ': ' + JSON.stringify(result));
  }
  console.log(`PASS: all ${Object.keys(solutions).length} C exercises compile and pass their real GCC tests`);

  // Keep QA parallelism small: Cargo's unchanged per-UID nproc budget also
  // counts Chromium's threads. These flags do not disable browser isolation.
  const browserOptions = { headless: true, args: [
    '--renderer-process-limit=2', '--num-raster-threads=1', '--process-per-site',
    '--disable-gpu', '--js-flags=--single-threaded'
  ] };
  browser = await chromium.launch(browserOptions);
  // UI transport fixture only. Actual Cargo → HTTP → client/v1 is mandatory
  // in rust-client.test.mjs on the Rust-equipped test job, not simulated here.
  const rustCorrect = 'pub fn total(items: u32, price: u32) -> u32 { items * price }';
  const rustWrong = rustCorrect.replace('items * price', 'items + price');
  const rustApp = createLearningServer({ root, rustService: createRustGradingService({
    enabled: true, definitions: createRustGradingDefinitions(), grade: request => {
      const ok = request.code === rustCorrect;
      return { ok, message: ok ? '10/10' : '0/10', compileOutput: '',
        tests: Array.from({ length: 10 }, () => ({ passed: ok, detail: ok ? '테스트 통과' : '단언 실패 · UI fixture' })) };
    }
  }) });
  const rustAddress = await rustApp.listen(0), rustBase = 'http://127.0.0.1:' + rustAddress.port;
  const rustContext = await browser.newContext({ viewport: { width: 390, height: 844 }, acceptDownloads: true });
  const rustPage = await rustContext.newPage();
  rustPage.on('pageerror', error => errors.push(error.message));
  let rustDialogs = 0;
  rustPage.on('dialog', dialog => { rustDialogs++; return dialog.accept(); });
  try {
    await rustPage.goto(rustBase + '/#lesson:rust-cargo');
    await expect(rustPage.locator('#grade-code')).toBeEnabled();
    await expect(rustPage.locator('.practice-card').last()).toContainText('Cargo 함수 테스트형');
    const submitRust = async source => {
      await rustPage.locator('#code-input').fill(source);
      const response = rustPage.waitForResponse(r => r.url().endsWith('/api/grade/rust'));
      await rustPage.locator('#grade-code').click();
      const result = await response;
      assert.deepEqual(result.request().postDataJSON(), { exerciseId: 'rust-cargo', code: source });
      assert.equal(result.request().headers()['x-codeweave-token'],
        await rustPage.locator('meta[name="codeweave-token"]').getAttribute('content'));
      await ready(rustPage);
    };
    await submitRust(rustWrong);
    await expect(rustPage.locator('.terminal[role="status"]')).toContainText('0/10');
    await expect(rustPage.locator('.mastery-state')).not.toContainText('전체 숙달');
    await submitRust(rustCorrect);
    await expect(rustPage.locator('.terminal[role="status"]')).toContainText('10/10');
    await expect(rustPage.locator('.mastery-state')).not.toContainText('전체 숙달');
    await rustPage.locator('#mark-theory').click();
    await rustPage.locator('[data-quiz="rust-cargo"][data-choice="0"]').click();
    await expect(rustPage.locator('.mastery-state')).toContainText('전체 숙달');
    await rustPage.locator('[data-restore-attempt="1"]').click();
    await expect(rustPage.locator('#code-input')).toHaveValue(rustWrong);
    assert.equal((await history(rustPage))['rust-cargo'].length, 2, 'restoring is not submitting');
    await rustPage.reload();
    await expect(rustPage.locator('#code-input')).toHaveValue(rustWrong);
    await expect(rustPage.locator('#attempt-history-container .attempt-list li')).toHaveCount(2);
    const beforeErrors = await history(rustPage);
    for (const fixture of [{ status: 429, body: '{}' },
      { status: 200, body: JSON.stringify({ ok: true, message: '9/9', compileOutput: '',
        tests: Array.from({ length: 9 }, () => ({ passed: true, detail: '통과' })) }) }]) {
      await rustPage.route('**/api/grade/rust', route => route.fulfill({ ...fixture, contentType: 'application/json' }));
      await submitRust(rustCorrect);
      await expect(rustPage.locator('.terminal[role="status"]')).toContainText('제출 기록을 추가하지 않았습니다');
      assert.deepEqual(await history(rustPage), beforeErrors);
      await rustPage.unroute('**/api/grade/rust');
    }
    await rustPage.locator('[data-route="settings"]').click();
    const downloadEvent = rustPage.waitForEvent('download');
    await rustPage.locator('#export-progress').click();
    const download = await downloadEvent, chunks = [];
    for await (const chunk of await download.createReadStream()) chunks.push(chunk);
    const backup = Buffer.concat(chunks);
    assert.equal(JSON.parse(backup).iterations['rust-cargo'].length, 2);
    await rustPage.evaluate(() => localStorage.setItem('codeweave.iterations.v1', '{}'));
    const beforeRestoreDialogs = rustDialogs;
    await rustPage.locator('#import-file').setInputFiles({ name: 'f01.json', mimeType: 'application/json', buffer: backup });
    await expect.poll(() => rustDialogs).toBe(beforeRestoreDialogs + 2);
    assert.deepEqual(await history(rustPage), beforeErrors);
    const legacyC = createAttemptBackup({ drafts: {}, iterations: {} }, ['c-hello']);
    const beforeLegacyDialogs = rustDialogs;
    await rustPage.locator('#import-file').setInputFiles({ name: 'old-c.json', mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(legacyC)) });
    await expect.poll(() => rustDialogs).toBe(beforeLegacyDialogs + 2);
    assert.deepEqual(await history(rustPage), beforeErrors, 'legacy C backup must not erase Rust history');
    await rustPage.goto(rustBase + '/#lesson:rust-cargo');
    await rustPage.evaluate(async () => {
      await navigator.serviceWorker.ready;
      if (!navigator.serviceWorker.controller) await new Promise(resolve =>
        navigator.serviceWorker.addEventListener('controllerchange', resolve, { once: true }));
    });
    await expect(rustPage.locator('#attempt-history-container .attempt-list li')).toHaveCount(2);
    assert.equal(await rustPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    if (qaDir) {
      await mkdir(qaDir, { recursive: true });
      await rustPage.screenshot({ path: path.join(qaDir, 'f01-local-submissions-mobile.png'), fullPage: true });
    }
    await rustContext.setOffline(true);
    await rustPage.reload();
    await expect(rustPage.locator('#grade-code')).toBeDisabled();
    await expect(rustPage.locator('#attempt-history-container .attempt-list li')).toHaveCount(2);
    await expect(rustPage.locator('meta[name="codeweave-token"], meta[name="codeweave-rust"]')).toHaveCount(0);
    await rustPage.locator('[data-restore-attempt="1"]').click();
    await expect(rustPage.locator('#code-input')).toHaveValue(rustWrong);
    assert.deepEqual(await history(rustPage), beforeErrors);
    await rustContext.setOffline(false);
    await rustPage.reload();
    await expect(rustPage.locator('#grade-code')).toBeEnabled();
    console.log('PASS: F01 configured UI fixture routes Cargo requests, keeps error/history/mastery separate, restores both v1 formats and preserves offline attempts at 390px');
  } finally {
    await rustContext.close();
    await rustApp.close();
  }
  // Actual Cargo, HTTP, both browser screens and v1 storage, without interception.
  // Discard idle processes retained by the preceding service-worker fixture.
  await browser.close();
  browser = await chromium.launch(browserOptions);
  const actualTools = await trustedRustTools();
  assert.notEqual(process.getuid(), 0, 'real browser grading must enforce nproc as a non-root user');
  const taskSnapshot = spawnSync('ps', ['-u', String(process.getuid()), '-L', '-o', 'pid='],
    { encoding: 'utf8', timeout: 3000, maxBuffer: 100000 });
  assert.equal(taskSnapshot.status, 0);
  console.log('F01 browser pre-build UID task count:', taskSnapshot.stdout.trim().split(/\s+/).length);
  const actualParent = await realpath(await mkdtemp(path.join(os.tmpdir(), 'codeweave-browser-f01-')));
  const actualService = await createLocalRustGradingService({ enabled: true,
    definitions: createRustGradingDefinitions(), sysroot: path.dirname(path.dirname(actualTools.rustc)), parent: actualParent });
  const actualApp = createLearningServer({ root, rustService: actualService });
  let actualContext;
  try {
    const address = await actualApp.listen(0), actualBase = 'http://127.0.0.1:' + address.port;
    actualContext = await browser.newContext({ viewport: { width: 390, height: 844 }, acceptDownloads: true });
    const actualPage = await actualContext.newPage(), actualBench = await actualContext.newPage();
    console.log('F01 browser task snapshot:', spawnSync('ps',
      ['-u', String(process.getuid()), '-o', 'pid=,nlwp=,comm='],
      { encoding: 'utf8', timeout: 3000, maxBuffer: 100000 }).stdout);
    for (const p of [actualPage, actualBench]) {
      p.on('pageerror', error => errors.push(error.message));
      p.on('dialog', dialog => dialog.accept());
    }
    await actualPage.goto(actualBase + '/#lesson:rust-cargo');
    const rustStarter = await actualPage.locator('#code-input').inputValue();
    const actualSubmit = async (p, source) => {
      await p.locator('#code-input').fill(source);
      const response = p.waitForResponse(r => r.url().endsWith('/api/grade/rust'), { timeout: 45000 });
      await p.locator('#grade-code').click();
      const graded = await response;
      assert.equal(graded.status(), 200);
      assert.deepEqual(graded.request().postDataJSON(), { exerciseId: 'rust-cargo', code: source });
      assert.equal(graded.request().headers()['x-codeweave-token'],
        await p.locator('meta[name="codeweave-token"]').getAttribute('content'));
      const answer = await graded.json();
      console.log('F01 actual browser diagnostic:', JSON.stringify({
        ok: answer.ok, message: answer.message,
        compileOutput: String(answer.compileOutput ?? '').replaceAll(actualParent, '<workspace>').slice(0, 1800),
        tests: answer.tests
      }));
      assert.equal(answer.tests.length, 10);
      await ready(p);
      assert.deepEqual(await readdir(actualParent), [], 'cleanup finishes before UI result');
      return answer;
    };
    const compileFailure = await actualSubmit(actualPage, rustStarter);
    assert.equal(compileFailure.ok, false);
    assert.notEqual(compileFailure.compileOutput, '');
    assert.match(compileFailure.compileOutput, /unused.variable|unused variable|unused_variables/i);
    assert.ok(compileFailure.tests.every(tc => tc.detail === '미실행'));
    await expect(actualPage.locator('.terminal[role="status"]')).toContainText('미실행');
    await actualBench.goto(actualBase + '/workbench.html');
    await actualBench.locator('#lesson-select').selectOption('rust-cargo');
    await expect(actualBench.locator('#code-label')).toHaveText('Rust 코드 작성');
    await expect(actualBench.locator('#code-input')).toHaveValue(rustStarter);
    await expect(actualBench.locator('#attempt-list li')).toHaveCount(1);
    const assertionFailure = await actualSubmit(actualBench, rustWrong);
    assert.equal(assertionFailure.ok, false);
    assert.ok(assertionFailure.tests.some(tc => !tc.passed && tc.detail.startsWith('단언 실패 · ')));
    assert.ok(assertionFailure.tests.every(tc => tc.detail !== '미실행'));
    await expect(actualPage.locator('#attempt-history-container .attempt-list li')).toHaveCount(2);
    const fixed = await actualSubmit(actualBench, rustCorrect);
    assert.equal(fixed.ok, true);
    assert.ok(fixed.tests.every(tc => tc.passed));
    await expect(actualBench.locator('#grade-result')).toContainText('10/10');
    await expect(actualPage.locator('#attempt-history-container .attempt-list li')).toHaveCount(3);
    await expect(actualPage.locator('.mastery-state')).not.toContainText('전체 숙달');
    await actualPage.reload();
    await expect(actualPage.locator('.learning-status-list li').nth(2)).toContainText('통과');
    await actualPage.locator('#mark-theory').click();
    await actualPage.locator('[data-quiz="rust-cargo"][data-choice="0"]').click();
    await expect(actualPage.locator('.mastery-state')).toContainText('전체 숙달');
    await actualPage.locator('.next-action [data-route="lesson:rust-mut"]').click();
    await expect(actualPage.locator('.detail-head h1')).toHaveText('변수 바인딩과 가변성');
    await expect(actualPage.locator('#grade-code')).toBeDisabled();
    assert.equal(new URL(actualPage.url()).hash, '#lesson:rust-mut');
    await actualPage.goto(actualBase + '/#lesson:rust-cargo');
    await expect(actualPage.locator('.mastery-state')).toContainText('전체 숙달');
    await actualBench.locator('#attempt-list li').nth(1).getByRole('button').click();
    await expect(actualBench.locator('#code-input')).toHaveValue(rustWrong);
    assert.equal((await history(actualBench))['rust-cargo'].length, 3);
    const backupEvent = actualBench.waitForEvent('download');
    await actualBench.locator('#export-history').click();
    const backupDownload = await backupEvent, backupChunks = [];
    for await (const chunk of await backupDownload.createReadStream()) backupChunks.push(chunk);
    const actualBackup = Buffer.concat(backupChunks), beforeImport = await history(actualBench);
    await actualBench.evaluate(() => localStorage.setItem('codeweave.iterations.v1', '{}'));
    await actualBench.locator('#import-file').setInputFiles({ name: 'actual-f01.json', mimeType: 'application/json', buffer: actualBackup });
    await expect(actualBench.locator('#draft-status')).toHaveText('통합 백업을 복원했습니다.');
    assert.deepEqual(await history(actualBench), beforeImport);
    const oldC = createAttemptBackup({ drafts: {}, iterations: {} }, ['c-hello']);
    await actualBench.locator('#import-file').setInputFiles({ name: 'legacy-c.json', mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(oldC)) });
    await expect(actualBench.locator('#draft-status')).toHaveText('기존 제출 이력 백업을 복원했습니다.');
    assert.deepEqual(await history(actualBench), beforeImport);
    await actualBench.reload();
    await actualBench.locator('#lesson-select').selectOption('rust-cargo');
    await expect(actualBench.locator('#code-input')).toHaveValue(rustWrong);
    assert.equal(await actualBench.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await actualPage.evaluate(async () => {
      await navigator.serviceWorker.ready;
      if (!navigator.serviceWorker.controller) await new Promise(resolve =>
        navigator.serviceWorker.addEventListener('controllerchange', resolve, { once: true }));
    });
    await actualBench.reload(); // Cache a token-free document in the controlled shell.
    await actualBench.locator('#lesson-select').selectOption('rust-cargo');
    if (qaDir) await actualBench.screenshot({ path: path.join(qaDir, 'f01-real-cargo-workbench-mobile.png'), fullPage: true });
    await actualContext.setOffline(true);
    await actualBench.reload();
    await actualBench.locator('#lesson-select').selectOption('rust-cargo');
    await expect(actualBench.locator('#grade-code')).toBeDisabled();
    await expect(actualBench.locator('#attempt-list li')).toHaveCount(3);
    await expect(actualBench.locator('meta[name="codeweave-token"], meta[name="codeweave-rust"]')).toHaveCount(0);
    await actualBench.locator('#attempt-list li').nth(2).getByRole('button').click();
    await expect(actualBench.locator('#code-input')).toHaveValue(rustStarter);
    assert.deepEqual(await history(actualBench), beforeImport);
    await actualContext.setOffline(false);
    await actualBench.reload();
    await actualBench.locator('#lesson-select').selectOption('rust-cargo');
    await expect(actualBench.locator('#grade-code')).toBeEnabled();
    console.log('PASS: REAL Cargo F01 browser: starter compile failure → workbench assertion failure → correction 10/10; shared lesson history, separate mastery, next Rust lesson and return, v1/C legacy restore, offline read-only and 390px');
  } finally {
    await actualContext?.close();
    await actualApp.close();
    // Never erase quarantined executor evidence or free an uncertain slot.
    const status = actualService.inspect();
    if (status.state === 'quarantined') throw Error('Actual F01 browser service quarantined: ' + status.reason);
    assert.deepEqual(await readdir(actualParent), []);
    await rm(actualParent, { recursive: true, force: true });
  }
  const f02Parent = await realpath(await mkdtemp(path.join(os.tmpdir(), 'codeweave-browser-f02-')));
  const f02Service = await createLocalRustGradingService({ enabled: true,
    definitions: createRustBindingDefinitions(), sysroot: path.dirname(path.dirname(actualTools.rustc)), parent: f02Parent });
  const f02App = createLearningServer({ root, rustService: f02Service, rustExerciseIds: ['rust-cargo', 'rust-mut'] });
  let f02Context;
  try {
    const address = await f02App.listen(0), f02Base = 'http://127.0.0.1:' + address.port;
    f02Context = await browser.newContext({ viewport: { width: 390, height: 844 }, acceptDownloads: true });
    const p = await f02Context.newPage(), bench = await f02Context.newPage();
    for (const screen of [p, bench]) {
      screen.on('pageerror', error => errors.push(error.message));
      screen.on('dialog', dialog => dialog.accept());
    }
    await p.goto(f02Base + '/#lesson:rust-mut');
    await expect(p.locator('#grade-code')).toBeEnabled();
    const starter = await p.locator('#code-input').inputValue();
    const manuscript = await readFile(new URL('../content/rust/02-bindings.md', import.meta.url), 'utf8');
    const correct = manuscript.match(/```rust\n([\s\S]*?)\n```/)[1].split('fn main()')[0];
    const submit = async (screen, code) => {
      await screen.locator('#code-input').fill(code);
      const response = screen.waitForResponse(r => r.url().endsWith('/api/grade/rust'), { timeout: 45000 });
      await screen.locator('#grade-code').click();
      const result = await response;
      assert.equal(result.status(), 200);
      assert.deepEqual(result.request().postDataJSON(), { exerciseId: 'rust-mut', code });
      assert.equal(result.request().headers()['x-codeweave-token'],
        await screen.locator('meta[name="codeweave-token"]').getAttribute('content'));
      const value = await result.json();
      assert.equal(value.tests.length, 10);
      await ready(screen);
      assert.deepEqual(await readdir(f02Parent), []);
      return value;
    };
    const failed = await submit(p, starter);
    assert.equal(failed.ok, false);
    assert.ok(failed.tests.some(tc => tc.detail.startsWith('단언 실패 · ')));
    await bench.goto(f02Base + '/workbench.html');
    await bench.locator('#lesson-select').selectOption('rust-mut');
    await expect(bench.locator('#code-label')).toHaveText('Rust 코드 작성');
    await expect(bench.locator('#code-input')).toHaveValue(starter);
    assert.equal((await submit(bench, correct)).ok, true);
    await expect(bench.locator('#grade-result')).toContainText('10/10');
    await expect(p.locator('#attempt-history-container .attempt-list li')).toHaveCount(2);
    await p.reload();
    await expect(p.locator('.mastery-state')).not.toContainText('전체 숙달');
    await p.locator('#mark-theory').click();
    await p.locator('[data-quiz="rust-mut"][data-choice="1"]').click();
    await expect(p.locator('.feedback.bad')).toBeVisible();
    await p.locator('[data-retry="rust-mut"]').click();
    await p.locator('[data-quiz="rust-mut"][data-choice="0"]').click();
    await expect(p.locator('.mastery-state')).toContainText('전체 숙달');
    await p.locator('.next-action [data-route="lesson:rust-control-flow"]').click();
    await expect(p.locator('.detail-head h1')).toHaveText('조건·반복·식과 범위: 멈추기 전 짝수 누적');
    await expect(p.locator('#grade-code')).toBeDisabled();
    await p.goto(f02Base + '/#lesson:rust-mut');
    await expect(p.locator('.mastery-state')).toContainText('전체 숙달');
    await bench.locator('#attempt-list li').nth(1).getByRole('button').click();
    await expect(bench.locator('#code-input')).toHaveValue(starter);
    assert.equal((await history(bench))['rust-mut'].length, 2);
    const downloadEvent = bench.waitForEvent('download');
    await bench.locator('#export-history').click();
    const download = await downloadEvent, chunks = [];
    for await (const chunk of await download.createReadStream()) chunks.push(chunk);
    const before = await history(bench);
    await bench.evaluate(() => localStorage.setItem('codeweave.iterations.v1', '{}'));
    await bench.locator('#import-file').setInputFiles({ name: 'f02.json', mimeType: 'application/json', buffer: Buffer.concat(chunks) });
    await expect(bench.locator('#draft-status')).toHaveText('통합 백업을 복원했습니다.');
    assert.deepEqual(await history(bench), before);
    await bench.locator('#import-file').setInputFiles({ name: 'legacy-c.json', mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(createAttemptBackup({ drafts: {}, iterations: {} }, ['c-hello']))) });
    await expect(bench.locator('#draft-status')).toHaveText('기존 제출 이력 백업을 복원했습니다.');
    assert.deepEqual(await history(bench), before);
    assert.equal(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    assert.equal(await bench.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    if (qaDir) await p.screenshot({ path: path.join(qaDir, 'f02-real-cargo-mobile.png'), fullPage: true });
    await p.evaluate(async () => {
      await navigator.serviceWorker.ready;
      if (!navigator.serviceWorker.controller) await new Promise(resolve =>
        navigator.serviceWorker.addEventListener('controllerchange', resolve, { once: true }));
    });
    await bench.reload();
    await f02Context.setOffline(true);
    await bench.reload();
    await bench.locator('#lesson-select').selectOption('rust-mut');
    await expect(bench.locator('#grade-code')).toBeDisabled();
    await expect(bench.locator('#code-input')).toHaveValue(starter);
    assert.deepEqual(await history(bench), before);
    await p.reload();
    await expect(p.locator('#grade-code')).toBeDisabled();
    await expect(p.locator('.mastery-state')).not.toContainText('전체 숙달');
    await f02Context.setOffline(false);
    await p.reload();
    await expect(p.locator('#grade-code')).toBeEnabled();
    await expect(p.locator('.mastery-state')).toContainText('전체 숙달');
    console.log('PASS: REAL Cargo F02 browser: starter assertion failure → workbench correction 10/10, quiz retry and separate mastery, shared history/v1 restore, next lesson, offline disabled and 390px');
  } finally {
    await f02Context?.close();
    await f02App.close();
    const status = f02Service.inspect();
    if (status.state === 'quarantined') throw Error('F02 browser service quarantined: ' + status.reason);
    assert.deepEqual(await readdir(f02Parent), []);
    await rm(f02Parent, { recursive: true, force: true });
  }
  const f03Parent = await realpath(await mkdtemp(path.join(os.tmpdir(), 'codeweave-browser-f03-')));
  const f03Script = fileURLToPath(new URL('../scripts/start-rust.mjs', import.meta.url));
  const f03Child = spawn(process.execPath, [f03Script, '--trusted-personal-code',
    '--sysroot', path.dirname(path.dirname(actualTools.rustc)), '--workspace-parent', f03Parent,
    '--port', '0', '--include-control-flow'], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] });
  let f03Output = '';
  f03Child.stdout.on('data', chunk => { f03Output += chunk; });
  f03Child.stderr.on('data', chunk => { f03Output += chunk; });
  const f03Closed = once(f03Child, 'close');
  const f03Deadline = Date.now() + 15000;
  while (!/http:\/\/127\.0\.0\.1:\d+/.test(f03Output)) {
    if (f03Child.exitCode !== null || f03Child.signalCode !== null || Date.now() > f03Deadline) {
      throw Error('F03 CLI did not start: ' + f03Output);
    }
    await new Promise(resolve => setTimeout(resolve, 20));
  }
  const f03Base = f03Output.match(/http:\/\/127\.0\.0\.1:\d+/)[0];
  let f03Context;
  try {
    f03Context = await browser.newContext({ viewport: { width: 390, height: 844 }, acceptDownloads: true });
    const p = await f03Context.newPage(), bench = await f03Context.newPage();
    for (const screen of [p, bench]) {
      screen.on('pageerror', error => errors.push(error.message));
      screen.on('dialog', dialog => dialog.accept());
    }
    await p.goto(f03Base + '/#lesson:rust-control-flow');
    await expect(p.locator('meta[name="codeweave-rust-exercises"]'))
      .toHaveAttribute('content', 'rust-cargo rust-mut rust-control-flow');
    await expect(p.locator('.detail-head h1')).toHaveText('조건·반복·식과 범위: 멈추기 전 짝수 누적');
    await expect(p.locator('.figure-box svg')).toHaveAttribute('role', 'img');
    await expect(p.locator('#grade-code')).toBeEnabled();
    const starter = await p.locator('#code-input').inputValue();
    assert.equal(starter, controlDefinition.starter.trimEnd());
    const submit = async (screen, code) => {
      await screen.locator('#code-input').fill(code);
      const response = screen.waitForResponse(r => r.url().endsWith('/api/grade/rust'), { timeout: 45000 });
      await screen.locator('#grade-code').click();
      const result = await response;
      assert.equal(result.status(), 200);
      assert.deepEqual(result.request().postDataJSON(), { exerciseId: 'rust-control-flow', code });
      assert.equal(result.request().headers()['x-codeweave-token'],
        await screen.locator('meta[name="codeweave-token"]').getAttribute('content'));
      const value = await result.json();
      assert.equal(value.tests.length, 10);
      await ready(screen);
      assert.deepEqual(await readdir(f03Parent), []);
      return value;
    };
    assert.equal((await submit(p, starter)).ok, false);
    await bench.goto(f03Base + '/workbench.html');
    await bench.locator('#lesson-select').selectOption('rust-control-flow');
    await expect(bench.locator('#code-label')).toHaveText('Rust 코드 작성');
    assert.equal((await submit(bench, controlWrong)).ok, false);
    assert.equal((await submit(bench, controlCorrect)).ok, true);
    await expect(bench.locator('#grade-result')).toContainText('10/10');
    await expect(p.locator('#attempt-history-container .attempt-list li')).toHaveCount(3);
    await expect(p.locator('.mastery-state')).not.toContainText('전체 숙달');
    await p.reload();
    await p.locator('#mark-theory').click();
    await p.locator('[data-quiz="rust-control-flow"][data-choice="1"]').click();
    await expect(p.locator('.feedback.bad')).toBeVisible();
    await p.locator('[data-retry="rust-control-flow"]').click();
    await p.locator('[data-quiz="rust-control-flow"][data-choice="0"]').click();
    await expect(p.locator('.mastery-state')).toContainText('전체 숙달');
    await bench.reload();
    await bench.locator('#lesson-select').selectOption('rust-control-flow');
    await expect(bench.locator('#code-input')).toHaveValue(controlCorrect);
    const downloadEvent = bench.waitForEvent('download');
    await bench.locator('#export-history').click();
    const download = await downloadEvent, chunks = [];
    for await (const chunk of await download.createReadStream()) chunks.push(chunk);
    const backup = Buffer.concat(chunks), backupData = JSON.parse(backup);
    assert.equal(backupData.drafts['rust-control-flow'], controlCorrect);
    assert.equal(backupData.iterations['rust-control-flow'].length, 3);
    await bench.evaluate(() => {
      for (const key of ['codeweave.drafts.v1', 'codeweave.iterations.v1']) {
        const values = JSON.parse(localStorage.getItem(key) || '{}');
        delete values['rust-control-flow'];
        localStorage.setItem(key, JSON.stringify(values));
      }
    });
    await bench.reload();
    await bench.locator('#lesson-select').selectOption('rust-control-flow');
    await expect(bench.locator('#code-input')).toHaveValue(starter);
    await expect(bench.locator('#attempt-list')).toContainText('아직 제출 기록이 없습니다.');
    await bench.locator('#import-file').setInputFiles({
      name: 'f03.json', mimeType: 'application/json', buffer: backup
    });
    await expect(bench.locator('#draft-status')).toHaveText('통합 백업을 복원했습니다.');
    await p.reload();
    await expect(p.locator('#code-input')).toHaveValue(controlCorrect);
    await expect(p.locator('#attempt-history-container .attempt-list li')).toHaveCount(3);
    await p.locator('[data-restore-attempt="1"]').click();
    await expect(p.locator('#code-input')).toHaveValue(controlWrong);
    await p.locator('[data-restore-attempt="0"]').click();
    await expect(p.locator('#code-input')).toHaveValue(controlCorrect);
    const bounds = await p.evaluate(() => {
      const svg = document.querySelector('.figure-box svg'), view = svg.viewBox.baseVal;
      return {
        overflow: [...svg.querySelectorAll('text')].flatMap(text => {
          const box = text.getBBox();
          return box.x >= 0 && box.y >= 0 && box.x + box.width <= view.width && box.y + box.height <= view.height
            ? [] : [text.textContent];
        }),
        width: document.documentElement.scrollWidth, viewport: innerWidth
      };
    });
    assert.deepEqual(bounds.overflow, []);
    assert.ok(bounds.width <= bounds.viewport, JSON.stringify(bounds));
    if (qaDir) await p.screenshot({ path: path.join(qaDir, 'f03-control-flow-mobile.png'), fullPage: true });
    await p.evaluate(async () => {
      await navigator.serviceWorker.ready;
      if (!navigator.serviceWorker.controller) await new Promise(resolve =>
        navigator.serviceWorker.addEventListener('controllerchange', resolve, { once: true }));
    });
    await bench.reload();
    await f03Context.setOffline(true);
    await bench.reload();
    await bench.locator('#lesson-select').selectOption('rust-control-flow');
    await expect(bench.locator('#grade-code')).toBeDisabled();
    await expect(bench.locator('#code-input')).toHaveValue(controlCorrect);
    await expect(bench.locator('#attempt-list li')).toHaveCount(3);
    await f03Context.setOffline(false);
    await p.reload();
    await expect(p.locator('#grade-code')).toBeEnabled();
    await expect(p.locator('.mastery-state')).toContainText('전체 숙달');
    await p.locator('.next-action [data-route="lesson:rust-functions"]').click();
    await expect(p.locator('.detail-head h1')).toHaveText('함수·반환값과 단위 테스트');
    console.log('PASS: REAL Cargo F03 browser: explicit CLI, starter/inclusive-range failure, correction 10/10, quiz retry, separate mastery, shared history/v1 restore, 390px diagram, offline and next lesson');
  } finally {
    await f03Context?.close();
    if (f03Child.exitCode === null && f03Child.signalCode === null) f03Child.kill('SIGTERM');
    const [status, signal] = await f03Closed;
    assert.equal(status, 0, f03Output);
    assert.equal(signal, null);
    assert.deepEqual(await readdir(f03Parent), []);
    await rm(f03Parent, { recursive: true, force: true });
  }
  const f04Parent = await realpath(await mkdtemp(path.join(os.tmpdir(), 'codeweave-browser-f04-')));
  const f04Service = await createLocalRustGradingService({ enabled: true,
    definitions: createRustFunctionDefinitions(),
    sysroot: path.dirname(path.dirname(actualTools.rustc)), parent: f04Parent });
  const f04App = createLearningServer({ root, rustService: f04Service,
    rustExerciseIds: ['rust-cargo', 'rust-mut', 'rust-control-flow', 'rust-functions'] });
  let f04Context;
  try {
    const { port } = await f04App.listen(0), f04Base = 'http://127.0.0.1:' + port;
    f04Context = await browser.newContext({ viewport: { width: 390, height: 844 }, acceptDownloads: true });
    const p = await f04Context.newPage(), bench = await f04Context.newPage();
    for (const screen of [p, bench]) {
      screen.on('pageerror', error => errors.push(error.message));
      screen.on('dialog', dialog => dialog.accept());
    }
    await p.goto(f04Base + '/#lesson:rust-functions');
    await expect(p.locator('meta[name="codeweave-rust-exercises"]'))
      .toHaveAttribute('content', 'rust-cargo rust-mut rust-control-flow rust-functions');
    await expect(p.locator('.detail-head h1')).toHaveText('함수·반환값과 단위 테스트');
    await expect(p.locator('.figure-box svg')).toHaveAttribute('role', 'img');
    await expect(p.locator('#grade-code')).toBeEnabled();
    await expect(p.locator('#code-input')).toHaveValue(functionDefinition.starter);
    const submitF04 = async (screen, code) => {
      await screen.locator('#code-input').fill(code);
      const response = screen.waitForResponse(r => r.url().endsWith('/api/grade/rust'), { timeout: 45000 });
      await screen.locator('#grade-code').click();
      const result = await response;
      assert.equal(result.status(), 200);
      assert.deepEqual(result.request().postDataJSON(), { exerciseId: 'rust-functions', code });
      const value = await result.json();
      assert.equal(value.tests.length, 10);
      await ready(screen);
      assert.deepEqual(await readdir(f04Parent), []);
      return value;
    };
    assert.equal((await submitF04(p, functionDefinition.starter)).ok, false);
    await bench.goto(f04Base + '/workbench.html');
    await bench.locator('#lesson-select').selectOption('rust-functions');
    await expect(bench.locator('#code-label')).toHaveText('Rust 코드 작성');
    assert.equal((await submitF04(bench, functionWrong)).ok, false);
    assert.equal((await submitF04(bench, functionCorrect)).ok, true);
    await expect(bench.locator('#grade-result')).toContainText('10/10');
    await expect(p.locator('#attempt-history-container .attempt-list li')).toHaveCount(3);
    await expect(p.locator('.mastery-state')).not.toContainText('전체 숙달');
    await p.reload();
    await p.locator('#mark-theory').click();
    await p.locator('[data-quiz="rust-functions"][data-choice="1"]').click();
    await expect(p.locator('.feedback.bad')).toBeVisible();
    await p.locator('[data-retry="rust-functions"]').click();
    await p.locator('[data-quiz="rust-functions"][data-choice="0"]').click();
    await expect(p.locator('.mastery-state')).toContainText('전체 숙달');
    await bench.reload();
    await bench.locator('#lesson-select').selectOption('rust-functions');
    await expect(bench.locator('#code-input')).toHaveValue(functionCorrect);
    const downloadEvent = bench.waitForEvent('download');
    await bench.locator('#export-history').click();
    const download = await downloadEvent, chunks = [];
    for await (const chunk of await download.createReadStream()) chunks.push(chunk);
    const backup = Buffer.concat(chunks), backupData = JSON.parse(backup);
    assert.equal(backupData.drafts['rust-functions'], functionCorrect);
    assert.equal(backupData.iterations['rust-functions'].length, 3);
    await bench.evaluate(() => {
      for (const key of ['codeweave.drafts.v1', 'codeweave.iterations.v1']) {
        const values = JSON.parse(localStorage.getItem(key) || '{}');
        delete values['rust-functions'];
        localStorage.setItem(key, JSON.stringify(values));
      }
    });
    await bench.reload();
    await bench.locator('#lesson-select').selectOption('rust-functions');
    await expect(bench.locator('#code-input')).toHaveValue(functionDefinition.starter);
    await bench.locator('#import-file').setInputFiles({
      name: 'f04.json', mimeType: 'application/json', buffer: backup
    });
    await expect(bench.locator('#draft-status')).toHaveText('통합 백업을 복원했습니다.');
    await p.reload();
    await expect(p.locator('#code-input')).toHaveValue(functionCorrect);
    await expect(p.locator('#attempt-history-container .attempt-list li')).toHaveCount(3);
    await p.locator('[data-restore-attempt="1"]').click();
    await expect(p.locator('#code-input')).toHaveValue(functionWrong);
    await p.locator('[data-restore-attempt="0"]').click();
    await expect(p.locator('#code-input')).toHaveValue(functionCorrect);
    assert.equal(await p.evaluate(() => {
      const svg = document.querySelector('.figure-box svg'), view = svg.viewBox.baseVal;
      return [...svg.querySelectorAll('text')].every(text => {
        const box = text.getBBox();
        return box.x >= 0 && box.y >= 0 && box.x + box.width <= view.width && box.y + box.height <= view.height;
      }) && document.documentElement.scrollWidth <= innerWidth;
    }), true, 'F04 function diagram and learner page must fit 390px');
    if (qaDir) await p.screenshot({ path: path.join(qaDir, 'f04-functions-mobile.png'), fullPage: true });
    await p.evaluate(async () => {
      await navigator.serviceWorker.ready;
      if (!navigator.serviceWorker.controller) await new Promise(resolve =>
        navigator.serviceWorker.addEventListener('controllerchange', resolve, { once: true }));
    });
    await f04Context.setOffline(true);
    await p.reload();
    await expect(p.locator('#grade-code')).toBeDisabled();
    await expect(p.locator('#code-input')).toHaveValue(functionCorrect);
    await expect(p.locator('#attempt-history-container .attempt-list li')).toHaveCount(3);
    await f04Context.setOffline(false);
    await p.reload();
    await expect(p.locator('#grade-code')).toBeEnabled();
    await expect(p.locator('.mastery-state')).toContainText('전체 숙달');
    await p.locator('.next-action [data-route="lesson:ds-list-find"]').click();
    await expect(p.locator('.detail-head h1')).toHaveText('단일 연결 리스트: 순회와 첫 일치 검색');
    console.log('PASS: REAL Cargo F04 browser: starter and missing-shipping failures, correction 10/10, quiz retry, separate mastery, shared history/backup restore, 390px, offline and next lesson');
  } finally {
    await f04Context?.close();
    await f04App.close();
    const status = f04Service.inspect();
    if (status.state === 'quarantined') throw Error('F04 browser service quarantined: ' + status.reason);
    assert.deepEqual(await readdir(f04Parent), []);
    await rm(f04Parent, { recursive: true, force: true });
  }
    const warningContext = await browser.newContext();
  warningContext.on('page', p => p.on('pageerror', e => errors.push(e.message)));
  try {
    for (const [route, terminal, workbench] of [
      ['/#lesson:c-hello', '.terminal[role="status"]', false],
      ['/workbench.html', '#grade-result', true]
    ]) {
      const warningPage = await warningContext.newPage();
      await warningPage.goto(base + route);
      if (workbench) await warningPage.locator('#lesson-select').selectOption('c-hello');
      await submit(warningPage, '#include <stdio.h>\nint main(void){int unused=7;puts("Hello, CodeWeave!");return 0;}');
      await expect(warningPage.locator(terminal)).toContainText('컴파일 실패');
      await expect(warningPage.locator(terminal)).toContainText('unused-variable');
      await expect(warningPage.locator(terminal)).toContainText('테스트 1: 미실행');
      await submit(warningPage, solutions['c-hello']);
      await expect(warningPage.locator(terminal)).toContainText('모든 테스트 통과');
      await warningPage.close();
    }
  } finally { await warningContext.close(); }
  console.log('PASS: both submission screens reject compiler warnings, show the diagnostic and accept the corrected code');
  context = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  context.on('page', p => p.on('pageerror', e => errors.push(e.message)));
  page = await context.newPage();
  for (const id of ['c-hello', 'c-types', 'c-loops']) {
    await page.goto(base + '/#lesson:' + id);
    const note = page.locator('article details.advanced').first();
    await expect(note).toHaveCount(1);
    assert.equal(await note.evaluate(el => el.open), false);
    const body = note.locator('p').first();
    await expect(body).not.toBeVisible();
    await note.locator('summary').focus();
    await page.keyboard.press('Enter');
    await expect(body).toBeVisible();
    await page.keyboard.press('Space');
    await expect(body).not.toBeVisible();
    await expect(page.locator('#code-input')).toBeVisible();
  }
  console.log('PASS: all three beginner lessons keep advanced notes closed, keyboard-toggleable and separate from practice');
  const interruptedCode = '#include <stdio.h>\nint main(void){int a,b;if(scanf("%d%d",&a,&b)!=2)return 8;if(a<0)return 7;printf("%d\\n",a+b);return 0;}';
  await page.goto(base + '/#lesson:c-types');
  await submit(page, interruptedCode);
  const interruptedTerminal = page.locator('.terminal[role="status"]');
  await expect(interruptedTerminal).toContainText('1/5개 테스트 통과');
  await expect(interruptedTerminal).toContainText('테스트 2: 실패');
  await expect(interruptedTerminal).toContainText('테스트 3: 미실행');
  await expect(interruptedTerminal).toContainText('테스트 5: 미실행');
  await expect(interruptedTerminal).not.toContainText('테스트 3: 실패');
  await page.reload();
  await expect(page.locator('#attempt-history-container')).toContainText('테스트 5: 미실행');
  const interruptedBench = await context.newPage();
  await interruptedBench.goto(base + '/workbench.html');
  await interruptedBench.locator('#lesson-select').selectOption('c-types');
  await submit(interruptedBench, interruptedCode);
  await expect(interruptedBench.locator('#grade-result')).toContainText('1/5개 테스트 통과');
  await expect(interruptedBench.locator('#grade-result')).toContainText('테스트 5: 미실행');
  await expect(interruptedBench.locator('#grade-result')).not.toContainText('테스트 3: 실패');
  await interruptedBench.close();
  console.log('PASS: fatal grading keeps the full denominator and unexecuted cases in both screens and reloaded v1 history');
  await page.goto(base + '/#lesson:c-hello');
  await expect(page.locator('.detail-head h1')).toHaveText('첫 C 프로그램의 구조');
  await expect(page.locator('.figure-box svg')).toContainText('전처리');
  await expect(page.locator('.figure-box svg')).toContainText('목적 파일 hello.o');
  await expect(page.locator('.article')).toContainText('printf 반환값과 출력 오류');
  await expect(page.locator('#code-input')).toHaveValue(/int main\(void\)/);
  await submit(page, solutions['c-hello']);
  await expect(page.locator('.terminal[role="status"]')).toContainText('모든 테스트 통과');
  await page.locator('#mark-theory').click();
  await page.locator('[data-quiz="c-hello"][data-choice="0"]').click();
  await expect(page.locator('.mastery-state')).toContainText('전체 숙달');
  console.log('PASS: first C lesson renders the detailed build pipeline and reaches mastery through a real submission');
  await page.goto(base + '/#lesson:c-loops');
  await expect(page.locator('.detail-head h1')).toHaveText('조건문과 반복문');
  await expect(page.locator('.article')).toContainText('불변식: 이미 더한 범위');
  await expect(page.locator('.article')).toContainText('500500');
  await expect(page.locator('.figure-box svg')).toContainText('거짓');
  await expect(page.locator('.figure-box svg')).toContainText('갱신');
  await submit(page, solutions['c-loops'].replace('i<=n', 'i<n'));
  await expect(page.locator('.terminal[role="status"]')).toContainText('채점 미통과');
  await submit(page, solutions['c-loops']);
  await expect(page.locator('.terminal[role="status"]')).toContainText('모든 테스트 통과');
  await expect(page.locator('#attempt-history-container .attempt-list li')).toHaveCount(2);
  await page.locator('#mark-theory').click();
  await page.locator('[data-quiz="c-loops"][data-choice="1"]').click();
  await expect(page.locator('.mastery-state')).toContainText('전체 숙달');
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'loops lesson mobile overflow');
  const loopsFigure = await page.locator('.figure-box svg').boundingBox();
  assert.ok(loopsFigure && loopsFigure.x >= 0 && loopsFigure.x + loopsFigure.width <= 390, 'loops figure fits the mobile viewport');
  if (qaDir) {
    await mkdir(qaDir, { recursive: true });
    await page.locator('.figure-box').screenshot({ path: path.join(qaDir, 'loop-invariant-mobile.png') });
  }
  await page.setViewportSize({ width: 1366, height: 900 });
  console.log('PASS: detailed loops lesson rejects an off-by-one, reaches mastery and fits 390px');
  await page.goto(base + '/#lesson:c-array');
  await expect(page.locator('.detail-head h1')).toHaveText('배열과 함수');
  await expect(page.locator('.article')).toContainText('sizeof로 구할 수 있는 길이');
  await expect(page.locator('.article')).toContainText('최댓값 추적과 불변식');
  await expect(page.locator('.figure-box svg')).toContainText('[0, count)');
  await expect(page.locator('.figure-box svg')).toContainText('접근 금지');
  await submit(page, solutions['c-array'].replace('int maximum = values[0];', 'int maximum = 0;'));
  await expect(page.locator('.terminal[role="status"]')).toContainText('채점 미통과');
  await submit(page, solutions['c-array']);
  await expect(page.locator('.terminal[role="status"]')).toContainText('모든 테스트 통과');
  await expect(page.locator('#attempt-history-container .attempt-list li')).toHaveCount(2);
  await page.locator('#mark-theory').click();
  await page.locator('[data-quiz="c-array"][data-choice="2"]').click();
  await expect(page.locator('.mastery-state')).toContainText('전체 숙달');
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'array introduction mobile overflow');
  const arrayFigure = await page.locator('.figure-box svg').boundingBox();
  assert.ok(arrayFigure && arrayFigure.x >= 0 && arrayFigure.x + arrayFigure.width <= 390, 'array figure fits the mobile viewport');
  if (qaDir) {
    await mkdir(qaDir, { recursive: true });
    await page.locator('.figure-box').screenshot({ path: path.join(qaDir, 'array-half-open-mobile.png') });
  }
  await page.setViewportSize({ width: 1366, height: 900 });
  console.log('PASS: array introduction rejects a zero candidate, reaches mastery and fits 390px');
  await page.goto(base + '/#lesson:c-pointer');
  await expect(page.locator('.detail-head h1')).toHaveText('포인터의 주소와 역참조');
  await expect(page.locator('.article')).toContainText('NULL 검사만으로는 유효성을 증명하지 못한다');
  await expect(page.locator('.article')).toContainText('포인터도 값 전달');
  await expect(page.locator('.figure-box svg')).toContainText('시점 A');
  await expect(page.locator('.figure-box svg')).toContainText('alias는 value 그대로');
  await submit(page, solutions['c-pointer'].replace('++(*value);', 'value++;'));
  await expect(page.locator('.terminal[role="status"]')).toContainText('채점 미통과');
  await submit(page, solutions['c-pointer']);
  await expect(page.locator('.terminal[role="status"]')).toContainText('모든 테스트 통과');
  await expect(page.locator('#attempt-history-container .attempt-list li')).toHaveCount(2);
  await page.locator('#mark-theory').click();
  await page.locator('[data-quiz="c-pointer"][data-choice="1"]').click();
  await expect(page.locator('.mastery-state')).toContainText('전체 숙달');
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'pointer introduction mobile overflow');
  const pointerFigure = await page.locator('.figure-box svg').boundingBox();
  assert.ok(pointerFigure && pointerFigure.x >= 0 && pointerFigure.x + pointerFigure.width <= 390, 'pointer figure fits the mobile viewport');
  const pointerTextSizes = await page.locator('.figure-box svg').evaluate(svg => [...svg.querySelectorAll('text')].map(label => {
    const transform = label.getScreenCTM();
    return { label: label.textContent, pixels: parseFloat(getComputedStyle(label).fontSize) * Math.hypot(transform.a, transform.b) };
  }));
  assert.ok(pointerTextSizes.length > 0 && pointerTextSizes.every(label => label.pixels >= 11.5), 'pointer diagram text must remain at least 11.5 CSS px at 390px: ' + JSON.stringify(pointerTextSizes));
  if (qaDir) {
    await mkdir(qaDir, { recursive: true });
    await page.locator('.figure-box').screenshot({ path: path.join(qaDir, 'pointer-alias-mobile.png') });
  }
  await page.setViewportSize({ width: 1366, height: 900 });
  console.log('PASS: pointer introduction rejects pointer movement, reaches mastery and fits 390px');
  await page.goto(base + '/#lesson:c-functions');
  await expect(page.locator('.detail-head h1')).toHaveText('함수 설계: 선언·호출·값 전달');
  await expect(page.locator('.article')).toContainText('static 지역 객체');
  await expect(page.locator('.article')).toContainText('범위·저장기간·연결');
  await expect(page.locator('.figure-box svg')).toContainText('int age = 30;');
  await expect(page.locator('.figure-box svg')).toContainText('바깥 이름만 가려짐');
  await expect(page.locator('#code-input')).toHaveValue(/int clamp\(int value, int low, int high\)/);
  await expect(page.locator('.practice-zone')).toContainText('Practice Exercise');
  await expect(page.locator('.practice-zone')).toContainText('선수 단원:');
  await submit(page, solutions['c-functions'].replace('printf("%d\\n", clamp(value, low, high));', 'clamp(value, low, high);\n    printf("%d\\n", value);'));
  await expect(page.locator('.terminal[role="status"]')).toContainText('채점 미통과');
  await submit(page, solutions['c-functions']);
  await expect(page.locator('.terminal[role="status"]')).toContainText('모든 테스트 통과');
  await expect(page.locator('#attempt-history-container .attempt-list li')).toHaveCount(2);
  await page.locator('#mark-theory').click();
  await page.locator('[data-quiz="c-functions"][data-choice="0"]').click();
  await expect(page.locator('.mastery-state')).toContainText('전체 숙달');
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'function lesson mobile overflow');
  const functionFigure = await page.locator('.figure-box svg').boundingBox();
  assert.ok(functionFigure && functionFigure.x >= 0 && functionFigure.x + functionFigure.width <= 390, 'function figure fits the mobile viewport');
  const functionTextSizes = await page.locator('.figure-box svg').evaluate(svg => [...svg.querySelectorAll('text')].map(label => {
    const transform = label.getScreenCTM();
    return parseFloat(getComputedStyle(label).fontSize) * Math.hypot(transform.a, transform.b);
  }));
  assert.ok(functionTextSizes.length > 0 && functionTextSizes.every(size => size >= 11.5), 'function diagram retains readable mobile text');
  if (qaDir) {
    await mkdir(qaDir, { recursive: true });
    await page.locator('.figure-box').screenshot({ path: path.join(qaDir, 'function-scope-mobile.png') });
  }
  await page.setViewportSize({ width: 1366, height: 900 });
  console.log('PASS: function lesson rejects discarded return, reaches mastery and preserves scope diagram readability at 390px');
  await page.goto(base + '/#lesson:c-recursion-factorial');
  // New DS unit must complete the same correction and mastery flow as C units.
  await page.evaluate(() => {
    const id = 'algo-binary';
    const drafts = JSON.parse(localStorage.getItem('codeweave.drafts.v1') || '{}');
    drafts[id] = '// my prior sample draft';
    localStorage.setItem('codeweave.drafts.v1', JSON.stringify(drafts));
    const progress = JSON.parse(localStorage.getItem('codeweave.progress.v1') || '{}');
    progress.completed = [...new Set([...(progress.completed || []), id])];
    progress.results = { ...progress.results, [id]: { correct: true, selected: 2 } };
    localStorage.setItem('codeweave.progress.v1', JSON.stringify(progress));
  });
  await page.goto(base + '/#lesson:algo-binary');
  await page.reload();
  await expect(page.locator('.detail-head h1')).toHaveText('복잡도와 선형·이진 탐색의 전제');
  await expect(page.locator('#code-input')).toHaveValue('// my prior sample draft');
  await expect(page.locator('.mastery-state')).not.toContainText('전체 숙달');
  const savedSearchQuiz = await page.evaluate(() => JSON.parse(localStorage.getItem('codeweave.progress.v1')).results['algo-binary']);
  assert.equal(savedSearchQuiz.correct, true);
  assert.equal(savedSearchQuiz.selected, 2);
  await page.locator('[data-quiz="algo-binary"][data-choice="2"]').click();
  await page.locator('#mark-theory').click();
  await submit(page, searchWrong);
  await expect(page.locator('.terminal[role="status"]')).toContainText('채점 미통과');
  await expect(page.locator('.mastery-state')).not.toContainText('전체 숙달');
  await submit(page, searchFunctions);
  await expect(page.locator('.terminal[role="status"]')).toContainText('모든 테스트 통과');
  await expect(page.locator('#attempt-history-container .attempt-list li')).toHaveCount(2);
  await expect(page.locator('.mastery-state')).toContainText('전체 숙달');
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'E01 mobile overflow');
  const searchFigure = await page.locator('.figure-box svg').boundingBox();
  assert.ok(searchFigure && searchFigure.x >= 0 && searchFigure.x + searchFigure.width <= 390);
  if (qaDir) {
    await mkdir(qaDir, { recursive: true });
    await page.screenshot({ path: path.join(qaDir, 'search-first-mobile.png'), fullPage: true });
  }
  await page.locator('[data-route="track:algo"]').first().click();
  await expect(page.locator('[data-route="lesson:algo-binary"]')).toHaveCount(1);
  await page.setViewportSize({ width: 1366, height: 900 });
  console.log('PASS: E01 preserves legacy draft/quiz, corrects a duplicate error, reaches mastery and fits 390px');
  await page.goto(base + '/#lesson:ds-list-find');
  await expect(page.locator('.detail-head h1')).toHaveText('단일 연결 리스트: 순회와 첫 일치 검색');
  await expect(page.locator('.figure-box svg')).toHaveAttribute('role', 'img');
  await expect(page.locator('.practice-zone')).toContainText('함수 직접 호출형');
  await expect(page.locator('#code-input')).not.toHaveValue(/int main\s*\(/);
  await page.locator('#mark-theory').click();
  await page.locator('[data-quiz="ds-list-find"][data-choice="0"]').click();
  await expect(page.locator('.mastery-state')).not.toContainText('전체 숙달');
  await submit(page, listLast);
  await expect(page.locator('.terminal[role="status"]')).toContainText('채점 미통과');
  await expect(page.locator('.mastery-state')).not.toContainText('전체 숙달');
  await submit(page, listFind);
  await expect(page.locator('.terminal[role="status"]')).toContainText('모든 테스트 통과');
  await expect(page.locator('#attempt-history-container .attempt-list li')).toHaveCount(2);
  await expect(page.locator('.mastery-state')).toContainText('전체 숙달');
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'D01 mobile overflow');
  const listFigure = await page.locator('.figure-box svg').boundingBox();
  assert.ok(listFigure && listFigure.x >= 0 && listFigure.x + listFigure.width <= 390);
  if (qaDir) {
    await mkdir(qaDir, { recursive: true });
    await page.screenshot({ path: path.join(qaDir, 'linked-list-mobile.png'), fullPage: true });
  }
  await page.setViewportSize({ width: 1366, height: 900 });
  console.log('PASS: D01 linked-list first-match failure/correction, separate mastery and 390px layout');
  await page.locator('.next-action [data-route="lesson:ds-stack"]').click();
  await expect(page.locator('.detail-head h1')).toHaveText('스택: 나중에 넣은 것이 먼저 나온다');
  console.log('PASS: D01 next-unit navigation stays in the DS track');
  await page.goto(base + '/#lesson:c-recursion-factorial');
  await expect(page.locator('.detail-head h1')).toHaveText('재귀: 종료 조건과 작은 팩토리얼');
  await expect(page.locator('.article')).toContainText('진행 척도');
  await expect(page.locator('.article')).toContainText('재귀 사용을 증명하지');
  await expect(page.locator('.figure-box svg')).toContainText('n=0');
  await expect(page.locator('.figure-box svg')).toContainText('3 × 2 = 6');
  await expect(page.locator('#code-input')).not.toHaveValue(/main\s*\(/);
  await expect(page.locator('.practice-zone')).toContainText('함수 직접 호출형');
  await submit(page, '#include <stddef.h>\nint factorial_checked(unsigned int n,unsigned long *out){if(!out||n>12)return 0;static unsigned long result=1UL;for(unsigned int i=1;i<=n;i++)result*=i;*out=result;return 1;}');
  await expect(page.locator('.terminal[role="status"]')).toContainText('채점 미통과');
  await submit(page, solutions['c-recursion-factorial']);
  await expect(page.locator('.terminal[role="status"]')).toContainText('모든 테스트 통과');
  await expect(page.locator('#attempt-history-container .attempt-list li')).toHaveCount(2);
  await page.locator('#mark-theory').click();
  await page.locator('[data-quiz="c-recursion-factorial"][data-choice="0"]').click();
  await expect(page.locator('.mastery-state')).toContainText('전체 숙달');
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'recursion lesson mobile overflow');
  const recursionFigure = await page.locator('.figure-box svg').boundingBox();
  assert.ok(recursionFigure && recursionFigure.x >= 0 && recursionFigure.x + recursionFigure.width <= 390, 'recursion diagram fits mobile viewport');
  const recursionTextSizes = await page.locator('.figure-box svg').evaluate(svg => [...svg.querySelectorAll('text')].map(label => {
    const transform = label.getScreenCTM();
    return parseFloat(getComputedStyle(label).fontSize) * Math.hypot(transform.a, transform.b);
  }));
  assert.ok(recursionTextSizes.length > 0 && recursionTextSizes.every(size => size >= 11.5), 'recursion diagram retains readable mobile text');
  if (qaDir) {
    await mkdir(qaDir, { recursive: true });
    await page.locator('.figure-box').screenshot({ path: path.join(qaDir, 'recursion-unwind-mobile.png') });
  }
  await page.setViewportSize({ width: 1366, height: 900 });
  console.log('PASS: recursion rejects shared state, reaches mastery and preserves call/return readability at 390px');
  await page.goto(base + '/#lesson:c-matrix-row-sums');
  await expect(page.locator('.detail-head h1')).toHaveText('다차원 배열: 행·열과 안전한 행 합');
  await expect(page.locator('.article')).toContainText('int **');
  await expect(page.locator('.article')).toContainText('C11');
  await expect(page.locator('.figure-box svg')).toContainText('열 [3] 접근 금지');
  await expect(page.locator('#code-input')).not.toHaveValue(/main\s*\(/);
  await submit(page, solutions['c-matrix-row-sums'].replace('totals[r] = sum;', 'totals[r] = sum; out_sums[r] = sum;'));
  await expect(page.locator('.terminal[role="status"]')).toContainText('채점 미통과');
  await submit(page, solutions['c-matrix-row-sums']);
  await expect(page.locator('.terminal[role="status"]')).toContainText('모든 테스트 통과');
  await expect(page.locator('#attempt-history-container .attempt-list li')).toHaveCount(2);
  await page.locator('#mark-theory').click();
  await page.locator('[data-quiz="c-matrix-row-sums"][data-choice="0"]').click();
  await expect(page.locator('.mastery-state')).toContainText('전체 숙달');
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'matrix lesson mobile overflow');
  const matrixFigure = await page.locator('.figure-box svg').boundingBox();
  assert.ok(matrixFigure && matrixFigure.x >= 0 && matrixFigure.x + matrixFigure.width <= 390, 'matrix diagram fits mobile viewport');
  const matrixTextSizes = await page.locator('.figure-box svg').evaluate(svg => [...svg.querySelectorAll('text')].map(label => {
    const transform = label.getScreenCTM();
    return parseFloat(getComputedStyle(label).fontSize) * Math.hypot(transform.a, transform.b);
  }));
  assert.ok(matrixTextSizes.length > 0 && matrixTextSizes.every(size => size >= 11.5), 'matrix diagram retains readable mobile text');
  if (qaDir) {
    await mkdir(qaDir, { recursive: true });
    await page.locator('.figure-box').screenshot({ path: path.join(qaDir, 'matrix-rows-mobile.png') });
  }
  await page.setViewportSize({ width: 1366, height: 900 });
  console.log('PASS: matrix rejects early output publication, reaches mastery and preserves row/column readability at 390px');
  await page.goto(base + '/#lesson:c-clamp-function');
  await expect(page.locator('.detail-head h1')).toHaveText('함수 구현 실습: 테스트 하네스와 계약');
  await expect(page.locator('#code-input')).not.toHaveValue(/main\s*\(/);
  await expect(page.locator('.practice-zone')).toContainText('함수 직접 호출형');
  await submit(page, functionOnly + '\nint main(void){return 0;}');
  await expect(page.locator('.terminal[role="status"]')).toContainText('링크 단계 · 같은 이름이 두 번 정의됨');
  await expect(page.locator('.terminal[role="status"]')).toContainText('multiple definition');
  await submit(page, functionOnly);
  await expect(page.locator('.terminal[role="status"]')).toContainText('모든 테스트 통과');
  console.log('PASS: function-only lesson explains a linker failure and then passes the direct-call harness');
  await page.goto(base + '/#lesson:c-array-max-function');
  await expect(page.locator('.detail-head h1')).toHaveText('배열 함수 실습: 최댓값과 출력 포인터');
  await expect(page.locator('.figure-box svg')).toContainText('out_max');
  await expect(page.locator('#code-input')).not.toHaveValue(/main\s*\(/);
  await expect(page.locator('.practice-zone')).toContainText('함수 직접 호출형');
  await submit(page, arrayMaxWrong);
  await expect(page.locator('.terminal[role="status"]')).toContainText('채점 미통과');
  await submit(page, arrayMaxFunction);
  await expect(page.locator('.terminal[role="status"]')).toContainText('모든 테스트 통과');
  await expect(page.locator('#attempt-history-container .attempt-list li')).toHaveCount(2);
  await page.locator('#mark-theory').click();
  await page.locator('[data-quiz="c-array-max-function"][data-choice="0"]').click();
  await expect(page.locator('.mastery-state')).toContainText('전체 숙달');
  console.log('PASS: array function failure, correction, iterations and mastery stay in one lesson flow');
  await page.goto(base + '/#lesson:c-string-count-function');
  await expect(page.locator('.detail-head h1')).toHaveText('문자열 함수 실습: 널 종료와 문자 세기');
  await expect(page.locator('.figure-box svg')).toContainText('여기서 중지');
  await expect(page.locator('#code-input')).not.toHaveValue(/main\s*\(/);
  await expect(page.locator('.practice-zone')).toContainText('함수 직접 호출형');
  await submit(page, stringCountWrong);
  await expect(page.locator('.terminal[role="status"]')).toContainText('채점 미통과');
  await submit(page, stringCountFunction);
  await expect(page.locator('.terminal[role="status"]')).toContainText('모든 테스트 통과');
  await expect(page.locator('#attempt-history-container .attempt-list li')).toHaveCount(2);
  await page.locator('#mark-theory').click();
  await page.locator('[data-quiz="c-string-count-function"][data-choice="0"]').click();
  await expect(page.locator('.mastery-state')).toContainText('전체 숙달');
  console.log('PASS: string terminator boundary, correction, iterations and mastery stay in one lesson flow');
  await page.goto(base + '/#lesson:c-bounded-string-length');
  await expect(page.locator('.detail-head h1')).toHaveText('경계 있는 문자열: 용량과 종료 문자');
  await expect(page.locator('.figure-box svg')).toContainText('[0, capacity)');
  await expect(page.locator('#code-input')).not.toHaveValue(/main\s*\(/);
  await expect(page.locator('.practice-zone')).toContainText('함수 직접 호출형');
  await submit(page, boundedStringWrong);
  await expect(page.locator('.terminal[role="status"]')).toContainText('채점 미통과');
  await submit(page, boundedStringFunction);
  await expect(page.locator('.terminal[role="status"]')).toContainText('모든 테스트 통과');
  await expect(page.locator('#attempt-history-container .attempt-list li')).toHaveCount(2);
  await page.locator('#mark-theory').click();
  await page.locator('[data-quiz="c-bounded-string-length"][data-choice="0"]').click();
  await expect(page.locator('.mastery-state')).toContainText('전체 숙달');
  console.log('PASS: bounded string capacity failure, correction, iterations and mastery stay in one lesson flow');
  await page.goto(base + '/#lesson:c-fgets-logical-line');
  await expect(page.locator('.detail-head h1')).toHaveText('fgets로 논리적 한 줄 읽기');
  await expect(page.locator('.figure-box svg')).toContainText('7 + 4');
  await expect(page.locator('#code-input')).toHaveValue(/char chunk\[8\]/);
  await expect(page.locator('.practice-zone')).toContainText('입출력형');
  await submit(page, fgetsLogicalLineWrong);
  await expect(page.locator('.terminal[role="status"]')).toContainText('채점 미통과');
  await submit(page, fgetsLogicalLine);
  await expect(page.locator('.terminal[role="status"]')).toContainText('모든 테스트 통과');
  await expect(page.locator('#attempt-history-container .attempt-list li')).toHaveCount(2);
  await page.locator('#mark-theory').click();
  await page.locator('[data-quiz="c-fgets-logical-line"][data-choice="0"]').click();
  await expect(page.locator('.mastery-state')).toContainText('전체 숙달');
  console.log('PASS: fgets chunk failure, correction, iterations and mastery stay in one lesson flow');
  await page.goto(base + '/#lesson:c-strtol-integer-input');
  await expect(page.locator('.detail-head h1')).toHaveText('fgets와 strtol로 정수 검증하기');
  await expect(page.locator('.figure-box svg')).toContainText('endptr');
  await expect(page.locator('#code-input')).toHaveValue(/char line\[64\]/);
  await expect(page.locator('.practice-zone')).toContainText('입출력형');
  await submit(page, strtolIntegerWrong);
  await expect(page.locator('.terminal[role="status"]')).toContainText('채점 미통과');
  await submit(page, strtolIntegerInput);
  await expect(page.locator('.terminal[role="status"]')).toContainText('모든 테스트 통과');
  await expect(page.locator('#attempt-history-container .attempt-list li')).toHaveCount(2);
  await page.locator('#mark-theory').click();
  await page.locator('[data-quiz="c-strtol-integer-input"][data-choice="0"]').click();
  await expect(page.locator('.mastery-state')).toContainText('전체 숙달');
  console.log('PASS: strtol syntax, range and trailing-input validation stay in one lesson flow');
  await page.goto(base + '/#lesson:c-struct-student-score');
  await expect(page.locator('.detail-head h1')).toHaveText('구조체와 포인터로 학생 점수 갱신하기');
  await expect(page.locator('.figure-box svg')).toContainText('id 유지');
  await expect(page.locator('#code-input')).toHaveValue(/struct Student/);
  await expect(page.locator('.practice-zone')).toContainText('함수 직접 호출형');
  await submit(page, structStudentWrong);
  await expect(page.locator('.terminal[role="status"]')).toContainText('채점 미통과');
  await submit(page, structStudentScore);
  await expect(page.locator('.terminal[role="status"]')).toContainText('모든 테스트 통과');
  await expect(page.locator('#attempt-history-container .attempt-list li')).toHaveCount(2);
  await page.locator('#mark-theory').click();
  await page.locator('[data-quiz="c-struct-student-score"][data-choice="0"]').click();
  await expect(page.locator('.mastery-state')).toContainText('전체 숙달');
  console.log('PASS: structure pointer validation, preserved failure, iterations and mastery stay in one lesson flow');
  await page.goto(base + '/#lesson:c-struct-array-search');
  await expect(page.locator('.detail-head h1')).toHaveText('구조체 배열에서 학번 찾기');
  await expect(page.locator('.figure-box svg')).toContainText('첫 일치');
  await expect(page.locator('#code-input')).toHaveValue(/find_student_index/);
  await expect(page.locator('.practice-zone')).toContainText('함수 직접 호출형');
  await submit(page, structArraySearchWrong);
  await expect(page.locator('.terminal[role="status"]')).toContainText('채점 미통과');
  await submit(page, structArraySearch);
  await expect(page.locator('.terminal[role="status"]')).toContainText('모든 테스트 통과');
  await expect(page.locator('#attempt-history-container .attempt-list li')).toHaveCount(2);
  await page.locator('#mark-theory').click();
  await page.locator('[data-quiz="c-struct-array-search"][data-choice="0"]').click();
  await expect(page.locator('.mastery-state')).toContainText('전체 숙달');
  console.log('PASS: structure array first-match correction, iterations and mastery stay in one lesson flow');
  await page.goto(base + '/#lesson:c-struct-array-sort');
  await expect(page.locator('.detail-head h1')).toHaveText('구조체 배열을 학번순으로 안정 정렬하기');
  await expect(page.locator('.figure-box svg')).toContainText('엄격한 >');
  await expect(page.locator('#code-input')).toHaveValue(/stable_sort_students_by_id/);
  await expect(page.locator('.practice-zone')).toContainText('함수 직접 호출형');
  await submit(page, structArraySortWrong);
  await expect(page.locator('.terminal[role="status"]')).toContainText('채점 미통과');
  await submit(page, structArraySort);
  await expect(page.locator('.terminal[role="status"]')).toContainText('모든 테스트 통과');
  await expect(page.locator('#attempt-history-container .attempt-list li')).toHaveCount(2);
  await page.locator('#mark-theory').click();
  await page.locator('[data-quiz="c-struct-array-sort"][data-choice="0"]').click();
  await expect(page.locator('.mastery-state')).toContainText('전체 숙달');
  console.log('PASS: stable structure sort correction, iterations and mastery stay in one lesson flow');
  await page.goto(base + '/#lesson:c-struct-array-binary-search');
  await expect(page.locator('.detail-head h1')).toHaveText('정렬된 구조체 배열에서 첫 학번 이진 탐색');
  await expect(page.locator('.figure-box svg')).toContainText('첫 위치 1');
  await expect(page.locator('#code-input')).toHaveValue(/find_first_student_by_id/);
  await expect(page.locator('.practice-zone')).toContainText('함수 직접 호출형');
  await submit(page, structArrayBinarySearchWrong);
  await expect(page.locator('.terminal[role="status"]')).toContainText('채점 미통과');
  await submit(page, structArrayBinarySearch);
  await expect(page.locator('.terminal[role="status"]')).toContainText('모든 테스트 통과');
  await expect(page.locator('#attempt-history-container .attempt-list li')).toHaveCount(2);
  await page.locator('#mark-theory').click();
  await page.locator('[data-quiz="c-struct-array-binary-search"][data-choice="0"]').click();
  await expect(page.locator('.mastery-state')).toContainText('전체 숙달');
  console.log('PASS: first-position binary search correction, iterations and mastery stay in one lesson flow');
  await page.goto(base + '/#lesson:c-multi-file');
  await expect(page.locator('.detail-head h1')).toHaveText('분할 컴파일: 헤더와 여러 소스 파일');
  await expect(page.locator('.figure-box svg')).toContainText('functions.h');
  await expect(page.locator('[data-code-file]')).toHaveCount(3);
  await expect(page.locator('.practice-zone')).toContainText('다중 파일형');
  await fillMultiFile(page, multiFileSolution);
  const multiResponse = page.waitForResponse(r => r.url().endsWith('/api/grade'));
  await page.locator('#grade-code').click(); await multiResponse; await ready(page);
  await expect(page.locator('.terminal[role="status"]')).toContainText('모든 테스트 통과');
  assert.match(await page.evaluate(() => JSON.parse(localStorage.getItem('codeweave.drafts.v1'))['c-multi-file']), /^CODEWEAVE_MULTI_FILE_V1/);
  await fillMultiFile(page, multiFileWrong);
  const failedMultiResponse = page.waitForResponse(r => r.url().endsWith('/api/grade'));
  await page.locator('#grade-code').click(); await failedMultiResponse; await ready(page);
  await expect(page.locator('.terminal[role="status"]')).toContainText('채점 미통과');
  await expect(page.locator('#attempt-history-container .attempt-list li')).toHaveCount(2);
  await expect(page.locator('#attempt-history-container .attempt-status.failed')).toHaveCount(1);
  page.once('dialog', dialog => dialog.accept());
  await page.locator('#attempt-history-container .attempt-list li').last().locator('button').click();
  await expectMultiFile(page, multiFileSolution);
  await expect(page.locator('.terminal[role="status"]')).toContainText('이전 제출 코드를 복원했습니다');

  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'multi-file lesson mobile overflow');
  for (const file of multiFileSolution) {
    const box = await page.locator('[data-code-file="' + file.name + '"]').boundingBox();
    assert.ok(box && box.x >= 0 && box.x + box.width <= 390, file.name + ' must fit the mobile viewport');
  }
  if (qaDir) {
    await mkdir(qaDir, { recursive: true });
    await page.locator('.multi-file-editors').screenshot({ path: path.join(qaDir, 'lesson-multi-file-mobile.png') });
  }

  const multiBench = await context.newPage();
  await multiBench.setViewportSize({ width: 390, height: 844 });
  await multiBench.goto(base + '/workbench.html');
  await multiBench.locator('#lesson-select').selectOption('c-multi-file');
  await expectMultiFile(multiBench, multiFileSolution);
  await expect(multiBench.locator('#attempt-list li')).toHaveCount(2);
  assert.equal(await multiBench.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'multi-file workbench mobile overflow');
  for (const file of multiFileSolution) {
    const box = await multiBench.locator('[data-code-file="' + file.name + '"]').boundingBox();
    assert.ok(box && box.x >= 0 && box.x + box.width <= 390, 'workbench ' + file.name + ' must fit the mobile viewport');
  }
  if (qaDir) await multiBench.locator('#multi-file-editors').screenshot({ path: path.join(qaDir, 'workbench-multi-file-mobile.png') });

  const multiDownloadPromise = multiBench.waitForEvent('download');
  await multiBench.locator('#export-history').click();
  const multiDownload = await multiDownloadPromise;
  const multiChunks = [];
  for await (const chunk of await multiDownload.createReadStream()) multiChunks.push(chunk);
  const multiBackup = Buffer.concat(multiChunks);
  const multiBackupData = JSON.parse(multiBackup);
  assert.equal(multiBackupData.kind, 'full-backup');
  assert.equal(multiBackupData.iterations['c-multi-file'].length, 2);

  await fillMultiFile(multiBench, multiFileWrong);
  await expect.poll(() => multiBench.evaluate(() => JSON.parse(localStorage.getItem('codeweave.drafts.v1'))['c-multi-file']))
    .not.toBe(multiBackupData.drafts['c-multi-file']);
  multiBench.on('dialog', dialog => dialog.accept());
  await multiBench.locator('#import-file').setInputFiles({ name: 'multi-file-backup.json', mimeType: 'application/json', buffer: multiBackup });
  await expect(multiBench.locator('#draft-status')).toHaveText('통합 백업을 복원했습니다.');
  await expectMultiFile(multiBench, multiFileSolution);
  await expect(multiBench.locator('#attempt-list li')).toHaveCount(2);
  await page.reload();
  await expectMultiFile(page, multiFileSolution);
  await expect(page.locator('#attempt-history-container .attempt-list li')).toHaveCount(2);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await multiBench.close();
  await page.setViewportSize({ width: 1366, height: 900 });
  console.log('PASS: multi-file mobile editors, attempt restore and unified backup round trip preserve all three files');
  await page.goto(base + '/#lesson:c-struct-student-registry');
  await expect(page.locator('.detail-head h1')).toHaveText('학생 명부: 안정 정렬과 첫 학번 탐색');
  await expect(page.locator('.figure-box svg')).toContainText('안정 정렬');
  await expect(page.locator('[data-code-file]')).toHaveCount(3);
  await fillMultiFile(page, studentRegistrySolution);
  const registryResponse = page.waitForResponse(r => r.url().endsWith('/api/grade'));
  await page.locator('#grade-code').click(); await registryResponse; await ready(page);
  await expect(page.locator('.terminal[role="status"]')).toContainText('모든 테스트 통과');
  await expect(page.locator('[data-code-file="student.h"]')).toHaveValue(/struct Student/);
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'student registry mobile overflow');
  await page.setViewportSize({ width: 1366, height: 900 });
  console.log('PASS: student registry lesson renders and submits its independent three-file contract');
  await page.goto(base + '/#lesson:c-dynamic-student-array');
  await expect(page.locator('.detail-head h1')).toHaveText('동적 메모리: 학생 배열의 생성과 해제');
  await expect(page.locator('.figure-box svg')).toContainText('SIZE_MAX');
  await expect(page.locator('.figure-box svg')).toContainText('malloc');
  await expect(page.locator('#code-input')).toHaveValue(/create_students/);
  await expect(page.locator('#code-input')).not.toHaveValue(/main\s*\(/);
  await submit(page, dynamicStudentArray);
  await expect(page.locator('.terminal[role="status"]')).toContainText('모든 테스트 통과');
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'dynamic student array mobile overflow');
  await page.setViewportSize({ width: 1366, height: 900 });
  console.log('PASS: dynamic student array lesson renders its ownership figure and passes the allocation wrapper harness');
  await page.goto(base + '/#lesson:c-realloc-student-capacity');
  await expect(page.locator('.detail-head h1')).toHaveText('realloc로 학생 배열 용량 늘리기');
  await expect(page.locator('.figure-box svg')).toContainText('realloc');
  await expect(page.locator('.figure-box svg')).toContainText('원본 보존');
  await expect(page.locator('#code-input')).toHaveValue(/reserve_students/);
  await expect(page.locator('#code-input')).not.toHaveValue(/main\s*\(/);
  await submit(page, reallocStudentCapacity);
  await expect(page.locator('.terminal[role="status"]')).toContainText('모든 테스트 통과');
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'realloc student capacity mobile overflow');
  await page.setViewportSize({ width: 1366, height: 900 });
  console.log('PASS: realloc lesson renders its preserved-failure figure and passes deterministic failure injection');
  await page.goto(base + '/#lesson:c-student-vector-push');
  await expect(page.locator('.detail-head h1')).toHaveText('동적 배열: 학생 한 명 안전하게 추가하기');
  await expect(page.locator('.figure-box svg')).toContainText('reserve_students');
  await expect(page.locator('.figure-box svg')).toContainText('0 → 4');
  await expect(page.locator('#code-input')).toHaveValue(/push_student/);
  await expect(page.locator('#code-input')).not.toHaveValue(/int main\s*\(/);
  await submit(page, studentVectorPush);
  await expect(page.locator('.terminal[role="status"]')).toContainText('모든 테스트 통과');
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'student vector push mobile overflow');
  await page.setViewportSize({ width: 1366, height: 900 });
  console.log('PASS: vector push lesson renders geometric growth and passes reserve reuse cases');
  await page.evaluate(({ failed }) => {
    // Keep the actually graded DS attempts for the subsequent all-track backup check.
    // Reset legacy C data/progress independently; this fixture is not a product reset.
    const dsHistory = JSON.parse(localStorage.getItem('codeweave.iterations.v1'))['ds-list-find'];
    const dsDraft = JSON.parse(localStorage.getItem('codeweave.drafts.v1'))['ds-list-find'];
    const algoHistory = JSON.parse(localStorage.getItem('codeweave.iterations.v1'))['algo-binary'];
    const algoDraft = JSON.parse(localStorage.getItem('codeweave.drafts.v1'))['algo-binary'];
    if (algoHistory?.length !== 2 || typeof algoDraft !== 'string') throw Error('E01 setup did not produce two attempts and a draft');
    if (dsHistory?.length !== 2 || typeof dsDraft !== 'string') throw Error('D01 setup did not produce two attempts and a draft');
    localStorage.clear();
    localStorage.setItem('codeweave.drafts.v1', JSON.stringify({ 'c-types': failed, 'rust-mut': 'keep rust draft', 'ds-list-find': dsDraft, 'algo-binary': algoDraft }));
    localStorage.setItem('codeweave.iterations.v1', JSON.stringify({ 'c-types': [{
      at: '2026-10-11T02:30:00.000Z', code: failed, passed: false,
      message: '<img src=x onerror=alert(1)>', tests: [{ passed: false, detail: 'legacy failure' }]
    }], 'ds-list-find': dsHistory, 'algo-binary': algoHistory }));
  }, { failed });
  await page.goto(base + '/#lesson:c-types');
  // Hash navigation keeps the original module state; reload after seeding v1 data.
  await page.reload();
  await expect(page.locator('.detail-head h1')).toHaveText('변수·자료형·연산자');
  await expect(page.locator('.article')).toContainText('정수의 표현 범위와 구현 차이');
  await expect(page.locator('.article')).toContainText('scanf는 변환 개수를 확인한다');
  await expect(page.locator('.figure-box svg')).toContainText('double 3.0');
  await expect(page.locator('.figure-box svg')).toContainText('double 3.5');
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'types lesson mobile overflow');
  const typesFigure = await page.locator('.figure-box svg').boundingBox();
  assert.ok(typesFigure && typesFigure.x >= 0 && typesFigure.x + typesFigure.width <= 390, 'types figure fits the mobile viewport');
  if (qaDir) {
    await mkdir(qaDir, { recursive: true });
    await page.locator('.figure-box').screenshot({ path: path.join(qaDir, 'types-conversion-mobile.png') });
  }
  await page.setViewportSize({ width: 1366, height: 900 });
  await expect(page.locator('#code-input')).toHaveValue(failed);
  await expect(page.locator('#attempt-history-container .attempt-list li')).toHaveCount(1);
  await expect(page.locator('#attempt-history-container .attempt-list img')).toHaveCount(0);
  await expect(page.locator('#attempt-history-container .attempt-status.failed')).toHaveCount(1);
  console.log('PASS: legacy drafts/history render safely in the lesson');

  const bench = await context.newPage();
  await bench.goto(base + '/workbench.html');
  await expect(bench.locator('#lesson-select option[value="c-clamp-function"]')).toHaveCount(1);
  await expect(bench.locator('#lesson-select option[value="c-array-max-function"]')).toHaveCount(1);
  await expect(bench.locator('#lesson-select option[value="c-string-count-function"]')).toHaveCount(1);
  await expect(bench.locator('#lesson-select option[value="c-bounded-string-length"]')).toHaveCount(1);
  await expect(bench.locator('#lesson-select option[value="c-fgets-logical-line"]')).toHaveCount(1);
  await expect(bench.locator('#lesson-select option[value="c-strtol-integer-input"]')).toHaveCount(1);
  await expect(bench.locator('#lesson-select option[value="c-struct-student-score"]')).toHaveCount(1);
  await expect(bench.locator('#lesson-select option[value="c-struct-array-search"]')).toHaveCount(1);
  await expect(bench.locator('#lesson-select option[value="c-struct-array-sort"]')).toHaveCount(1);
  await expect(bench.locator('#lesson-select option[value="c-struct-array-binary-search"]')).toHaveCount(1);
  await expect(bench.locator('#lesson-select option[value="c-multi-file"]')).toHaveCount(1);
  await expect(bench.locator('#lesson-select option[value="c-struct-student-registry"]')).toHaveCount(1);
  await expect(bench.locator('#lesson-select option[value="c-dynamic-student-array"]')).toHaveCount(1);
  await expect(bench.locator('#lesson-select option[value="c-realloc-student-capacity"]')).toHaveCount(1);
  await expect(bench.locator('#lesson-select option[value="c-student-vector-push"]')).toHaveCount(1);
  await bench.locator('#lesson-select').selectOption('c-types');
  await submit(page, failed);
  await expect(page.locator('#attempt-history-container .attempt-list li')).toHaveCount(2);
  await submit(page, correct);
  await expect(page.locator('#attempt-history-container .attempt-list li')).toHaveCount(3);
  assert.ok(await page.locator('#attempt-history-container .attempt-status.passed').count() > 0);
  assert.deepEqual((await history(page))['c-types'].map(x => x.passed), [true, false, false]);
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('codeweave.progress.v1') || '{"completed":[]}').completed.includes('c-types')), false);
  await page.locator('#mark-theory').click();
  await page.locator('[data-quiz="c-types"][data-choice="1"]').click();
  await expect(page.locator('.mastery-state')).toContainText('전체 숙달');
  assert.deepEqual(await page.evaluate(() => JSON.parse(localStorage.getItem('codeweave.progress.v1')).theoryRead), ['c-types']);
  await page.locator('#toggle-review').click();
  await expect(page.locator('.mastery-state')).toContainText('숙달 진행 중');
  await expect(page.locator('.learning-status-list')).toContainText('! 필요');
  await page.locator('#toggle-review').click();
  await expect(page.locator('.mastery-state')).toContainText('전체 숙달');
  await expect(bench.locator('#attempt-list li')).toHaveCount(3);
  await page.locator('#attempt-history-container .attempt-list li').first().locator('summary').click();
  await expect(page.locator('#attempt-history-container .attempt-list li').first().locator('pre').last()).toHaveText(correct);
  await expect(page.locator('#attempt-history-container .attempt-list li').first().locator('pre').first()).toContainText('테스트 3: 통과');
  await submit(bench, correct);
  await expect(page.locator('#attempt-history-container .attempt-list li')).toHaveCount(4);
  console.log('PASS: real failing/passing submissions, separate quiz status and live shared history');

  page.once('dialog', d => d.dismiss());
  await page.locator('#attempt-history-container .attempt-list li').last().locator('button').click();
  await expect(page.locator('#code-input')).toHaveValue(correct);
  page.once('dialog', d => d.accept());
  await page.locator('#attempt-history-container .attempt-list li').last().locator('button').click();
  await expect(page.locator('#code-input')).toHaveValue(failed);
  assert.equal((await history(page))['c-types'].length, 4);
  await submit(page, failed);
  assert.equal((await history(page))['c-types'].length, 5);
  assert.ok(await page.locator('#attempt-history-container .attempt-status.passed').count() > 0);
  await page.reload();
  await expect(page.locator('#code-input')).toHaveValue(failed);
  await expect(page.locator('#attempt-history-container .attempt-list li')).toHaveCount(5);
  console.log('PASS: cancel/restore/re-submit/reload preserve previous iterations');

  await page.route('**/api/grade', route => route.fulfill({ status: 503, body: '{}' }));
  await submit(page, correct);
  assert.equal((await history(page))['c-types'].length, 5);
  await expect(page.locator('.terminal[role="status"]')).toContainText('채점 요청 실패 503');
  await page.unroute('**/api/grade');
  await page.route('**/api/grade', route => route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true,"tests":[]}' }));
  await submit(page, correct);
  assert.equal((await history(page))['c-types'].length, 5);
  await expect(page.locator('.terminal[role="status"]')).toContainText('잘못된 채점 결과');
  await page.unroute('**/api/grade');
  await page.locator('#code-input').focus();
  await page.keyboard.press('Shift+Tab');
  assert.equal(await page.locator('#code-input').evaluate(el => el === document.activeElement), false);
  console.log('PASS: transport/invalid response errors do not create attempts; keyboard can leave editor');

  const downloadPromise = bench.waitForEvent('download');
  await bench.locator('#export-history').click();
  const download = await downloadPromise;
  const chunks = [];
  for await (const chunk of await download.createReadStream()) chunks.push(chunk);
  const backup = Buffer.concat(chunks);
  assert.equal(JSON.parse(backup).kind, 'full-backup');
  assert.equal(JSON.parse(backup)['iterations']['c-types'].length, 5);
  assert.equal(JSON.parse(backup)['iterations']['ds-list-find'].length, 2);
  assert.equal(JSON.parse(backup)['iterations']['algo-binary'].length, 2);
  assert.equal(JSON.parse(backup).drafts['algo-binary'], searchFunctions);
  await expect(bench.locator('#lesson-select option[value="algo-binary"]')).toHaveCount(1);
  await expect(bench.locator('#lesson-select option[value="ds-list-find"]')).toHaveCount(1);
  bench.on('dialog', d => d.accept());
  await bench.locator('#import-file').setInputFiles({ name: 'attempts.json', mimeType: 'application/json', buffer: backup });
  await expect(bench.locator('#draft-status')).toHaveText('통합 백업을 복원했습니다.');
  assert.equal(await bench.evaluate(() => JSON.parse(localStorage.getItem('codeweave.drafts.v1'))['rust-mut']), 'keep rust draft');
  await expect(page.locator('#attempt-history-container .attempt-list li')).toHaveCount(5);
  console.log('PASS: unified workbench backup/restore preserves all-track data');

  await page.locator('[data-route="settings"]').click();
  page.on('dialog', d => d.accept());
  await page.locator('#import-file').setInputFiles({ name: 'legacy-progress.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({
    app: 'CodeWeave', version: 1, progress: { completed: ['c-types'], results: {} }, drafts: { 'c-types': correct }
  })) });
  await expect(page.locator('#import-file')).toBeAttached();
  // Wait for the imported draft, not for the file input alone.
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('codeweave.drafts.v1'))['c-types'])).toBe(correct);
  assert.equal((await history(page))['c-types'].length, 5);
  console.log('PASS: legacy progress restore retains the independent submission history');

  await page.goto(base + '/#lesson:c-types');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  for (const asset of ['/src/catalog.js', '/src/figures.js', '/src/practice.js', '/src/mastery.js', '/src/exercises.js', '/src/multi-file.js', '/src/compiler-feedback.js']) {
    assert.equal(await page.evaluate(async asset => !!(await caches.match(asset)), asset), true, 'cached ' + asset);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'mobile document overflow');
  if (qaDir) {
    await mkdir(qaDir, { recursive: true });
    await page.locator('.attempt-history').screenshot({ path: path.join(qaDir, 'lesson-attempts-mobile.png') });
  }
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator('.article')).toContainText('정수의 표현 범위와 구현 차이');
  await expect(page.locator('.figure-box svg')).toContainText('double 3.5');
  await expect(page.locator('#attempt-history-container .attempt-list li')).toHaveCount(5);
  await expect(page.locator('#code-input')).toHaveValue(correct);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await page.goto(base + '/#lesson:c-loops');
  await page.reload();
  await expect(page.locator('.detail-head h1')).toHaveText('조건문과 반복문');
  await expect(page.locator('.figure-box svg')).toContainText('갱신');
  await expect(page.locator('.article')).toContainText('누산형 범위는 반복 횟수와 다르다');
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'offline loops lesson mobile overflow');
  await page.goto(base + '/#lesson:c-array');
  await page.reload();
  await expect(page.locator('.detail-head h1')).toHaveText('배열과 함수');
  await expect(page.locator('.figure-box svg')).toContainText('접근 금지');
  await expect(page.locator('.article')).toContainText('함수 매개변수와 별도 길이');
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'offline array introduction mobile overflow');
  await page.goto(base + '/#lesson:c-pointer');
  await page.reload();
  await expect(page.locator('.detail-head h1')).toHaveText('포인터의 주소와 역참조');
  await expect(page.locator('.figure-box svg')).toContainText('alias는 value 그대로');
  await expect(page.locator('.article')).toContainText('객체 수명과 빌린 주소');
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'offline pointer introduction mobile overflow');
  await page.goto(base + '/#lesson:c-functions');
  await page.reload();
  await expect(page.locator('.detail-head h1')).toHaveText('함수 설계: 선언·호출·값 전달');
  await expect(page.locator('.figure-box svg')).toContainText('int age = 15;');
  await expect(page.locator('.article')).toContainText('static 지역 객체');
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'offline function lesson mobile overflow');
  await page.goto(base + '/#lesson:c-recursion-factorial');
  await page.reload();
  await expect(page.locator('.detail-head h1')).toHaveText('재귀: 종료 조건과 작은 팩토리얼');
  await expect(page.locator('.figure-box svg')).toContainText('return 1');
  await expect(page.locator('.article')).toContainText('ULONG_MAX');
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'offline recursion lesson mobile overflow');
  await page.goto(base + '/#lesson:c-matrix-row-sums');
  await page.reload();
  await expect(page.locator('.detail-head h1')).toHaveText('다차원 배열: 행·열과 안전한 행 합');
  await expect(page.locator('.figure-box svg')).toContainText('열 [3] 접근 금지');
  await expect(page.locator('.article')).toContainText('모든 검증 뒤 출력 공개');
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'offline matrix lesson mobile overflow');
  await page.goto(base + '/#lesson:ds-list-find');
  await page.reload();
  await expect(page.locator('.detail-head h1')).toHaveText('단일 연결 리스트: 순회와 첫 일치 검색');
  await expect(page.locator('.figure-box svg')).toHaveAttribute('role', 'img');
  // The deliberately restored legacy backup replaces drafts, but retains history.
  // Recover the DS draft from its latest correct attempt, then reload offline.
  await page.locator('[data-restore-attempt="0"]').click();
  await expect(page.locator('#code-input')).toHaveValue(listFind);
  await page.reload();
  await expect(page.locator('#code-input')).toHaveValue(listFind);
  await expect(page.locator('#attempt-history-container .attempt-list li')).toHaveCount(2);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'offline D01 mobile overflow');
  await context.setOffline(false);
  console.log('PASS: D01 backup preserves two attempts and offline reload restores its draft/history/diagram');
  await context.setOffline(true);
  await page.goto(base + '/#lesson:algo-binary');
  await page.reload();
  await expect(page.locator('.detail-head h1')).toHaveText('복잡도와 선형·이진 탐색의 전제');
  await expect(page.locator('.figure-box svg')).toHaveAttribute('role', 'img');
  await page.locator('[data-restore-attempt="0"]').click();
  await expect(page.locator('#code-input')).toHaveValue(searchFunctions);
  await page.reload();
  await expect(page.locator('#code-input')).toHaveValue(searchFunctions);
  await expect(page.locator('#attempt-history-container .attempt-list li')).toHaveCount(2);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'offline E01 mobile overflow');
  await context.setOffline(false);
  console.log('PASS: E01 backup and offline attempt restoration retain the original exercise ID');
  // The preceding legacy restore intentionally replaced drafts. Establish the
  // existing Rust draft through the editor before testing F01 preservation.
  await page.goto(base + '/#lesson:rust-mut');
  await page.locator('#code-input').fill('keep rust draft');
  await page.locator('#save-code').click();
  await page.goto(base + '/#lesson:rust-cargo');
  await expect(page.locator('.detail-head h1')).toHaveText('Cargo 프로젝트와 실패하는 테스트 읽기');
  await expect(page.locator('.figure-box svg')).toHaveAttribute('role', 'img');
  await expect(page.locator('#grade-code')).toBeDisabled();
  await page.locator('[data-quiz="rust-cargo"][data-choice="1"]').click();
  await expect(page.locator('.feedback.bad')).toBeVisible();
  await page.locator('[data-retry="rust-cargo"]').click();
  await page.locator('[data-quiz="rust-cargo"][data-choice="0"]').click();
  await page.locator('#mark-theory').click();
  await expect(page.locator('.learning-status-list li').nth(0)).toContainText('완료');
  await expect(page.locator('.learning-status-list li').nth(1)).toContainText('통과');
  await expect(page.locator('.learning-status-list li').nth(2)).toContainText('준비 중');
  await expect(page.locator('.mastery-state')).not.toContainText('전체 숙달');
  const rustDraft = 'pub fn total(items: u32, price: u32) -> u32 { items * price }';
  await page.locator('#code-input').fill(rustDraft);
  await page.locator('#save-code').click();
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator('.detail-head h1')).toHaveText('Cargo 프로젝트와 실패하는 테스트 읽기');
  await expect(page.locator('#code-input')).toHaveValue(rustDraft);
  await expect(page.locator('#grade-code')).toBeDisabled();
  await expect(page.locator('.learning-status-list li').nth(1)).toContainText('통과');
  await expect(page.locator('.mastery-state')).not.toContainText('전체 숙달');
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'F01 mobile overflow');
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('codeweave.drafts.v1'))['rust-mut']), 'keep rust draft');
  if (qaDir) await page.screenshot({ path: path.join(qaDir, 'rust-cargo-mobile.png'), fullPage: true });
  await context.setOffline(false);
  await page.locator('.next-action [data-route="lesson:rust-mut"]').click();
  await expect(page.locator('.detail-head h1')).toHaveText('변수 바인딩과 가변성');
  await expect(page.locator('#code-input')).toHaveValue('keep rust draft');
  console.log('PASS: F01 quiz correction, separate mastery, preserved Rust drafts, offline 390px and next lesson');
  await page.goto(base + '/#lesson:c-file-stream-count');
  // The preceding offline shell deliberately has no execution capability.
  // Reload online to receive this server's token; never inject or cache one.
  await page.reload();
  await expect(page.locator('.detail-head h1')).toHaveText('파일 스트림: 읽기·EOF·오류와 소유권');
  await expect(page.locator('.figure-box svg')).toHaveAttribute('role', 'img');
  await expect(page.locator('#code-input')).toHaveValue(/count_stream_bytes/);
  await page.locator('[data-quiz="c-file-stream-count"][data-choice="0"]').click();
  await expect(page.locator('.feedback.bad')).toBeVisible();
  await page.locator('[data-retry="c-file-stream-count"]').click();
  await page.locator('[data-quiz="c-file-stream-count"][data-choice="1"]').click();
  await page.locator('#mark-theory').click();
  await expect(page.locator('.mastery-state')).not.toContainText('전체 숙달');
  await submit(page, streamCount.replace('!= EOF)', '!= EOF && ch != 0)'));
  await expect(page.locator('.terminal[role="status"]')).toContainText('채점 미통과');
  await expect(page.locator('.mastery-state')).not.toContainText('전체 숙달');
  await submit(page, streamCount);
  await expect(page.locator('.terminal[role="status"]')).toContainText('10/10');
  await expect(page.locator('.mastery-state')).toContainText('전체 숙달');
  await expect(page.locator('#attempt-history-container .attempt-list li')).toHaveCount(2);
  const streamBackupEvent = bench.waitForEvent('download');
  await bench.locator('#export-history').click();
  const streamDownload = await streamBackupEvent;
  const streamChunks = [];
  for await (const chunk of await streamDownload.createReadStream()) streamChunks.push(chunk);
  const streamBackup = Buffer.concat(streamChunks);
  const streamData = JSON.parse(streamBackup);
  assert.equal(streamData.drafts['c-file-stream-count'], streamCount);
  assert.equal(streamData.iterations['c-file-stream-count'].length, 2);
  assert.equal(streamData.drafts['rust-cargo'], rustDraft);
  await bench.locator('#import-file').setInputFiles({ name: 'stream-backup.json', mimeType: 'application/json', buffer: streamBackup });
  await expect(bench.locator('#draft-status')).toHaveText('통합 백업을 복원했습니다.');
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator('#code-input')).toHaveValue(streamCount);
  await expect(page.locator('#attempt-history-container .attempt-list li')).toHaveCount(2);
  await page.locator('[data-restore-attempt="1"]').click();
  await expect(page.locator('#code-input')).toHaveValue(streamCount.replace('!= EOF)', '!= EOF && ch != 0)'));
  await page.locator('[data-restore-attempt="0"]').click();
  await expect(page.locator('#code-input')).toHaveValue(streamCount);
  await expect(page.locator('.mastery-state')).toContainText('전체 숙달');
  await expect(page.locator('.article')).toContainText('Windows 네이티브');
  assert.equal(await page.evaluate(() => {
    const svg = document.querySelector('.figure-box svg');
    const view = svg.viewBox.baseVal;
    return [...svg.querySelectorAll('text')].every(text => {
      const box = text.getBBox();
      return box.x >= 0 && box.y >= 0 && box.x + box.width <= view.width && box.y + box.height <= view.height;
    }) && document.documentElement.scrollWidth <= innerWidth;
  }), true, 'C05 stream diagram and document must fit 390px');
  if (qaDir) await page.screenshot({ path: path.join(qaDir, 'file-stream-mobile.png'), fullPage: true });
  await context.setOffline(false);
  await page.locator('.next-action [data-route="lesson:c-owned-stream-byte"]').click();
  await expect(page.locator('.detail-head h1')).toHaveText('소유 스트림: 오류 진단을 보존하며 닫기');
  await page.goto(base + '/#lesson:rust-cargo');
  await expect(page.locator('.detail-head h1')).toHaveText('Cargo 프로젝트와 실패하는 테스트 읽기');
  await expect(page.locator('#code-input')).toHaveValue(rustDraft);
  console.log('PASS: C05 quiz correction, real 10-case GCC API failure/retry, mastery, backup, offline attempts, 390px and next lesson');
  // Upgrade the existing sample without losing its original ID, draft or quiz choice.
  await page.evaluate(() => {
    const id = 'ds-stack';
    const drafts = JSON.parse(localStorage.getItem('codeweave.drafts.v1') || '{}');
    drafts[id] = '// prior stack sample draft';
    localStorage.setItem('codeweave.drafts.v1', JSON.stringify(drafts));
    const progress = JSON.parse(localStorage.getItem('codeweave.progress.v1') || '{}');
    progress.completed = [...new Set([...(progress.completed || []), id])];
    progress.results = { ...progress.results, [id]: { correct: true, selected: 2 } };
    localStorage.setItem('codeweave.progress.v1', JSON.stringify(progress));
  });
  await page.goto(base + '/#lesson:ds-stack');
  await page.reload(); // Offline shell tokens are deliberately stripped; fetch an online document.
  await expect(page.locator('.detail-head h1')).toHaveText('스택: 나중에 넣은 것이 먼저 나온다');
  await expect(page.locator('#code-input')).toHaveValue('// prior stack sample draft');
  await expect(page.locator('.practice-zone')).toContainText('함수 직접 호출형');
  await expect(page.locator('.mastery-state')).not.toContainText('전체 숙달');
  const savedStackQuiz = await page.evaluate(() => JSON.parse(localStorage.getItem('codeweave.progress.v1')).results['ds-stack']);
  assert.deepEqual(savedStackQuiz, { correct: true, selected: 2 });
  await page.locator('[data-quiz="ds-stack"][data-choice="2"]').click();
  await page.locator('#mark-theory').click();
  await submit(page, stackFIFO);
  await expect(page.locator('.terminal[role="status"]')).toContainText('채점 미통과');
  await expect(page.locator('.mastery-state')).not.toContainText('전체 숙달');
  await submit(page, stackFunctions);
  await expect(page.locator('.terminal[role="status"]')).toContainText('10/10');
  await expect(page.locator('.mastery-state')).toContainText('전체 숙달');
  await expect(page.locator('#attempt-history-container .attempt-list li')).toHaveCount(2);
  const stackBackupEvent = bench.waitForEvent('download');
  await bench.locator('#export-history').click();
  const stackDownload = await stackBackupEvent;
  const stackChunks = [];
  for await (const chunk of await stackDownload.createReadStream()) stackChunks.push(chunk);
  const stackBackup = Buffer.concat(stackChunks);
  const stackData = JSON.parse(stackBackup);
  assert.equal(stackData.drafts['ds-stack'], stackFunctions);
  assert.equal(stackData.iterations['ds-stack'].length, 2);
  assert.equal(stackData.drafts['rust-cargo'], rustDraft);
  await bench.locator('#import-file').setInputFiles({ name: 'stack-backup.json', mimeType: 'application/json', buffer: stackBackup });
  await expect(bench.locator('#draft-status')).toHaveText('통합 백업을 복원했습니다.');
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator('#code-input')).toHaveValue(stackFunctions);
  await expect(page.locator('#attempt-history-container .attempt-list li')).toHaveCount(2);
  await page.locator('[data-restore-attempt="1"]').click();
  await expect(page.locator('#code-input')).toHaveValue(stackFIFO);
  await page.locator('[data-restore-attempt="0"]').click();
  await expect(page.locator('#code-input')).toHaveValue(stackFunctions);
  await expect(page.locator('.mastery-state')).toContainText('전체 숙달');
  await expect(page.locator('.figure-box svg')).toHaveAttribute('role', 'img');
  assert.equal(await page.evaluate(() => {
    const svg = document.querySelector('.figure-box svg');
    const view = svg.viewBox.baseVal;
    return [...svg.querySelectorAll('text')].every(text => {
      const box = text.getBBox();
      return box.x >= 0 && box.y >= 0 && box.x + box.width <= view.width && box.y + box.height <= view.height;
    }) && document.documentElement.scrollWidth <= innerWidth;
  }), true, 'D02 live stack diagram and document must fit 390px');
  if (qaDir) await page.screenshot({ path: path.join(qaDir, 'stack-mobile.png'), fullPage: true });
  await context.setOffline(false);
  await page.locator('.next-action [data-route="lesson:ds-queue"]').click();
  await expect(page.locator('.detail-head h1')).toHaveText('원형 큐: 먼저 온 값을 순환하며 꺼내기');
  await page.locator('.next-action [data-route="lesson:ds-array-list"]').click();
  await expect(page.locator('.detail-head h1')).toHaveText('배열 리스트: 중간 삽입·삭제와 이동 비용');
  await page.locator('.next-action [data-route="lesson:ds-owned-list"]').click();
  await expect(page.locator('.detail-head h1')).toHaveText('연결 리스트 소유권: 앞 삽입·첫 삭제·전체 해제');
  await page.locator('.next-action [data-route="lesson:algo-binary"]').click();
  await expect(page.locator('.detail-head h1')).toHaveText('복잡도와 선형·이진 탐색의 전제');
  console.log('PASS: D02 legacy draft/quiz preserved, real FIFO failure/correction 10/10, mastery, backup, offline attempts, 390px and next lesson');
  // Enter E02 through E01's actual next-unit action.
  await page.locator('.next-action [data-route="lesson:algo-stable-insertion"]').click();
  await page.reload(); // Reacquire the live token after the preceding offline reloads.
  await expect(page.locator('.detail-head h1')).toHaveText('안정 삽입 정렬: 비교와 이동을 따로 세기');
  await expect(page.locator('.practice-zone')).toContainText('함수 직접 호출형');
  await expect(page.locator('#code-input')).toHaveValue(/stable_sort_counted/);
  await expect(page.locator('#code-input')).not.toHaveValue(/int main\s*\(/);
  await page.locator('[data-quiz="algo-stable-insertion"][data-choice="0"]').click();
  await expect(page.locator('.feedback.bad')).toBeVisible();
  await page.locator('[data-retry="algo-stable-insertion"]').click();
  await page.locator('[data-quiz="algo-stable-insertion"][data-choice="2"]').click();
  await page.locator('#mark-theory').click();
  await expect(page.locator('.mastery-state')).not.toContainText('전체 숙달');
  await submit(page, sortUnstable);
  await expect(page.locator('.terminal[role="status"]')).toContainText('채점 미통과');
  await expect(page.locator('.mastery-state')).not.toContainText('전체 숙달');
  await submit(page, sortCounted);
  await expect(page.locator('.terminal[role="status"]')).toContainText('10/10');
  await expect(page.locator('.mastery-state')).toContainText('전체 숙달');
  await expect(page.locator('#attempt-history-container .attempt-list li')).toHaveCount(2);
  const sortBackupEvent = bench.waitForEvent('download');
  await bench.locator('#export-history').click();
  const sortDownload = await sortBackupEvent;
  const sortChunks = [];
  for await (const chunk of await sortDownload.createReadStream()) sortChunks.push(chunk);
  const sortBackup = Buffer.concat(sortChunks);
  const sortData = JSON.parse(sortBackup);
  assert.equal(sortData.drafts['algo-stable-insertion'], sortCounted);
  assert.equal(sortData.iterations['algo-stable-insertion'].length, 2);
  assert.equal(sortData.drafts['ds-stack'], stackFunctions);
  assert.equal(sortData.drafts['rust-cargo'], rustDraft);
  await bench.locator('#import-file').setInputFiles({ name: 'sort-backup.json', mimeType: 'application/json', buffer: sortBackup });
  await expect(bench.locator('#draft-status')).toHaveText('통합 백업을 복원했습니다.');
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator('#code-input')).toHaveValue(sortCounted);
  await expect(page.locator('#attempt-history-container .attempt-list li')).toHaveCount(2);
  await page.locator('[data-restore-attempt="1"]').click();
  await expect(page.locator('#code-input')).toHaveValue(sortUnstable);
  await page.locator('[data-restore-attempt="0"]').click();
  await expect(page.locator('#code-input')).toHaveValue(sortCounted);
  await expect(page.locator('.mastery-state')).toContainText('전체 숙달');
  await expect(page.locator('.figure-box svg')).toHaveAttribute('role', 'img');
  assert.equal(await page.evaluate(() => {
    const svg = document.querySelector('.figure-box svg');
    const view = svg.viewBox.baseVal;
    return [...svg.querySelectorAll('text')].every(text => {
      const box = text.getBBox();
      return box.x >= 0 && box.y >= 0 && box.x + box.width <= view.width && box.y + box.height <= view.height;
    }) && document.documentElement.scrollWidth <= innerWidth;
  }), true, 'E02 actual lesson and diagram must fit 390px');
  if (qaDir) await page.screenshot({ path: path.join(qaDir, 'stable-insertion-mobile.png'), fullPage: true });
  await context.setOffline(false);
  await page.locator('[data-route="track:algo"]').first().click();
  await expect(page.locator('[data-route="lesson:algo-binary"]')).toHaveCount(1);
  await expect(page.locator('[data-route="lesson:algo-stable-insertion"]')).toHaveCount(1);
  console.log('PASS: E01 next-unit enters E02; quiz correction, real unstable failure/retry 10/10, mastery, backup, offline attempts, 390px and track return');
  await page.goto(base + '/#lesson:c-preprocessor-once');
  await page.reload(); // Hash-only navigation can retain the preceding token-free offline shell.
  await expect(page.locator('meta[name="codeweave-token"]')).toHaveAttribute('content', /^[a-f0-9]{64}$/);
  await expect(page.locator('.detail-head h1')).toHaveText('전처리 매크로: 값을 한 번만 소비하기');
  await expect(page.locator('.practice-zone')).toContainText('함수 직접 호출형');
  await expect(page.locator('#code-input')).toHaveValue(preprocessorStarter);
  await page.locator('[data-quiz="c-preprocessor-once"][data-choice="0"]').click();
  await expect(page.locator('.feedback.bad')).toBeVisible();
  await page.locator('[data-retry="c-preprocessor-once"]').click();
  await page.locator('[data-quiz="c-preprocessor-once"][data-choice="1"]').click();
  await page.locator('#mark-theory').click();
  await expect(page.locator('.mastery-state')).not.toContainText('전체 숙달');
  await submit(page, c06Wrong);
  await expect(page.locator('.terminal[role="status"]')).toContainText('채점 미통과');
  await expect(page.locator('.mastery-state')).not.toContainText('전체 숙달');
  await submit(page, c06Correct);
  await expect(page.locator('.terminal[role="status"]')).toContainText('10/10');
  await expect(page.locator('.mastery-state')).toContainText('전체 숙달');
  await expect(page.locator('#attempt-history-container .attempt-list li')).toHaveCount(2);
  await bench.reload();
  await bench.locator('#lesson-select').selectOption('c-preprocessor-once');
  await expect(bench.locator('#code-input')).toHaveValue(c06Correct);
  const c06DownloadEvent = bench.waitForEvent('download');
  await bench.locator('#export-history').click();
  const c06Download = await c06DownloadEvent, c06Chunks = [];
  for await (const chunk of await c06Download.createReadStream()) c06Chunks.push(chunk);
  const c06Backup = Buffer.concat(c06Chunks), c06Data = JSON.parse(c06Backup);
  assert.equal(c06Data.iterations['c-preprocessor-once'].length, 2);
  assert.equal(c06Data.drafts['c-preprocessor-once'], c06Correct);
  assert.equal(c06Data.drafts['rust-cargo'], rustDraft);
  await bench.locator('#import-file').setInputFiles({ name: 'c06-backup.json', mimeType: 'application/json', buffer: c06Backup });
  await expect(bench.locator('#draft-status')).toHaveText('통합 백업을 복원했습니다.');
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator('#code-input')).toHaveValue(c06Correct);
  await expect(page.locator('#attempt-history-container .attempt-list li')).toHaveCount(2);
  await page.locator('[data-restore-attempt="1"]').click();
  await expect(page.locator('#code-input')).toHaveValue(c06Wrong);
  await page.locator('[data-restore-attempt="0"]').click();
  await expect(page.locator('#code-input')).toHaveValue(c06Correct);
  await expect(page.locator('.mastery-state')).toContainText('전체 숙달');
  await expect(page.locator('.figure-box svg')).toHaveAttribute('role', 'img');
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  if (qaDir) await page.screenshot({ path: path.join(qaDir, 'preprocessor-once-mobile.png'), fullPage: true });
  await context.setOffline(false);
  await page.locator('.next-action [data-route="lesson:c-file-stream-count"]').click();
  await expect(page.locator('.detail-head h1')).toHaveText('파일 스트림: 읽기·EOF·오류와 소유권');
  console.log('PASS: C06 real GCC 10-case failure/correction, quiz retry, separate mastery, shared history, v1, 390px/offline and next lesson');
  await page.goto(base + '/#lesson:ds-queue');
  await page.reload();
  await expect(page.locator('meta[name="codeweave-token"]')).toHaveAttribute('content', /^[a-f0-9]{64}$/);
  await expect(page.locator('.detail-head h1')).toHaveText('원형 큐: 먼저 온 값을 순환하며 꺼내기');
  await expect(page.locator('.practice-zone')).toContainText('함수 직접 호출형');
  await expect(page.locator('#code-input')).toHaveValue(queueStarter);
  await page.locator('[data-quiz="ds-queue"][data-choice="0"]').click();
  await expect(page.locator('.feedback.bad')).toBeVisible();
  await page.locator('[data-retry="ds-queue"]').click();
  await page.locator('[data-quiz="ds-queue"][data-choice="1"]').click();
  await page.locator('#mark-theory').click();
  await expect(page.locator('.mastery-state')).not.toContainText('전체 숙달');
  await submit(page, queueLIFO);
  await expect(page.locator('.terminal[role="status"]')).toContainText('채점 미통과');
  await expect(page.locator('.mastery-state')).not.toContainText('전체 숙달');
  await submit(page, queueCorrect);
  await expect(page.locator('.terminal[role="status"]')).toContainText('10/10');
  await expect(page.locator('.mastery-state')).toContainText('전체 숙달');
  await expect(page.locator('#attempt-history-container .attempt-list li')).toHaveCount(2);
  await bench.reload();
  await bench.locator('#lesson-select').selectOption('ds-queue');
  await expect(bench.locator('#code-input')).toHaveValue(queueCorrect);
  const queueDownloadEvent = bench.waitForEvent('download');
  await bench.locator('#export-history').click();
  const queueDownload = await queueDownloadEvent, queueChunks = [];
  for await (const chunk of await queueDownload.createReadStream()) queueChunks.push(chunk);
  const queueBackup = Buffer.concat(queueChunks), queueData = JSON.parse(queueBackup);
  assert.equal(queueData.drafts['ds-queue'], queueCorrect);
  assert.equal(queueData.iterations['ds-queue'].length, 2);
  assert.equal(queueData.drafts['ds-stack'], stackFunctions);
  assert.equal(queueData.drafts['c-preprocessor-once'], c06Correct);
  assert.equal(queueData.drafts['rust-cargo'], rustDraft);
  await bench.locator('#import-file').setInputFiles({ name: 'queue-backup.json', mimeType: 'application/json', buffer: queueBackup });
  await expect(bench.locator('#draft-status')).toHaveText('통합 백업을 복원했습니다.');
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator('#code-input')).toHaveValue(queueCorrect);
  await expect(page.locator('#attempt-history-container .attempt-list li')).toHaveCount(2);
  await page.locator('[data-restore-attempt="1"]').click();
  await expect(page.locator('#code-input')).toHaveValue(queueLIFO);
  await page.locator('[data-restore-attempt="0"]').click();
  await expect(page.locator('#code-input')).toHaveValue(queueCorrect);
  await expect(page.locator('.mastery-state')).toContainText('전체 숙달');
  await expect(page.locator('.figure-box svg')).toHaveAttribute('role', 'img');
  assert.equal(await page.evaluate(() => {
    const svg = document.querySelector('.figure-box svg'), view = svg.viewBox.baseVal;
    return [...svg.querySelectorAll('text')].every(text => {
      const box = text.getBBox();
      return box.x >= 0 && box.y >= 0 && box.x + box.width <= view.width && box.y + box.height <= view.height;
    }) && document.documentElement.scrollWidth <= innerWidth;
  }), true, 'D03 queue diagram and learner page must fit 390px');
  if (qaDir) await page.screenshot({ path: path.join(qaDir, 'circular-queue-mobile.png'), fullPage: true });
  await context.setOffline(false);
  await page.locator('.next-action [data-route="lesson:ds-array-list"]').click();
  await expect(page.locator('.detail-head h1')).toHaveText('배열 리스트: 중간 삽입·삭제와 이동 비용');
  console.log('PASS: D03 real GCC LIFO failure/correction 10/10, quiz retry, separate mastery, shared history, v1, 390px diagram/offline and next lesson');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(base + '/#lesson:ds-queue');
  await page.locator('.next-action [data-route="lesson:ds-array-list"]').click();
  await page.reload();
  await expect(page.locator('meta[name="codeweave-token"]')).toHaveAttribute('content', /^[a-f0-9]{64}$/);
  await expect(page.locator('.detail-head h1')).toHaveText('배열 리스트: 중간 삽입·삭제와 이동 비용');
  await expect(page.locator('.practice-zone')).toContainText('함수 직접 호출형');
  await expect(page.locator('#code-input')).toHaveValue(arrayListStarter);
  await page.locator('[data-quiz="ds-array-list"][data-choice="0"]').click();
  await expect(page.locator('.feedback.bad')).toBeVisible();
  await page.locator('[data-retry="ds-array-list"]').click();
  await page.locator('[data-quiz="ds-array-list"][data-choice="1"]').click();
  await page.locator('#mark-theory').click();
  await expect(page.locator('.mastery-state')).not.toContainText('전체 숙달');
  await submit(page, arrayListWrong);
  await expect(page.locator('.terminal[role="status"]')).toContainText('채점 미통과');
  await expect(page.locator('.mastery-state')).not.toContainText('전체 숙달');
  await submit(page, arrayListCorrect);
  await expect(page.locator('.terminal[role="status"]')).toContainText('10/10');
  await expect(page.locator('.mastery-state')).toContainText('전체 숙달');
  await expect(page.locator('#attempt-history-container .attempt-list li')).toHaveCount(2);
  await bench.reload();
  await bench.locator('#lesson-select').selectOption('ds-array-list');
  await expect(bench.locator('#code-input')).toHaveValue(arrayListCorrect);
  const arrayListDownloadEvent = bench.waitForEvent('download');
  await bench.locator('#export-history').click();
  const arrayListDownload = await arrayListDownloadEvent, arrayListChunks = [];
  for await (const chunk of await arrayListDownload.createReadStream()) arrayListChunks.push(chunk);
  const arrayListBackup = Buffer.concat(arrayListChunks), arrayListData = JSON.parse(arrayListBackup);
  assert.equal(arrayListData.drafts['ds-array-list'], arrayListCorrect);
  assert.equal(arrayListData.iterations['ds-array-list'].length, 2);
  assert.equal(arrayListData.drafts['ds-queue'], queueCorrect);
  assert.equal(arrayListData.drafts['c-preprocessor-once'], c06Correct);
  assert.equal(arrayListData.drafts['rust-cargo'], rustDraft);
  await bench.evaluate(() => {
    for (const key of ['codeweave.drafts.v1', 'codeweave.iterations.v1']) {
      const values = JSON.parse(localStorage.getItem(key) || '{}');
      delete values['ds-array-list'];
      localStorage.setItem(key, JSON.stringify(values));
    }
  });
  await bench.reload();
  await bench.locator('#lesson-select').selectOption('ds-array-list');
  await expect(bench.locator('#code-input')).toHaveValue(arrayListStarter);
  assert.deepEqual((await history(bench))['ds-array-list'] ?? [], [], 'D04 actual attempt records must be absent before restore');
  await expect(bench.locator('#attempt-list')).toContainText('아직 제출 기록이 없습니다.');
  await bench.locator('#import-file').setInputFiles({ name: 'array-list-backup.json', mimeType: 'application/json', buffer: arrayListBackup });
  await expect(bench.locator('#draft-status')).toHaveText('통합 백업을 복원했습니다.');
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator('#code-input')).toHaveValue(arrayListCorrect);
  await expect(page.locator('#attempt-history-container .attempt-list li')).toHaveCount(2);
  await page.locator('[data-restore-attempt="1"]').click();
  await expect(page.locator('#code-input')).toHaveValue(arrayListWrong);
  await page.locator('[data-restore-attempt="0"]').click();
  await expect(page.locator('#code-input')).toHaveValue(arrayListCorrect);
  await expect(page.locator('.mastery-state')).toContainText('전체 숙달');
  await expect(page.locator('.figure-box svg')).toHaveAttribute('role', 'img');
  assert.equal(await page.evaluate(() => {
    const svg = document.querySelector('.figure-box svg'), view = svg.viewBox.baseVal;
    return [...svg.querySelectorAll('text')].every(text => {
      const box = text.getBBox();
      return box.x >= 0 && box.y >= 0 && box.x + box.width <= view.width && box.y + box.height <= view.height;
    }) && document.documentElement.scrollWidth <= innerWidth;
  }), true, 'D04 array-list diagram and learner page must fit 390px');
  if (qaDir) await page.screenshot({ path: path.join(qaDir, 'array-list-mobile.png'), fullPage: true });
  await context.setOffline(false);
  await page.locator('.next-action [data-route="lesson:ds-owned-list"]').click();
  await page.reload();
  await expect(page.locator('meta[name="codeweave-token"]')).toHaveAttribute('content', /^[a-f0-9]{64}$/);
  await expect(page.locator('.detail-head h1')).toHaveText('연결 리스트 소유권: 앞 삽입·첫 삭제·전체 해제');
  await expect(page.locator('.practice-zone')).toContainText('함수 직접 호출형');
  await expect(page.locator('#code-input')).toHaveValue(ownedListStarter);
  await page.locator('[data-quiz="ds-owned-list"][data-choice="0"]').click();
  await expect(page.locator('.feedback.bad')).toBeVisible();
  await page.locator('[data-retry="ds-owned-list"]').click();
  await page.locator('[data-quiz="ds-owned-list"][data-choice="1"]').click();
  await page.locator('#mark-theory').click();
  await expect(page.locator('.mastery-state')).not.toContainText('전체 숙달');
  await submit(page, ownedListWrong);
  await expect(page.locator('.terminal[role="status"]')).toContainText('채점 미통과');
  await submit(page, ownedListCorrect);
  await expect(page.locator('.terminal[role="status"]')).toContainText('10/10');
  await expect(page.locator('.mastery-state')).toContainText('전체 숙달');
  await expect(page.locator('#attempt-history-container .attempt-list li')).toHaveCount(2);
  await bench.reload();
  await bench.locator('#lesson-select').selectOption('ds-owned-list');
  await expect(bench.locator('#code-input')).toHaveValue(ownedListCorrect);
  const ownedListDownloadEvent = bench.waitForEvent('download');
  await bench.locator('#export-history').click();
  const ownedListDownload = await ownedListDownloadEvent, ownedListChunks = [];
  for await (const chunk of await ownedListDownload.createReadStream()) ownedListChunks.push(chunk);
  const ownedListBackup = Buffer.concat(ownedListChunks), ownedListData = JSON.parse(ownedListBackup);
  assert.equal(ownedListData.drafts['ds-owned-list'], ownedListCorrect);
  assert.equal(ownedListData.iterations['ds-owned-list'].length, 2);
  assert.equal(ownedListData.drafts['ds-array-list'], arrayListCorrect);
  await bench.evaluate(() => {
    for (const key of ['codeweave.drafts.v1', 'codeweave.iterations.v1']) {
      const values = JSON.parse(localStorage.getItem(key) || '{}');
      delete values['ds-owned-list'];
      localStorage.setItem(key, JSON.stringify(values));
    }
  });
  await bench.reload();
  await bench.locator('#lesson-select').selectOption('ds-owned-list');
  await expect(bench.locator('#code-input')).toHaveValue(ownedListStarter);
  assert.deepEqual((await history(bench))['ds-owned-list'] ?? [], [], 'D05 attempts must be absent before restore');
  await bench.locator('#import-file').setInputFiles({ name: 'owned-list-backup.json', mimeType: 'application/json', buffer: ownedListBackup });
  await expect(bench.locator('#draft-status')).toHaveText('통합 백업을 복원했습니다.');
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator('#code-input')).toHaveValue(ownedListCorrect);
  await expect(page.locator('#attempt-history-container .attempt-list li')).toHaveCount(2);
  await page.locator('[data-restore-attempt="1"]').click();
  await expect(page.locator('#code-input')).toHaveValue(ownedListWrong);
  await page.locator('[data-restore-attempt="0"]').click();
  await expect(page.locator('#code-input')).toHaveValue(ownedListCorrect);
  await expect(page.locator('.mastery-state')).toContainText('전체 숙달');
  await expect(page.locator('.figure-box svg')).toHaveAttribute('role', 'img');
  assert.equal(await page.evaluate(() => {
    const svg = document.querySelector('.figure-box svg'), view = svg.viewBox.baseVal;
    return [...svg.querySelectorAll('text')].every(text => {
      const box = text.getBBox();
      return box.x >= 0 && box.y >= 0 && box.x + box.width <= view.width && box.y + box.height <= view.height;
    }) && document.documentElement.scrollWidth <= innerWidth;
  }), true, 'D05 owned-list diagram and learner page must fit 390px');
  if (qaDir) await page.screenshot({ path: path.join(qaDir, 'owned-list-mobile.png'), fullPage: true });
  await context.setOffline(false);
  await page.locator('.next-action [data-route="lesson:algo-binary"]').click();
  await expect(page.locator('.detail-head h1')).toHaveText('복잡도와 선형·이진 탐색의 전제');
  console.log('PASS: D04→D05, real GCC ownership failure/correction 10/10, quiz retry, mastery, shared history/v1 restore, 390px/offline and next lesson');
  // E02's actual next action now enters E03; E04's real next entry is checked below.
  await page.goto(base + '/#lesson:algo-stable-insertion');
  await page.locator('.next-action [data-route="lesson:algo-merge"]').click();
  await page.reload();
  await expect(page.locator('meta[name="codeweave-token"]')).toHaveAttribute('content', /^[a-f0-9]{64}$/);
  await expect(page.locator('.detail-head h1')).toHaveText('병합 정렬: 나누고 보조 배열로 합치기');
  await expect(page.locator('.practice-zone')).toContainText('함수 직접 호출형');
  await expect(page.locator('#code-input')).toHaveValue(mergeStarter);
  await page.locator('[data-quiz="algo-merge"][data-choice="0"]').click();
  await expect(page.locator('.feedback.bad')).toBeVisible();
  await page.locator('[data-retry="algo-merge"]').click();
  await page.locator('[data-quiz="algo-merge"][data-choice="1"]').click();
  await page.locator('#mark-theory').click();
  await expect(page.locator('.mastery-state')).not.toContainText('전체 숙달');
  await submit(page, mergeWrong);
  await expect(page.locator('.terminal[role="status"]')).toContainText('채점 미통과');
  await expect(page.locator('.mastery-state')).not.toContainText('전체 숙달');
  await submit(page, mergeCorrect);
  await expect(page.locator('.terminal[role="status"]')).toContainText('10/10');
  await expect(page.locator('.mastery-state')).toContainText('전체 숙달');
  await expect(page.locator('#attempt-history-container .attempt-list li')).toHaveCount(2);
  await bench.reload();
  await bench.locator('#lesson-select').selectOption('algo-merge');
  await expect(bench.locator('#code-input')).toHaveValue(mergeCorrect);
  const mergeDownloadEvent = bench.waitForEvent('download');
  await bench.locator('#export-history').click();
  const mergeDownload = await mergeDownloadEvent, mergeChunks = [];
  for await (const chunk of await mergeDownload.createReadStream()) mergeChunks.push(chunk);
  const mergeBackup = Buffer.concat(mergeChunks), mergeData = JSON.parse(mergeBackup);
  assert.equal(mergeData.drafts['algo-merge'], mergeCorrect);
  assert.equal(mergeData.iterations['algo-merge'].length, 2);
  assert.equal(mergeData.drafts['ds-queue'], queueCorrect);
  assert.equal(mergeData.drafts['c-preprocessor-once'], c06Correct);
  assert.equal(mergeData.drafts['rust-cargo'], rustDraft);
  await bench.locator('#import-file').setInputFiles({ name: 'merge-backup.json', mimeType: 'application/json', buffer: mergeBackup });
  await expect(bench.locator('#draft-status')).toHaveText('통합 백업을 복원했습니다.');
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator('#code-input')).toHaveValue(mergeCorrect);
  await expect(page.locator('#attempt-history-container .attempt-list li')).toHaveCount(2);
  await page.locator('[data-restore-attempt="1"]').click();
  await expect(page.locator('#code-input')).toHaveValue(mergeWrong);
  await page.locator('[data-restore-attempt="0"]').click();
  await expect(page.locator('#code-input')).toHaveValue(mergeCorrect);
  await expect(page.locator('.mastery-state')).toContainText('전체 숙달');
  await expect(page.locator('.figure-box svg')).toHaveAttribute('role', 'img');
  assert.equal(await page.evaluate(() => {
    const svg = document.querySelector('.figure-box svg'), view = svg.viewBox.baseVal;
    return [...svg.querySelectorAll('text')].every(text => {
      const box = text.getBBox();
      return box.x >= 0 && box.y >= 0 && box.x + box.width <= view.width && box.y + box.height <= view.height;
    }) && document.documentElement.scrollWidth <= innerWidth;
  }), true, 'E03 merge diagram and learner page must fit 390px');
  if (qaDir) await page.screenshot({ path: path.join(qaDir, 'merge-sort-mobile.png'), fullPage: true });
  await context.setOffline(false);
  await page.locator('[data-route="track:algo"]').first().click();
  await expect(page.locator('[data-route="lesson:algo-merge"]')).toHaveCount(1);
  console.log('PASS: E03 E02-next entry, real GCC missing-remainder failure/correction 10/10, quiz retry, separate mastery, shared history, v1, 390px/offline and track return; E04 delivery is checked next');

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(base + '/#lesson:algo-merge');
  await page.locator('.next-action [data-route="lesson:algo-permutations"]').click();
  await page.reload();
  await expect(page.locator('meta[name="codeweave-token"]')).toHaveAttribute('content', /^[a-f0-9]{64}$/);
  await expect(page.locator('.detail-head h1')).toHaveText('재귀 순열: 선택하고 돌아와 원상 복원하기');
  await expect(page.locator('.practice-zone')).toContainText('함수 직접 호출형');
  await expect(page.locator('#code-input')).toHaveValue(permutationsStarter);
  await page.locator('[data-quiz="algo-permutations"][data-choice="0"]').click();
  await expect(page.locator('.feedback.bad')).toBeVisible();
  await page.locator('[data-retry="algo-permutations"]').click();
  await page.locator('[data-quiz="algo-permutations"][data-choice="1"]').click();
  await page.locator('#mark-theory').click();
  await expect(page.locator('.mastery-state')).not.toContainText('전체 숙달');
  await submit(page, permutationsWrong);
  await expect(page.locator('.terminal[role="status"]')).toContainText('채점 미통과');
  await expect(page.locator('.mastery-state')).not.toContainText('전체 숙달');
  await submit(page, permutationsCorrect);
  await expect(page.locator('.terminal[role="status"]')).toContainText('10/10');
  await expect(page.locator('.mastery-state')).toContainText('전체 숙달');
  await expect(page.locator('#attempt-history-container .attempt-list li')).toHaveCount(2);
  await bench.reload();
  await bench.locator('#lesson-select').selectOption('algo-permutations');
  await expect(bench.locator('#code-input')).toHaveValue(permutationsCorrect);
  const permutationsDownloadEvent = bench.waitForEvent('download');
  await bench.locator('#export-history').click();
  const permutationsDownload = await permutationsDownloadEvent, permutationsChunks = [];
  for await (const chunk of await permutationsDownload.createReadStream()) permutationsChunks.push(chunk);
  const permutationsBackup = Buffer.concat(permutationsChunks), permutationsData = JSON.parse(permutationsBackup);
  assert.equal(permutationsData.drafts['algo-permutations'], permutationsCorrect);
  assert.equal(permutationsData.iterations['algo-permutations'].length, 2);
  assert.equal(permutationsData.drafts['algo-merge'], mergeCorrect);
  assert.equal(permutationsData.drafts['c-preprocessor-once'], c06Correct);
  assert.equal(permutationsData.drafts['rust-cargo'], rustDraft);
  await bench.evaluate(() => {
    for (const key of ['codeweave.drafts.v1', 'codeweave.iterations.v1']) {
      const values = JSON.parse(localStorage.getItem(key) || '{}');
      delete values['algo-permutations'];
      localStorage.setItem(key, JSON.stringify(values));
    }
  });
  await bench.reload();
  await bench.locator('#lesson-select').selectOption('algo-permutations');
  await expect(bench.locator('#code-input')).toHaveValue(permutationsStarter);
  assert.deepEqual((await history(bench))['algo-permutations'] ?? [], [], 'E04 actual attempt records must be absent before restore');
  await expect(bench.locator('#attempt-list')).toContainText('아직 제출 기록이 없습니다.');
  await bench.locator('#import-file').setInputFiles({ name: 'permutations-backup.json', mimeType: 'application/json', buffer: permutationsBackup });
  await expect(bench.locator('#draft-status')).toHaveText('통합 백업을 복원했습니다.');
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator('#code-input')).toHaveValue(permutationsCorrect);
  await expect(page.locator('#attempt-history-container .attempt-list li')).toHaveCount(2);
  await page.locator('[data-restore-attempt="1"]').click();
  await expect(page.locator('#code-input')).toHaveValue(permutationsWrong);
  await page.locator('[data-restore-attempt="0"]').click();
  await expect(page.locator('#code-input')).toHaveValue(permutationsCorrect);
  await expect(page.locator('.mastery-state')).toContainText('전체 숙달');
  await expect(page.locator('.figure-box svg')).toHaveAttribute('role', 'img');
  const permutationsBounds = await page.evaluate(() => {
    const svg = document.querySelector('.figure-box svg'), view = svg.viewBox.baseVal;
    const overflow = [...svg.querySelectorAll('text')].flatMap(text => {
      const box = text.getBBox();
      return box.x >= 0 && box.y >= 0 && box.x + box.width <= view.width && box.y + box.height <= view.height
        ? [] : [{ text: text.textContent, x: box.x, y: box.y, width: box.width, height: box.height }];
    });
    return { overflow, width: document.documentElement.scrollWidth, viewport: innerWidth,
      wideElements: [...document.querySelectorAll('*')].filter(el => el.getBoundingClientRect().right > innerWidth + 1)
        .slice(0, 8).map(el => ({ tag: el.tagName, class: el.className, text: el.textContent.slice(0, 80) })) };
  });
  assert.deepEqual(permutationsBounds.overflow, [], 'E04 SVG text overflow: ' + JSON.stringify(permutationsBounds));
  assert.ok(permutationsBounds.width <= permutationsBounds.viewport, 'E04 page overflow: ' + JSON.stringify(permutationsBounds));
  if (qaDir) await page.screenshot({ path: path.join(qaDir, 'permutations-mobile.png'), fullPage: true });
  await context.setOffline(false);
  await page.locator('[data-route="track:algo"]').first().click();
  await expect(page.locator('[data-route="lesson:algo-permutations"]')).toHaveCount(1);
  console.log('PASS: E04 E03-next entry, real GCC missing-undo failure/correction 10/10, quiz retry, separate mastery, shared history, v1, 390px diagram/offline and next lesson');

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(base + '/#lesson:algo-permutations');
  await page.locator('.next-action [data-route="lesson:algo-activity-selection"]').click();
  await page.reload();
  await expect(page.locator('meta[name="codeweave-token"]')).toHaveAttribute('content', /^[a-f0-9]{64}$/);
  await expect(page.locator('.detail-head h1')).toHaveText('탐욕 활동 선택: 가장 이른 종료와 반례');
  await expect(page.locator('.practice-zone')).toContainText('함수 직접 호출형');
  await expect(page.locator('#code-input')).toHaveValue(activitySelectionStarter);
  await page.locator('[data-quiz="algo-activity-selection"][data-choice="0"]').click();
  await expect(page.locator('.feedback.bad')).toBeVisible();
  await page.locator('[data-retry="algo-activity-selection"]').click();
  await page.locator('[data-quiz="algo-activity-selection"][data-choice="2"]').click();
  await page.locator('#mark-theory').click();
  await expect(page.locator('.mastery-state')).not.toContainText('전체 숙달');
  await submit(page, activityWrong);
  await expect(page.locator('.terminal[role="status"]')).toContainText('채점 미통과');
  await expect(page.locator('.mastery-state')).not.toContainText('전체 숙달');
  await submit(page, activityCorrect);
  await expect(page.locator('.terminal[role="status"]')).toContainText('10/10');
  await expect(page.locator('.mastery-state')).toContainText('전체 숙달');
  await expect(page.locator('#attempt-history-container .attempt-list li')).toHaveCount(2);
  await bench.reload();
  await bench.locator('#lesson-select').selectOption('algo-activity-selection');
  await expect(bench.locator('#code-input')).toHaveValue(activityCorrect);
  const activityDownloadEvent = bench.waitForEvent('download');
  await bench.locator('#export-history').click();
  const activityDownload = await activityDownloadEvent, activityChunks = [];
  for await (const chunk of await activityDownload.createReadStream()) activityChunks.push(chunk);
  const activityBackup = Buffer.concat(activityChunks), activityData = JSON.parse(activityBackup);
  assert.equal(activityData.drafts['algo-activity-selection'], activityCorrect);
  assert.equal(activityData.iterations['algo-activity-selection'].length, 2);
  assert.equal(activityData.drafts['algo-permutations'], permutationsCorrect);
  await bench.evaluate(() => {
    for (const key of ['codeweave.drafts.v1', 'codeweave.iterations.v1']) {
      const values = JSON.parse(localStorage.getItem(key) || '{}');
      delete values['algo-activity-selection'];
      localStorage.setItem(key, JSON.stringify(values));
    }
  });
  await bench.reload();
  await bench.locator('#lesson-select').selectOption('algo-activity-selection');
  await expect(bench.locator('#code-input')).toHaveValue(activitySelectionStarter);
  assert.deepEqual((await history(bench))['algo-activity-selection'] ?? [], [], 'E05 attempts must be absent before restore');
  await bench.locator('#import-file').setInputFiles({ name: 'activity-selection-backup.json', mimeType: 'application/json', buffer: activityBackup });
  await expect(bench.locator('#draft-status')).toHaveText('통합 백업을 복원했습니다.');
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator('#code-input')).toHaveValue(activityCorrect);
  await expect(page.locator('#attempt-history-container .attempt-list li')).toHaveCount(2);
  await page.locator('[data-restore-attempt="1"]').click();
  await expect(page.locator('#code-input')).toHaveValue(activityWrong);
  await page.locator('[data-restore-attempt="0"]').click();
  await expect(page.locator('#code-input')).toHaveValue(activityCorrect);
  await expect(page.locator('.mastery-state')).toContainText('전체 숙달');
  await expect(page.locator('.figure-box svg')).toHaveAttribute('role', 'img');
  assert.equal(await page.evaluate(() => {
    const svg = document.querySelector('.figure-box svg'), view = svg.viewBox.baseVal;
    return [...svg.querySelectorAll('text')].every(text => {
      const box = text.getBBox();
      return box.x >= 0 && box.y >= 0 && box.x + box.width <= view.width && box.y + box.height <= view.height;
    }) && document.documentElement.scrollWidth <= innerWidth;
  }), true, 'E05 learner page must fit 390px');
  if (qaDir) await page.screenshot({ path: path.join(qaDir, 'activity-selection-mobile.png'), fullPage: true });
  await context.setOffline(false);
  await page.locator('[data-route="track:algo"]').first().click();
  await expect(page.locator('[data-route="lesson:algo-activity-selection"]')).toHaveCount(1);
  console.log('PASS: E05 E04-next entry, real GCC endpoint failure/correction 10/10, quiz retry, mastery, shared history/v1 restore, offline and 390px');

  await page.goto(base + '/#lesson:c-file-stream-count');
  await page.reload();
  await page.locator('.next-action [data-route="lesson:c-owned-stream-byte"]').click();
  await expect(page.locator('.detail-head h1')).toHaveText('소유 스트림: 오류 진단을 보존하며 닫기');
  await expect(page.locator('#code-input')).toHaveValue(ownedStreamStarter);
  await page.locator('[data-quiz="c-owned-stream-byte"][data-choice="1"]').click();
  await expect(page.locator('.feedback.bad')).toBeVisible();
  await page.locator('[data-retry="c-owned-stream-byte"]').click();
  await page.locator('[data-quiz="c-owned-stream-byte"][data-choice="0"]').click();
  await page.locator('#mark-theory').click();
  await expect(page.locator('.mastery-state')).not.toContainText('전체 숙달');
  await submit(page, ownedWrong);
  await expect(page.locator('.terminal[role="status"]')).toContainText('채점 미통과');
  await expect(page.locator('.mastery-state')).not.toContainText('전체 숙달');
  await submit(page, ownedCorrect);
  await expect(page.locator('.terminal[role="status"]')).toContainText('12/12');
  await expect(page.locator('.mastery-state')).toContainText('전체 숙달');
  await expect(page.locator('#attempt-history-container .attempt-list li')).toHaveCount(2);
  await bench.reload();
  await bench.locator('#lesson-select').selectOption('c-owned-stream-byte');
  await expect(bench.locator('#code-input')).toHaveValue(ownedCorrect);
  const ownedDownloadEvent = bench.waitForEvent('download');
  await bench.locator('#export-history').click();
  const ownedDownload = await ownedDownloadEvent, ownedChunks = [];
  for await (const chunk of await ownedDownload.createReadStream()) ownedChunks.push(chunk);
  const ownedBackup = Buffer.concat(ownedChunks), ownedData = JSON.parse(ownedBackup);
  assert.equal(ownedData.drafts['c-owned-stream-byte'], ownedCorrect);
  assert.equal(ownedData.iterations['c-owned-stream-byte'].length, 2);
  assert.equal(ownedData.drafts['algo-merge'], mergeCorrect);
  assert.equal(ownedData.drafts['rust-cargo'], rustDraft);
  await bench.locator('#import-file').setInputFiles({ name: 'owned-stream-backup.json', mimeType: 'application/json', buffer: ownedBackup });
  await expect(bench.locator('#draft-status')).toHaveText('통합 백업을 복원했습니다.');
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator('#code-input')).toHaveValue(ownedCorrect);
  await expect(page.locator('#attempt-history-container .attempt-list li')).toHaveCount(2);
  await page.locator('[data-restore-attempt="1"]').click();
  await expect(page.locator('#code-input')).toHaveValue(ownedWrong);
  await page.locator('[data-restore-attempt="0"]').click();
  await expect(page.locator('#code-input')).toHaveValue(ownedCorrect);
  await expect(page.locator('.mastery-state')).toContainText('전체 숙달');
  await expect(page.locator('.figure-box svg')).toHaveAttribute('role', 'img');
  assert.equal(await page.evaluate(() => {
    const svg = document.querySelector('.figure-box svg'), view = svg.viewBox.baseVal;
    return [...svg.querySelectorAll('text')].every(text => {
      const box = text.getBBox();
      return box.x >= 0 && box.y >= 0 && box.x + box.width <= view.width && box.y + box.height <= view.height;
    }) && document.documentElement.scrollWidth <= innerWidth;
  }), true, 'C07 ownership diagram and learner page must fit 390px');
  if (qaDir) await page.screenshot({ path: path.join(qaDir, 'owned-stream-mobile.png'), fullPage: true });
  await context.setOffline(false);
  await page.locator('[data-route="track:c"]').first().click();
  await expect(page.locator('[data-route="lesson:c-owned-stream-byte"]')).toHaveCount(1);
  console.log('PASS: C07 C05-next entry, real GCC ignored-close failure/correction 12/12, quiz retry, separate mastery, shared history/v1 restore, offline attempts and 390px');
  await page.goto(base + '/#lesson:c-owned-stream-byte');
  await page.locator('.next-action [data-route="lesson:c-qsort-callback"]').click();
  await page.reload();
  await expect(page.locator('.detail-head h1')).toHaveText('qsort와 함수 포인터: 정렬 정책 전달하기');
  await expect(page.locator('#code-input')).toHaveValue(callbackSortStarter);
  await page.locator('[data-quiz="c-qsort-callback"][data-choice="0"]').click();
  await expect(page.locator('.feedback.bad')).toBeVisible();
  await page.locator('[data-retry="c-qsort-callback"]').click();
  await page.locator('[data-quiz="c-qsort-callback"][data-choice="1"]').click();
  await page.locator('#mark-theory').click();
  await expect(page.locator('.mastery-state')).not.toContainText('전체 숙달');
  await submit(page, callbackWrong);
  await expect(page.locator('.terminal[role="status"]')).toContainText('채점 미통과');
  await submit(page, callbackCorrect);
  await expect(page.locator('.terminal[role="status"]')).toContainText('12/12');
  await expect(page.locator('.mastery-state')).toContainText('전체 숙달');
  await expect(page.locator('#attempt-history-container .attempt-list li')).toHaveCount(2);
  await bench.reload();
  await bench.locator('#lesson-select').selectOption('c-qsort-callback');
  await expect(bench.locator('#code-input')).toHaveValue(callbackCorrect);
  const callbackDownloadEvent = bench.waitForEvent('download');
  await bench.locator('#export-history').click();
  const callbackDownload = await callbackDownloadEvent, callbackChunks = [];
  for await (const chunk of await callbackDownload.createReadStream()) callbackChunks.push(chunk);
  const callbackBackup = Buffer.concat(callbackChunks), callbackData = JSON.parse(callbackBackup);
  assert.equal(callbackData.drafts['c-qsort-callback'], callbackCorrect);
  assert.equal(callbackData.iterations['c-qsort-callback'].length, 2);
  assert.equal(callbackData.drafts['c-owned-stream-byte'], ownedCorrect);
  await bench.evaluate(() => {
    for (const key of ['codeweave.drafts.v1', 'codeweave.iterations.v1']) {
      const values = JSON.parse(localStorage.getItem(key) || '{}');
      delete values['c-qsort-callback'];
      localStorage.setItem(key, JSON.stringify(values));
    }
  });
  await bench.reload();
  await bench.locator('#lesson-select').selectOption('c-qsort-callback');
  await expect(bench.locator('#code-input')).toHaveValue(callbackSortStarter);
  await bench.locator('#import-file').setInputFiles({ name: 'callback-sort-backup.json', mimeType: 'application/json', buffer: callbackBackup });
  await expect(bench.locator('#draft-status')).toHaveText('통합 백업을 복원했습니다.');
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator('#code-input')).toHaveValue(callbackCorrect);
  await expect(page.locator('#attempt-history-container .attempt-list li')).toHaveCount(2);
  await page.locator('[data-restore-attempt="1"]').click();
  await expect(page.locator('#code-input')).toHaveValue(callbackWrong);
  await page.locator('[data-restore-attempt="0"]').click();
  await expect(page.locator('#code-input')).toHaveValue(callbackCorrect);
  await expect(page.locator('.mastery-state')).toContainText('전체 숙달');
  await expect(page.locator('.figure-box svg')).toHaveAttribute('role', 'img');
  assert.equal(await page.evaluate(() => {
    const svg = document.querySelector('.figure-box svg'), view = svg.viewBox.baseVal;
    return [...svg.querySelectorAll('text')].every(text => {
      const box = text.getBBox();
      return box.x >= 0 && box.y >= 0 && box.x + box.width <= view.width && box.y + box.height <= view.height;
    }) && document.documentElement.scrollWidth <= innerWidth;
  }), true, 'C08 callback diagram and learner page must fit 390px');
  if (qaDir) await page.screenshot({ path: path.join(qaDir, 'callback-sort-mobile.png'), fullPage: true });
  await context.setOffline(false);
  await page.locator('[data-route="track:c"]').first().click();
  await expect(page.locator('[data-route="lesson:c-qsort-callback"]')).toHaveCount(1);
  console.log('PASS: C08 C07-next entry, real GCC shortened-range failure/correction 12/12, quiz retry, mastery, shared history/v1 restore, offline and 390px');
  assert.deepEqual(errors, []);
  console.log('PASS: 390px mobile layout and offline reload of drafts/history; no browser exceptions');
} catch (error) {
  if (page && process.env.CODEWEAVE_QA_DIR) {
    await mkdir(process.env.CODEWEAVE_QA_DIR, { recursive: true });
    await page.screenshot({ path: path.join(process.env.CODEWEAVE_QA_DIR, 'browser-failure.png'), fullPage: true }).catch(() => {});
  }
  throw error;
} finally {
  await browser?.close();
  const ended = once(server, 'exit');
  server.kill();
  await ended;
}
