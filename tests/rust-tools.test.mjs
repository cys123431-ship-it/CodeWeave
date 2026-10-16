import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { rustBuildBudget } from './helpers/rust-build-budget.mjs';

const api = () => import('../server/rust-tools.mjs');
async function fixture(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'codeweave-tools-test-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  await fs.mkdir(path.join(root, 'bin'));
  for (const name of ['cargo', 'rustc']) await fs.writeFile(path.join(root, 'bin', name), 'fixture', { mode: 0o700 });
  return root;
}

test('Rust tool paths resolve two fixed regular executables within one canonical sysroot', async t => {
  const { resolveRustToolPaths } = await api();
  const root = await fs.realpath(await fixture(t));
  const tools = await resolveRustToolPaths(root, { platform: 'linux', arch: 'x64' });
  assert.deepEqual(tools, { cargo: path.join(root, 'bin/cargo'), rustc: path.join(root, 'bin/rustc'),
    host: 'x86_64-unknown-linux-gnu' });
  assert.ok(Object.isFrozen(tools));
});

test('Rust tool paths reject unsupported hosts, relative roots and filesystem roots', async t => {
  const { resolveRustToolPaths } = await api();
  const root = await fixture(t);
  for (const value of ['', '.', '/', null, root + '\0']) await assert.rejects(resolveRustToolPaths(value));
  for (const options of [{ platform: 'win32', arch: 'x64' }, { platform: 'linux', arch: 'ia32' }]) {
    await assert.rejects(resolveRustToolPaths(root, options));
  }
});

test('Rust tool paths reject linked binaries and linked bin directories', async t => {
  const { resolveRustToolPaths } = await api();
  const root = await fixture(t);
  const outside = await fixture(t);
  await fs.unlink(path.join(root, 'bin/cargo'));
  await fs.symlink(path.join(outside, 'bin/cargo'), path.join(root, 'bin/cargo'));
  await assert.rejects(resolveRustToolPaths(root));
  await fs.unlink(path.join(root, 'bin/cargo'));
  // A separate root avoids deleting the fixture's nonempty bin directory.
  const linked = await fs.mkdtemp(path.join(os.tmpdir(), 'codeweave-tools-link-'));
  t.after(() => fs.rm(linked, { recursive: true, force: true }));
  await fs.symlink(path.join(outside, 'bin'), path.join(linked, 'bin'));
  await assert.rejects(resolveRustToolPaths(linked));
});

test('Rust tool paths reject missing, non-file and non-executable tools', async t => {
  const { resolveRustToolPaths } = await api();
  const root = await fixture(t);
  await fs.chmod(path.join(root, 'bin/rustc'), 0o600);
  await assert.rejects(resolveRustToolPaths(root));
  await fs.unlink(path.join(root, 'bin/rustc'));
  await assert.rejects(resolveRustToolPaths(root));
  await fs.mkdir(path.join(root, 'bin/rustc'));
  await assert.rejects(resolveRustToolPaths(root));
});

test('Rust host validation rejects missing, duplicate, foreign and failed verbose reports', async () => {
  const { checkRustToolHost } = await api();
  const host = 'x86_64-unknown-linux-gnu';
  const stdout = `rustc 1.99.0 (fixture)\nbinary: rustc\nhost: ${host}\nrelease: 1.99.0\n`;
  const report = { status: 0, signal: null, stdout };
  assert.equal(checkRustToolHost(report, host), host);
  for (const change of [{ stdout: '' }, { stdout: stdout + `host: ${host}\n` },
    { stdout: stdout.replace(host, 'aarch64-apple-darwin') }, { status: 1 },
    { signal: 'SIGTERM' }, { error: { code: 'ETIMEDOUT' } },
    { stdout: stdout.replace('release: 1.99.0', 'release: 1.99.0-nightly') }]) {
    assert.throws(() => checkRustToolHost({ ...report, ...change }, host));
  }
});

test('Rust build budget preserves an explicit compiler while dropping proxy and wrapper overrides', () => {
  const call = rustBuildBudget('/trusted/cargo', [], { platform: 'linux', env: {
    RUSTC: '/trusted/rustc', RUSTC_WRAPPER: '/untrusted', RUSTC_WORKSPACE_WRAPPER: '/untrusted',
    RUSTUP_TOOLCHAIN: 'nightly', CARGO_BUILD_TARGET: 'foreign', SECRET: 'hidden'
  } });
  assert.deepEqual(call.env, { RUSTC: '/trusted/rustc' });
});

const available = spawnSync('rustc', ['--version'], { timeout: 3000 }).status === 0;
test('Real trusted Cargo version probe uses resolved host tools despite inherited Rust overrides', {
  skip: !available && process.env.CODEWEAVE_REQUIRE_RUST !== '1' ? 'Rust unavailable locally; required in CI' : false
}, async () => {
  const { trustedRustTools } = await import('./helpers/rust-tools.mjs');
  const tools = await trustedRustTools();
  assert.ok(path.isAbsolute(tools.cargo) && path.isAbsolute(tools.rustc));
  const call = rustBuildBudget(tools.cargo, ['--version'], { env: { PATH: process.env.PATH,
    RUSTC: tools.rustc, RUSTUP_TOOLCHAIN: 'does-not-exist', RUSTC_WRAPPER: '/must-not-run' } });
  assert.equal(call.env.RUSTC, tools.rustc);
  const out = spawnSync(call.command, call.args, { env: call.env, encoding: 'utf8', timeout: call.timeout });
  assert.equal(out.status, 0, out.stderr);
  assert.match(out.stdout, /^cargo 1\.99\.0 /);
});
