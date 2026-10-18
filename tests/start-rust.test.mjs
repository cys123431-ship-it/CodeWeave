import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import net from 'node:net';
import { spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';

const api = () => import('../scripts/start-rust.mjs');
const script = fileURLToPath(new URL('../scripts/start-rust.mjs', import.meta.url));
const posix = ['linux', 'darwin'].includes(process.platform);
const argsFor = f => ['--trusted-personal-code', '--sysroot', f.sysroot, '--workspace-parent', f.parent, '--port', '0'];
async function temporary(t) {
  const root = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'codeweave-start-rust-')));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  return root;
}
async function tools(t, version = '1.99.0') {
  const root = await temporary(t), sysroot = path.join(root, 'trusted tools'), parent = path.join(root, 'workspaces');
  await fs.mkdir(path.join(sysroot, 'bin'), { recursive: true });
  await fs.mkdir(parent);
  const cargo = path.join(sysroot, 'bin', 'cargo'), rustc = path.join(sysroot, 'bin', 'rustc');
  await fs.writeFile(cargo, '#!/bin/sh\n', { mode: 0o700 });
  await fs.writeFile(rustc, '#!/bin/sh\n', { mode: 0o700 });
  const { resolveRustToolPaths } = await import('../server/rust-tools.mjs');
  const info = await resolveRustToolPaths(sysroot);
  await fs.writeFile(cargo, `#!/bin/sh\nif [ "$1" = --version ]; then echo 'cargo ${version} (fixture)'; exit 0; fi\necho 'error: fixture compilation failure' >&2\nexit 101\n`);
  await fs.writeFile(rustc, `#!/bin/sh\nif [ "$1" = --version ]; then echo 'rustc ${version} (fixture)'; exit 0; fi\nprintf '%s\\n' 'host: ${info.host}' 'release: ${version}'\n`);
  return { root, sysroot, parent };
}
async function launch(t, f) {
  const child = spawn(process.execPath, [script, ...argsFor(f)], { cwd: f.root, stdio: ['ignore', 'pipe', 'pipe'] });
  let output = '', errors = '';
  child.stdout.on('data', chunk => { output += chunk; });
  child.stderr.on('data', chunk => { errors += chunk; });
  const closed = once(child, 'close');
  t.after(async () => {
    if (child.exitCode === null && child.signalCode === null) child.kill('SIGTERM');
    await closed;
  });
  const deadline = Date.now() + 10000;
  while (!/http:\/\/127\.0\.0\.1:\d+/.test(output)) {
    if (child.exitCode !== null || child.signalCode !== null || Date.now() > deadline) throw Error(output + errors || 'CLI did not start');
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  const url = output.match(/http:\/\/127\.0\.0\.1:\d+/)[0];
  const html = await (await fetch(url)).text();
  assert.match(html, /name="codeweave-rust" content="rust-cargo"/);
  const token = html.match(/name="codeweave-token" content="([a-f0-9]{64})"/)[1];
  return { child, closed, url, token, errors: () => errors };
}
async function grade(f, code, headers = {}) {
  const response = await fetch(f.url + '/api/grade/rust', { method: 'POST', headers: {
    'Content-Type': 'application/json', 'X-CodeWeave-Token': f.token, ...headers
  }, body: JSON.stringify({ exerciseId: 'rust-cargo', code }) });
  return { status: response.status, result: await response.json() };
}

test('Rust CLI parser requires explicit trust and absolute operator paths and ignores activation environment', async t => {
  const { parseRustArgs } = await api();
  const f = { sysroot: '/trusted/toolchain', parent: '/trusted/work' };
  const previous = { PORT: process.env.PORT, CODEWEAVE_RUST_ENABLED: process.env.CODEWEAVE_RUST_ENABLED };
  t.after(() => {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });
  process.env.PORT = '9999'; process.env.CODEWEAVE_RUST_ENABLED = '1';
  assert.deepEqual(parseRustArgs(argsFor(f)), { sysroot: f.sysroot, parent: f.parent, port: 0 });
  assert.equal(parseRustArgs(argsFor(f).slice(0, -2)).port, 4173);
  assert.throws(() => parseRustArgs([]), TypeError);
  assert.throws(() => parseRustArgs(argsFor(f).slice(1)), TypeError);
});
test('Rust CLI parser rejects duplicate, unknown, relative, missing and ambiguous arguments', async () => {
  const { parseRustArgs } = await api();
  const valid = argsFor({ sysroot: '/trusted/tools', parent: '/trusted/work' });
  for (const args of [
    [...valid, '--host', '0.0.0.0'], [...valid, '--root', '/'], [...valid, '--sysroot', '/other'],
    [...valid, '--trusted-personal-code'], valid.slice(0, -1),
    valid.map(v => v === '/trusted/tools' ? './relative' : v),
    valid.map(v => v === '/trusted/work' ? 'relative' : v),
    ...['-1', '65536', '1.5', 'NaN', '', ' 4173', '01'].map(port => [...valid.slice(0, -1), port])
  ]) assert.throws(() => parseRustArgs(args), TypeError);
});
test('import and invalid Rust startup are inert before tool probing, workspace allocation or socket binding', async t => {
  let allocations = 0, bindings = 0;
  t.mock.method(fs, 'mkdtemp', () => { allocations++; throw Error('unexpected allocation'); });
  t.mock.method(net.Server.prototype, 'listen', () => { bindings++; throw Error('unexpected bind'); });
  const { startRustServer } = await api();
  await assert.rejects(startRustServer(['--sysroot', '/must-not-probe', '--workspace-parent', '/must-not-write']), TypeError);
  assert.equal(allocations, 0); assert.equal(bindings, 0);
});
test('Rust CLI help succeeds without tools and missing consent fails without starting a server', async () => {
  await api();
  const help = spawnSync(process.execPath, [script, '--help'], { encoding: 'utf8', timeout: 3000 });
  assert.equal(help.status, 0, help.stderr);
  assert.equal(help.stderr, '');
  const npmHelp = spawnSync('npm', ['run', 'start:rust', '--', '--help'], {
    cwd: fileURLToPath(new URL('../', import.meta.url)), encoding: 'utf8', timeout: 5000
  });
  assert.equal(npmHelp.status, 0, npmHelp.stderr);
  const missing = spawnSync(process.execPath, [script, '--sysroot', '/PRIVATE/missing', '--workspace-parent', '/PRIVATE/work'], { encoding: 'utf8', timeout: 3000 });
  assert.equal(missing.status, 1);
  assert.doesNotMatch(missing.stdout + missing.stderr, /PRIVATE|http:\/\//);
});
test('Rust CLI refuses mismatched tool versions before binding or creating submission workspaces', { skip: !posix }, async t => {
  const fixture = await tools(t, '1.98.0'), { startRustServer } = await api();
  let bindings = 0;
  t.mock.method(net.Server.prototype, 'listen', () => { bindings++; throw Error('unexpected bind'); });
  await assert.rejects(startRustServer(argsFor(fixture)));
  assert.equal(bindings, 0);
  assert.deepEqual(await fs.readdir(fixture.parent), []);
});
test('Rust operator close waits for an already disconnected grading lease to settle', async () => {
  const { closeRustServer } = await api();
  assert.equal(typeof closeRustServer, 'function');
  const { gradingAdmission } = await import('../server/grading-admission.mjs');
  const release = gradingAdmission.tryAcquire();
  let closed = false, settled = false;
  const handle = { app: { async close() { closed = true; } }, rustService: { inspect: () => ({ state: 'ready' }) } };
  const pending = Promise.resolve().then(() => closeRustServer(handle)).then(() => { settled = true; });
  pending.catch(() => {});
  try {
    await new Promise(resolve => setTimeout(resolve, 10));
    assert.equal(closed, true);
    assert.equal(settled, false);
    release(); await pending;
    assert.equal(settled, true);
  } finally { release(); await pending; }
});
test('Rust operator close refuses to acknowledge a quarantined lease and never unlocks it', async () => {
  const { closeRustServer } = await api();
  assert.equal(typeof closeRustServer, 'function');
  const { gradingAdmission } = await import('../server/grading-admission.mjs');
  const release = gradingAdmission.tryAcquire();
  try {
    await assert.rejects(closeRustServer({ app: { async close() {} },
      rustService: { inspect: () => ({ state: 'quarantined' }) } }));
    assert.equal(gradingAdmission.busy, true);
  } finally { release(); }
});
test('explicit Rust CLI serves the fixed learning root, retains authentication and exits cleanly without deleting operator data', { skip: !posix }, async t => {
  await api();
  const fixture = await tools(t), keep = path.join(fixture.parent, 'keep.txt');
  await fs.writeFile(keep, 'operator data');
  const f = await launch(t, fixture);
  assert.equal((await grade(f, 'pub fn total(_i:u32,_p:u32)->u32{0}', { 'X-CodeWeave-Token': '0'.repeat(64) })).status, 403);
  const result = await grade(f, 'pub fn total(_i:u32,_p:u32)->u32{0}');
  assert.equal(result.status, 200); assert.equal(result.result.ok, false);
  assert.equal(result.result.tests.length, 10);
  assert.ok(result.result.tests.every(tc => tc.detail === '미실행'));
  assert.equal((await fetch(f.url + '/scripts/start-rust.mjs')).status, 404);
  f.child.kill('SIGTERM');
  const [status, signal] = await f.closed;
  assert.equal(status, 0, f.errors()); assert.equal(signal, null);
  assert.equal(await fs.readFile(keep, 'utf8'), 'operator data');
  assert.deepEqual(await fs.readdir(fixture.parent), ['keep.txt']);
});
const cargo = spawnSync('cargo', ['--version'], { timeout: 3000 }).status === 0;
test('real Rust CLI grades F01 wrong then correct code through authenticated HTTP and cleans before shutdown', {
  skip: !cargo && process.env.CODEWEAVE_REQUIRE_RUST !== '1' ? 'Cargo unavailable locally; mandatory in CI' : false,
  timeout: 60000
}, async t => {
  await api();
  const { trustedRustTools } = await import('./helpers/rust-tools.mjs');
  const trusted = await trustedRustTools(), root = await temporary(t), parent = path.join(root, 'work');
  await fs.mkdir(parent);
  const f = await launch(t, { root, parent, sysroot: path.dirname(path.dirname(trusted.rustc)) });
  const wrong = await grade(f, 'pub fn total(items:u32,price:u32)->u32{items+price}');
  assert.equal(wrong.status, 200); assert.equal(wrong.result.ok, false);
  assert.ok(wrong.result.tests.some(tc => tc.detail.startsWith('단언 실패')));
  const correct = await grade(f, 'pub fn total(items:u32,price:u32)->u32{items*price}');
  assert.equal(correct.status, 200); assert.equal(correct.result.ok, true);
  assert.equal(correct.result.tests.length, 10); assert.ok(correct.result.tests.every(tc => tc.passed));
  assert.deepEqual(await fs.readdir(parent), []);
  f.child.kill('SIGTERM'); assert.deepEqual(await f.closed, [0, null]);
});
