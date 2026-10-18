import test from 'node:test';
import assert from 'node:assert/strict';
import childProcess from 'node:child_process';
import { syncBuiltinESMExports } from 'node:module';
import { once } from 'node:events';
import fs from 'node:fs';

const api = () => import('../server/process-group-state.mjs');
const posix = ['linux', 'darwin'].includes(process.platform);

test('group snapshot distinguishes live descendants from zombie-only or absent groups', async () => {
  const { parseGroupSnapshot } = await api();
  assert.equal(parseGroupSnapshot(' 20 S\n 30 Z+\n 30 X\n', 30), false);
  assert.equal(parseGroupSnapshot(' 20 S\n 30 Z\n 30 S+\n', 30), true);
  assert.equal(parseGroupSnapshot(' 20 S\n', 30), false);
  assert.equal(parseGroupSnapshot(' 30 T\n', 30), true);
  assert.equal(parseGroupSnapshot(' 30 D\n', 30), true);
});

test('group snapshot rejects missing, malformed and oversized evidence instead of proving cleanup', async () => {
  const { parseGroupSnapshot } = await api();
  for (const output of ['', '\n', 'permission denied', '30', '30 S extra', '30 S\ninvalid',
    '30 Z\n' + ' '.repeat(2 * 1024 * 1024)]) {
    assert.throws(() => parseGroupSnapshot(output, 30));
  }
  for (const pid of [0, 1, -30, 1.5, '30', NaN]) {
    assert.throws(() => parseGroupSnapshot('30 Z\n', pid), TypeError);
  }
});

test('group observation uses a fixed bounded ps command and fails closed on probe errors', { skip: !posix }, async t => {
  const { groupHasLiveMembers } = await api();
  t.mock.method(process, 'kill', (pid, signal) => {
    assert.equal(pid, -30);
    assert.equal(signal, 0);
    return true;
  });
  const selfMock = t.mock.method(fs, 'readFileSync', () => `${process.pid} (node) S`);
  const mock = t.mock.method(childProcess, 'spawnSync', (command, args, options) => {
    assert.equal(command, '/bin/ps');
    assert.deepEqual(args, ['-axo', 'pgid=,stat=']);
    assert.equal(options.timeout, 200);
    assert.equal(options.maxBuffer, 2 * 1024 * 1024);
    assert.deepEqual(options.env, { PATH: '/usr/bin:/bin', LANG: 'C', LC_ALL: 'C' });
    return { status: 1, stdout: '30 Z\n', stderr: '/private/diagnostic' };
  });
  syncBuiltinESMExports();
  try { assert.equal(groupHasLiveMembers(30), true, 'unavailable evidence must remain pending'); }
  finally { mock.mock.restore(); selfMock.mock.restore(); syncBuiltinESMExports(); }
});

test('Linux observation does not trust a ps snapshot from a different PID namespace', { skip: process.platform !== 'linux' }, async t => {
  const { groupHasLiveMembers } = await api();
  t.mock.method(process, 'kill', () => true);
  const fileMock = t.mock.method(fs, 'readFileSync', () => `${process.pid + 10000} (node) S`);
  const psMock = t.mock.method(childProcess, 'spawnSync', () => { throw Error('foreign process table must not be trusted'); });
  syncBuiltinESMExports();
  try { assert.equal(groupHasLiveMembers(30), true); }
  finally { fileMock.mock.restore(); psMock.mock.restore(); syncBuiltinESMExports(); }
});

test('real POSIX group observation distinguishes a running owned group from its terminated group', { skip: !posix }, async () => {
  const { groupHasLiveMembers } = await api();
  const child = childProcess.spawn('/bin/bash', ['--noprofile', '--norc', '-c', 'exec sleep 30'], {
    detached: true, stdio: 'ignore'
  });
  const closed = once(child, 'close');
  try {
    await once(child, 'spawn');
    assert.equal(groupHasLiveMembers(child.pid), true);
  } finally {
    process.kill(-child.pid, 'SIGKILL');
    await closed;
  }
  assert.equal(groupHasLiveMembers(child.pid), false);
});

test('group observation accepts ESRCH but never treats permission failures as termination', async t => {
  const { groupHasLiveMembers } = await api();
  const ps = t.mock.method(childProcess, 'spawnSync', () => ({ status: 1, stdout: '', stderr: 'unavailable' }));
  syncBuiltinESMExports();
  let code = 'ESRCH';
  t.mock.method(process, 'kill', () => { throw Object.assign(Error('fixture'), { code }); });
  try {
    assert.equal(groupHasLiveMembers(30), false);
    code = 'EPERM';
    assert.throws(() => groupHasLiveMembers(30), { code: 'EPERM' });
  } finally { ps.mock.restore(); syncBuiltinESMExports(); }
});

test('a denied signal-zero query requires positive terminal snapshot evidence, not an assumed exit', { skip: !posix }, async t => {
  const { groupHasLiveMembers } = await api();
  t.mock.method(process, 'kill', () => { throw Object.assign(Error('fixture'), { code: 'EPERM' }); });
  const self = t.mock.method(fs, 'readFileSync', () => `${process.pid} (node) S`);
  let stdout = '20 S\n30 Z+\n';
  const ps = t.mock.method(childProcess, 'spawnSync', () => ({ status: 0, stdout, stderr: '' }));
  syncBuiltinESMExports();
  try {
    assert.equal(groupHasLiveMembers(30), false);
    stdout = '20 S\n30 S\n';
    assert.throws(() => groupHasLiveMembers(30), { code: 'EPERM' });
    stdout = '';
    assert.throws(() => groupHasLiveMembers(30), { code: 'EPERM' });
  } finally { self.mock.restore(); ps.mock.restore(); syncBuiltinESMExports(); }
});
