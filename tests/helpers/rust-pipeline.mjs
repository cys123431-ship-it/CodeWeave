// Executes only trusted CI fixture code. Not imported by the application server.
import path from 'node:path';
import { trustedRustTools } from './rust-tools.mjs';
import { withRustFixtureLinker } from './rust-fixture-linker.mjs';
import { rustBuildBudget } from './rust-build-budget.mjs';
import { rustBudget } from './rust-budget.mjs';
import { observeProcess } from './observe-process.mjs';

export async function trustedRustObserver() {
  const tools = await trustedRustTools();
  return async ({ stage, workspace, artifact, test, signal }) => {
    signal?.throwIfAborted();
    const env = withRustFixtureLinker({ PATH: process.env.PATH, HOME: process.env.HOME,
      RUSTUP_HOME: process.env.RUSTUP_HOME, ...workspace.plan.environment,
      RUSTC: tools.rustc, CARGO_HOME: path.join(workspace.dir, 'cargo-home'),
      CARGO_TARGET_DIR: workspace.targetDir });
    let invocation, timeout;
    if (stage === 'compile') {
      invocation = rustBuildBudget(tools.cargo, workspace.plan.compile.args, { env });
      timeout = invocation.timeout;
    } else {
      const args = stage === 'list' ? workspace.plan.list.args
        : stage === 'list-ignored' ? workspace.plan.listIgnored.args : stage === 'case' ? test.args : null;
      if (!args) throw new Error('Unknown trusted Rust pipeline stage');
      invocation = rustBudget(artifact, args, { env });
      timeout = 2000;
    }
    const output = await observeProcess(invocation.command, invocation.args, {
      cwd: workspace.dir, env: invocation.env, timeout, maxBuffer: 80000,
      stage: 'pipeline-' + stage, abortSignal: signal
    });
    console.log('Rust pipeline observation:', JSON.stringify(output.observation));
    if (output.status === 125 || output.error?.code === 'ECLEANUP') {
      throw new Error('Trusted Rust limit setup or process cleanup failed');
    }
    return output;
  };
}
