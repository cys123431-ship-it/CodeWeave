import test from 'node:test';
import assert from 'node:assert/strict';
import { linuxProcessAlive } from './helpers/linux-process-alive.mjs';

test('Linux exit probe rechecks ESRCH after the process disappears between signal and stat', async () => {
  let calls = 0;
  const result = await linuxProcessAlive(123, {
    signal: () => { if (++calls === 2) throw Object.assign(Error('gone'), { code: 'ESRCH' }); },
    readStat: async () => { throw Object.assign(Error('gone'), { code: 'ENOENT' }); }
  });
  assert.equal(result, false);
  assert.equal(calls, 2);
});

test('Linux exit probe does not turn unreadable state of an existing PID into exit evidence', async () => {
  assert.equal(await linuxProcessAlive(123, {
    signal: () => {}, readStat: async () => { throw Object.assign(Error('denied'), { code: 'EACCES' }); }
  }), true);
  await assert.rejects(linuxProcessAlive(123, {
    signal: () => { throw Object.assign(Error('denied'), { code: 'EPERM' }); }
  }), { code: 'EPERM' });
});

test('Linux exit probe distinguishes absent, zombie and running processes', async () => {
  assert.equal(await linuxProcessAlive(123, {
    signal: () => { throw Object.assign(Error('gone'), { code: 'ESRCH' }); },
    readStat: async () => assert.fail('absent PID needs no stat')
  }), false);
  for (const [state, expected] of [['Z', false], ['R', true], ['S', true]]) {
    assert.equal(await linuxProcessAlive(123, {
      signal: () => {}, readStat: async () => `123 (fixture (name)) ${state} 1 123 123`
    }), expected);
  }
});
