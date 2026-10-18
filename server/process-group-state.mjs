// Read-only evidence for trusted local POSIX process cleanup, not a sandbox.
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const MAX_SNAPSHOT_BYTES = 2 * 1024 * 1024;

function validateGroup(group) {
  if (!Number.isSafeInteger(group) || group <= 1) throw new TypeError('Invalid owned process group');
}

export function parseGroupSnapshot(output, group) {
  validateGroup(group);
  if (typeof output !== 'string' || Buffer.byteLength(output) > MAX_SNAPSHOT_BYTES) {
    throw new Error('Process observation unavailable');
  }
  const rows = output.trim().split('\n');
  let live = false;
  for (const row of rows) {
    const fields = /^\s*(\d+)\s+([A-Za-z+<>=?\-]+)\s*$/.exec(row);
    if (!fields || !Number.isSafeInteger(Number(fields[1]))) throw new Error('Invalid process observation');
    // Zombies/exited tasks cannot execute. Stopped, uninterruptible and unknown states still count.
    if (Number(fields[1]) === group && !['Z', 'X'].includes(fields[2][0])) live = true;
  }
  return live;
}

export function groupHasLiveMembers(group) {
  validateGroup(group);
  try {
    process.kill(-group, 0);
  } catch (error) {
    if (error.code === 'ESRCH') return false;
    throw error;
  }
  if (process.platform === 'linux') {
    try {
      const self = readFileSync('/proc/self/stat', 'utf8');
      if (Number(self.slice(0, self.indexOf(' '))) !== process.pid) return true;
    } catch { return true; }
  }
  const result = spawnSync('/bin/ps', ['-axo', 'pgid=,stat='], {
    env: { PATH: '/usr/bin:/bin', LANG: 'C', LC_ALL: 'C' },
    encoding: 'utf8', timeout: 200, maxBuffer: MAX_SNAPSHOT_BYTES
  });
  // A failed snapshot proves nothing. Keep waiting for ESRCH, or let the caller's
  // cleanup deadline quarantine the service; never infer termination from failure.
  if (result.error || result.signal || result.status !== 0) return true;
  try { return parseGroupSnapshot(result.stdout, group); }
  catch { return true; }
}
