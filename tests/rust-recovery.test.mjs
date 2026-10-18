import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';
import { createGradingAdmission, gradingAdmission } from '../server/grading-admission.mjs';
import { createRustGradingService } from '../server/rust-service.mjs';
import { createLocalRustGradingService } from '../server/rust-executor.mjs';

const posix = ['linux', 'darwin'].includes(process.platform);
const request = { exerciseId: 'recovery-fixture', code: 'pub fn value() -> i32 { 2 }' };
const cases = Array.from({ length: 8 }, (_, i) => ({ id: `case_0${i}`, label: 'fixture' }));
const definitions = new Map([[request.exerciseId, { id: request.exerciseId, language: 'rust', grader: 'cargo-test',
  starter: request.code, cases,
  harness: cases.map(tc => `#[test] fn ${tc.id}() { assert_eq!(codeweave_submission::value(), 2); }`).join('\n') }]]);

test('disabled local Rust supervision exposes no workspace and cannot recover or accept a recovery path', async () => {
  const service = await createLocalRustGradingService({ sysroot: '/never-read' });
  assert.equal(typeof service.inspect, 'function');
  assert.deepEqual(service.inspect(), { state: 'disabled', reason: null, workspaceDir: null });
  assert.equal(await service.recover(), false);
  await assert.rejects(service.recover('/never-delete'), TypeError);
  await assert.rejects(service.submit(request), { code: 'RUST_DISABLED' });
});
async function temporary(t) {
  const dir = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'codeweave-recovery-test-')));
  const remove = fs.rm.bind(fs);
  t.after(() => remove(dir, { recursive: true, force: true }));
  return dir;
}
async function fakeTools(t) {
  const root = await temporary(t), sysroot = path.join(root, 'toolchain'), parent = path.join(root, 'workspaces');
  await fs.mkdir(path.join(sysroot, 'bin'), { recursive: true });
  await fs.mkdir(parent);
  const cargo = path.join(sysroot, 'bin', 'cargo'), rustc = path.join(sysroot, 'bin', 'rustc');
  await fs.writeFile(cargo, '#!/bin/sh\n', { mode: 0o700 });
  await fs.writeFile(rustc, '#!/bin/sh\n', { mode: 0o700 });
  const { resolveRustToolPaths } = await import('../server/rust-tools.mjs');
  const tools = await resolveRustToolPaths(sysroot);
  await fs.writeFile(cargo, '#!/bin/sh\nif [ "$1" = --version ]; then echo "cargo 1.99.0 (trusted)"; exit 0; fi\necho "error: synthetic compile failure" >&2\nexit 101\n');
  await fs.writeFile(rustc, `#!/bin/sh\nif [ "$1" = --version ]; then echo 'rustc 1.99.0 (trusted)'; exit 0; fi\nprintf '%s\\n' 'host: ${tools.host}' 'release: 1.99.0'\n`);
  return { root, sysroot, parent };
}

test('quarantined grading lease survives ordinary release and only its recovery capability can unlock it', () => {
  const gate = createGradingAdmission(), release = gate.tryAcquire();
  assert.equal(typeof release.quarantine, 'function');
  const recover = release.quarantine();
  release();
  assert.equal(gate.busy, true);
  assert.equal(gate.tryAcquire(), null);
  assert.equal(recover(), true);
  assert.equal(recover(), false);
  const next = gate.tryAcquire();
  release(); recover();
  assert.equal(gate.busy, true, 'stale capabilities must not release the new owner');
  next();
  assert.equal(gate.busy, false);
});

test('Rust service reports cleanup only to a trusted supervisor and keeps admission blocked even if reporting throws', async () => {
  let notice;
  const error = Object.assign(new Error('PRIVATE source and /private/path'), { code: 'ERUSTCLEANUP' });
  const service = createRustGradingService({ enabled: true, definitions, grade: () => { throw error; },
    onCleanupFailure: event => { notice = event; throw Error('PRIVATE callback'); } });
  try {
    await assert.rejects(service.submit(request), failure => failure.code === 'RUST_UNAVAILABLE'
      && failure.statusCode === 503 && !/PRIVATE|private\/path/.test(failure.message) && !failure.cause);
    assert.equal(gradingAdmission.busy, true);
    assert.equal(notice.error, error);
    assert.equal(Object.isFrozen(notice), true);
    await assert.rejects(service.submit(request), { code: 'RUST_BUSY' });
  } finally { notice?.resume(); }
  assert.equal(gradingAdmission.busy, false);
});

