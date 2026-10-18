// Resource budgets for explicit trusted local Rust use; not a sandbox or HTTP activation.
import path from 'node:path';

export function rustBudget(binary, args, { platform = process.platform, env = process.env } = {}) {
  if (!['linux', 'darwin'].includes(platform)) throw new Error('Rust execution budgets: unsupported platform');
  if (typeof binary !== 'string' || !path.posix.isAbsolute(binary) || binary.includes('\0')
      || !Array.isArray(args) || args.length > 256
      || args.some(arg => typeof arg !== 'string' || arg.includes('\0') || arg.length > 4096)) {
    throw new TypeError('Invalid trusted Rust executable or arguments');
  }
  const environment = {};
  for (const name of ['PATH', 'LANG', 'LC_ALL', 'TMPDIR']) {
    if (typeof env[name] === 'string') environment[name] = env[name];
  }
  const script = [
    'vm_cap=262144',
    ...(platform === 'darwin' ? [
      'vm_base=$(/bin/ps -o vsz= -p $$) || exit 125',
      'vm_base="${vm_base//[[:space:]]/}"',
      '[[ "$vm_base" =~ ^[0-9]+$ ]] || exit 125',
      'vm_cap=$((vm_base + vm_cap))'
    ] : []),
    'export CODEWEAVE_RUST_AS_LIMIT_KIB="$vm_cap"',
    'set_limit() {',
    '  local current level target="$2";',
    '  for level in -S -H; do',
    '    current=$(ulimit "$level" "$1") || return 1;',
    '    if [[ "$current" != unlimited && "$current" -lt "$target" ]]; then target="$current"; fi;',
    '  done;',
    '  ulimit "$1" "$target";',
    '}',
    'set_limit -t 2 &&',
    'set_limit -v "$vm_cap" &&',
    'set_limit -f 2048 &&',
    'set_limit -c 0 &&',
    'set_limit -u ' + (platform === 'darwin' ? 512 : 128) + ' || exit 125',
    'exec "$@"'
  ].join('\n');
  return {
    command: '/bin/bash',
    args: ['--noprofile', '--norc', '-c', script, 'codeweave-rust-probe', binary, ...args],
    env: environment
  };
}

export function rustBuildBudget(binary, args, {
  platform = process.platform, env = process.env, cpuSoftSeconds = 10
} = {}) {
  if (!['linux', 'darwin'].includes(platform)) throw new Error('Rust build budgets: unsupported platform');
  if (!Number.isInteger(cpuSoftSeconds) || cpuSoftSeconds < 1 || cpuSoftSeconds > 10) {
    throw new TypeError('Invalid trusted Rust CPU soft ceiling');
  }
  if (typeof binary !== 'string' || !path.posix.isAbsolute(binary) || binary.includes('\0')
      || !Array.isArray(args) || args.length > 256
      || args.some(arg => typeof arg !== 'string' || arg.includes('\0') || arg.length > 4096)) {
    throw new TypeError('Invalid trusted Rust build executable or arguments');
  }
  const environment = {};
  for (const name of ['PATH', 'HOME', 'LANG', 'LC_ALL', 'TMPDIR', 'RUSTUP_HOME',
    'CARGO_HOME', 'CARGO_TARGET_DIR', 'RUSTFLAGS', 'CARGO_NET_OFFLINE',
    'CARGO_INCREMENTAL', 'CARGO_TERM_COLOR', 'RUST_BACKTRACE', 'RUSTC']) {
    if (typeof env[name] === 'string') environment[name] = env[name];
  }
  const script = [
    'vm_cap=1048576',
    ...(platform === 'darwin' ? [
      'vm_base=$(/bin/ps -o vsz= -p $$) || exit 125',
      'vm_base="${vm_base//[[:space:]]/}"',
      '[[ "$vm_base" =~ ^[0-9]+$ ]] || exit 125',
      'vm_cap=$((vm_base + vm_cap))'
    ] : []),
    'export CODEWEAVE_RUST_BUILD_AS_LIMIT_KIB="$vm_cap"',
    'set_limit() {',
    '  local current level target="$2";',
    '  for level in -S -H; do',
    '    current=$(ulimit "$level" "$1") || return 1;',
    '    if [[ "$current" != unlimited && "$current" -lt "$target" ]]; then target="$current"; fi;',
    '  done;',
    '  ulimit "$1" "$target";',
    '}',
    'set_limit -t 10 &&',
    'set_limit -v "$vm_cap" &&',
    'set_limit -f 32768 &&',
    'set_limit -c 0 &&',
    'set_limit -u ' + (platform === 'darwin' ? 512 : 128) + ' || exit 125',
    'cpu_soft=$(ulimit -S -t) || exit 125',
    `if [[ "$cpu_soft" == unlimited || "$cpu_soft" -gt ${cpuSoftSeconds} ]]; then`,
    `  ulimit -S -t ${cpuSoftSeconds} || exit 125`,
    'fi',
    'exec "$@"'
  ].join('\n');
  return {
    command: '/bin/bash',
    args: ['--noprofile', '--norc', '-c', script, 'codeweave-rust-build', binary, ...args],
    env: environment, timeout: 15000, maxBuffer: 80000
  };
}
