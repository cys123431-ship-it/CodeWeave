import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';
import { pathToFileURL } from 'node:url';
import { MAX_CODE_LENGTH } from '../src/iterations.js';
import { serializeMultiFileSubmission } from '../src/multi-file.js';

const maxBodyBytes = MAX_CODE_LENGTH * 4 + 4096;
const gccAvailable = spawnSync('gcc', ['--version']).status === 0;
const hello = '#include <stdio.h>\nint main(void){puts("Hello, CodeWeave!");return 0;}\n';
function paddedSource(program, length, filler = '한') {
  const remaining = length - program.length - 5;
  assert.ok(remaining >= 0);
  const padding = filler.repeat(Math.floor(remaining / filler.length)) +
    ' '.repeat(remaining % filler.length);
  const code = '/*' + padding + '*/\n' + program;
  assert.equal(code.length, length);
  return code;
}

test('request byte budget preserves the existing code length contract', { timeout: 30000 }, async t => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'codeweave-body-test-'));
  const trace = path.join(dir, 'effects.txt');
  const hook = path.join(dir, 'audit.mjs');
  await fs.writeFile(trace, '');
  await fs.writeFile(hook, [
    "import fs from 'node:fs/promises';",
    "import { appendFileSync } from 'node:fs';",
    "import cp from 'node:child_process';",
    "import { syncBuiltinESMExports } from 'node:module';",
    "const trace = process.env.CODEWEAVE_BODY_TRACE;",
    "const originalTemp = fs.mkdtemp;",
    "fs.mkdtemp = (...args) => { appendFileSync(trace, 'mkdtemp\\n'); return originalTemp(...args); };",
    "const originalSpawn = cp.spawnSync;",
    "cp.spawnSync = (command, ...args) => { if (command === 'gcc') appendFileSync(trace, 'gcc\\n'); return originalSpawn(command, ...args); };",
    "syncBuiltinESMExports();"
  ].join('\n'));
  const server = spawn(process.execPath, ['--import', pathToFileURL(hook).href, 'dev-server.mjs'], {
    env: { ...process.env, PORT: '0', TMPDIR: dir, TEMP: dir, TMP: dir, CODEWEAVE_BODY_TRACE: trace },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  t.after(async () => {
    if (server.exitCode === null && server.signalCode === null) {
      const exited = once(server, 'exit'); server.kill(); await exited;
    }
    await fs.rm(dir, { recursive: true, force: true });
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

  function request(body, chunks) {
    return new Promise((resolve, reject) => {
      const req = http.request(base + '/api/grade', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CodeWeave-Token': token }
      }, res => {
        const received = [];
        res.on('data', chunk => received.push(chunk));
        res.on('error', reject);
        res.on('end', () => resolve({ status: res.statusCode,
          result: JSON.parse(Buffer.concat(received).toString('utf8')) }));
      });
      req.setTimeout(10000, () => req.destroy(Error('request timed out')));
      req.on('error', reject);
      if (chunks) { for (const chunk of chunks) req.write(chunk); req.end(); }
      else req.end(body);
    });
  }
  async function accepted(code, exerciseId = 'c-hello', body) {
    await fs.writeFile(trace, '');
    const response = await request(body ?? JSON.stringify({ exerciseId, code }));
    assert.equal(response.status, 200);
    assert.equal(response.result.ok, true, JSON.stringify(response.result));
    assert.equal(await fs.readFile(trace, 'utf8'), 'mkdtemp\ngcc\n');
  }
  async function rejected(body, status, chunks) {
    await fs.writeFile(trace, '');
    const response = await request(body, chunks);
    assert.equal(response.status, status);
    assert.equal(response.result.ok, false);
    assert.equal(await fs.readFile(trace, 'utf8'), '', 'rejected requests cannot allocate sources or launch GCC');
    assert.ok(!(await fs.readdir(dir)).some(name => name.startsWith('codeweave-')));
  }
  for (const [name, filler] of [
    ['accepts a 25000-character Korean C submission', '한'],
    ['accepts four-byte UTF-8 without changing the UTF-16 code length budget', '😀'],
    ['accepts JSON-escaped quotes backslashes and newlines at the code limit', '"\\\n']
  ]) {
    await t.test(name, { skip: !gccAvailable }, async () => {
      const code = paddedSource(hello, MAX_CODE_LENGTH, filler);
      assert.ok(Buffer.byteLength(JSON.stringify({ exerciseId: 'c-hello', code })) > 40000);
      await accepted(code);
    });
  }
  await t.test('accepts Korean function-only code at the existing length limit', { skip: !gccAvailable }, async () => {
    const code = paddedSource('int clamp(int v,int l,int h){return v<l?l:v>h?h:v;}\n', MAX_CODE_LENGTH);
    await accepted(code, 'c-clamp-function');
  });
  await t.test('accepts a Korean multi-file submission within all existing v1 limits', { skip: !gccAvailable }, async () => {
    const code = serializeMultiFileSubmission([
      { name: 'main.c', content: paddedSource('#include <stdio.h>\n#include "functions.h"\nint main(void){int v,l,h;if(scanf("%d%d%d",&v,&l,&h)!=3)return 1;printf("%d\\n",clamp(v,l,h));return 0;}\n', 8000) },
      { name: 'functions.c', content: paddedSource('#include "functions.h"\nint clamp(int v,int l,int h){return v<l?l:v>h?h:v;}\n', 8000) },
      { name: 'functions.h', content: paddedSource('int clamp(int v,int l,int h);\n', 8000) }
    ], { requiredNames: ['main.c', 'functions.c', 'functions.h'] });
    assert.ok(code.length <= MAX_CODE_LENGTH);
    await accepted(code, 'c-multi-file');
  });
  const smallBody = JSON.stringify({ exerciseId: 'c-hello', code: hello });
  const exactBody = smallBody + ' '.repeat(maxBodyBytes - Buffer.byteLength(smallBody));
  await t.test('accepts a JSON body exactly at code length times four plus overhead', { skip: !gccAvailable }, async () => {
    assert.equal(Buffer.byteLength(exactBody), maxBodyBytes);
    await accepted(hello, 'c-hello', exactBody);
  });
  await t.test('rejects one byte above the request budget before GCC and temporary sources', async () => {
    await rejected(exactBody + ' ', 413);
  });
  await t.test('counts chunked UTF-8 bytes and rejects overflow before side effects', async () => {
    const body = JSON.stringify({ exerciseId: 'c-hello', code: paddedSource(hello, 15000) });
    const oversized = Buffer.from(body + ' '.repeat(maxBodyBytes + 1 - Buffer.byteLength(body)));
    const split = oversized.indexOf(Buffer.from('한')) + 1;
    assert.equal(oversized.length, maxBodyBytes + 1);
    await rejected(undefined, 413, [oversized.subarray(0, split), oversized.subarray(split, 60000), oversized.subarray(60000)]);
  });
  await t.test('rejects 25001 Korean code units as a code length error before side effects', async () => {
    const body = JSON.stringify({ exerciseId: 'c-hello', code: paddedSource(hello, MAX_CODE_LENGTH + 1) });
    assert.ok(Buffer.byteLength(body) < maxBodyBytes);
    await rejected(body, 400);
  });
  await t.test('a rejected oversized request leaves the grader available for a valid submission', { skip: !gccAvailable }, async () => {
    await rejected(exactBody + ' ', 413);
    await accepted(hello);
  });
});
