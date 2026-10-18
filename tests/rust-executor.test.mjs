import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import childProcess from 'node:child_process';
import { syncBuiltinESMExports } from 'node:module';
import http from 'node:http';
import { linuxProcessAlive } from './helpers/linux-process-alive.mjs';

const api = () => import('../server/rust-executor.mjs');
const posix = ['linux', 'darwin'].includes(process.platform);
const request = { exerciseId: 'executor-fixture', code: 'pub fn value() -> i32 { 2 }' };
const cases = Array.from({ length: 8 }, (_, i) => ({ id: `case_0${i}`, label: 'fixture ' + i }));
const definitions = new Map([[request.exerciseId, { id: request.exerciseId, language: 'rust', grader: 'cargo-test',
  starter: request.code, cases,
  harness: cases.map(tc => `#[test] fn ${tc.id}() { assert_eq!(codeweave_submission::value(), 2); }`).join('\n') }]]);
async function temporary(t) {
  const dir = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'codeweave-executor-test-')));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  return dir;
}
async function read(file) {
  try { return await fs.readFile(file, 'utf8'); }
  catch (error) { if (error.code === 'ENOENT') return ''; throw error; }
}
async function ready(file) {
  const end = Date.now() + 4000;
  while (Date.now() < end) {
    const value = await read(file);
    if (value.trim()) return value;
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  throw Error('trusted executor fixture did not start');
}
async function alive(pid) {
  if (process.platform === 'linux') return linuxProcessAlive(pid);
  try { process.kill(pid, 0); }
  catch (error) { if (error.code === 'ESRCH') return false; throw error; }
  const state = spawnSync('/bin/ps', ['-o', 'stat=', '-p', String(pid)], { encoding: 'utf8' }).stdout.trim();
  if (!state) {
    try { process.kill(pid, 0); }
    catch (error) { if (error.code === 'ESRCH') return false; throw error; }
  }
  return !state || !state.startsWith('Z');
}
async function fakeTools(t, { cargoVersion = '1.99.0', host, body = 'echo "error: trusted fixture compile failure" >&2\nexit 101' } = {}) {
  const root = await temporary(t), sysroot = path.join(root, 'toolchain'), parent = path.join(root, 'workspaces');
  await fs.mkdir(path.join(sysroot, 'bin'), { recursive: true });
  await fs.mkdir(parent);
  const { resolveRustToolPaths } = await import('../server/rust-tools.mjs');
  const cargo = path.join(sysroot, 'bin', 'cargo'), rustc = path.join(sysroot, 'bin', 'rustc');
  await fs.writeFile(cargo, '#!/bin/sh\n', { mode: 0o700 });
  await fs.writeFile(rustc, '#!/bin/sh\n', { mode: 0o700 });
  const tools = await resolveRustToolPaths(sysroot);
  await fs.writeFile(cargo, `#!/bin/sh\nif [ "$1" = --version ]; then echo 'cargo ${cargoVersion} (trusted)'; exit 0; fi\n${body}\n`, { mode: 0o700 });
  await fs.writeFile(rustc, `#!/bin/sh\nif [ "$1" = --version ]; then echo 'rustc 1.99.0 (trusted)'; exit 0; fi\nif [ "$1" = -vV ]; then printf '%s\\n' 'rustc 1.99.0 (trusted)' 'host: ${host ?? tools.host}' 'release: 1.99.0'; exit 0; fi\nexit 77\n`, { mode: 0o700 });
  return { root, sysroot, parent, tools };
}

test('local Rust executor stays disabled without probing paths and rejects ambiguous activation', async () => {
  const { createLocalRustGradingService } = await api();
  const service = await createLocalRustGradingService({ sysroot: '/never-read', definitions });
  await assert.rejects(service.submit(request), { code: 'RUST_DISABLED' });
  for (const enabled of ['true', 1, null]) {
    await assert.rejects(createLocalRustGradingService({ enabled, definitions, sysroot: '/never-read' }), TypeError);
  }
  await assert.rejects(createLocalRustGradingService({ enabled: true, sysroot: '/never-read' }), TypeError);
});

test('local Rust executor rejects mismatched tool versions and hosts before allocating workspaces', { skip: !posix }, async t => {
  const { createLocalRustGradingService } = await api();
  for (const config of [{ cargoVersion: '1.98.0' }, { host: 'untrusted-target' }]) {
    const fixture = await fakeTools(t, config);
    await assert.rejects(createLocalRustGradingService({ enabled: true, definitions, ...fixture }));
    assert.deepEqual(await fs.readdir(fixture.parent), []);
  }
});

test('local Rust executor reuses the existing runtime and build budget contracts', { skip: !posix }, async () => {
  const { rustBudget, rustBuildBudget } = await import('../server/rust-budget.mjs');
  const { rustBudget: oldRuntime } = await import('./helpers/rust-budget.mjs');
  const { rustBuildBudget: oldBuild } = await import('./helpers/rust-build-budget.mjs');
  assert.equal(rustBudget, oldRuntime);
  assert.equal(rustBuildBudget, oldBuild);
  const env = { PATH: '/usr/bin:/bin', BASH_ENV: '/never-read', RUSTFLAGS: '-Dwarnings' };
  for (const platform of ['linux', 'darwin']) {
    assert.deepEqual(rustBudget('/trusted/test', ['case_00', '--exact'], { platform, env }), oldRuntime('/trusted/test', ['case_00', '--exact'], { platform, env }));
    assert.deepEqual(rustBuildBudget('/trusted/cargo', ['test'], { platform, env }), oldBuild('/trusted/cargo', ['test'], { platform, env }));
  }
});

test('local Rust executor ignores inherited compiler hooks and returns full compile failure results after cleanup', { skip: !posix }, async t => {
  const { createLocalRustGradingService } = await api();
  const fixture = await fakeTools(t);
  const trace = path.join(fixture.root, 'env.txt');
  await fs.appendFile(path.join(fixture.sysroot, 'bin', 'cargo'), '\n');
  const cargoFile = path.join(fixture.sysroot, 'bin', 'cargo');
  const cargoSource = await fs.readFile(cargoFile, 'utf8');
  await fs.writeFile(cargoFile, cargoSource.replace('echo "error: trusted fixture compile failure"', () =>
    `printf '%s\\n' "$RUSTC_WRAPPER" "$RUSTFLAGS" "$CARGO_HOME" "$CARGO_TARGET_DIR" "$RUSTC" "$CARGO_NET_OFFLINE" "$BASH_ENV" > ${JSON.stringify(trace)}\necho "error: trusted fixture compile failure"`));
  const poison = { RUSTC_WRAPPER: '/never-execute', RUSTFLAGS: '--cfg poisoned', CARGO_TARGET_DIR: '/never-write', BASH_ENV: '/never-read' };
  const previous = Object.fromEntries(Object.keys(poison).map(key => [key, process.env[key]]));
  for (const [key, value] of Object.entries(poison)) process.env[key] = value;
  let service;
  try { service = await createLocalRustGradingService({ enabled: true, definitions, ...fixture }); }
  finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  }
  const result = await service.submit(request);
  assert.equal(result.ok, false);
  assert.equal(result.tests.length, 8);
  assert.ok(result.tests.every(tc => !tc.passed && tc.detail === '미실행'));
  assert.match(result.compileOutput, /trusted fixture compile failure/);
  const [wrapper, flags, home, target, compiler, offline, shellHook] = (await read(trace)).split('\n');
  assert.equal(wrapper, '');
  assert.ok(flags.startsWith('-Dwarnings'));
  assert.doesNotMatch(flags, /poisoned/);
  assert.ok(home.startsWith(fixture.parent + path.sep) && home.endsWith('/cargo-home'));
  assert.ok(target.startsWith(fixture.parent + path.sep));
  assert.equal(compiler, fixture.tools.rustc);
  assert.equal(offline, 'true');
  assert.equal(shellHook, '');
  assert.deepEqual(await fs.readdir(fixture.parent), []);
});

