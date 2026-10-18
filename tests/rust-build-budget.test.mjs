import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { observeProcess } from './helpers/observe-process.mjs';

const api = () => import('./helpers/rust-build-budget.mjs');
const gcc = spawnSync('gcc', ['--version']).status === 0;
const posix = ['linux', 'darwin'].includes(process.platform);

test('Rust build CPU soft ceiling rejects invalid or increased probe limits', async () => {
  const { rustBuildBudget } = await api();
  for (const cpuSoftSeconds of [0, -1, 11, 1.5, '1', null]) {
    assert.throws(() => rustBuildBudget('/bin/true', [], { cpuSoftSeconds }), /CPU/);
  }
});

test('Rust build CPU probe lowers only the soft ceiling and preserves the hard ceiling', { skip: !posix }, async () => {
  const { rustBuildBudget } = await api();
  const call = rustBuildBudget('/bin/bash', ['--noprofile', '--norc', '-c', 'ulimit -S -t; ulimit -H -t'], { cpuSoftSeconds: 1 });
  const out = await observeProcess(call.command, call.args, call);
  assert.equal(out.status, 0, JSON.stringify(out));
  const [soft, hard] = out.stdout.trim().split('\n').map(Number);
  assert.equal(soft, 1);
  assert.equal(hard, 10);
  assert.equal(call.timeout, 15000);
  const inherited = await observeProcess('/bin/bash', ['--noprofile', '--norc', '-c',
    'ulimit -t 1 || exit 125; exec "$@"', 'lower-cpu', call.command, ...call.args],
  { env: call.env, timeout: call.timeout });
  assert.equal(inherited.status, 0, JSON.stringify(inherited));
  assert.deepEqual(inherited.stdout.trim().split('\n').map(Number), [1, 1]);
});

test('Rust build budget rejects unsupported platforms and malformed tool arguments', async () => {
  const { rustBuildBudget } = await api();
  assert.throws(() => rustBuildBudget('/bin/true', [], { platform: 'win32' }), /unsupported/);
  for (const [binary, args] of [['cargo', []], ['/bin/true', 'bad'], ['/bin/true', [null]], ['/bin/true\0', []]]) {
    assert.throws(() => rustBuildBudget(binary, args));
  }
});

test('Rust build budget preserves only explicit trusted build environment and fixed observation ceilings', async () => {
  const { rustBuildBudget } = await api();
  const invocation = rustBuildBudget('/bin/true', [], { platform: 'linux', env: {
    PATH: '/bin', HOME: '/trusted-home', CARGO_HOME: '/trusted-cargo', CARGO_TARGET_DIR: '/trusted-target',
    RUSTFLAGS: '-Dwarnings', CARGO_NET_OFFLINE: 'true', RUSTUP_HOME: '/trusted-rustup',
    BASH_ENV: '/startup', ENV: '/startup', SHELLOPTS: 'xtrace', BASHOPTS: 'extdebug',
    POSIXLY_CORRECT: '1', RUSTC_WRAPPER: '/wrapper', CARGO_BUILD_RUSTC_WRAPPER: '/wrapper',
    SECRET: 'must not reach build'
  } });
  assert.deepEqual(invocation.env, { PATH: '/bin', HOME: '/trusted-home', CARGO_HOME: '/trusted-cargo',
    CARGO_TARGET_DIR: '/trusted-target', RUSTFLAGS: '-Dwarnings', CARGO_NET_OFFLINE: 'true', RUSTUP_HOME: '/trusted-rustup' });
  assert.equal(invocation.timeout, 15000);
  assert.equal(invocation.maxBuffer, 80000);
});

test('Rust build budget keeps shell metacharacters literal argv values', { skip: !posix }, async t => {
  const { rustBuildBudget } = await api();
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'codeweave-build-argv-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  const marker = path.join(dir, 'must-not-exist');
  const payload = `$(touch ${marker}); " ' spaces`;
  const call = rustBuildBudget('/bin/echo', [payload]);
  const out = await observeProcess(call.command, call.args, { ...call, cwd: dir });
  assert.equal(out.status, 0, JSON.stringify(out));
  assert.equal(out.stdout.trim(), payload);
  await assert.rejects(fs.stat(marker), { code: 'ENOENT' });
});

