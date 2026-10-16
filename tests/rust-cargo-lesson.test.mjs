import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import { lessons } from '../src/catalog.js';
import { exerciseById } from '../src/exercises.js';
import { gradingExercises } from '../server/grading-exercises.mjs';
import { lessonLearningStatus } from '../src/mastery.js';
import { scoreChoice } from '../src/logic.js';
import { figureFor } from '../src/figures.js';
import { observeProcess } from './helpers/observe-process.mjs';
import { withRustFixtureLinker } from './helpers/rust-fixture-linker.mjs';

const lesson = () => lessons.find(item => item.id === 'rust-cargo');
test('F01 exposes a Rust lesson with complete project files and an accessible static figure', () => {
  const l = lesson();
  assert.ok(l);
  assert.equal(l.track, 'rust');
  assert.deepEqual(l.sections.filter(s => s.fileName).map(s => s.fileName).sort(), ['Cargo.toml', 'src/lib.rs', 'tests/receipt.rs']);
  assert.match(figureFor(l.figure), /role="img"/);
  assert.doesNotMatch(figureFor(l.figure), /<script|<foreignObject/);
});

test('F01 quiz success and legacy theory flags cannot activate ungraded practice or mastery', () => {
  const l = lesson();
  assert.ok(l);
  const e = exerciseById(l.challenge.id);
  assert.equal(e.language, 'rust');
  assert.equal(e.grader, null);
  assert.equal(gradingExercises.has(e.id), false);
  const correct = scoreChoice(l.quiz, l.quiz.answer);
  assert.equal(correct.correct, true);
  assert.equal(scoreChoice(l.quiz, (l.quiz.answer + 1) % l.quiz.options.length).correct, false);
  const status = lessonLearningStatus(l.id, { completed: [l.id], theoryRead: [l.id] }, {}, false);
  assert.equal(status.theoryRead && status.quizPassed, true);
  assert.equal(status.practicePassed || status.mastered, false);
});

const cargo = spawnSync('cargo', ['--version'], { encoding: 'utf8', timeout: 3000 });
test('F01 displayed Cargo project runs ten assertions, rejects a wrong operator and passes after correction', {
  skip: cargo.status !== 0 && process.env.CODEWEAVE_REQUIRE_RUST !== '1' ? 'Cargo unavailable locally; required in CI' : false,
  timeout: 60000
}, async t => {
  assert.equal(cargo.status, 0);
  const l = lesson();
  assert.ok(l);
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'codeweave-cargo-lesson-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  for (const section of l.sections.filter(s => s.fileName)) {
    await fs.mkdir(path.dirname(path.join(dir, section.fileName)), { recursive: true });
    await fs.writeFile(path.join(dir, section.fileName), section.code);
  }
  await fs.writeFile(path.join(dir, 'Cargo.lock'), 'version = 3\n\n[[package]]\nname = "weave_receipt"\nversion = "0.1.0"\n');
  const env = withRustFixtureLinker({ PATH: process.env.PATH, HOME: process.env.HOME, RUSTUP_HOME: process.env.RUSTUP_HOME,
    CARGO_HOME: path.join(dir, 'cargo-home'), CARGO_TARGET_DIR: path.join(dir, 'target'),
    CARGO_NET_OFFLINE: 'true', CARGO_INCREMENTAL: '0', CARGO_TERM_COLOR: 'never' });
  const run = () => observeProcess('cargo', ['test', '--test', 'receipt', '--frozen', '--jobs', '1', '--color', 'never'], { cwd: dir, env, timeout: 15000, stage: 'F01-project' });
  const library = l.sections.find(s => s.fileName === 'src/lib.rs').code;
  const first = await run();
  assert.equal(first.status, 0, JSON.stringify(first));
  assert.match(first.stdout, /10 passed; 0 failed/);
  await fs.writeFile(path.join(dir, 'src/lib.rs'), library.replace('items * price', 'items + price'));
  const wrong = await run();
  assert.equal(wrong.status, 101, JSON.stringify(wrong));
  await fs.writeFile(path.join(dir, 'src/lib.rs'), library);
  const fixed = await run();
  assert.equal(fixed.status, 0, JSON.stringify(fixed));
  assert.match(fixed.stdout, /10 passed; 0 failed/);
});
