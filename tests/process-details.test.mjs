import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const api = () => import('./helpers/process-details.mjs');
async function fixture(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'codeweave-proc-fixture-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  await fs.mkdir(path.join(root, '42/task/43'), { recursive: true });
  await fs.writeFile(path.join(root, '42/status'), 'Name:\trustc\nThreads:\t99\nVmRSS:\t1234 kB\nVmSize:\t9000 kB\nSecret:\tnever-collect\n');
  await fs.writeFile(path.join(root, '42/io'), 'rchar: 111\nread_bytes: 222\nwrite_bytes: 333\nsecret: 999\n');
  await fs.writeFile(path.join(root, '42/task/43/comm'), 'coordinator\n');
  await fs.writeFile(path.join(root, '42/task/43/wchan'), 'futex_wait_queue\n');
  // Fields after comm: state, ppid, pgrp, session, tty, tpgid, flags,
  // minflt, cminflt, majflt, cmajflt, utime, stime.
  await fs.writeFile(path.join(root, '42/task/43/stat'), '43 (coordinator) S 1 42 1 0 0 0 0 0 0 0 7 8 0\n');
  await fs.writeFile(path.join(root, '42/environ'), 'SECRET=never-collect');
  await fs.writeFile(path.join(root, '42/cmdline'), 'private-command-arguments');
  return root;
}

test('process details preserve only bounded wait, CPU, memory and IO fields', async t => {
  const { readProcessDetails } = await api();
  const root = await fixture(t);
  for (let i = 44; i < 70; i++) await fs.mkdir(path.join(root, '42/task', String(i)));
  const details = await readProcessDetails(42, root);
  assert.equal(details.memory.VmRSS, '1234 kB');
  assert.equal(details.threadCount, 99);
  assert.deepEqual(details.io, { rchar: '111', read_bytes: '222', write_bytes: '333' });
  assert.equal(details.threads.length, 16);
  assert.deepEqual(details.threads[0], { tid: 43, name: 'coordinator', state: 'S', userTicks: '7', systemTicks: '8', wchan: 'futex_wait_queue' });
  assert.doesNotMatch(JSON.stringify(details), /never-collect|private-command|secret/i);
});

test('process details report missing counters rather than inventing zero or bypassing access errors', async t => {
  const { readProcessDetails } = await api();
  const root = await fixture(t);
  await fs.unlink(path.join(root, '42/io'));
  const details = await readProcessDetails(42, root);
  assert.deepEqual(details.io, { unavailable: 'ENOENT' });
  await assert.rejects(readProcessDetails('../42', root), /PID/);
});
