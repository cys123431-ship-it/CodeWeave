import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { formatRustProcessFailure } from '../server/rust-results.mjs';

const api = () => import('./helpers/observe-process.mjs');
const run = async (source, options) => (await api()).observeProcess(process.execPath, ['-e', source], options);

test('trusted process observation preserves stage timing and both streams', async () => {
  const result = await run('process.stdout.write("out");process.stderr.write("err")', { stage: 'synthetic', timeout: 2000 });
  assert.equal(result.status, 0);
  assert.equal(result.stdout, 'out');
  assert.equal(result.stderr, 'err');
  assert.equal(result.observation.stage, 'synthetic');
  assert.ok(result.observation.durationMs >= 0);
});

test('trusted process observation preserves nonzero exit and missing-tool errors', async () => {
  const { observeProcess } = await api();
  const result = await run('process.exit(7)', { timeout: 2000 });
  assert.equal(result.status, 7);
  const missing = await observeProcess('/codeweave-nonexistent-fixture-tool', [], { timeout: 2000 });
  assert.equal(missing.error.code, 'ENOENT');
});

async function alive(pid) {
  try { process.kill(pid, 0); } catch { return false; }
  if (process.platform === 'linux') {
    try {
      const self = await fs.readFile('/proc/self/stat', 'utf8');
      if (Number(self.split(' ')[0]) !== process.pid) return true;
      return (await fs.readFile(`/proc/${pid}/stat`, 'utf8')).split(') ')[1][0] !== 'Z';
    }
    catch { return false; }
  }
  try { process.kill(pid, 0); return true; } catch { return false; }
}

async function waitForExit(pid) {
  const deadline = Date.now() + 500;
  while (await alive(pid)) {
    if (Date.now() >= deadline) return false;
    await new Promise(resolve => setTimeout(resolve, 5));
  }
  return true;
}

test('trusted process timeout snapshots and kills the whole descendant group', { skip: process.platform === 'win32', timeout: 5000 }, async t => {
  const result = await run('const {spawn}=require("node:child_process"); const c=spawn(process.execPath,["-e","setInterval(()=>{},1000)"],{stdio:"inherit"}); console.log(c.pid); setInterval(()=>{},1000);', { stage: 'forced-timeout', timeout: 900 });
  const pid = Number(result.stdout.trim());
  assert.ok(Number.isInteger(pid) && pid > 1);
  t.after(() => { try { process.kill(pid, 'SIGKILL'); } catch {} });
  assert.equal(result.error.code, 'ETIMEDOUT');
  assert.equal(result.observation.snapshots.length, 2);
  assert.ok(result.observation.snapshots[0].atMs < result.observation.snapshots[1].atMs);
  assert.equal(await waitForExit(pid), true);
  if (process.platform === 'linux') {
    const namespaceMatches = Number((await fs.readFile('/proc/self/stat', 'utf8')).split(' ')[0]) === process.pid;
    assert.equal(result.observation.processes.available, namespaceMatches);
    if (namespaceMatches) {
      const child = result.observation.processes.rows.find(row => row.pid === pid);
      assert.ok(child);
      assert.ok(child.details.threads.length > 0);
      assert.match(child.details.threads[0].userTicks, /^\d+$/);
      assert.equal(typeof child.details.threads[0].wchan, 'string');
    }
    else assert.equal(result.observation.processes.reason, 'PID namespace mismatch');
    assert.ok(result.observation.processes.rows.every(row => !('args' in row) && !('env' in row)));
  }
});

test('trusted normal parent exit also cleans descendants holding output pipes', { skip: process.platform === 'win32', timeout: 5000 }, async t => {
  const result = await run('const {spawn}=require("node:child_process"); const c=spawn(process.execPath,["-e","setInterval(()=>{},1000)"],{stdio:"inherit"}); console.log(c.pid); setTimeout(()=>process.exit(0),100);', { timeout: 2000 });
  const pid = Number(result.stdout.trim());
  assert.ok(Number.isInteger(pid) && pid > 1);
  t.after(() => { try { process.kill(pid, 'SIGKILL'); } catch {} });
  assert.equal(result.status, 0);
  assert.equal(result.error, undefined);
  assert.equal(await waitForExit(pid), true);
});

test('trusted process output remains bounded and overflow terminates the group', async () => {
  const result = await run('process.stdout.write("x".repeat(5000));setInterval(()=>{},1000)', { timeout: 2000, maxBuffer: 256 });
  assert.equal(result.error.code, 'ENOBUFS');
  assert.ok(Buffer.byteLength(result.stdout) <= 256);
});

test('Cargo failure diagnostic retains observation metadata without command arguments or environment', () => {
  const observation = { stage: 'compile-ignored', durationMs: 15001, processes: { available: true, rows: [{ pid: 2, ppid: 1, pgid: 1, state: 'S', command: 'rustc' }] } };
  const diagnostic = JSON.parse(formatRustProcessFailure({ status: null, error: { code: 'ETIMEDOUT' }, observation }));
  assert.deepEqual(diagnostic.observation, observation);
});
