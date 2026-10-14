import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';
import { fileURLToPath, pathToFileURL } from 'node:url';

const project = fileURLToPath(new URL('../', import.meta.url));
const posix = process.platform !== 'win32';
const gcc = spawnSync('gcc', ['--version']).status === 0;
const prefix = '#define _POSIX_C_SOURCE 200809L\n#include <stdio.h>\n#include <stdlib.h>\n#include <unistd.h>\n#include <signal.h>\n#include <sys/types.h>\n#include <sys/resource.h>\n';
const hello = 'puts("Hello, CodeWeave!");return 0;';

async function alive(pid) {
  try { process.kill(pid, 0); } catch (error) {
    if (error.code === 'ESRCH') return false;
    throw error;
  }
  // A killed zombie is not executing; PID 1 reaping differs in containers.
  if (process.platform === 'linux') {
    try {
      const stat = await fs.readFile('/proc/' + pid + '/stat', 'utf8');
      return stat.slice(stat.lastIndexOf(')') + 2)[0] !== 'Z';
    } catch (error) { if (error.code === 'ENOENT') return false; throw error; }
  }
  return !spawnSync('ps', ['-o', 'stat=', '-p', String(pid)], { encoding: 'utf8' }).stdout.trim().startsWith('Z');
}

test('local API limits submission resources and cleans its process group', { skip: !posix || !gcc, timeout: 30000 }, async t => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'codeweave-resources-test-'));
  const pids = new Set();
  const server = spawn(process.execPath, ['dev-server.mjs'], {
    cwd: project, env: { ...process.env, PORT: '0' }, stdio: ['ignore', 'pipe', 'pipe']
  });
  t.after(async () => {
    for (const pid of pids) {
      if (await alive(pid)) process.kill(pid, 'SIGKILL');
    }
    if (server.exitCode === null && server.signalCode === null) {
      const exit = once(server, 'exit'); server.kill(); await exit;
    }
    await fs.rm(dir, { recursive: true, force: true });
  });
  const url = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(Error('server startup timeout')), 5000);
    server.once('error', error => { clearTimeout(timer); reject(error); });
    server.once('exit', code => { clearTimeout(timer); reject(Error('server exited ' + code)); });
    let output = '';
    server.stdout.on('data', chunk => {
      output += chunk;
      const match = output.match(/http:\/\/127\.0\.0\.1:\d+/);
      if (match) { clearTimeout(timer); resolve(match[0]); }
    });
  });
  const html = await (await fetch(url)).text();
  const token = html.match(/<meta name="codeweave-token" content="([0-9a-f]{64})">/)[1];
  async function submit(code) {
    const response = await fetch(url + '/api/grade', { method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-CodeWeave-Token': token },
      body: JSON.stringify({ exerciseId: 'c-hello', code }), signal: AbortSignal.timeout(8000) });
    assert.equal(response.status, 200);
    return response.json();
  }
  for (const mode of ['timeout', 'parent exit', 'output overflow']) {
    await t.test('kills forked sleepers after ' + mode, async () => {
      const pidFile = path.join(dir, mode.replaceAll(' ', '-') + '.pid');
      const action = mode === 'timeout' ? 'sleep(4);' : mode === 'parent exit' ? hello : 'for(int i=0;i<50000;++i)putchar(\'x\');return 0;';
      const code = prefix + 'int main(void){pid_t child=fork();if(child<0)return 9;if(child==0){signal(SIGTERM,SIG_IGN);signal(SIGHUP,SIG_IGN);close(0);close(1);close(2);sleep(5);_exit(0);}FILE *f=fopen(' + JSON.stringify(pidFile) + ',"w");if(!f)return 8;fprintf(f,"%ld",(long)child);fclose(f);' + action + '}';
      const started = Date.now();
      const result = await submit(code);
      const pid = Number(await fs.readFile(pidFile, 'utf8'));
      assert.ok(Number.isSafeInteger(pid) && pid > 1);
      pids.add(pid);
      assert.ok(Date.now() - started < 3500, 'grading must not wait for the sleeping child');
      if (mode === 'parent exit') assert.equal(result.ok, true);
      else assert.equal(result.ok, false);
      if (mode === 'timeout') assert.equal(result.tests[0].detail, '시간 제한 초과');
      for (let i = 0; i < 20 && await alive(pid); i++) await new Promise(resolve => setTimeout(resolve, 10));
      assert.equal(await alive(pid), false, 'no live sleeper may remain after the grading response');
    });
  }
  await t.test('runs the submitted program in its own process group', async () => {
    const result = await submit(prefix + 'int main(void){if(getpgrp()!=getpid())return 7;' + hello + '}');
    assert.equal(result.ok, true);
  });
  await t.test('bounded malloc growth fails under the virtual memory limit', async () => {
    const code = prefix + '#include <string.h>\nint main(void){void *p[12];for(int i=0;i<12;++i){p[i]=malloc(8UL*1024*1024);if(!p[i])return 7;memset(p[i],1,8UL*1024*1024);}for(int i=0;i<12;++i)free(p[i]);' + hello + '}';
    const result = await submit(code);
    assert.equal(result.ok, false, '96 MiB bounded allocation must exceed the configured mapping budget');
    assert.match(result.tests[0].detail, /비정상 종료/);
  });
  await t.test('bounded file growth fails under the file size limit', async () => {
    const code = prefix + 'int main(void){FILE *f=fopen("bounded-output.bin","wb");if(!f)return 7;char block[32768]={0};for(int i=0;i<96;++i)if(fwrite(block,1,sizeof block,f)!=sizeof block)return 8;if(fclose(f)!=0)return 9;' + hello + '}';
    const result = await submit(code);
    assert.equal(result.ok, false, '3 MiB bounded output must exceed the 2 MiB file limit');
    assert.match(result.tests[0].detail, /비정상 종료 \(SIGXFSZ\)/);
  });
  await t.test('inherits finite CPU, memory, file and user-process ceilings', async () => {
    const code = prefix + '#include <limits.h>\nint main(void){const char *budget=getenv("CODEWEAVE_AS_LIMIT_KIB");if(!budget)return 8;char *end;unsigned long kib=strtoul(budget,&end,10);if(*end||kib==0||kib>ULONG_MAX/1024)return 9;int ids[]={RLIMIT_CPU,RLIMIT_AS,RLIMIT_FSIZE,RLIMIT_NPROC};unsigned long caps[]={2,kib*1024,2UL*1024*1024,128};for(int i=0;i<4;++i){struct rlimit r;if(getrlimit(ids[i],&r)!=0||r.rlim_cur>caps[i]||r.rlim_max>caps[i])return 7;}' + hello + '}';
    assert.equal((await submit(code)).ok, true);
  });
  await t.test('releases the grading slot after a resource failure', async () => {
    assert.equal((await submit(prefix + 'int main(void){' + hello + '}')).ok, true);
  });
});