test('local Rust executor cancellation kills the compiler family, releases admission after cleanup and permits retry', { skip: !posix, timeout: 20000 }, async t => {
  const { createLocalRustGradingService } = await api();
  const { gradingAdmission } = await import('../server/grading-admission.mjs');
  const fixture = await fakeTools(t), marker = path.join(fixture.root, 'pids');
  const faults = [], attempts = new Map(), successful = new Map(), remove = fs.rm.bind(fs), kill = process.kill.bind(process);
  t.mock.method(fs, 'rm', async (target, options) => {
    try { return await remove(target, options); }
    catch (error) {
      if (path.dirname(target) === fixture.parent) faults.push({ stage: 'workspace', code: error.code, syscall: error.syscall });
      throw error;
    }
  });
  t.mock.method(process, 'kill', (pid, signal) => {
    if (pid < 0) attempts.set(pid, (attempts.get(pid) ?? 0) + 1);
    try {
      const result = kill(pid, signal);
      if (pid < 0) successful.set(pid, (successful.get(pid) ?? 0) + 1);
      return result;
    }
    catch (error) {
      if (pid < 0 && error.code !== 'ESRCH') faults.push({ stage: 'process-group', code: error.code,
        signal, syscall: error.syscall, attempt: attempts.get(pid), previousSuccessfulSignals: successful.get(pid) ?? 0 });
      throw error;
    }
  });
  const cargoFile = path.join(fixture.sysroot, 'bin', 'cargo');
  const cargoSource = await fs.readFile(cargoFile, 'utf8');
  await fs.writeFile(cargoFile, cargoSource.replace('echo "error: trusted fixture compile failure" >&2\nexit 101', () =>
    `sleep 30 &\nprintf '%s %s\\n' "$$" "$!" > ${JSON.stringify(marker)}\nwait`));
  const service = await createLocalRustGradingService({ enabled: true, definitions, ...fixture });
  const controller = new AbortController();
  const pending = assert.rejects(service.submit(request, { signal: controller.signal }), { code: 'RUST_CANCELLED' });
  try {
    const pids = (await ready(marker)).trim().split(/\s+/).map(Number);
    assert.equal(pids.length, 2);
    assert.ok(pids.every(pid => Number.isInteger(pid) && pid > 1));
    assert.equal(gradingAdmission.busy, true);
    await assert.rejects(service.submit(request), { code: 'RUST_BUSY' });
    const start = Date.now(); controller.abort(); await pending;
    assert.ok(Date.now() - start < 2000, 'cancel must not wait for the build deadline');
    for (const pid of pids) assert.equal(await alive(pid), false, 'surviving compiler PID ' + pid);
    assert.equal(gradingAdmission.busy, false);
    assert.deepEqual(await fs.readdir(fixture.parent), []);
    await fs.writeFile(cargoFile, cargoSource);
    assert.equal((await service.submit(request)).ok, false);
    assert.deepEqual(await fs.readdir(fixture.parent), []);
  } finally {
    const { state, reason } = service.inspect();
    if (faults.length || state === 'quarantined') console.log('Rust cancellation cleanup observation:', JSON.stringify({ state, reason, faults }));
    controller.abort(); await pending;
  }
});

