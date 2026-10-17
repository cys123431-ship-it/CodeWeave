// Trusted test tools only. Not imported by dev-server or any production runner.
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import { performance } from 'node:perf_hooks';
import { readProcessDetails } from './process-details.mjs';

async function processSnapshot(root) {
  if (process.platform !== 'linux') return { available: false, reason: 'Linux /proc only', rows: [] };
  try {
    const self = await fs.readFile('/proc/self/stat', 'utf8');
    if (Number(self.split(' ')[0]) !== process.pid) {
      return { available: false, reason: 'PID namespace mismatch', rows: [] };
    }
    const names = (await fs.readdir('/proc')).filter(name => /^\d+$/.test(name));
    const processes = (await Promise.all(names.map(async pid => {
      try {
        const stat = await fs.readFile(`/proc/${pid}/stat`, 'utf8');
        const match = /^(\d+) \((.*)\) ([A-Za-z]) (\d+) (\d+)/.exec(stat);
        return match && { pid: Number(match[1]), command: match[2].slice(0, 64), state: match[3], ppid: Number(match[4]), pgid: Number(match[5]) };
      } catch { return null; }
    }))).filter(Boolean);
    const owned = new Set([root]);
    for (let i = 0; i < processes.length; i++) {
      let changed = false;
      for (const p of processes) {
        if (!owned.has(p.pid) && (owned.has(p.ppid) || p.pgid === root)) {
          owned.add(p.pid);
          changed = true;
        }
      }
      if (!changed) break;
    }
    const rows = processes.filter(p => owned.has(p.pid)).slice(0, 32);
    for (const p of rows.slice(0, 6)) p.details = await readProcessDetails(p.pid);
    return { available: true, rows };
  } catch (error) {
    return { available: false, reason: error.code || 'snapshot failure', rows: [] };
  }
}

export function observeProcess(command, args, {
  cwd, env, timeout = 2000, maxBuffer = 80000, stage = 'trusted-tool', abortSignal
} = {}) {
  if (typeof command !== 'string' || !Array.isArray(args) || args.some(a => typeof a !== 'string')
      || !Number.isInteger(timeout) || timeout < 1 || timeout > 60000
      || !Number.isInteger(maxBuffer) || maxBuffer < 1 || maxBuffer > 80000) {
    throw new TypeError('Invalid trusted process observation options');
  }
  if (abortSignal !== undefined && !(abortSignal instanceof AbortSignal)) {
    throw new TypeError('Invalid trusted process cancellation signal');
  }
  const abortError = () => Object.assign(new Error('Trusted tool cancelled'), { name: 'AbortError', code: 'ABORT_ERR' });
  if (abortSignal?.aborted) {
    return Promise.resolve({ status: null, signal: null, error: abortError(), stdout: '', stderr: '',
      observation: { stage, durationMs: 0, pid: null,
        processes: { available: false, reason: 'cancelled before spawn', rows: [] }, snapshots: [] } });
  }
  const start = performance.now();
  const posix = process.platform !== 'win32';
  return new Promise(resolve => {
    const child = spawn(command, args, { cwd, env, detached: posix, stdio: ['ignore', 'pipe', 'pipe'] });
    const stdout = [], stderr = [];
    let bytes = 0, status = null, signal = null, failure, finished = false;
    let timer, cleanupTimer;
    const snapshotTimers = [], snapshots = [];
    let processes = { available: false, reason: 'deadline not approached', rows: [] };
    function finish() {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      snapshotTimers.forEach(clearTimeout);
      clearTimeout(cleanupTimer);
      abortSignal?.removeEventListener('abort', cancel);
      resolve({ status, signal, error: failure,
        stdout: Buffer.concat(stdout).toString('utf8'), stderr: Buffer.concat(stderr).toString('utf8'),
        observation: { stage, durationMs: Math.round(performance.now() - start), pid: child.pid ?? null, processes, snapshots }
      });
    }
    function stop() {
      if (child.pid) {
        try {
          if (posix) process.kill(-child.pid, 'SIGKILL');
          else child.kill('SIGKILL');
        } catch (error) { if (error.code !== 'ESRCH') failure ??= error; }
      }
      cleanupTimer ??= setTimeout(() => {
        failure ??= Object.assign(new Error('Trusted tool pipe cleanup timed out'), { code: 'ECLEANUP' });
        child.stdout.destroy();
        child.stderr.destroy();
        finish();
      }, 500);
    }
    function collect(chunk, chunks) {
      const remaining = Math.max(0, maxBuffer - bytes);
      if (remaining) chunks.push(chunk.subarray(0, remaining));
      bytes += chunk.length;
      if (bytes > maxBuffer && !failure) {
        failure = Object.assign(new Error('Trusted tool output limit exceeded'), { code: 'ENOBUFS' });
        stop();
      }
    }
    function cancel() {
      if (finished) return;
      failure ??= abortError();
      stop();
    }
    child.stdout.on('data', chunk => collect(chunk, stdout));
    child.stderr.on('data', chunk => collect(chunk, stderr));
    child.once('error', error => { failure ??= error; stop(); });
    child.once('exit', (code, reason) => { status = code; signal = reason; stop(); });
    child.once('close', finish);
    for (const fraction of [0.5, 0.85]) {
      snapshotTimers.push(setTimeout(async () => {
        const atMs = Math.round(performance.now() - start);
        const snapshot = await processSnapshot(child.pid);
        if (!finished) {
          processes = snapshot;
          snapshots.push({ atMs, processes: snapshot });
        }
      }, Math.max(1, Math.floor(timeout * fraction))));
    }
    timer = setTimeout(() => {
      failure ??= Object.assign(new Error('Trusted tool deadline exceeded'), { code: 'ETIMEDOUT' });
      stop();
    }, timeout);
    abortSignal?.addEventListener('abort', cancel, { once: true });
    if (abortSignal?.aborted) cancel();
  });
}
