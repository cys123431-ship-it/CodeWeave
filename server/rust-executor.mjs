// Explicit trusted personal-code adapter only. No HTTP route, environment activation or sandbox.
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { resolveRustToolPaths, checkRustToolHost } from './rust-tools.mjs';
import { checkRustToolchain } from './rust-preparation.mjs';
import { rustBudget, rustBuildBudget, RUST_READY_MARKER } from './rust-budget.mjs';
import { gradeRustInternal } from './rust-pipeline.mjs';
import { createRustGradingService } from './rust-service.mjs';
import { groupHasLiveMembers } from './process-group-state.mjs';

function hasProcessCleanupFailure(error) {
  const pending = [error], seen = new Set();
  for (let count = 0; pending.length && count < 32; count++) {
    const current = pending.pop();
    if (!current || typeof current !== 'object' || seen.has(current)) continue;
    seen.add(current);
    if (current.code === 'ECLEANUP') return true;
    if (Array.isArray(current.errors)) {
      if (current.errors.length > 16) return true;
      pending.push(...current.errors);
    }
    if (current.cause) pending.push(current.cause);
  }
  // Unknown/deeper error chains cannot authorize a workspace-only recovery.
  return pending.length > 0;
}

function unavailable() {
  return Object.assign(new Error('Rust 채점 도구를 사용할 수 없습니다.'), { code: 'RUST_UNAVAILABLE', statusCode: 503 });
}

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
      cwd, env: invocation.env, detached: true,
      stdio: ['ignore', 'pipe', 'pipe', ...(invocation.readyFd === 3 ? ['pipe'] : [])]
    });
    const stdout = [], stderr = [];
    let readiness = '', readinessBytes = 0;
    let bytes = 0, status = null, termination = null, error, finished = false, stopping = false;
    let timer, cleanupTimer, settlementTimer;
    let killAcknowledged = false, observationFailure;
    function finish() {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      clearTimeout(cleanupTimer);
      clearTimeout(settlementTimer);
      signal?.removeEventListener('abort', cancel);
      resolve({ status, signal: termination, error, launcherReady: readiness === RUST_READY_MARKER,
        stdout: Buffer.concat(stdout).toString('utf8'), stderr: Buffer.concat(stderr).toString('utf8') });
    }
    function cleanupFailure(cause) {
      error = Object.assign(new Error('Rust process cleanup failed'), { code: 'ECLEANUP', cause: cause ?? error });
    }
    function stop() {
      // Abort/limit and the later exit event share one termination attempt.
      // Never signal a departed/reused group again after the first attempt.
      if (stopping) return;
      stopping = true;
      if (child.pid) {
        try {
          process.kill(-child.pid, 'SIGKILL');
          killAcknowledged = true;
        }
        catch (failure) { if (failure.code !== 'ESRCH') cleanupFailure(failure); }
      }
      cleanupTimer ??= setTimeout(() => {
        // An abort or limit must not hide incomplete process/pipe cleanup.
        cleanupFailure(observationFailure);
        child.stdout.destroy();
        child.stderr.destroy();
        child.stdio[3]?.destroy();
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
    function settleGroup() {
      if (finished) return;
      if (!child.pid || error?.code === 'ECLEANUP') return finish();
      try {
        if (!groupHasLiveMembers(child.pid)) return finish();
      } catch (failure) {
        // Only an acknowledged owned-group kill permits bounded read-only observation.
        // EPERM proves neither life nor exit: retain the lease and original deadline,
        // and require later ESRCH or an independently terminal process snapshot.
        if (failure.code === 'EPERM' && killAcknowledged) {
          observationFailure ??= failure;
        } else {
          cleanupFailure(failure);
          return finish();
        }
      }
      // SIGKILL delivery and pipe EOF are not proof that every descendant has exited.
      // Keep the existing 500ms cleanup deadline and shared lease; never signal again.
      settlementTimer = setTimeout(settleGroup, 10);
    }
    child.stdout.on('data', chunk => collect(chunk, stdout));
    child.stderr.on('data', chunk => collect(chunk, stderr));
    child.stdio[3]?.on('data', chunk => {
      readinessBytes += chunk.length;
      // Readiness is a bounded, separate channel, never compiler diagnostics.
      if (readinessBytes <= RUST_READY_MARKER.length) readiness += chunk.toString('ascii');
      else {
        error ??= Object.assign(new Error('Invalid Rust launcher readiness'), { code: 'ERUSTTOOL' });
        stop();
      }
    });
    child.once('error', failure => { error ??= failure; stop(); });
    child.once('exit', (code, reason) => {
      status = code;
      termination = reason;
      // Descendants must not outlive even a normally exiting tool/test parent.
      stop();
    });
    child.once('close', () => {
      clearTimeout(timer);
      settleGroup();
    });
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
  if (!enabled) {
    const service = createRustGradingService();
    return Object.freeze({
      submit: (...args) => service.submit(...args),
      inspect: () => Object.freeze({ state: 'disabled', reason: null, workspaceDir: null }),
      async recover(...args) {
        if (args.length) throw new TypeError('Recovery does not accept a path or override');
        return false;
      }
    });
  }
  if (!(definitions instanceof Map)) throw new TypeError('Local Rust execution requires a trusted registry');
  if (!['linux', 'darwin'].includes(process.platform)) throw new Error('Local Rust execution requires Linux or macOS');
  const root = await fs.realpath(parent ?? os.tmpdir());
  const parentIdentity = await fs.stat(root, { bigint: true });
  if (!parentIdentity.isDirectory()) throw new TypeError('Rust workspace parent must be a directory');
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
  let activeWorkspace = null, incident = null, recovering = false;
  const observe = async ({ stage, workspace, artifact, test, signal }) => {
    activeWorkspace = workspace.dir;
    signal?.throwIfAborted();
    const env = { ...baseEnv, ...workspace.plan.environment, RUSTC: tools.rustc,
      CARGO_HOME: path.join(workspace.dir, 'cargo-home'), CARGO_TARGET_DIR: workspace.targetDir,
      RUSTFLAGS: ['-Dwarnings', ...(process.platform === 'linux' && process.arch === 'x64' ? ['-Clinker-features=-lld'] : [])].join(' ') };
    let invocation;
    if (stage === 'compile') {
      invocation = rustBuildBudget(tools.cargo, workspace.plan.compile.args, { env, readyFd: 3 });
    } else {
      const args = stage === 'list' ? workspace.plan.list.args
        : stage === 'list-ignored' ? workspace.plan.listIgnored.args : stage === 'case' ? test.args : null;
      if (!args) throw new Error('Unknown local Rust stage');
      invocation = rustBudget(artifact, args, { env });
    }
    const output = await run(invocation, workspace.dir, signal);
    if (output.error?.code === 'ABORT_ERR') throw output.error;
    if (stage === 'compile' && (!output.launcherReady || [126, 127].includes(output.status))
        && output.error?.code !== 'ECLEANUP') {
      throw Object.assign(new Error('Local Cargo launcher unavailable'), { code: 'ERUSTTOOL' });
    }
    if (output.status === 125 || output.error?.code === 'ECLEANUP') {
      throw Object.assign(new Error('Local Rust limits or process cleanup failed'), {
        code: output.error?.code ?? 'ELIMIT', cause: output.error
      });
    }
    return output;
  };
  const service = createRustGradingService({ enabled: true, definitions,
    onCleanupFailure: ({ error, resume }) => {
      // Establish a conservative incident before inspecting even trusted exception metadata.
      incident = Object.freeze({ reason: 'process-cleanup', workspaceDir: null, resume });
      const candidate = error.code === 'ERUSTCLEANUP' ? error.workspaceDir : activeWorkspace;
      const dir = typeof candidate === 'string' && path.normalize(candidate) === candidate
        && path.dirname(candidate) === root && path.basename(candidate).startsWith('codeweave-rust-')
        ? candidate : null;
      incident = Object.freeze({ reason: dir && !hasProcessCleanupFailure(error)
        ? 'workspace-cleanup' : 'process-cleanup', workspaceDir: dir, resume });
    },
    grade: async (request, registry, { signal }) => {
      activeWorkspace = null;
      await assertNoCargoConfig(root);
      return gradeRustInternal(request, registry, { parent: root, signal, observe });
    }
  });
  return Object.freeze({
    async submit(...args) {
      if (incident) throw unavailable();
      return service.submit(...args);
    },
    inspect() {
      return Object.freeze({ state: incident ? (recovering ? 'recovering' : 'quarantined') : 'ready',
        reason: incident?.reason ?? null, workspaceDir: incident?.workspaceDir ?? null });
    },
    async recover(...args) {
      if (args.length) throw new TypeError('Recovery does not accept a path or override');
      const current = incident;
      if (!current || recovering || current.reason !== 'workspace-cleanup' || !current.workspaceDir) return false;
      recovering = true;
      try {
        try {
          const identity = await fs.lstat(root, { bigint: true });
          if (!identity.isDirectory() || identity.dev !== parentIdentity.dev || identity.ino !== parentIdentity.ino
              || await fs.realpath(root) !== root) return false;
        } catch { return false; }
        try {
          // lstat also sees dangling/replacement links. Never follow or remove a recovery target.
          await fs.lstat(current.workspaceDir);
          return false;
        } catch (error) {
          if (error.code !== 'ENOENT') return false;
        }
        if (incident !== current || !current.resume()) return false;
        incident = null;
        return true;
      } finally { recovering = false; }
    }
  });
}
