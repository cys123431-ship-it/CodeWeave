import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const api = () => import('../scripts/prepare-rust-inputs.mjs');

async function fixture(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'codeweave-tool-inputs-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const sysroot = path.join(root, 'toolchain');
  const targetLibdir = path.join(sysroot, 'lib/rustlib/fixture-target/lib');
  await fs.mkdir(targetLibdir, { recursive: true });
  await fs.mkdir(path.join(sysroot, 'bin'));
  const inputs = new Map([
    ['bin/rustc', Buffer.alloc(16, 1)], ['lib/librustc_driver-fixture.so', Buffer.alloc(128, 2)],
    ['lib/libLLVM.so.22.1-rust-fixture-stable', Buffer.alloc(256, 3)],
    ['lib/rustlib/fixture-target/lib/libstd-fixture.rlib', Buffer.alloc(64, 4)],
    ['lib/rustlib/fixture-target/lib/libtest-fixture.rlib', Buffer.alloc(32, 5)]
  ]);
  for (const [name, data] of inputs) await fs.writeFile(path.join(sysroot, name), data);
  await fs.writeFile(path.join(sysroot, 'lib/notes.txt'), 'not a toolchain input');
  return { root, sysroot, targetLibdir, inputs };
}

test('Rust readiness reads only toolchain inputs without modifying files or compiling', async t => {
  const { prepareRustInputs } = await api();
  const fixtureData = await fixture(t);
  const { sysroot, targetLibdir, inputs } = fixtureData;
  const result = await prepareRustInputs({ sysroot, targetLibdir });
  assert.equal(result.files, 5);
  assert.equal(result.bytes, 496);
  assert.ok(result.durationMs >= 0);
  for (const [name, data] of inputs) assert.deepEqual(await fs.readFile(path.join(sysroot, name)), data);
  assert.deepEqual((await fs.readdir(path.join(sysroot, 'bin'))).sort(), ['rustc']);
  assert.doesNotMatch(JSON.stringify(result), /toolchain\/|notes|AAAA/);
});

test('Rust readiness rejects outside targets and escaping toolchain links', async t => {
  const { prepareRustInputs } = await api();
  const { root, sysroot, targetLibdir } = await fixture(t);
  await assert.rejects(prepareRustInputs({ sysroot, targetLibdir: root }), /inside/);
  await fs.symlink(path.join(root, 'outside.so'), path.join(sysroot, 'lib/libescape.so'));
  await fs.writeFile(path.join(root, 'outside.so'), 'never read me');
  await assert.rejects(prepareRustInputs({ sysroot, targetLibdir }), /inside/);
  await assert.rejects(prepareRustInputs({ sysroot: '.', targetLibdir }), /absolute/);
});

test('Rust readiness reads an in-tree library alias once rather than doubling its IO budget', async t => {
  const { prepareRustInputs } = await api();
  const { sysroot, targetLibdir } = await fixture(t);
  await fs.symlink('libLLVM.so.22.1-rust-fixture-stable', path.join(sysroot, 'lib/libLLVM-fixture.so'));
  const result = await prepareRustInputs({ sysroot, targetLibdir, maxBytes: 496 });
  assert.equal(result.files, 5);
  assert.equal(result.bytes, 496);
});

test('Rust readiness fails closed on file and byte budgets instead of silently skipping inputs', async t => {
  const { prepareRustInputs } = await api();
  const { sysroot, targetLibdir } = await fixture(t);
  await assert.rejects(prepareRustInputs({ sysroot, targetLibdir, maxFiles: 4 }), /file budget/);
  await assert.rejects(prepareRustInputs({ sysroot, targetLibdir, maxBytes: 495 }), /byte budget/);
  await assert.rejects(prepareRustInputs({ sysroot, targetLibdir, maxBytes: 0 }), /budget/);
  await assert.rejects(prepareRustInputs({ sysroot, targetLibdir, maxFiles: 257 }), /budget/);
});

test('Rust readiness reports its own deadline without extending or running a build', async t => {
  const { prepareRustInputs } = await api();
  const { sysroot, targetLibdir } = await fixture(t);
  let time = 0;
  await assert.rejects(prepareRustInputs({ sysroot, targetLibdir, timeoutMs: 100, now: () => (time += 101) }), /deadline/);
  await assert.rejects(prepareRustInputs({ sysroot, targetLibdir, timeoutMs: 60001 }), /budget/);
});