test('local Rust workspace cleanup failure has bounded private status and never auto-removes or resumes', { skip: !posix }, async t => {
  const fixture = await fakeTools(t), sentinel = path.join(fixture.parent, 'keep');
  await fs.writeFile(sentinel, 'user data');
  const service = await createLocalRustGradingService({ enabled: true, definitions, ...fixture });
  assert.equal(typeof service.inspect, 'function');
  assert.equal(typeof service.recover, 'function');
  const remove = fs.rm.bind(fs), attempts = [];
  const denied = t.mock.method(fs, 'rm', async (target, options) => {
    attempts.push(target);
    if (path.dirname(target) === fixture.parent && path.basename(target).startsWith('codeweave-rust-')) {
      throw Object.assign(Error('PRIVATE removal denied'), { code: 'EACCES' });
    }
    return remove(target, options);
  });
  let owned;
  try {
    await assert.rejects(service.submit(request), { code: 'RUST_UNAVAILABLE' });
    const status = service.inspect(); owned = status.workspaceDir;
    assert.deepEqual(Object.keys(status).sort(), ['reason', 'state', 'workspaceDir']);
    assert.equal(status.state, 'quarantined');
    assert.equal(status.reason, 'workspace-cleanup');
    assert.equal(Object.isFrozen(status), true);
    assert.equal(path.dirname(owned), fixture.parent);
    assert.equal(await service.recover(), false, 'existing owned path is not proof of cleanup');
    assert.deepEqual(attempts, [owned], 'recovery inspection must not retry deletion');
    await assert.rejects(service.submit(request), { code: 'RUST_UNAVAILABLE' });
    assert.equal(gradingAdmission.tryAcquire(), null, 'C and other Rust services must remain blocked');
    await assert.rejects(service.recover({ workspaceDir: fixture.parent }), TypeError);
    assert.equal(await fs.readFile(sentinel, 'utf8'), 'user data');
  } finally { denied.mock.restore(); }
  try {
    await remove(owned, { recursive: true, force: true });
    assert.equal(await service.recover(), true);
    assert.equal(await service.recover(), false);
    assert.deepEqual(service.inspect(), { state: 'ready', reason: null, workspaceDir: null });
    assert.equal((await service.submit(request)).ok, false);
    assert.deepEqual(await fs.readdir(fixture.parent), ['keep']);
  } finally {
    if (owned) await remove(owned, { recursive: true, force: true });
    await service.recover();
  }
});

test('workspace recovery refuses replacement symlinks, even dangling ones, until the exact path is absent', { skip: !posix }, async t => {
  const fixture = await fakeTools(t), service = await createLocalRustGradingService({ enabled: true, definitions, ...fixture });
  assert.equal(typeof service.inspect, 'function');
  const remove = fs.rm.bind(fs);
  const denied = t.mock.method(fs, 'rm', async (target, options) => {
    if (path.dirname(target) === fixture.parent) throw Object.assign(Error('denied'), { code: 'EACCES' });
    return remove(target, options);
  });
  let owned;
  try { await assert.rejects(service.submit(request), { code: 'RUST_UNAVAILABLE' }); owned = service.inspect().workspaceDir; }
  finally { denied.mock.restore(); }
  try {
    await remove(owned, { recursive: true, force: true });
    await fs.symlink(path.join(fixture.root, 'does-not-exist'), owned);
    assert.equal(await service.recover(), false);
    assert.equal(gradingAdmission.busy, true);
    assert.equal((await fs.lstat(owned)).isSymbolicLink(), true);
    await fs.unlink(owned);
    assert.equal(await service.recover(), true);
  } finally { await remove(owned, { recursive: true, force: true }); await service.recover(); }
});

