import { spawn } from 'node:child_process';

export const SUBMISSION_LIMITS = Object.freeze({
  cpuSeconds: 2,
  virtualMemoryKiB: 65536,
  fileSizeKiB: 2048,
  userProcesses: 128,
  wallTimeMs: 1300,
  outputBytes: 30000
});

// This is resource budgeting for trusted local C, NOT an execution sandbox.
// Bash receives the executable/arguments as argv, never interpolated shell text.
const limitScript = [
  'set_limit() {',
  '  local current level target="$2";',
  '  for level in -S -H; do',
  '    current=$(ulimit "$level" "$1") || return 1;',
  '    if [[ "$current" != unlimited && "$current" -lt "$target" ]]; then target="$current"; fi;',
  '  done;',
  '  ulimit "$1" "$target";',
  '}',
  'set_limit -t ' + SUBMISSION_LIMITS.cpuSeconds + ' &&',
  'set_limit -v ' + SUBMISSION_LIMITS.virtualMemoryKiB + ' &&',
  'set_limit -f ' + SUBMISSION_LIMITS.fileSizeKiB + ' &&',
  'set_limit -c 0 &&',
  'set_limit -u ' + SUBMISSION_LIMITS.userProcesses + ' || { echo CODEWEAVE_LIMIT_SETUP_FAILED >&2; exit 125; }',
  'exec "$@"'
].join('\n');

export function runSubmission(binary, args, {
  input = '', cwd, timeout = SUBMISSION_LIMITS.wallTimeMs,
  maxBuffer = SUBMISSION_LIMITS.outputBytes
} = {}) {
  const posix = process.platform !== 'win32';
  const env = { ...process.env };
  // Do not load startup files or import shell options before setting budgets.
  for (const key of ['BASH_ENV', 'ENV', 'SHELLOPTS', 'BASHOPTS', 'POSIXLY_CORRECT']) delete env[key];
  const command = posix ? '/bin/bash' : binary;
  const argv = posix ? ['--noprofile', '--norc', '-c', limitScript, 'codeweave-run', binary, ...args] : args;
  return new Promise(resolve => {
    const out = [], err = [];
    let outSize = 0, errSize = 0, failure, status = null, signal = null;
    let timer, cleanupTimer, finished = false;
    const child = spawn(command, argv, { cwd, env, detached: posix, stdio: ['pipe', 'pipe', 'pipe'] });

    function finish() {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      clearTimeout(cleanupTimer);
      const stderr = Buffer.concat(err).toString('utf8');
      if (posix && status === 125 && stderr.includes('CODEWEAVE_LIMIT_SETUP_FAILED')) {
        failure ??= Object.assign(new Error('자원 제한 설정 실패: 제출 프로그램을 실행하지 않았습니다.'), { code: 'ELIMIT' });
      }
      resolve({ status, signal, stdout: Buffer.concat(out).toString('utf8'), stderr, error: failure });
    }
    function stopGroup() {
      if (child.pid) {
        try {
          if (posix) process.kill(-child.pid, 'SIGKILL');
          else child.kill('SIGKILL');
        } catch (error) { if (error.code !== 'ESRCH') failure ??= error; }
      }
      // Escaped process groups are not isolation-safe. Do not hang on their pipes.
      cleanupTimer ??= setTimeout(() => {
        failure ??= Object.assign(new Error('실행 스트림 정리 시간 초과'), { code: 'ECLEANUP' });
        child.stdin.destroy();
        child.stdout.destroy();
        child.stderr.destroy();
        finish();
      }, 500);
    }
    function collect(chunk, chunks, size) {
      const remaining = Math.max(0, maxBuffer - size);
      if (remaining) chunks.push(chunk.subarray(0, remaining));
      if (chunk.length > remaining && !failure) {
        failure = Object.assign(new Error('출력 크기 제한 초과'), { code: 'ENOBUFS' });
        stopGroup();
      }
      return size + chunk.length;
    }
    child.stdout.on('data', chunk => { outSize = collect(chunk, out, outSize); });
    child.stderr.on('data', chunk => { errSize = collect(chunk, err, errSize); });
    child.stdin.on('error', error => {
      // A program may legitimately exit without reading the provided input.
      if (error.code !== 'EPIPE' && error.code !== 'ECONNRESET') {
        failure ??= error;
        stopGroup();
      }
    });
    child.once('error', error => { failure ??= error; stopGroup(); });
    child.once('exit', (code, reason) => {
      status = code;
      signal = reason;
      // Cleanup applies to normal exit too: detached forked children must not survive.
      stopGroup();
    });
    child.once('close', finish);
    timer = setTimeout(() => {
      failure ??= Object.assign(new Error('시간 제한 초과'), { code: 'ETIMEDOUT' });
      stopGroup();
    }, timeout);
    child.stdin.end(input);
  });
}
