// Trusted CI discovery only; never accepts submitted commands or configuration.
import { spawnSync } from 'node:child_process';
import { checkRustToolchain } from '../../server/rust-preparation.mjs';
import { resolveRustToolPaths, checkRustToolHost } from '../../server/rust-tools.mjs';

export async function trustedRustTools() {
  const env = {};
  for (const name of ['PATH', 'HOME', 'RUSTUP_HOME']) {
    if (typeof process.env[name] === 'string') env[name] = process.env[name];
  }
  const probe = (binary, args) => spawnSync(binary, args, {
    env, encoding: 'utf8', timeout: 5000, maxBuffer: 4096
  });
  const discovered = probe('rustc', ['--print', 'sysroot']);
  if (discovered.status !== 0 || discovered.signal || discovered.error
      || typeof discovered.stdout !== 'string' || /[\r\n]/.test(discovered.stdout.trim())) {
    throw new Error('Rust sysroot discovery failed');
  }
  const tools = await resolveRustToolPaths(discovered.stdout.trim());
  const versions = checkRustToolchain(probe(tools.cargo, ['--version']), probe(tools.rustc, ['--version']));
  checkRustToolHost(probe(tools.rustc, ['-vV']), tools.host);
  console.log('Resolved trusted Rust toolchain:', { paths: tools, versions });
  return tools;
}
