import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { observeProcess } from './helpers/observe-process.mjs';

const api = () => import('./helpers/rust-budget.mjs');
const posix = process.platform !== 'win32';
const rustc = spawnSync('rustc', ['--version'], { encoding: 'utf8', timeout: 3000 });

test('Rust budget rejects unsupported platforms before any execution', async () => {
  const { rustBudget } = await api();
  assert.throws(() => rustBudget('/trusted/binary', [], { platform: 'win32' }), /unsupported/);
});

test('Rust budget rejects relative executables and malformed arguments', async () => {
  const { rustBudget } = await api();
  for (const [binary, args] of [['cargo', []], ['/bin/true', 'oops'], ['/bin/true', [null]], ['/bin/true\0', []]]) {
    assert.throws(() => rustBudget(binary, args));
  }
});

test('Rust budget does not interpolate paths or arguments into shell code', { skip: !posix }, async t => {
  const { rustBudget } = await api();
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'codeweave-rust-budget-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  const marker = path.join(dir, 'must-not-exist');
  const payload = `$(touch ${marker}); " ' spaces`;
  const invocation = rustBudget('/bin/echo', [payload]);
  const result = await observeProcess(invocation.command, invocation.args, { cwd: dir, env: invocation.env });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout.trim(), payload);
  await assert.rejects(fs.stat(marker), { code: 'ENOENT' });
});

test('Rust budget removes inherited shell startup and option variables', async () => {
  const { rustBudget } = await api();
  const invocation = rustBudget('/bin/true', [], { platform: 'linux', env: {
    PATH: '/bin', BASH_ENV: '/untrusted', ENV: '/untrusted', SHELLOPTS: 'xtrace',
    BASHOPTS: 'extdebug', POSIXLY_CORRECT: '1', SECRET: 'never pass through'
  } });
  assert.deepEqual(invocation.env, { PATH: '/bin' });
});

const source = `use std::{env, fs::File, io::{self, Write}, time::{Duration, Instant}};
#[repr(C)] struct Limit { current: u64, maximum: u64 }
unsafe extern "C" { fn getrlimit(resource: i32, value: *mut Limit) -> i32; fn fork() -> i32; fn getpid() -> i32; fn getpgrp() -> i32; fn sleep(seconds: u32) -> u32; fn _exit(status: i32) -> !; }
fn main() {
    let args: Vec<String> = env::args().collect();
    match args[1].as_str() {
        "limits" => {
            #[cfg(target_os="linux")] let ids = [0, 9, 1, 6];
            #[cfg(target_os="macos")] let ids = [0, 5, 1, 7];
            let memory = env::var("CODEWEAVE_RUST_AS_LIMIT_KIB").unwrap().parse::<u64>().unwrap()*1024;
            let processes = if cfg!(target_os="macos") {512} else {128};
            for (id, cap) in ids.into_iter().zip([2, memory, 2097152, processes]) {
                let mut limit = Limit { current: 0, maximum: 0 };
                assert_eq!(unsafe {getrlimit(id, &mut limit)}, 0);
                assert!(limit.current <= cap && limit.maximum <= cap);
            }
            assert_eq!(unsafe {getpid()}, unsafe {getpgrp()});
            println!("finite limits");
        }
        "memory" => { let mut value = Vec::<u8>::new(); assert!(value.try_reserve_exact(384*1024*1024).is_err()); println!("allocation refused"); }
        "file" => { File::create("bounded.bin").unwrap().write_all(&vec![0u8; 4*1024*1024]).unwrap(); }
        "cpu" => { let start=Instant::now(); while start.elapsed() < Duration::from_secs(6) { std::hint::black_box(42); } }
        "child" | "timeout" => {
            let pid=unsafe {fork()}; assert!(pid>=0);
            if pid==0 { unsafe {sleep(10); _exit(0)} }
            println!("{}",pid); io::stdout().flush().unwrap();
            if args[1]=="timeout" { unsafe {sleep(10);} }
        }
        _ => panic!("unknown trusted fixture"),
    }
}
`;

async function alive(pid) {
  try { process.kill(pid, 0); } catch (error) { if (error.code === 'ESRCH') return false; throw error; }
  if (process.platform === 'linux') {
    const self = await fs.readFile('/proc/self/stat', 'utf8');
    if (Number(self.split(' ')[0]) !== process.pid) return true;
    const stat = await fs.readFile(`/proc/${pid}/stat`, 'utf8').catch(() => '');
    return !!stat && stat.slice(stat.lastIndexOf(')') + 2)[0] !== 'Z';
  }
  return !spawnSync('/bin/ps', ['-o', 'stat=', '-p', String(pid)], { encoding: 'utf8' }).stdout.trim().startsWith('Z');
}

test('Real Rust inherits execution budgets and fails bounded memory, file, CPU and descendant probes', {
  skip: (!posix || rustc.status !== 0) && process.env.CODEWEAVE_REQUIRE_RUST !== '1' ? 'Rust POSIX tools unavailable locally; mandatory in CI' : false,
  timeout: 30000
}, async t => {
  const { rustBudget } = await api();
  assert.ok(posix);
  assert.equal(rustc.status, 0);
  console.log('Rust resource fixture:', rustc.stdout.trim());
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'codeweave-rust-resource-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  await fs.writeFile(path.join(dir, 'probe.rs'), source);
  const binary = path.join(dir, 'probe');
  const compiled = await observeProcess('rustc', ['--edition=2021', '-Dwarnings', path.join(dir, 'probe.rs'), '-o', binary], { timeout: 15000, stage: 'resource-probe-build' });
  assert.equal(compiled.status, 0, JSON.stringify(compiled));
  async function run(mode, timeout = 2000) {
    const invocation = rustBudget(binary, [mode]);
    return observeProcess(invocation.command, invocation.args, { cwd: dir, env: invocation.env, timeout, stage: 'rust-resource-' + mode });
  }
  const limits = await run('limits');
  assert.equal(limits.status, 0, JSON.stringify(limits));
  assert.match(limits.stdout, /finite limits/);
  const memory = await run('memory');
  assert.equal(memory.status, 0, JSON.stringify(memory));
  assert.match(memory.stdout, /allocation refused/);
  const file = await run('file');
  assert.equal(file.signal, 'SIGXFSZ', JSON.stringify(file));
  assert.ok((await fs.stat(path.join(dir, 'bounded.bin'))).size <= 2097152);
  const cpu = await run('cpu', 8000);
  assert.ok(['SIGKILL', 'SIGXCPU'].includes(cpu.signal), JSON.stringify(cpu));
  assert.equal(cpu.error, undefined, 'CPU ceiling, not wall timer, must end the bounded loop');
  for (const mode of ['child', 'timeout']) {
    const result = await run(mode);
    const pid = Number(result.stdout.trim());
    assert.ok(Number.isInteger(pid) && pid > 1, JSON.stringify(result));
    t.after(async () => { if (await alive(pid)) process.kill(pid, 'SIGKILL'); });
    if (mode === 'child') assert.equal(result.status, 0, JSON.stringify(result));
    else assert.equal(result.error?.code, 'ETIMEDOUT', JSON.stringify(result));
    for (let i = 0; i < 50 && await alive(pid); i++) await new Promise(resolve => setTimeout(resolve, 10));
    assert.equal(await alive(pid), false, mode + ' descendant must stop');
  }
});