test('local Rust cancellation never signals a successfully killed group again after parent exit', { skip: !posix, timeout: 10000 }, async t => {
  const { createLocalRustGradingService } = await api();
  const { gradingAdmission } = await import('../server/grading-admission.mjs');
  const fixture = await fakeTools(t), marker = path.join(fixture.root, 'single-kill-pids');
  const cargoFile = path.join(fixture.sysroot, 'bin', 'cargo'), original = await fs.readFile(cargoFile, 'utf8');
  await fs.writeFile(cargoFile, original.replace('echo "error: trusted fixture compile failure" >&2\nexit 101', () =>
    `sleep 30 &\nprintf '%s %s\\n' "$$" "$!" > ${JSON.stringify(marker)}\nwait`));
  const service = await createLocalRustGradingService({ enabled: true, definitions, ...fixture });
  const kill = process.kill.bind(process);
  let groupSignals = 0;
  const faults = [];
  t.mock.method(process, 'kill', (pid, signal) => {
    if (pid < 0 && signal !== 0 && ++groupSignals > 1) throw Object.assign(Error('post-exit group signal must not be retried'), { code: 'EPERM' });
    try { return kill(pid, signal); }
    catch (error) {
      if (pid < 0 && error.code !== 'ESRCH' && faults.length < 8) faults.push({ signal, code: error.code, groupSignals });
      throw error;
    }
  });
  const controller = new AbortController();
  const pending = assert.rejects(service.submit(request, { signal: controller.signal }), { code: 'RUST_CANCELLED' });
  try {
    const pids = (await ready(marker)).trim().split(/\s+/).map(Number);
    assert.equal(pids.length, 2);
    controller.abort(); await pending;
    assert.equal(groupSignals, 1);
    for (const pid of pids) assert.equal(await alive(pid), false);
    assert.equal(gradingAdmission.busy, false);
    assert.deepEqual(await fs.readdir(fixture.parent), []);
  } finally {
    if (faults.length || service.inspect().state === 'quarantined') {
      console.log('Rust single-stop observation:', JSON.stringify({ faults, state: service.inspect().state, reason: service.inspect().reason }));
    }
    controller.abort(); await pending;
  }
});

