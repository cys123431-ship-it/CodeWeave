// Explicit trusted personal-code adapter only. No HTTP route, environment activation or sandbox.
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { resolveRustToolPaths, checkRustToolHost } from './rust-tools.mjs';
import { checkRustToolchain } from './rust-preparation.mjs';
import { rustBudget, rustBuildBudget } from './rust-budget.mjs';
import { gradeRustInternal } from './rust-pipeline.mjs';
import { createRustGradingService } from './rust-service.mjs';

async function assertNoCargoConfig(parent) {
  for (let dir = parent; ; dir = path.dirname(dir)) {
    for (const name of ['config', 'config.toml']) {
      let exists = false;
      try {
        await fs.lstat(path.join(dir, '.cargo', name));
        exists = true;
      } catch (error) {
        if (error.code !== 'ENOENT') throw error;
      }
      if (exists) throw new Error('Local Rust requires a parent without ancestor Cargo configuration');
    }
    if (path.dirname(dir) === dir) return;
  }
}

function run(invocation, cwd, signal) {
  const cancelled = () => Object.assign(new Error('Rust execution cancelled'), { name: 'AbortError', code: 'ABORT_ERR' });
  if (signal?.aborted) return Promise.resolve({ status: null, signal: null, error: cancelled(), stdout: '', stderr: '' });
  return new Promise(resolve => {
    const child = spawn(invocation.command, invocation.args, {
      cwd, env: invocation.env, detached: true, stdio: ['ignore', 'pipe', 'pipe']
    });
    const stdout = [], stderr = [];
    let bytes = 0, status = null, termination = null, error, finished = false;
    let timer, cleanupTimer;
    function finish() {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      clearTimeout(cleanupTimer);
      signal?.removeEventListener('abort', cancel);
      resolve({ status, signal: termination, error,
        stdout: Buffer.concat(stdout).toString('utf8'), stderr: Buffer.concat(stderr).toString('utf8') });
    }
    function cleanupFailure(cause) {
      error = Object.assign(new Error('Rust process cleanup failed'), { code: 'ECLEANUP', cause: cause ?? error });
    }
    function stop() {
      if (child.pid) {
        try { process.kill(-child.pid, 'SIGKILL'); }
        catch (failure) { if (failure.code !== 'ESRCH') cleanupFailure(failure); }
      }
      cleanupTimer ??= setTimeout(() => {
        // An abort or limit must not hide incomplete process/pipe cleanup.
        cleanupFailure();
        child.stdout.destroy();
        child.stderr.destroy();
        finish();
      }, 500);
    }
    function collect(chunk, output) {
      const remaining = Math.max(0, 80000 - bytes);
      if (remaining) output.push(chunk.subarray(0, remaining));
      bytes += chunk.length;
      if (bytes > 80000 && !error) {
        error = Object.assign(new Error('Rust output limit exceeded'), { code: 'ENOBUFS' });
        stop();
      }
    }
    function cancel() {
      if (finished) return;
      error ??= cancelled();
      stop();
    }
    child.stdout.on('data', chunk => collect(chunk, stdout));
    child.stderr.on('data', chunk => collect(chunk, stderr));
    child.once('error', failure => { error ??= failure; stop(); });
    child.once('exit', (code, reason) => {
      status = code;
      termination = reason;
      // Descendants must not outlive even a normally exiting tool/test parent.
      stop();
    });
    child.once('close', finish);
    timer = setTimeout(() => {
      error ??= Object.assign(new Error('Rust execution deadline exceeded'), { code: 'ETIMEDOUT' });
      stop();
    }, invocation.timeout ?? 2000);
    signal?.addEventListener('abort', cancel, { once: true });
    if (signal?.aborted) cancel();
  });
}

export async function createLocalRustGradingService({ enabled = false, definitions, sysroot, parent } = {}) {
  if (typeof enabled !== 'boolean') throw new TypeError('Rust activation must be boolean');
  if (!enabled) return createRustGradingService();
  if (!(definitions instanceof Map)) throw new TypeError('Local Rust execution requires a trusted registry');
  if (!['linux', 'darwin'].includes(process.platform)) throw new Error('Local Rust execution requires Linux or macOS');
  const root = await fs.realpath(parent ?? os.tmpdir());
  if (!(await fs.stat(root)).isDirectory()) throw new TypeError('Rust workspace parent must be a directory');
  await assertNoCargoConfig(root);
  // The operator supplies the sysroot. Neither submitted fields nor a moving PATH rustup proxy selects it.
  const tools = await resolveRustToolPaths(sysroot);
  const baseEnv = {};
  for (const key of ['PATH', 'HOME', 'LANG', 'LC_ALL', 'TMPDIR']) {
    if (typeof process.env[key] === 'string') baseEnv[key] = process.env[key];
  }
  const probe = (binary, args) => spawnSync(binary, args, {
    env: baseEnv, encoding: 'utf8', timeout: 5000, maxBuffer: 4096
  });
  checkRustToolchain(probe(tools.cargo, ['--version']), probe(tools.rustc, ['--version']));
  checkRustToolHost(probe(tools.rustc, ['-vV']), tools.host);
  const observe = async ({ stage, workspace, artifact, test, signal }) => {
    signal?.throwIfAborted();
    const env = { ...baseEnv, ...workspace.plan.environment, RUSTC: tools.rustc,
      CARGO_HOME: path.join(workspace.dir, 'cargo-home'), CARGO_TARGET_DIR: workspace.targetDir,
      RUSTFLAGS: ['-Dwarnings', ...(process.platform === 'linux' && process.arch === 'x64' ? ['-Clinker-features=-lld'] : [])].join(' ') };
    let invocation;
    if (stage === 'compile') {
      invocation = rustBuildBudget(tools.cargo, workspace.plan.compile.args, { env });
    } else {
      const args = stage === 'list' ? workspace.plan.list.args
        : stage === 'list-ignored' ? workspace.plan.listIgnored.args : stage === 'case' ? test.args : null;
      if (!args) throw new Error('Unknown local Rust stage');
      invocation = rustBudget(artifact, args, { env });
    }
    const output = await run(invocation, workspace.dir, signal);
    if (stage === 'compile' && [126, 127].includes(output.status)) {
      throw Object.assign(new Error('Local Cargo launcher unavailable'), { code: 'ERUSTTOOL' });
    }
    if (output.status === 125 || output.error?.code === 'ECLEANUP') {
      throw Object.assign(new Error('Local Rust limits or process cleanup failed'), {
        code: output.error?.code ?? 'ELIMIT', cause: output.error
      });
    }
    return output;
  };
  return createRustGradingService({ enabled: true, definitions, grade: async (request, registry, { signal }) => {
    await assertNoCargoConfig(root);
    return gradeRustInternal(request, registry, { parent: root, signal, observe });
  } });
}
