import test from 'node:test';
import assert from 'node:assert/strict';
import { recordGradedSubmission } from '../src/practice.js';
import { ITERATIONS_KEY } from '../src/iterations.js';
import { DRAFTS_KEY, PROGRESS_KEY } from '../src/logic.js';
import { createAttemptBackup } from '../src/attempt-backup.js';
import { createFullBackup } from '../src/backup.js';

const token = 'c'.repeat(64);
const correct = 'pub fn total(items: u32, price: u32) -> u32 { items * price }';
const wrong = correct.replace('items * price', 'items + price');
const at = '2026-10-18T13:59:19.000Z';
const result = ok => ({ ok, message: ok ? '10/10' : '0/10', compileOutput: '',
  tests: Array.from({ length: 10 }, () => ({ passed: ok, detail: ok ? '테스트 통과' : '단언 실패 · fixture' })) });
let sequence = 0;
async function fixture(t, { enabled = true, initial = {}, respond = async () => ({ ok: true, json: async () => result(true) }) } = {}) {
  const names = ['document', 'window', 'localStorage', 'confirm', 'alert', 'fetch'];
  const previous = new Map(names.map(name => [name, Object.getOwnPropertyDescriptor(globalThis, name)]));
  t.after(() => {
    for (const [name, descriptor] of previous) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor); else delete globalThis[name];
    }
  });
  function element() {
    const listeners = {};
    return { value: '', textContent: '', children: [], dataset: {}, disabled: false,
      append(...values) { this.children.push(...values); },
      replaceChildren(...values) { this.children = values; },
      setAttribute(name, value) { this[name] = value; },
      addEventListener(name, fn) { listeners[name] = fn; },
      async fire(name, target = this) { await listeners[name]?.({ target }); } };
  }
  const elements = new Map(), windowListeners = {}, values = new Map(Object.entries(initial)), calls = [], notices = [];
  const storage = { getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) };
  const el = selector => {
    if (!elements.has(selector)) elements.set(selector, element());
    return elements.get(selector);
  };
  const globals = {
    document: { querySelector(selector) {
      if (selector === 'meta[name="codeweave-rust"]') return enabled ? { content: 'rust-cargo' } : null;
      if (selector === 'meta[name="codeweave-token"]') return enabled ? { content: token } : null;
      return el(selector);
    }, querySelectorAll: () => [], createElement: () => element() },
    window: { addEventListener: (name, fn) => { windowListeners[name] = fn; } },
    localStorage: storage, confirm: () => true, alert: message => notices.push(message),
    fetch: async (url, options) => { calls.push({ url, options }); return respond(url, options); }
  };
  for (const [name, value] of Object.entries(globals)) {
    Object.defineProperty(globalThis, name, { value, writable: true, configurable: true });
  }
  await import('../src/workbench.js?rust-workbench-' + sequence++);
  const options = () => el('#lesson-select').children.map(item => item.value);
  const select = async id => {
    assert.ok(options().includes(id), 'exercise is selectable: ' + id);
    el('#lesson-select').value = id;
    await el('#lesson-select').fire('change');
  };
  const submit = async source => { el('#code-input').value = source; await el('#grade-code').fire('click'); };
  return { el, storage, values, calls, notices, options, select, submit, windowListeners };
}
test('workbench exposes only configured F01, not other Rust exercises, and labels the selected language', async t => {
  const f = await fixture(t);
  assert.ok(f.options().includes('rust-cargo'));
  assert.ok(!f.options().includes('rust-mut'));
  await f.select('rust-cargo');
  assert.match(f.el('#code-label').textContent, /Rust/);
  assert.match(f.el('#grade-code').textContent, /Cargo/);
  assert.equal(f.el('#grade-code').disabled, false);
  await f.select('c-hello');
  assert.match(f.el('#code-label').textContent, /C/);
  assert.match(f.el('#grade-code').textContent, /GCC/);
});
test('ordinary workbench keeps the existing C selection without activating Rust', async t => {
  const f = await fixture(t, { enabled: false });
  assert.ok(f.options().includes('c-hello'));
  assert.ok(!f.options().includes('rust-cargo'));
});
test('workbench sends F01 to authenticated Rust route, records failure/correction and restores without submitting', async t => {
  const f = await fixture(t, { respond: async (_url, options) =>
    ({ ok: true, json: async () => result(JSON.parse(options.body).code === correct) }) });
  await f.select('rust-cargo');
  await f.submit(wrong);
  await f.submit(correct);
  assert.deepEqual(f.calls.map(call => call.url), ['./api/grade/rust', './api/grade/rust']);
  assert.deepEqual(JSON.parse(f.calls[1].options.body), { exerciseId: 'rust-cargo', code: correct });
  assert.equal(f.calls[1].options.headers['X-CodeWeave-Token'], token);
  assert.equal(f.calls[1].options.headers['Content-Type'], 'application/json');
  const before = f.storage.getItem(ITERATIONS_KEY);
  assert.deepEqual(JSON.parse(before)['rust-cargo'].map(entry => entry.passed), [true, false]);
  const failedAttempt = f.el('#attempt-list').children[1];
  await failedAttempt.children.at(-1).fire('click');
  assert.equal(f.el('#code-input').value, wrong);
  assert.equal(f.storage.getItem(ITERATIONS_KEY), before);
  assert.equal(f.calls.length, 2);
  assert.equal(f.storage.getItem(PROGRESS_KEY), null, 'practice must not grant quiz/theory completion');
});
test('workbench HTTP and malformed F01 responses never add attempts', async t => {
  const f = await fixture(t, { respond: async () => ({ ok: false, status: 503 }) });
  await f.select('rust-cargo');
  await f.submit(correct);
  assert.equal(f.storage.getItem(ITERATIONS_KEY), null);
  assert.match(f.el('#grade-result').textContent, /503/);
  globalThis.fetch = async () => ({ ok: true, json: async () => ({ ...result(true), tests: [] }) });
  await f.submit(correct);
  assert.equal(f.storage.getItem(ITERATIONS_KEY), null);
  assert.match(f.el('#grade-result').textContent, /잘못된 채점 결과/);
  assert.equal(f.el('#grade-code').disabled, false);
});
test('legacy C import in configured workbench preserves Rust history and draft outside its original scope', async t => {
  const f = await fixture(t);
  recordGradedSubmission(f.storage, ['c-hello', 'rust-cargo'], 'rust-cargo', correct, result(true), at);
  f.storage.setItem(DRAFTS_KEY, JSON.stringify({ 'rust-cargo': correct, 'c-hello': 'old C' }));
  const before = f.storage.getItem(ITERATIONS_KEY);
  const legacy = createAttemptBackup({ drafts: { 'c-hello': 'new C' }, iterations: {} }, ['c-hello'], at);
  const text = JSON.stringify(legacy);
  await f.el('#import-file').fire('change', { value: 'c.json', files: [{ size: text.length, text: async () => text }] });
  assert.equal(f.storage.getItem(ITERATIONS_KEY), before);
  assert.equal(JSON.parse(f.storage.getItem(DRAFTS_KEY))['rust-cargo'], correct);
  assert.equal(JSON.parse(f.storage.getItem(DRAFTS_KEY))['c-hello'], 'new C');
  assert.deepEqual(f.notices, []);
});
test('offline workbench can restore saved F01 data but cannot send a forged grading click', async t => {
  const seed = { 'rust-cargo': [{ at, code: wrong, passed: false, message: '0/10', compileOutput: '', tests: result(false).tests }] };
  const f = await fixture(t, { enabled: false, initial: {
    [ITERATIONS_KEY]: JSON.stringify(seed), [DRAFTS_KEY]: JSON.stringify({ 'rust-cargo': correct })
  } });
  await f.select('rust-cargo');
  assert.equal(f.el('#grade-code').disabled, true);
  const before = f.storage.getItem(ITERATIONS_KEY);
  await f.el('#attempt-list').children[0].children.at(-1).fire('click');
  assert.equal(f.el('#code-input').value, wrong);
  await f.el('#grade-code').fire('click');
  assert.equal(f.calls.length, 0);
  assert.equal(f.storage.getItem(ITERATIONS_KEY), before);
});
test('importing F01 data into a C-only page immediately exposes read-only restoration without reload', async t => {
  const f = await fixture(t, { enabled: false });
  assert.ok(!f.options().includes('rust-cargo'));
  const backup = createFullBackup({ progress: {}, drafts: { 'rust-cargo': wrong }, iterations: {} },
    ['c-hello', 'rust-cargo'], at);
  const text = JSON.stringify(backup);
  await f.el('#import-file').fire('change', { value: 'f01.json', files: [{ size: text.length, text: async () => text }] });
  await f.select('rust-cargo');
  assert.equal(f.el('#code-input').value, wrong);
  assert.equal(f.el('#grade-code').disabled, true);
  assert.deepEqual(f.notices, []);
});