test('local Rust executor stops excessive build output without running cases or leaking workspace files', { skip: !posix }, async t => {
  const { createLocalRustGradingService } = await api();
  const fixture = await fakeTools(t, { body: 'while :; do printf "trusted-fixture-output-overflow-1234567890\\n"; done' });
  const service = await createLocalRustGradingService({ enabled: true, definitions, ...fixture });
  const result = await service.submit(request);
  assert.equal(result.ok, false);
  assert.match(result.message, /출력/);
  assert.equal(result.tests.length, 8);
  assert.ok(result.tests.every(tc => tc.detail === '미실행'));
  assert.ok(result.compileOutput.length <= 3000);
  assert.deepEqual(await fs.readdir(fixture.parent), []);
});

test('Rust parent and pipe close do not release admission before a delayed killed descendant exits', { skip: !posix }, async t => {
  const { createLocalRustGradingService } = await api();
  const { gradingAdmission } = await import('../server/grading-admission.mjs');
  const fixture = await fakeTools(t), marker = path.join(fixture.root, 'detached-pid');
  const cargo = path.join(fixture.sysroot, 'bin', 'cargo');
  const original = await fs.readFile(cargo, 'utf8');
  await fs.writeFile(cargo, original.replace('echo "error: trusted fixture compile failure" >&2\nexit 101', () =>
    `sleep 30 </dev/null >/dev/null 2>&1 &\nprintf '%s\\n' "$!" > ${JSON.stringify(marker)}\nexit 101`));
  const kill = process.kill.bind(process);
  let group, timer, delayed = false, observedBusy = false;
  const faults = [];
  t.mock.method(process, 'kill', (pid, signal) => {
    if (pid < 0 && signal === 'SIGKILL' && !delayed) {
      group = pid;
      delayed = true;
      // Model acknowledged signal delivery whose descendant termination is not instantaneous.
      timer = setTimeout(() => {
        observedBusy = gradingAdmission.busy;
        try { kill(group, 'SIGKILL'); } catch (error) { if (error.code !== 'ESRCH') throw error; }
      }, 120);
      return true;
    }
    try { return kill(pid, signal); }
    catch (error) {
      if (pid < 0 && error.code !== 'ESRCH' && faults.length < 8) faults.push({ signal, code: error.code });
      throw error;
    }
  });
  const service = await createLocalRustGradingService({ enabled: true, definitions, ...fixture });
  try {
    const result = await service.submit(request);
    const pid = Number((await ready(marker)).trim());
    assert.equal(result.ok, false);
    assert.equal(await alive(pid), false, 'pipe EOF is not descendant termination');
    assert.equal(observedBusy, true, 'shared admission stays held until descendant termination');
    assert.equal(gradingAdmission.busy, false);
    assert.deepEqual(await fs.readdir(fixture.parent), []);
  } finally {
    clearTimeout(timer);
    if (faults.length || service.inspect().state === 'quarantined') {
      console.log('Rust delayed-stop observation:', JSON.stringify({ faults, state: service.inspect().state, reason: service.inspect().reason }));
    }
    if (group) { try { kill(group, 'SIGKILL'); } catch (error) { if (error.code !== 'ESRCH') throw error; } }
  }
});

