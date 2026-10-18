import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { gradeRustInternal } from '../server/rust-pipeline.mjs';

const request = { exerciseId: 'cleanup-fixture', code: 'pub fn value() -> i32 { 2 }' };
const cases = Array.from({ length: 8 }, (_, i) => ({ id: `case_0${i}`, label: `case ${i}` }));
const definitions = new Map([[request.exerciseId, { id: request.exerciseId, language: 'rust',
  grader: 'cargo-test', starter: request.code, cases,
  harness: cases.map(c => `#[test] fn ${c.id}() { assert_eq!(codeweave_submission::value(), 2); }`).join('\n') }]]);

for (const mode of ['success-result', 'compile-result', 'observer-error', 'falsy-error', 'cancelled']) {
  test(`Rust cleanup failure preserves recovery directory and original outcome: ${mode}`, async t => {
    const parent = await fs.mkdtemp(path.join(os.tmpdir(), 'codeweave-cleanup-test-'));
    const remove = fs.rm.bind(fs);
    t.after(() => remove(parent, { recursive: true, force: true }));
    const sentinel = path.join(parent, 'keep');
    await fs.writeFile(sentinel, 'user data');
    const cleanup = Object.assign(new Error('injected removal denied'), { code: 'EACCES' });
    const primary = mode === 'falsy-error' ? null : new Error('original observer failure');
    const controller = new AbortController();
    let owned;
    const attempted = [];
    const mock = t.mock.method(fs, 'rm', async (target, options) => {
      attempted.push(target);
      if (target === owned) throw cleanup;
      return remove(target, options);
    });
    let failure;
    try {
      await gradeRustInternal(request, definitions, { parent, signal: controller.signal,
        observe: async event => {
          owned = event.workspace.dir;
          if (mode === 'success-result') {
            let stdout = '';
            if (event.stage === 'compile') {
              const binary = path.join(event.workspace.targetDir, 'fixture');
              await fs.writeFile(binary, 'synthetic fixture, never executed', { mode: 0o700 });
              stdout = JSON.stringify({ reason: 'compiler-artifact',
                manifest_path: path.join(owned, 'Cargo.toml'), target: { name: 'codeweave', kind: ['test'] },
                profile: { test: true }, executable: binary }) + '\n' +
                JSON.stringify({ reason: 'build-finished', success: true });
            } else if (event.stage === 'list') {
              stdout = cases.map(c => c.id + ': test\n').join('');
            } else if (event.stage === 'case') {
              stdout = `running 1 test\ntest ${event.test.id} ... ok\ntest result: ok. 1 passed; 0 failed; 0 ignored; 0 measured; 7 filtered out; finished in 0.00s\n`;
            }
            return { status: 0, stdout, stderr: '' };
          }
          if (mode === 'cancelled') {
            controller.abort();
            return { status: 0, stdout: '', stderr: '' };
          }
          if (mode !== 'compile-result') throw primary;
          return { status: 101, stdout: '', stderr: 'syntax error' };
        } });
      assert.fail('cleanup failure must never become a grading result');
    } catch (error) {
      failure = error;
    } finally {
      mock.mock.restore();
    }
    assert.equal(failure.code, 'ERUSTCLEANUP');
    assert.ok(failure instanceof AggregateError);
    assert.equal(failure.cause, cleanup);
    assert.equal(failure.workspaceDir, owned);
    assert.deepEqual(attempted, [owned]);
    assert.equal(path.dirname(owned), parent);
    assert.equal(failure.errors.at(-1), cleanup);
    if (mode.endsWith('-result')) assert.deepEqual(failure.errors, [cleanup]);
    else if (mode === 'cancelled') assert.equal(failure.errors[0].name, 'AbortError');
    else assert.equal(failure.errors[0], primary);
    assert.equal(await fs.readFile(sentinel, 'utf8'), 'user data');
    assert.ok((await fs.readdir(owned)).includes('Cargo.toml'));
    // Recovery is explicit and targets only the captured owned directory.
    await remove(failure.workspaceDir, { recursive: true, force: true });
    assert.deepEqual(await fs.readdir(parent), ['keep']);
  });
}
