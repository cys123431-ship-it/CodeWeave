import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { gradingExercises } from '../server/grading-exercises.mjs';
import { serializeMultiFileSubmission } from '../src/multi-file.js';

const gcc = spawnSync('gcc', ['--version']).status === 0;
const hello = 'puts("Hello, CodeWeave!");return 0;';

test('local grading treats enabled compiler warnings as compile failures', { skip: !gcc, timeout: 15000 }, async t => {
  const server = spawn(process.execPath, ['dev-server.mjs'], {
    env: { ...process.env, PORT: '0' }, stdio: ['ignore', 'pipe', 'pipe']
  });
  t.after(async () => {
    if (server.exitCode === null && server.signalCode === null) {
      const ended = once(server, 'exit'); server.kill(); await ended;
    }
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
  const html = await (await fetch(base)).text();
  const token = html.match(/name="codeweave-token" content="([0-9a-f]{64})"/)?.[1];
  assert.match(token ?? '', /^[0-9a-f]{64}$/);
  async function submit(exerciseId, code) {
    const response = await fetch(base + '/api/grade', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CodeWeave-Token': token },
      body: JSON.stringify({ exerciseId, code }), signal: AbortSignal.timeout(8000)
    });
    assert.equal(response.status, 200);
    return response.json();
  }
  const multi = serializeMultiFileSubmission([
    { name: 'main.c', content: '#include <stdio.h>\n#include "functions.h"\nint main(void){int v,l,h;if(scanf("%d%d%d",&v,&l,&h)!=3)return 1;printf("%d\\n",clamp(v,l,h));return 0;}' },
    { name: 'functions.c', content: '#include "functions.h"\nint clamp(int v,int l,int h){int unused=7;return v<l?l:v>h?h:v;}' },
    { name: 'functions.h', content: 'int clamp(int v,int l,int h);' }
  ], { requiredNames: ['main.c', 'functions.c', 'functions.h'] });
  for (const [name, id, code, diagnostic] of [
    ['rejects a Wall-only unused variable instead of recording a practice pass', 'c-hello',
      '#include <stdio.h>\nint main(void){int unused=7;' + hello + '}', /unused-variable/],
    ['rejects a Wextra-only unused parameter before running cases', 'c-hello',
      '#include <stdio.h>\nstatic int identity(int value,int unused){return value;}\nint main(void){if(identity(1,2)!=1)return 7;' + hello + '}', /unused-parameter/],
    ['rejects a pedantic GNU statement expression in C11 mode', 'c-hello',
      '#include <stdio.h>\nint main(void){int value=({int n=1;n;});if(value!=1)return 7;' + hello + '}', /pedantic/],
    ['applies the warning failure policy to function-only submissions', 'c-clamp-function',
      'int clamp(int v,int l,int h){int unused=7;return v<l?l:v>h?h:v;}', /unused-variable/],
    ['applies the warning failure policy to multi-file submissions', 'c-multi-file', multi, /unused-variable/]
  ]) {
    await t.test(name, async () => {
      const result = await submit(id, code);
      assert.equal(result.ok, false, 'warning-only code must not become a practice pass');
      assert.match(result.message, /컴파일 실패/);
      assert.equal(result.compilerFeedback.phase, 'compile');
      assert.match(result.compileOutput, /error:/);
      assert.match(result.compileOutput, diagnostic);
      assert.deepEqual(result.tests, gradingExercises.get(id).cases.map(() => ({ passed: false, detail: '미실행' })));
    });
  }
  await t.test('accepts clean C11 after rejecting warning-only submissions', async () => {
    const result = await submit('c-hello', '#include <stdio.h>\nint main(void){' + hello + '}');
    assert.equal(result.ok, true);
    assert.ok(result.tests.every(item => item.passed));
  });
});

test('published first-lesson compile commands reject the same warning-only source', { skip: !gcc }, async t => {
  const text = await readFile(new URL('../content/c/01-hello.md', import.meta.url), 'utf8');
  const commands = text.match(/^gcc -std=c11 .+$/gm) ?? [];
  assert.ok(commands.length > 0);
  const dir = await mkdtemp(path.join(os.tmpdir(), 'codeweave-compiler-policy-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const source = path.join(dir, 'warning.c');
  await writeFile(source, '#include <stdio.h>\nint main(void){int unused=7;' + hello + '}');
  for (const command of commands) {
    const options = command.split(/\s+/).filter(arg => arg.startsWith('-W') || arg.startsWith('-std='));
    const result = spawnSync('gcc', [...options, '-c', source, '-o', path.join(dir, 'warning.o')], { encoding: 'utf8', timeout: 5000 });
    assert.notEqual(result.status, 0, command);
    assert.match(result.stderr, /unused-variable/);
  }
});
