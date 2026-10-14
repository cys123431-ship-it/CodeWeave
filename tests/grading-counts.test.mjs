import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { gradingExercises } from '../server/grading-exercises.mjs';
import { serializeMultiFileSubmission } from '../src/multi-file.js';

const gccAvailable = spawnSync('gcc', ['--version']).status === 0;

test('grading retains every case without executing cases after a fatal failure', {
  skip: !gccAvailable, timeout: 20000
}, async t => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'codeweave-count-test-'));
  const server = spawn(process.execPath, ['dev-server.mjs'], {
    env: { ...process.env, PORT: '0' }, stdio: ['ignore', 'pipe', 'pipe']
  });
  t.after(async () => {
    if (server.exitCode === null) {
      const exited = once(server, 'exit');
      server.kill();
      await exited;
    }
    await rm(dir, { recursive: true, force: true });
  });
  const base = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(Error('server startup timed out')), 5000);
    let output = '';
    server.once('error', error => { clearTimeout(timer); reject(error); });
    server.once('exit', code => { clearTimeout(timer); reject(Error('server exited: ' + code)); });
    server.stdout.on('data', chunk => {
      output += chunk;
      const match = output.match(/http:\/\/127\.0\.0\.1:\d+/);
      if (match) { clearTimeout(timer); resolve(match[0]); }
    });
  });
  const html = await (await fetch(base + '/')).text();
  const token = html.match(/name="codeweave-token" content="([0-9a-f]{64})"/)?.[1];
  assert.match(token ?? '', /^[0-9a-f]{64}$/);

  async function submit(id, code) {
    const response = await fetch(base + '/api/grade', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-CodeWeave-Token': token },
      body: JSON.stringify({ exerciseId: id, code }), signal: AbortSignal.timeout(10000)
    });
    assert.equal(response.status, 200);
    return response.json();
  }
  function assertCounts(result, id, executed, passed, reason) {
    const total = gradingExercises.get(id).cases.length;
    assert.equal(result.ok, false);
    assert.equal(result.tests.length, total, 'the response retains the entire declared case set');
    assert.ok(result.message.startsWith(passed + '/' + total + '개 테스트 통과'));
    assert.equal(result.tests.filter(item => item.passed).length, passed);
    if (executed) assert.match(result.tests[executed - 1].detail, reason);
    assert.deepEqual(result.tests.slice(executed),
      Array.from({ length: total - executed }, () => ({ passed: false, detail: '미실행' })));
  }
  function source(trace, body) {
    return '#include <stdio.h>\n#include <stdlib.h>\n#include <signal.h>\n#include <time.h>\n' +
      'int main(void){int a,b;if(scanf("%d%d",&a,&b)!=2)return 8;' +
      'FILE *f=fopen(' + JSON.stringify(trace) + ',"a");if(!f)return 9;' +
      'fprintf(f,"%d\\n",a);fclose(f);' + body + '}';
  }
  for (const [name, body, executed, passed, reason, visited] of [
    ['nonzero exit retains unexecuted cases and the full denominator', 'return 7;', 1, 0, /비정상 종료/, '4\n'],
    ['late fatal exit preserves earlier passes and does not launch remaining cases',
      'if(a<0)return 7;printf("%d\\n",a+b);return 0;', 2, 1, /비정상 종료/, '4\n-5\n'],
    ['signal termination retains unexecuted cases', 'raise(SIGABRT);return 0;', 1, 0, /비정상 종료/, '4\n'],
    ['timeout retains unexecuted cases without running them',
      'clock_t start=clock();while((double)(clock()-start)/CLOCKS_PER_SEC<3.0){}return 0;',
      1, 0, /시간 제한 초과/, '4\n'],
    ['output limit retains unexecuted cases without running them',
      'for(int i=0;i<40000;i++)putchar(65);return 0;', 1, 0, /실행 오류/, '4\n']
  ]) {
    await t.test(name, async () => {
      const trace = path.join(dir, name.slice(0, 12).replaceAll(' ', '-') + '.txt');
      const result = await submit('c-types', source(trace, body));
      // This independent trace verifies execution stopped, not merely that labels changed.
      assert.equal(await readFile(trace, 'utf8'), visited);
      assertCounts(result, 'c-types', executed, passed, reason);
    });
  }
  await t.test('function grading retains remaining cases after a fatal failure', async () => {
    const result = await submit('c-clamp-function', '#include <stdlib.h>\nint clamp(int v,int l,int h){(void)l;(void)h;if(v<0)exit(7);return v;}');
    assertCounts(result, 'c-clamp-function', 2, 1, /비정상 종료/);
  });
  await t.test('multi-file grading retains remaining cases after a fatal failure', async () => {
    const code = serializeMultiFileSubmission([
      { name: 'main.c', content: '#include "functions.h"\nint main(void){return clamp(7,0,10);}' },
      { name: 'functions.c', content: '#include "functions.h"\nint clamp(int v,int l,int h){(void)l;(void)h;return v;}' },
      { name: 'functions.h', content: 'int clamp(int v,int l,int h);' }
    ], { requiredNames: ['main.c', 'functions.c', 'functions.h'] });
    const result = await submit('c-multi-file', code);
    assertCounts(result, 'c-multi-file', 1, 0, /비정상 종료/);
  });
  await t.test('compiler failure reports zero of all cases and marks every case unexecuted', async () => {
    const result = await submit('c-types', 'int main(void){return missing_name;}');
    assertCounts(result, 'c-types', 0, 0);
    assert.match(result.message, /컴파일 실패/);
    assert.ok(result.compileOutput);
    assert.equal(result.compilerFeedback.phase, 'compile');
  });
});
