import test from 'node:test';
import assert from 'node:assert/strict';
import { DRAFTS_KEY, PROGRESS_KEY } from '../src/logic.js';
import { ITERATIONS_KEY, recordIteration } from '../src/iterations.js';

// A small event/DOM fixture exercises the real app module. It is not browser E2E.
const decode = text => text.replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
function domFixture() {
  let html = '', elements = [];
  function element(attrs = '') {
    const attributes = Object.fromEntries([...attrs.matchAll(/([\w-]+)="([^"]*)"/g)].map(m => [m[1], decode(m[2])]));
    const listeners = {};
    return { id: attributes.id, disabled: /\bdisabled\b/.test(attrs), value: '',
      dataset: Object.fromEntries(Object.entries(attributes).filter(([key]) => key.startsWith('data-'))
        .map(([key, value]) => [key.slice(5).replace(/-([a-z])/g, (_, ch) => ch.toUpperCase()), value])),
      addEventListener: (name, handler) => { (listeners[name] ??= []).push(handler); },
      async fire(name) { for (const handler of listeners[name] ?? []) await handler({ target: this }); },
      setAttribute() {}, prepend() {} };
  }
  const root = { get innerHTML() { return html; }, set innerHTML(value) {
    html = value; elements = [];
    for (const match of html.matchAll(/<(button|textarea|div|input|p)\b([^>]*)>/g)) {
      const el = element(match[2]);
      if (match[1] === 'textarea') el.value = decode(html.slice(match.index + match[0].length).split('</textarea>')[0]);
      elements.push(el);
    }
  } };
  return { root,
    querySelector(selector) { return selector === '#app' ? root : elements.find(el => el.id === selector.slice(1)) ?? null; },
    querySelectorAll(selector) {
      const key = selector.slice(6, -1).replace(/-([a-z])/g, (_, ch) => ch.toUpperCase());
      return elements.filter(el => Object.hasOwn(el.dataset, key));
    }, createElement: () => element() };
}

test('main lesson loads old workbench attempts, submits, restores, and keeps quiz completion separate', async t => {
  const globals = ['document', 'window', 'location', 'localStorage', 'navigator', 'confirm', 'fetch'];
  const descriptors = new Map(globals.map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  t.after(() => {
    for (const [key, descriptor] of descriptors) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key];
    }
  });
  const old = recordIteration({}, 'c-hello', 'old failed code', { ok: false, message: '컴파일 실패', tests: [] }, '2026-10-11T02:00:00Z');
  const values = new Map([[ITERATIONS_KEY, JSON.stringify(old)]]);
  const document = domFixture(), windowListeners = {};
  let acceptRestore = true, calls = 0, release;
  const pass = { ok: true, tests: [{ passed: true, detail: '출력 일치' }], message: '1/1 통과' };
  const bindings = {
    document, window: { addEventListener: (name, handler) => { windowListeners[name] = handler; }, scrollTo() {} },
    location: { hash: '#lesson:c-hello', protocol: 'http:', hostname: '127.0.0.1' }, navigator: {},
    localStorage: { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) },
    confirm: () => acceptRestore,
    fetch: async () => { calls++; await new Promise(resolve => { release = resolve; }); return { ok: true, json: async () => pass }; }
  };
  for (const [key, value] of Object.entries(bindings)) Object.defineProperty(globalThis, key, { value, writable: true, configurable: true });
  await import('../src/app.js?flow-test');
  assert.match(document.root.innerHTML, /old failed code/);
  const editor = document.querySelector('#code-input');
  editor.value = 'new passing code'; await editor.fire('input');
  const grading = document.querySelector('#grade-code').fire('click');
  assert.equal(document.querySelector('#grade-code').disabled, true);
  // The handler also rejects repeated activation, independent of disabled styling.
  await document.querySelector('#grade-code').fire('click');
  assert.equal(calls, 1);
  release(); await grading;
  assert.equal(document.querySelector('#grade-code').disabled, false);
  assert.equal(JSON.parse(values.get(ITERATIONS_KEY))['c-hello'].length, 2);
  assert.deepEqual(JSON.parse(values.get(PROGRESS_KEY)).completed, []);
  assert.match(document.root.innerHTML, /✓ 실습 통과/);
  const restore = () => document.querySelectorAll('[data-restore-attempt]').find(el => el.dataset.restoreAttempt === '1');
  acceptRestore = false; await restore().fire('click');
  assert.equal(document.querySelector('#code-input').value, 'new passing code');
  acceptRestore = true; await restore().fire('click');
  assert.equal(document.querySelector('#code-input').value, 'old failed code');
  assert.equal(JSON.parse(values.get(DRAFTS_KEY))['c-hello'], 'old failed code');
  assert.equal(JSON.parse(values.get(ITERATIONS_KEY))['c-hello'].length, 2);
  bindings.fetch = async () => { throw new Error('offline'); };
  globalThis.fetch = bindings.fetch;
  await document.querySelector('#grade-code').fire('click');
  assert.equal(JSON.parse(values.get(ITERATIONS_KEY))['c-hello'].length, 2);
  assert.match(document.root.innerHTML, /제출 기록을 추가하지 않았습니다/);
  // A history update in another tab must leave the active editor intact.
  const active = document.querySelector('#code-input');
  active.value = 'still editing';
  windowListeners.storage({ key: ITERATIONS_KEY });
  assert.equal(document.querySelector('#code-input'), active);
  assert.equal(active.value, 'still editing');
  // Another tab updates drafts after this app has already loaded its snapshot.
  values.set(DRAFTS_KEY, JSON.stringify({ 'c-types': 'other tab sum', 'rust-mut': 'new rust' }));
  await active.fire('input');
  assert.equal(JSON.parse(values.get(DRAFTS_KEY))['c-types'], 'other tab sum');
  assert.equal(JSON.parse(values.get(DRAFTS_KEY))['rust-mut'], 'new rust');
  // A quiz action writes progress only, even if this tab has stale draft state.
  const latest = JSON.parse(values.get(DRAFTS_KEY));
  latest['rust-mut'] = 'newer rust';
  values.set(DRAFTS_KEY, JSON.stringify(latest));
  await document.querySelectorAll('[data-quiz]').find(el => el.dataset.choice === '0').fire('click');
  assert.equal(JSON.parse(values.get(DRAFTS_KEY))['rust-mut'], 'newer rust');
});