test('Rust build budget stops before invoking the tool if limit setup fails', { skip: !posix }, async t => {
  const { rustBuildBudget } = await api();
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'codeweave-build-fail-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  const marker = path.join(dir, 'must-not-exist');
  const call = rustBuildBudget('/usr/bin/touch', [marker]);
  const args = [...call.args];
  // Fault injection only in this test copy; the production helper has no override.
  args[3] = 'ulimit() { return 1; }\n' + args[3];
  const out = await observeProcess(call.command, args, { env: call.env, cwd: dir, timeout: call.timeout });
  assert.equal(out.status, 125, JSON.stringify(out));
  await assert.rejects(fs.stat(marker), { code: 'ENOENT' });
});

const probe = `#include <sys/resource.h>
#include <unistd.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
int main(int argc, char **argv) {
    if (argc != 2) return 2;
    if (strcmp(argv[1], "limits") == 0) {
        const int ids[] = {RLIMIT_CPU, RLIMIT_AS, RLIMIT_FSIZE, RLIMIT_NPROC, RLIMIT_CORE};
        const unsigned long long caps[] = {10, strtoull(getenv("CODEWEAVE_RUST_BUILD_AS_LIMIT_KIB"), NULL, 10)*1024,
                                         33554432, 512, 0};
        for (size_t i = 0; i < 5; ++i) {
            struct rlimit value;
            if (getrlimit(ids[i], &value) != 0 || value.rlim_cur > caps[i] || value.rlim_max > caps[i]) return 3;
        }
        if (getpid() != getpgrp()) return 4;
        puts("finite build limits and process group");
    } else if (strcmp(argv[1], "memory") == 0) {
        void *memory = malloc((size_t)2*1024*1024*1024);
        if (memory != NULL) { free(memory); return 5; }
        puts("allocation refused");
    } else if (strcmp(argv[1], "file") == 0) {
        FILE *file = fopen("bounded.bin", "wb");
        if (file == NULL) return 6;
        char block[4096] = {0};
        for (size_t i = 0; i < 10240; ++i) {
            if (fwrite(block, 1, sizeof block, file) != sizeof block) return 7;
        }
        return fclose(file);
    } else if (strcmp(argv[1], "file-limit") == 0) {
        struct rlimit value;
        if (getrlimit(RLIMIT_FSIZE, &value) != 0 || value.rlim_cur > 524288 || value.rlim_max > 524288) return 8;
        puts("lower inherited limit preserved");
    } else return 9;
    return 0;
}
`;

test('Rust build budget inherits finite limits, rejects memory/file growth and preserves a lower inherited ceiling', {
  skip: !posix || !gcc, timeout: 15000
}, async t => {
  const { rustBuildBudget } = await api();
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'codeweave-build-limits-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  const source = path.join(dir, 'probe.c');
  const binary = path.join(dir, 'probe');
  await fs.writeFile(source, probe);
  const compiled = spawnSync('gcc', ['-std=c11', '-Wall', '-Wextra', '-Wpedantic', '-Werror', source, '-o', binary], { encoding: 'utf8' });
  assert.equal(compiled.status, 0, compiled.stderr);
  async function run(mode) {
    const call = rustBuildBudget(binary, [mode]);
    return observeProcess(call.command, call.args, { ...call, cwd: dir });
  }
  for (const mode of ['limits', 'memory']) {
    const out = await run(mode);
    assert.equal(out.status, 0, JSON.stringify(out));
  }
  const file = await run('file');
  assert.equal(file.signal, 'SIGXFSZ', JSON.stringify(file));
  assert.ok((await fs.stat(path.join(dir, 'bounded.bin'))).size <= 33554432);
  const call = rustBuildBudget(binary, ['file-limit']);
  const lower = await observeProcess('/bin/bash', ['--noprofile', '--norc', '-c',
    'ulimit -f 512 || exit 125; exec "$@"', 'lower-build-limit', call.command, ...call.args],
  { env: call.env, cwd: dir, timeout: call.timeout });
  assert.equal(lower.status, 0, JSON.stringify(lower));
  assert.match(lower.stdout, /lower inherited limit preserved/);
});