test('CPU budget kills a bounded busy loop before a longer wall deadline', { skip: !posix || !gcc, timeout: 10000 }, async t => {
  const { runSubmission } = await import('../server/run-submission.mjs');
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'codeweave-cpu-test-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  const source = path.join(dir, 'busy.c'), binary = path.join(dir, 'busy');
  await fs.writeFile(source, '#include <time.h>\nint main(void){clock_t start=clock();volatile unsigned long n=0;while((double)(clock()-start)/CLOCKS_PER_SEC<6.0)++n;return 0;}');
  const compiled = spawnSync('gcc', ['-std=c11', source, '-o', binary], { encoding: 'utf8' });
  assert.equal(compiled.status, 0, compiled.stderr);
  const result = await runSubmission(binary, [], { cwd: dir, timeout: 8000 });
  assert.equal(result.error?.code, undefined, 'the OS CPU limit, not the wall timer, must terminate it: ' + result.stderr);
  assert.equal(result.status, null);
  assert.ok(['SIGKILL', 'SIGXCPU'].includes(result.signal));
});

test('keeps a stricter inherited soft file limit', { skip: !posix || !gcc, timeout: 8000 }, async t => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'codeweave-soft-limit-test-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  const source = path.join(dir, 'write.c'), binary = path.join(dir, 'write');
  await fs.writeFile(source, '#include <stdio.h>\nint main(void){FILE *f=fopen("output.bin","wb");if(!f)return 1;char block[1024]={0};for(int i=0;i<1024;++i)if(fwrite(block,1,sizeof block,f)!=sizeof block)return 2;return fclose(f)!=0;}');
  const compiled = spawnSync('gcc', ['-std=c11', source, '-o', binary], { encoding: 'utf8' });
  assert.equal(compiled.status, 0, compiled.stderr);
  const module = pathToFileURL(path.join(project, 'server/run-submission.mjs')).href;
  const script = 'import {runSubmission} from ' + JSON.stringify(module) + ';const r=await runSubmission(' + JSON.stringify(binary) + ',[],{cwd:' + JSON.stringify(dir) + '});console.log(JSON.stringify({status:r.status,signal:r.signal,error:r.error?.code}));';
  const child = spawnSync('/bin/bash', ['--noprofile', '--norc', '-c', 'ulimit -S -f 512 && exec "$@"', 'strict-parent', process.execPath, '--input-type=module', '-e', script], { encoding: 'utf8', timeout: 5000 });
  assert.equal(child.status, 0, child.stderr);
  const result = JSON.parse(child.stdout);
  assert.equal(result.signal, 'SIGXFSZ', 'the runner must not raise an inherited lower soft limit');
});