test('local Rust executor reports build launcher failures as infrastructure errors instead of failed submissions', { skip: !posix }, async t => {
  const { createLocalRustGradingService } = await api();
  const outcomes = [];
  for (const status of [125, 126, 127]) {
    const fixture = await fakeTools(t, { body: 'exit ' + status });
    const service = await createLocalRustGradingService({ enabled: true, definitions, ...fixture });
    outcomes.push(await service.submit(request).then(() => 'graded-result', error => error.code));
    assert.deepEqual(await fs.readdir(fixture.parent), []);
  }
  assert.deepEqual(outcomes, ['RUST_UNAVAILABLE', 'RUST_UNAVAILABLE', 'RUST_UNAVAILABLE']);
});

test('Rust build preparation failure is unavailable even when stderr resembles a compiler error', { skip: !posix }, async t => {
  const { createLocalRustGradingService } = await api();
  const { gradingAdmission } = await import('../server/grading-admission.mjs');
  const fixture = await fakeTools(t);
  const service = await createLocalRustGradingService({ enabled: true, definitions, ...fixture });
  const original = childProcess.spawn;
  const mocked = t.mock.method(childProcess, 'spawn', (command, args, options) => {
    if (args?.[4] === 'codeweave-rust-build') {
      return original(command, ['--noprofile', '--norc', '-c',
        'printf "error: before Cargo; /private/operator-path\\n" >&2; exit 101'], options);
    }
    return original(command, args, options);
  });
  syncBuiltinESMExports();
  try {
    await assert.rejects(service.submit(request), error => {
      assert.equal(error.code, 'RUST_UNAVAILABLE');
      assert.equal(error.statusCode, 503);
      assert.doesNotMatch(error.message, /operator-path/);
      return true;
    });
    assert.equal(gradingAdmission.busy, false);
    assert.deepEqual(await fs.readdir(fixture.parent), []);
    const { createLocalGradeAuth } = await import('../server/local-auth.mjs');
    const { createRustHttpHandler } = await import('../server/rust-http.mjs');
    let server;
    const auth = createLocalGradeAuth(() => server.address().port);
    server = http.createServer(createRustHttpHandler({ enabled: true, auth, service }));
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    try {
      const response = await fetch(`http://127.0.0.1:${server.address().port}/api/grade/rust`, {
        method: 'POST', headers: { 'Content-Type': 'application/json',
          'X-CodeWeave-Token': auth.tokenMeta.match(/content="([a-f0-9]{64})"/)[1] },
        body: JSON.stringify(request)
      });
      assert.equal(response.status, 503);
      const value = await response.json();
      assert.deepEqual(value, { ok: false, message: 'Rust 채점 도구를 사용할 수 없습니다.' });
      assert.equal(value.tests, undefined, 'no learner grading result on infrastructure failure');
      assert.doesNotMatch(JSON.stringify(value), /operator-path|before Cargo/);
      assert.deepEqual(await fs.readdir(fixture.parent), []);
    } finally {
      await new Promise(resolve => { server.close(resolve); server.closeAllConnections(); });
    }
  } finally { mocked.mock.restore(); syncBuiltinESMExports(); }
  assert.equal((await service.submit(request)).ok, false, 'cleanup permits a later genuine compiler result');
});

