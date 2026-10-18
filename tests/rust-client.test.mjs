import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import * as practice from '../src/practice.js';
import { createLearningServer } from '../server/learning-server.mjs';
import { createRustGradingService } from '../server/rust-service.mjs';
import { createRustGradingDefinitions } from '../server/rust-exercises.mjs';
import { ITERATIONS_KEY } from '../src/iterations.js';
import { createFullBackup, restoreCodeWeaveBackup } from '../src/backup.js';
import { createAttemptBackup } from '../src/attempt-backup.js';
import { lessonLearningStatus } from '../src/mastery.js';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { spawnSync } from 'node:child_process';

const token = 'a'.repeat(64);
const code = 'pub fn total(items: u32, price: u32) -> u32 { items * price }';
const ids = ['c-hello', 'rust-cargo', 'rust-mut'];
const at = '2026-10-18T12:57:38.000Z';
const answer = ok => ({ ok, message: ok ? '10/10' : '0/10', compileOutput: '',
  tests: Array.from({ length: 10 }, () => ({ passed: ok, detail: ok ? '테스트 통과' : '단언 실패 · 값 불일치' })) });
function memory() {
  const values = new Map();
  return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value),
    removeItem: key => values.delete(key) };
}
test('F01 client capability requires both the configured server marker and a live page token', () => {
  const doc = (marker, secret) => ({ querySelector: selector =>
    selector.includes('codeweave-rust') ? { content: marker } : { content: secret } });
  assert.equal(practice.hasRustGrading(doc('rust-cargo', token)), true);
  for (const [marker, secret] of [['', token], ['rust-mut', token], ['rust-cargo', ''], ['rust-cargo', 'bad']]) {
    assert.equal(practice.hasRustGrading(doc(marker, secret)), false);
  }
});
test('only explicit F01 uses the Rust route and longer budget; ordinary C remains unchanged', async () => {
  assert.deepEqual(practice.gradingRequestFor('rust-cargo', true),
    { endpoint: './api/grade/rust', timeout: 45000, expectedTests: 10 });
  assert.deepEqual(practice.gradingRequestFor('c-hello', true),
    { endpoint: './api/grade', timeout: 10000 });
  assert.throws(() => practice.gradingRequestFor('rust-cargo', false));
  assert.throws(() => practice.gradingRequestFor('rust-mut', true));
  assert.throws(() => practice.gradingRequestFor('not-registered', true));
});
test('F01 rejects incomplete, inconsistent and sparse case results before v1 storage', () => {
  const storage = memory();
  practice.recordGradedSubmission(storage, ids, 'c-hello', 'keep', { ok: true, tests: [{ passed: true }] }, at);
  const before = storage.getItem(ITERATIONS_KEY);
  for (const invalid of [{ ...answer(true), tests: answer(true).tests.slice(1) },
    { ...answer(true), tests: Array(10) }, { ...answer(true), ok: false },
    { ...answer(false), compileOutput: undefined }, { ...answer(true), message: {} }]) {
    assert.throws(() => practice.recordGradedSubmission(storage, ids, 'rust-cargo', code, invalid, at));
    assert.equal(storage.getItem(ITERATIONS_KEY), before);
  }
});
test('configured HTTP F01 failure, correction and both v1 restores keep C and quiz states separate', async t => {
  const service = createRustGradingService({ enabled: true, definitions: createRustGradingDefinitions(),
    grade: request => answer(request.code === code) });
  const app = createLearningServer({ root: fileURLToPath(new URL('../', import.meta.url)), rustService: service });
  t.after(() => app.close());
  const address = await app.listen(0), base = 'http://127.0.0.1:' + address.port;
  for (const pathname of ['/', '/workbench.html']) {
    const response = await fetch(base + pathname), html = await response.text();
    assert.match(html, /<meta name="codeweave-rust" content="rust-cargo">/);
    assert.equal(response.headers.get('cache-control'), 'no-store');
  }
  const html = await (await fetch(base)).text();
  const secret = html.match(/name="codeweave-token" content="([a-f0-9]{64})"/)[1];
  const storage = memory();
  practice.recordGradedSubmission(storage, ids, 'c-hello', 'keep C', { ok: true, tests: [{ passed: true }] }, at);
  let history;
  for (const source of ['pub fn total() {}', code]) {
    const response = await fetch(base + '/api/grade/rust', { method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-CodeWeave-Token': secret },
      body: JSON.stringify({ exerciseId: 'rust-cargo', code: source }) });
    assert.equal(response.status, 200);
    history = practice.recordGradedSubmission(storage, ids, 'rust-cargo', source, await response.json(), at);
  }
  assert.deepEqual(history['rust-cargo'].map(entry => entry.passed), [true, false]);
  assert.equal(practice.submissionCode(history, 'rust-cargo', 1), 'pub fn total() {}');
  assert.equal(lessonLearningStatus('rust-cargo', {}, history, true).mastered, false);
  const progress = { theoryRead: ['rust-cargo'], completed: ['rust-cargo'] };
  assert.equal(lessonLearningStatus('rust-cargo', progress, history, true).mastered, true);
  const full = createFullBackup({ progress, drafts: { 'rust-cargo': code }, iterations: history }, ids, at);
  const restored = restoreCodeWeaveBackup(storage, full, { knownIds: ids, attemptIds: ['c-hello'] });
  assert.deepEqual(restored.iterations, history);
  const legacyC = createAttemptBackup({ drafts: {}, iterations: {} }, ['c-hello'], at);
  assert.deepEqual(restoreCodeWeaveBackup(storage, legacyC, { knownIds: ids, attemptIds: ['c-hello'] })
    .iterations['rust-cargo'], history['rust-cargo']);
});
test('ordinary learning server never advertises a Rust client capability', async t => {
  const app = createLearningServer({ root: fileURLToPath(new URL('../', import.meta.url)) });
  t.after(() => app.close());
  const address = await app.listen(0);
  assert.doesNotMatch(await (await fetch('http://127.0.0.1:' + address.port)).text(), /name="codeweave-rust"/);
});
test('offline shell strips both Rust availability and the live authorization token', async () => {
  const context = vm.createContext({ self: { addEventListener() {} }, Headers, Response });
  vm.runInContext(await fs.readFile(new URL('../sw.js', import.meta.url), 'utf8'), context);
  let cached;
  const cache = { put: async (_key, response) => { cached = await response.text(); } };
  const html = '<head>\n  <meta name="codeweave-token" content="' + token + '">\n'
    + '  <meta name="codeweave-rust" content="rust-cargo">\n</head><body>keep lesson</body>';
  await context.cacheShellResponse(cache, '/', new Response(html, { headers: { 'Content-Type': 'text/html' } }));
  assert.doesNotMatch(cached, /codeweave-token|codeweave-rust/);
  assert.match(cached, /keep lesson/);
});
test('actual app legacy-C import cannot expand its replacement scope when F01 is enabled', async t => {
  const names = ['document', 'window', 'location', 'localStorage', 'navigator', 'confirm', 'alert'];
  const previous = new Map(names.map(name => [name, Object.getOwnPropertyDescriptor(globalThis, name)]));
  t.after(() => {
    for (const [name, descriptor] of previous) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor);
      else delete globalThis[name];
    }
  });
  const storage = memory();
  const history = practice.recordGradedSubmission(storage, ids, 'rust-cargo', code, answer(true), at);
  const listeners = {};
  const input = { addEventListener: (name, fn) => { listeners[name] = fn; } };
  const root = { innerHTML: '' }, notices = [];
  const globals = {
    document: { querySelector(selector) {
      if (selector === '#app') return root;
      if (selector === '#import-file') return input;
      if (selector === 'meta[name="codeweave-rust"]') return { content: 'rust-cargo' };
      if (selector === 'meta[name="codeweave-token"]') return { content: token };
      return null;
    }, querySelectorAll: () => [] },
    window: { addEventListener() {} }, location: { hash: '#settings', protocol: 'http:', hostname: '127.0.0.1' },
    localStorage: storage, navigator: {}, confirm: () => true, alert: value => notices.push(value)
  };
  for (const [name, value] of Object.entries(globals)) {
    Object.defineProperty(globalThis, name, { value, writable: true, configurable: true });
  }
  await import('../src/app.js?f01-legacy-scope');
  const legacy = createAttemptBackup({ drafts: {}, iterations: {} }, ['c-hello'], at);
  const text = JSON.stringify(legacy);
  await listeners.change({ target: { files: [{ size: text.length, text: async () => text }], value: 'old.json' } });
  assert.equal(notices.length, 1);
  assert.doesNotMatch(notices[0], /실패/);
  assert.deepEqual(JSON.parse(storage.getItem(ITERATIONS_KEY))['rust-cargo'], history['rust-cargo']);
});
const cargo = spawnSync('cargo', ['--version'], { timeout: 3000 }).status === 0;
test('actual F01 Cargo HTTP results pass the client contract and survive failure/correction and v1 restore', {
  skip: !cargo && process.env.CODEWEAVE_REQUIRE_RUST !== '1' ? 'Cargo unavailable locally; mandatory in CI' : false,
  timeout: 60000
}, async t => {
  const { createLocalRustGradingService } = await import('../server/rust-executor.mjs');
  const { trustedRustTools } = await import('./helpers/rust-tools.mjs');
  const tools = await trustedRustTools();
  const parent = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'codeweave-f01-client-')));
  t.after(() => fs.rm(parent, { recursive: true, force: true }));
  const service = await createLocalRustGradingService({ enabled: true, definitions: createRustGradingDefinitions(),
    sysroot: path.dirname(path.dirname(tools.rustc)), parent });
  const app = createLearningServer({ root: fileURLToPath(new URL('../', import.meta.url)), rustService: service });
  t.after(() => app.close());
  const address = await app.listen(0), base = 'http://127.0.0.1:' + address.port;
  const html = await (await fetch(base)).text(), secret = html.match(/name="codeweave-token" content="([a-f0-9]{64})"/)[1];
  const storage = memory();
  let history;
  for (const [source, ok] of [[code.replace('items * price', 'items + price'), false], [code, true]]) {
    const request = practice.gradingRequestFor('rust-cargo', true);
    const response = await fetch(new URL(request.endpoint, base + '/'), { method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-CodeWeave-Token': secret },
      body: JSON.stringify({ exerciseId: 'rust-cargo', code: source }) });
    assert.equal(response.status, 200);
    const result = await response.json();
    assert.equal(result.ok, ok);
    assert.equal(practice.validateGradingResult(result, request.expectedTests), result);
    history = practice.recordGradedSubmission(storage, ids, 'rust-cargo', source, result, at);
    assert.equal(history['rust-cargo'][0].passed, ok);
    assert.equal(history['rust-cargo'][0].tests.length, 10);
    assert.deepEqual(await fs.readdir(parent), []);
  }
  const progress = { theoryRead: ['rust-cargo'], completed: ['rust-cargo'] };
  const backup = createFullBackup({ progress, drafts: { 'rust-cargo': code }, iterations: history }, ids, at);
  const restored = restoreCodeWeaveBackup(storage, backup, { knownIds: ids, attemptIds: ['c-hello'] });
  assert.deepEqual(restored.iterations, history);
  assert.deepEqual(restored.iterations['rust-cargo'].map(entry => entry.passed), [true, false]);
  assert.equal(practice.submissionCode(restored.iterations, 'rust-cargo', 0), code);
  assert.equal(lessonLearningStatus('rust-cargo', restored.progress, restored.iterations, true).mastered, true);
  console.log('F01 actual client/v1 verified: assertion failure → correction 10/10 → restore; workspace empty');
});
