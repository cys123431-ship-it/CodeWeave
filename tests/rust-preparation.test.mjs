import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import { formatRustProcessFailure } from '../server/rust-results.mjs';
import { observeProcess } from './helpers/observe-process.mjs';
import { withRustFixtureLinker } from './helpers/rust-fixture-linker.mjs';
import { rustBuildBudget } from './helpers/rust-build-budget.mjs';
import { trustedRustTools } from './helpers/rust-tools.mjs';

const api = () => import('../server/rust-preparation.mjs');
const cases = Array.from({ length: 8 }, (_, i) => ({ id: `case_0${i}`, label: `fixture ${i}` }));
const code = 'pub fn fixture() -> bool { true }\n';
const harness = cases.map(c => `#[test]\nfn ${c.id}() { panic!("listing must not execute this"); }`).join('\n');
const definition = (source = harness) => ({ id: 'rust-preparation-fixture', language: 'rust', grader: 'cargo-test', starter: code, harness: source, cases });
const request = { exerciseId: 'rust-preparation-fixture', code };
const registry = (source = harness) => new Map([[request.exerciseId, definition(source)]]);
const result = stdout => ({ status: 0, signal: null, stdout, stderr: '' });
const listing = cases.map(c => `${c.id}: test\n`).join('');

async function temporary(t) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'codeweave-rust-test-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  return dir;
}

test('Rust preparation rejects invalid submission before creating any workspace', async t => {
  const { prepareRustWorkspace } = await api();
  const parent = await temporary(t);
  await assert.rejects(prepareRustWorkspace({ ...request, files: [] }, registry(), parent));
  assert.deepEqual(await fs.readdir(parent), []);
});

test('Rust preparation writes only fixed sources into a fresh private directory', async t => {
  const { prepareRustWorkspace } = await api();
  const parent = await temporary(t);
  const a = await prepareRustWorkspace(request, registry(), parent);
  const b = await prepareRustWorkspace(request, registry(), parent);
  assert.notEqual(a.dir, b.dir);
  assert.equal(a.plan.executionEnabled, false);
  assert.equal(await fs.readFile(path.join(a.dir, 'src/lib.rs'), 'utf8'), code);
  assert.equal(await fs.readFile(path.join(a.dir, 'tests/codeweave.rs'), 'utf8'), harness);
  assert.deepEqual((await fs.readdir(a.dir)).sort(), ['Cargo.lock', 'Cargo.toml', 'src', 'target', 'tests']);
  if (process.platform !== 'win32') {
    assert.equal((await fs.stat(a.dir)).mode & 0o777, 0o700);
    assert.equal((await fs.stat(path.join(a.dir, 'src/lib.rs'))).mode & 0o777, 0o600);
  }
});

test('Rust preparation reports missing and failed tools without trusting printed version strings', async () => {
  const { checkRustToolchain } = await api();
  for (const bad of [{ error: { code: 'ENOENT' } }, { ...result('cargo 1.90.0'), status: 1 }, result('not cargo')]) {
    assert.throws(() => checkRustToolchain(bad, result('rustc 1.90.0')), /Rust 도구/);
  }
  assert.deepEqual(checkRustToolchain(result('cargo 1.99.0 (fixture)\n'), result('rustc 1.99.0 (fixture)\n')), {
    cargo: 'cargo 1.99.0 (fixture)', rustc: 'rustc 1.99.0 (fixture)'
  });
});

function messages(workspace, executable, change = {}) {
  return JSON.stringify({ reason: 'compiler-artifact', manifest_path: path.join(workspace.dir, 'Cargo.toml'),
    target: { name: 'codeweave', kind: ['test'] }, profile: { test: true }, executable, ...change }) +
    '\n' + JSON.stringify({ reason: 'build-finished', success: true }) + '\n';
}

test('Rust artifact selection requires one successful matching integration artifact', async t => {
  const { prepareRustWorkspace, selectRustArtifact } = await api();
  const workspace = await prepareRustWorkspace(request, registry(), await temporary(t));
  const executable = path.join(workspace.targetDir, 'fixture');
  await fs.writeFile(executable, 'synthetic artifact', { mode: 0o700 });
  assert.equal(await selectRustArtifact(messages(workspace, executable), workspace), executable);
  for (const bad of ['', 'not-json', messages(workspace, executable).replace('"success":true', '"success":false'),
    messages(workspace, executable, { target: { name: 'other', kind: ['test'] } }),
    messages(workspace, executable, { target: { name: 'codeweave', kind: { length: 1, 0: 'test' } } }),
    messages(workspace, executable, { profile: { test: false } }),
    messages(workspace, executable) + messages(workspace, executable), ' '.repeat(80001)]) {
    await assert.rejects(selectRustArtifact(bad, workspace), /산출물/);
  }
});