test('Rust build preparation deadline is unavailable without parsing learner diagnostics', { skip: !posix }, async t => {
  const { createLocalRustGradingService } = await api();
  const fixture = await fakeTools(t);
  const service = await createLocalRustGradingService({ enabled: true, definitions, ...fixture });
  const original = childProcess.spawn;
  const mocked = t.mock.method(childProcess, 'spawn', (command, args, options) => {
    if (args?.[4] === 'codeweave-rust-build') {
      const child = original(command, ['--noprofile', '--norc', '-c', 'exec sleep 30'], options);
      queueMicrotask(() => child.emit('error', Object.assign(Error('fixture deadline'), { code: 'ETIMEDOUT' })));
      return child;
    }
    return original(command, args, options);
  });
  syncBuiltinESMExports();
  try {
    await assert.rejects(service.submit(request), { code: 'RUST_UNAVAILABLE', statusCode: 503 });
    assert.deepEqual(await fs.readdir(fixture.parent), []);
  } finally { mocked.mock.restore(); syncBuiltinESMExports(); }
});

test('Rust build launcher signals readiness privately and closes the descriptor before Cargo', { skip: !posix }, async () => {
  const { rustBuildBudget } = await import('../server/rust-budget.mjs');
  const invocation = rustBuildBudget('/bin/bash', ['-c',
    'if printf poisoned >&3 2>/dev/null; then exit 77; fi; printf "codeweave-rust-build: fork: retry: Resource temporarily unavailable\\n" >&2; exit 101'],
  { readyFd: 3 });
  const result = spawnSync(invocation.command, invocation.args, {
    env: invocation.env, encoding: 'utf8', timeout: 2000, stdio: ['ignore', 'pipe', 'pipe', 'pipe']
  });
  assert.equal(result.status, 101);
  assert.equal(result.output[3], 'CODEWEAVE_RUST_READY\n');
  assert.match(result.stderr, /Resource temporarily unavailable/);
});

test('Rust build launcher performs no command substitution after applying the UID process cap', { skip: !posix }, async () => {
  const { rustBuildBudget } = await import('../server/rust-budget.mjs');
  const invocation = rustBuildBudget('/bin/bash', ['--noprofile', '--norc', '-c', 'exit 0']);
  // A trusted shell fixture detects subshell builtins after the final nproc update.
  // DEBUG propagates to command substitutions; no host processes or limits are changed.
  const prefix = 'set -T\nlimited=0\ntrap \'if [[ "$limited" == 1 && "$BASH_SUBSHELL" -gt 0 ]]; then exit 124; fi\' DEBUG\nulimit() { if [[ "$1" == -u && "$2" =~ ^[0-9]+$ ]]; then limited=1; elif [[ "$1" == -S || "$1" == -H ]]; then printf "unlimited\\n"; fi; }\n';
  const args = [...invocation.args];
  args[3] = prefix + args[3];
  const result = spawnSync(invocation.command, args, { encoding: 'utf8', timeout: 2000 });
  assert.equal(result.status, 0, result.stderr);
});

test('Cargo diagnostics resembling launcher errors remain genuine failed submissions after readiness', { skip: !posix }, async t => {
  const { createLocalRustGradingService } = await api();
  const fixture = await fakeTools(t, { body: 'printf "codeweave-rust-build: fork: retry: Resource temporarily unavailable\\n" >&2; exit 101' });
  const service = await createLocalRustGradingService({ enabled: true, definitions, ...fixture });
  const result = await service.submit(request);
  assert.equal(result.ok, false);
  assert.match(result.compileOutput, /Resource temporarily unavailable/);
  assert.equal(result.tests.length, 8);
  assert.deepEqual(await fs.readdir(fixture.parent), []);
});

