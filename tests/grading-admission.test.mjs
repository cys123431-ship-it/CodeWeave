import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const admission = () => import('../server/grading-admission.mjs');
const request = { exerciseId: 'admission-fixture', code: 'pub fn value() -> i32 { 2 }' };
const cases = Array.from({ length: 8 }, (_, i) => ({ id: `case_0${i}`, label: `case ${i}` }));
const definitions = new Map([[request.exerciseId, { id: request.exerciseId, language: 'rust', grader: 'cargo-test',
  starter: request.code, cases, harness: cases.map(c => `#[test] fn ${c.id}() {}`).join('\n') }]]);
const result = { ok: true, message: '8/8', compileOutput: '', tests: cases.map(() => ({ passed: true, detail: '통과' })) };

test('grading admission leases are exclusive and stale release cannot unlock a new owner', async () => {
  const { createGradingAdmission } = await admission();
  const gate = createGradingAdmission();
  assert.equal(gate.busy, false);
  const first = gate.tryAcquire();
  assert.equal(gate.busy, true);
  assert.equal(gate.tryAcquire(), null);
  first();
  const second = gate.tryAcquire();
  first();
  assert.equal(gate.busy, true);
  assert.equal(gate.tryAcquire(), null);
  second();
  assert.equal(gate.busy, false);
  assert.equal(Object.isFrozen(gate), true);
});

test('default Rust services share C admission and release after errors without queueing', async () => {
  const { gradingAdmission } = await admission();
  const { createRustGradingService } = await import('../server/rust-service.mjs');
  const releaseC = gradingAdmission.tryAcquire();
  let calls = 0;
  const service = createRustGradingService({ enabled: true, definitions, grade: () => { calls++; return result; } });
  try {
    await assert.rejects(service.submit(request), { code: 'RUST_BUSY', statusCode: 429 });
    assert.equal(calls, 0);
  } finally { releaseC(); }
  const broken = createRustGradingService({ enabled: true, definitions, grade: () => { throw Error('private'); } });
  await assert.rejects(broken.submit(request), { code: 'RUST_UNAVAILABLE' });
  assert.equal((await service.submit(request)).ok, true);
  assert.equal(calls, 1);
  assert.equal(gradingAdmission.busy, false);
});

test('cross-service cancellation retains shared admission until cleanup settles', async () => {
  const { gradingAdmission } = await admission();
  const { createRustGradingService } = await import('../server/rust-service.mjs');
  const controller = new AbortController();
  let finish;
  const service = createRustGradingService({ enabled: true, definitions,
    grade: () => new Promise(resolve => { finish = () => resolve(result); }) });
  let calls = 0;
  const other = createRustGradingService({ enabled: true, definitions, grade: () => { calls++; return result; } });
  const pending = assert.rejects(service.submit(request, { signal: controller.signal }), { code: 'RUST_CANCELLED' });
  try {
    controller.abort();
    assert.equal(gradingAdmission.tryAcquire(), null);
    await assert.rejects(other.submit(request), { code: 'RUST_BUSY' });
    assert.equal(calls, 0);
  } finally { finish(); await pending; }
  assert.equal((await other.submit(request)).ok, true);
  assert.equal(gradingAdmission.busy, false);
});

test('actual C HTTP route refuses a pending internal Rust grade before GCC or workspace allocation', { timeout: 20000 }, async t => {
  await admission();
  const project = fileURLToPath(new URL('../', import.meta.url));
  const parent = await fs.mkdtemp(path.join(os.tmpdir(), 'codeweave-admission-test-'));
  const hook = `import fs from 'node:fs/promises';
    import cp from 'node:child_process';
    import { syncBuiltinESMExports } from 'node:module';
    import { createRustGradingService } from ${JSON.stringify(new URL('../server/rust-service.mjs', import.meta.url).href)};
    const originalTemp = fs.mkdtemp, originalSpawn = cp.spawnSync;
    let effects = 0, calls = 0;
    fs.mkdtemp = async (...args) => {
      effects++;
      try { await service.submit(${JSON.stringify(request)}); console.log('C_OWNS:unexpected-success'); }
      catch (error) { console.log('C_OWNS:' + error.code); }
      return originalTemp(...args);
    };
    cp.spawnSync = (...args) => { if (args[0] === 'gcc') effects++; return originalSpawn(...args); };
    syncBuiltinESMExports();
    const service = createRustGradingService({ enabled: true, definitions: new Map(${JSON.stringify([...definitions])}),
      grade: () => ++calls === 1
        ? new Promise(resolve => process.stdin.once('data', () => resolve(${JSON.stringify(result)})))
        : ${JSON.stringify(result)} });
    service.submit(${JSON.stringify(request)}).then(() => console.log('RELEASED:' + effects));`;
  const child = spawn(process.execPath, ['--import', 'data:text/javascript,' + encodeURIComponent(hook), 'dev-server.mjs'], {
    cwd: project, env: { ...process.env, PORT: '0', TMPDIR: parent, TMP: parent, TEMP: parent }, stdio: ['pipe', 'pipe', 'pipe']
  });
  t.after(async () => {
    if (child.exitCode === null && child.signalCode === null) {
      const ended = once(child, 'exit'); child.kill(); await ended;
    }
    await fs.rm(parent, { recursive: true, force: true });
  });
  let output = '', errors = '';
  child.stdout.on('data', chunk => { output += chunk; });
  child.stderr.on('data', chunk => { errors += chunk; });
  async function waitFor(pattern) {
    for (let i = 0; i < 200; i++) {
      const match = output.match(pattern);
      if (match) return match;
      if (child.exitCode !== null) throw Error(errors || 'server exited');
      await new Promise(resolve => setTimeout(resolve, 20));
    }
    throw Error('server event timed out: ' + errors);
  }
  const url = (await waitFor(/http:\/\/127\.0\.0\.1:\d+/))[0];
  const page = await (await fetch(url)).text();
  const token = page.match(/name="codeweave-token" content="([0-9a-f]{64})"/)?.[1];
  assert.ok(token);
  const submit = () => fetch(url + '/api/grade', { method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-CodeWeave-Token': token },
    body: JSON.stringify({ exerciseId: 'c-hello', code: '#include <stdio.h>\nint main(void){puts("Hello, CodeWeave!");}' }),
    signal: AbortSignal.timeout(5000) });
  const rejected = await submit();
  assert.equal(rejected.status, 429);
  assert.equal((await rejected.json()).ok, false);
  assert.deepEqual(await fs.readdir(parent), []);
  child.stdin.write('release\n');
  assert.equal((await waitFor(/RELEASED:(\d+)/))[1], '0', 'no GCC or workspace allocation while Rust owns admission');
  if (spawnSync('gcc', ['--version']).status === 0) {
    const accepted = await submit();
    assert.equal(accepted.status, 200);
    assert.equal((await accepted.json()).ok, true);
    assert.equal((await waitFor(/C_OWNS:([^\s]+)/))[1], 'RUST_BUSY', 'C lease also refuses Rust before source allocation');
    assert.deepEqual(await fs.readdir(parent), []);
  } else t.diagnostic('GCC unavailable: post-release C execution not checked');
});