test('preparation cleanup failure is quarantined before any compiler stage and can be acknowledged after manual cleanup', { skip: !posix }, async t => {
  const fixture = await fakeTools(t), service = await createLocalRustGradingService({ enabled: true, definitions, ...fixture });
  assert.equal(typeof service.inspect, 'function');
  const remove = fs.rm.bind(fs), write = fs.writeFile.bind(fs);
  const writer = t.mock.method(fs, 'writeFile', async (file, ...args) => {
    if (String(file).startsWith(fixture.parent + path.sep)) throw Object.assign(Error('PRIVATE write'), { code: 'ENOSPC' });
    return write(file, ...args);
  });
  const denied = t.mock.method(fs, 'rm', async (target, options) => {
    if (path.dirname(target) === fixture.parent) throw Object.assign(Error('PRIVATE delete'), { code: 'EACCES' });
    return remove(target, options);
  });
  let owned;
  try {
    await assert.rejects(service.submit(request), { code: 'RUST_UNAVAILABLE' });
    const status = service.inspect(); owned = status.workspaceDir;
    assert.equal(status.reason, 'workspace-cleanup');
    assert.equal(gradingAdmission.busy, true);
    assert.equal(await service.recover(), false);
  } finally { writer.mock.restore(); denied.mock.restore(); }
  try { await remove(owned, { recursive: true, force: true }); assert.equal(await service.recover(), true); }
  finally { if (owned) await remove(owned, { recursive: true, force: true }); await service.recover(); }
});

test('workspace acknowledgement refuses a moved or replaced parent instead of confusing path absence with cleanup', { skip: !posix }, async t => {
  const fixture = await fakeTools(t), service = await createLocalRustGradingService({ enabled: true, definitions, ...fixture });
  const remove = fs.rm.bind(fs), moved = path.join(fixture.root, 'moved-workspaces');
  const denied = t.mock.method(fs, 'rm', async (target, options) => {
    if (path.dirname(target) === fixture.parent) throw Object.assign(Error('denied'), { code: 'EACCES' });
    return remove(target, options);
  });
  let owned;
  try { await assert.rejects(service.submit(request), { code: 'RUST_UNAVAILABLE' }); owned = service.inspect().workspaceDir; }
  finally { denied.mock.restore(); }
  await fs.rename(fixture.parent, moved);
  await fs.mkdir(fixture.parent);
  try {
    assert.equal(await service.recover(), false);
    assert.equal(gradingAdmission.busy, true);
    assert.ok((await fs.readdir(moved)).includes(path.basename(owned)));
  } finally {
    await fs.rmdir(fixture.parent);
    await fs.rename(moved, fixture.parent);
    await remove(owned, { recursive: true, force: true });
    await service.recover();
  }
});