test('Rust artifact selection rejects outside paths, missing files and non-files', async t => {
  const { prepareRustWorkspace, selectRustArtifact } = await api();
  const parent = await temporary(t);
  const workspace = await prepareRustWorkspace(request, registry(), parent);
  const outside = path.join(parent, 'outside');
  await fs.writeFile(outside, 'synthetic', { mode: 0o700 });
  for (const bad of [outside, path.join(workspace.targetDir, 'missing'), workspace.targetDir]) {
    await assert.rejects(selectRustArtifact(messages(workspace, bad), workspace), /산출물/);
  }
});

test('Rust artifact selection rejects symlinks in artifact and ancestor paths', { skip: process.platform === 'win32' }, async t => {
  const { prepareRustWorkspace, selectRustArtifact } = await api();
  const parent = await temporary(t);
  const workspace = await prepareRustWorkspace(request, registry(), parent);
  const outside = path.join(parent, 'outside');
  await fs.writeFile(outside, 'synthetic', { mode: 0o700 });
  const direct = path.join(workspace.targetDir, 'linked');
  await fs.symlink(outside, direct);
  await assert.rejects(selectRustArtifact(messages(workspace, direct), workspace), /산출물/);
  await fs.symlink(parent, path.join(workspace.targetDir, 'ancestor'));
  await assert.rejects(selectRustArtifact(messages(workspace, path.join(workspace.targetDir, 'ancestor/outside')), workspace), /산출물/);
});

test('Rust listing matches every declared ID and separately rejects ignored tests', async () => {
  const { validateRustListing } = await api();
  assert.deepEqual(validateRustListing(result(listing), result(''), cases), cases.map(c => c.id));
  for (const bad of ['', listing.replace('case_00: test\n', ''), listing + 'case_08: test\n',
    listing + 'case_00: test\n', listing.replace('case_00: test', 'case_00: benchmark')]) {
    assert.throws(() => validateRustListing(result(bad), result(''), cases), /테스트 목록/);
  }
  assert.throws(() => validateRustListing(result(listing), result('case_00: test\n'), cases), /테스트 목록/);
});

test('Rust listing rejects failed or signalled enumeration even with valid-looking stdout', async () => {
  const { validateRustListing } = await api();
  for (const change of [{ status: 1 }, { signal: 'SIGTERM' }, { error: { code: 'ETIMEDOUT' } }]) {
    assert.throws(() => validateRustListing({ ...result(listing), ...change }, result(''), cases), /테스트 목록/);
    assert.throws(() => validateRustListing(result(listing), { ...result(''), ...change }, cases), /테스트 목록/);
  }
});

const cargo = spawnSync('cargo', ['--version'], { encoding: 'utf8', timeout: 3000 });
const rustc = spawnSync('rustc', ['--version'], { encoding: 'utf8', timeout: 3000 });
const toolsAvailable = cargo.status === 0 && rustc.status === 0;

test('Real Cargo builds the fixed package and lists eight nonexecuted tests, rejecting ignored and empty fixtures', {
  skip: !toolsAvailable && process.env.CODEWEAVE_REQUIRE_RUST !== '1' ? 'Cargo/rustc unavailable locally; mandatory in CI' : false,
  timeout: 60000
}, async t => {
  const { prepareRustWorkspace, selectRustArtifact, validateRustListing, checkRustToolchain } = await api();
  const versions = checkRustToolchain(cargo, rustc);
  console.log('Rust fixture toolchain:', versions);
  const tools = await trustedRustTools();
  const parent = await temporary(t);
  for (const [source, valid] of [[harness, true], [harness.replace('#[test]', '#[test]\n#[ignore]'), false], ['// no tests\n', false]]) {
    const workspace = await prepareRustWorkspace(request, registry(source), parent);
    const env = withRustFixtureLinker({ PATH: process.env.PATH, HOME: process.env.HOME, ...workspace.plan.environment,
      CARGO_HOME: path.join(parent, 'cargo-home'), RUSTUP_HOME: process.env.RUSTUP_HOME,
      CARGO_TARGET_DIR: workspace.targetDir, RUSTC: tools.rustc });
    const build = rustBuildBudget(tools.cargo, workspace.plan.compile.args, { env });
    const compiled = await observeProcess(build.command, build.args, {
      cwd: workspace.dir, env: build.env, timeout: build.timeout, maxBuffer: build.maxBuffer,
      stage: source === harness ? 'prepare-normal' : source.includes('#[ignore]') ? 'prepare-ignored' : 'prepare-empty'
    });
    console.log('Cargo observation:', JSON.stringify(compiled.observation));
    assert.equal(compiled.status, 0, formatRustProcessFailure(compiled));
    const executable = await selectRustArtifact(compiled.stdout, workspace);
    const options = { cwd: workspace.dir, env, encoding: 'utf8', timeout: 2000, maxBuffer: 80000 };
    const all = spawnSync(executable, workspace.plan.list.args, options);
    const ignored = spawnSync(executable, workspace.plan.listIgnored.args, options);
    if (valid) assert.deepEqual(validateRustListing(all, ignored, cases), cases.map(c => c.id));
    else assert.throws(() => validateRustListing(all, ignored, cases), /테스트 목록/);
  }
});