test('cancellation before Rust launcher readiness retains cancellation after cleanup', { skip: !posix }, async t => {
  const { createLocalRustGradingService } = await api();
  const fixture = await fakeTools(t);
  const service = await createLocalRustGradingService({ enabled: true, definitions, ...fixture });
  const original = childProcess.spawn, controller = new AbortController();
  const mocked = t.mock.method(childProcess, 'spawn', (command, args, options) => {
    if (args?.[4] === 'codeweave-rust-build') {
      const child = original(command, ['--noprofile', '--norc', '-c', 'exec sleep 30'], options);
      queueMicrotask(() => controller.abort());
      return child;
    }
    return original(command, args, options);
  });
  syncBuiltinESMExports();
  try {
    await assert.rejects(service.submit(request, { signal: controller.signal }), { code: 'RUST_CANCELLED' });
    assert.deepEqual(await fs.readdir(fixture.parent), []);
  } finally { mocked.mock.restore(); syncBuiltinESMExports(); }
});

test('local Rust executor refuses ancestor Cargo configuration before activation and before each submission', { skip: !posix }, async t => {
  const { createLocalRustGradingService } = await api();
  const before = await fakeTools(t), after = await fakeTools(t);
  const service = await createLocalRustGradingService({ enabled: true, definitions, ...after });
  for (const [fixture, name] of [[before, 'config.toml'], [after, 'config']]) {
    await fs.mkdir(path.join(fixture.parent, '.cargo'));
    await fs.writeFile(path.join(fixture.parent, '.cargo', name), '[build]\nrustc-wrapper = "/never-execute"\n');
  }
  const activation = await createLocalRustGradingService({ enabled: true, definitions, ...before })
    .then(() => 'activated', () => 'rejected');
  const submission = await service.submit(request).then(() => 'graded-result', error => error.code);
  assert.deepEqual([activation, submission], ['rejected', 'RUST_UNAVAILABLE']);
  for (const fixture of [before, after]) assert.deepEqual(await fs.readdir(fixture.parent), ['.cargo']);
});

const available = spawnSync('cargo', ['--version'], { timeout: 3000 }).status === 0;
test('real local Rust executor grades normal, wrong, syntax and warning submissions and cancels a running case', {
  skip: !available && process.env.CODEWEAVE_REQUIRE_RUST !== '1' ? 'Cargo unavailable locally; mandatory in CI' : false,
  timeout: 60000
}, async t => {
  const { createLocalRustGradingService } = await api();
  const { trustedRustTools } = await import('./helpers/rust-tools.mjs');
  const tools = await trustedRustTools(), parent = await temporary(t), marker = path.join(parent, 'case-pid');
  const service = await createLocalRustGradingService({ enabled: true, definitions,
    sysroot: path.dirname(path.dirname(tools.rustc)), parent });
  for (const [code, passed, unrun] of [[request.code, true, false], ['pub fn value() -> i32 { 3 }', false, false],
    ['pub fn value( {', false, true], ['pub fn value() -> i32 { let unused = 3; 2 }', false, true]]) {
    const result = await service.submit({ ...request, code });
    assert.equal(result.ok, passed);
    assert.equal(result.tests.length, 8);
    assert.ok(result.tests.every(tc => tc.passed === passed));
    assert.equal(result.tests.every(tc => tc.detail === '미실행'), unrun);
    assert.deepEqual(await fs.readdir(parent), []);
  }
  const controller = new AbortController();
  const code = `pub fn value() -> i32 { std::fs::write(${JSON.stringify(marker)}, std::process::id().to_string()).unwrap(); std::thread::sleep(std::time::Duration::from_secs(10)); 2 }`;
  const cancelled = assert.rejects(service.submit({ ...request, code }, { signal: controller.signal }), { code: 'RUST_CANCELLED' });
  try {
    const pid = Number(await ready(marker));
    controller.abort(); await cancelled;
    assert.equal(await alive(pid), false);
    assert.deepEqual(await fs.readdir(parent), ['case-pid']);
  } finally { controller.abort(); await cancelled; }
});
