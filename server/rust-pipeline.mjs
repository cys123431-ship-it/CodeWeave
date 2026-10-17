// Internal lifecycle only. No default host executor and no HTTP registration.
import fs from 'node:fs/promises';
import { createRustPlan } from './rust-contract.mjs';
import { prepareRustWorkspace, selectRustArtifact, validateRustListing } from './rust-preparation.mjs';
import { runRustCases, buildRustResult } from './rust-results.mjs';

export async function gradeRustInternal(request, definitions, { observe, parent, signal } = {}) {
  if (typeof observe !== 'function') throw new TypeError('Rust 단계 관찰 함수가 필요합니다.');
  if (signal !== undefined && !(signal instanceof AbortSignal)) throw new TypeError('Invalid Rust cancellation signal');
  createRustPlan(request, definitions);
  signal?.throwIfAborted();
  const workspace = Object.freeze(await prepareRustWorkspace(request, definitions, parent));
  // Capture our exact created directory; never accept a cleanup target from the observer.
  const createdDir = workspace.dir;
  let primary;
  async function call(stage, extra = {}) {
    signal?.throwIfAborted();
    const output = await observe(Object.freeze({ stage, workspace, signal, ...extra }));
    signal?.throwIfAborted();
    if (!output || !(output.status === null || Number.isInteger(output.status))
        || typeof output.stdout !== 'string' || typeof output.stderr !== 'string'
        || Buffer.byteLength(output.stdout + output.stderr, 'utf8') > 80000) {
      throw new Error('Rust 단계 관찰 결과가 계약과 다릅니다.');
    }
    return output;
  }
  try {
    const compiled = await call('compile');
    if (compiled.status !== 0 || compiled.signal || compiled.error) {
      return buildRustResult(workspace.plan, compiled);
    }
    const artifact = await selectRustArtifact(compiled.stdout, workspace);
    const all = await call('list', { artifact });
    // Reject a failed/mismatched first listing before launching another process.
    // The real ignored listing remains mandatory before any case can execute.
    validateRustListing(all, { status: 0, stdout: '' }, workspace.plan.runCases);
    const ignored = await call('list-ignored', { artifact });
    validateRustListing(all, ignored, workspace.plan.runCases);
    const tests = await runRustCases(workspace.plan, test => call('case', { artifact, test }));
    return buildRustResult(workspace.plan, compiled, tests);
  } catch (error) {
    primary = error;
    throw error;
  } finally {
    try {
      await fs.rm(createdDir, { recursive: true, force: true });
    } catch (cleanup) {
      if (primary) throw new AggregateError([primary, cleanup], 'Rust 단계 실패 후 작업 공간 정리도 실패했습니다.');
      throw cleanup;
    }
  }
}