test('unconfirmed process cleanup cannot be reset through a workspace acknowledgement', { skip: !posix, timeout: 10000 }, async t => {
  // Isolate the deliberately unrecoverable admission state in a child process.
  for (const mode of ['signal', 'observation', 'deadline']) {
    const helper = `import assert from 'node:assert/strict';
      import childProcess from 'node:child_process'; import {syncBuiltinESMExports} from 'node:module';
      import fs from 'node:fs/promises'; import os from 'node:os'; import path from 'node:path';
      import { createLocalRustGradingService } from ${JSON.stringify(new URL('../server/rust-executor.mjs', import.meta.url).href)};
      import { gradingAdmission } from ${JSON.stringify(new URL('../server/grading-admission.mjs', import.meta.url).href)};
      import { resolveRustToolPaths } from ${JSON.stringify(new URL('../server/rust-tools.mjs', import.meta.url).href)};
      const root=await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(),'codeweave-process-fault-')));
      const sysroot=path.join(root,'tools'),parent=path.join(root,'work'); await fs.mkdir(path.join(sysroot,'bin'),{recursive:true});await fs.mkdir(parent);
      const cargo=path.join(sysroot,'bin','cargo'),rustc=path.join(sysroot,'bin','rustc');
      await fs.writeFile(cargo,'#!/bin/sh\\n',{mode:0o700});await fs.writeFile(rustc,'#!/bin/sh\\n',{mode:0o700});
      const tools=await resolveRustToolPaths(sysroot);
      await fs.writeFile(cargo,'#!/bin/sh\\nif [ "$1" = --version ]; then echo "cargo 1.99.0 (trusted)"; exit 0; fi\\nexit 101\\n');
      await fs.writeFile(rustc,'#!/bin/sh\\nif [ "$1" = --version ]; then echo "rustc 1.99.0 (trusted)"; exit 0; fi\\nprintf "%s\\\\n" "host: '+tools.host+'" "release: 1.99.0"\\n');
      try {
        const service=await createLocalRustGradingService({enabled:true,sysroot,parent,definitions:new Map(${JSON.stringify([...definitions])})});
        assert.equal(typeof service.inspect,'function');
        const originalKill=process.kill;
        process.kill=(pid,signal)=>{
          if(pid<0 && ((${JSON.stringify(mode)}==='signal' && signal!==0) || (${JSON.stringify(mode)}==='observation' && signal===0)))
            throw Object.assign(Error('PRIVATE group inspection failure'),{code:'EPERM'});
          if(pid<0 && signal===0 && ${JSON.stringify(mode)}==='deadline') return true;
          return originalKill(pid,signal);
        };
        const originalSpawn=childProcess.spawnSync;
        if(${JSON.stringify(mode)}==='deadline') {
          childProcess.spawnSync=(command,...args)=>command==='/bin/ps'?{status:1,stdout:'',stderr:'PRIVATE unavailable'}:originalSpawn(command,...args);
          syncBuiltinESMExports();
        }
        try {await assert.rejects(service.submit(${JSON.stringify(request)}),{code:'RUST_UNAVAILABLE'});}finally{process.kill=originalKill;}
        assert.equal(service.inspect().reason,'process-cleanup');
        assert.equal(await service.recover(),false);assert.equal(gradingAdmission.busy,true);
        assert.deepEqual(await fs.readdir(parent),[]);
        await assert.rejects(service.submit(${JSON.stringify(request)}),{code:'RUST_UNAVAILABLE'});
        console.log('PROCESS_QUARANTINE_VERIFIED');
      } finally {await fs.rm(root,{recursive:true,force:true});}`;
    const child = spawn(process.execPath, ['--input-type=module', '-e', helper], { stdio: ['ignore', 'pipe', 'pipe'] });
    t.after(async () => {
      if (child.exitCode === null && child.signalCode === null) {
        const ended = once(child, 'exit'); child.kill(); await ended;
      }
    });
    let out = '', err = '';
    child.stdout.on('data', chunk => { out += chunk; }); child.stderr.on('data', chunk => { err += chunk; });
    const [status] = await once(child, 'exit');
    assert.equal(status, 0, err);
    assert.match(out, /PROCESS_QUARANTINE_VERIFIED/);
  }
});

const cargo = spawnSync('cargo', ['--version'], { timeout: 3000 }).status === 0;
test('real Rust workspace deletion failure blocks re-execution until operator cleanup and preserves the next successful attempt', {
  skip: !cargo && process.env.CODEWEAVE_REQUIRE_RUST !== '1' ? 'Cargo unavailable locally; mandatory in CI' : false,
  timeout: 30000
}, async t => {
  const { trustedRustTools } = await import('./helpers/rust-tools.mjs');
  const tools = await trustedRustTools(), parent = await temporary(t);
  const service = await createLocalRustGradingService({ enabled: true, definitions,
    sysroot: path.dirname(path.dirname(tools.rustc)), parent });
  const remove = fs.rm.bind(fs);
  const denied = t.mock.method(fs, 'rm', async (target, options) => {
    if (path.dirname(target) === parent) throw Object.assign(Error('injected owned deletion failure'), { code: 'EACCES' });
    return remove(target, options);
  });
  let owned;
  try {
    await assert.rejects(service.submit(request), { code: 'RUST_UNAVAILABLE' });
    owned = service.inspect().workspaceDir;
    assert.equal(service.inspect().state, 'quarantined');
    assert.equal(await service.recover(), false);
    await assert.rejects(service.submit(request), { code: 'RUST_UNAVAILABLE' });
    assert.equal(gradingAdmission.tryAcquire(), null);
  } finally { denied.mock.restore(); }
  try {
    await remove(owned, { recursive: true, force: true });
    assert.equal(await service.recover(), true);
    const result = await service.submit(request);
    assert.equal(result.ok, true);
    assert.equal(result.tests.length, 8);
    assert.deepEqual(await fs.readdir(parent), []);
  } finally { if (owned) await remove(owned, { recursive: true, force: true }); await service.recover(); }
});
