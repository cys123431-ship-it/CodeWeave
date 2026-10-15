import test from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { gradingExercises } from '../server/grading-exercises.mjs';
import { serializeMultiFileSubmission } from '../src/multi-file.js';

const pipeline = () => import('../server/grading-pipeline.mjs');
const hello = { code: '/*한글*/ int main(void){return 0;}', exerciseId: 'c-hello' };
const request = value => Readable.from([Buffer.from(JSON.stringify(value))]);
const multiFiles = [
  { name: 'main.c', content: '#include "functions.h"\nint main(void){return clamp(5,0,10);}' },
  { name: 'functions.c', content: 'int clamp(int v,int l,int h){return v<l?l:v>h?h:v;}' },
  { name: 'functions.h', content: 'int clamp(int v,int l,int h);' }
];
async function workspace(t) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'codeweave-pipeline-test-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  return dir;
}

test('parseRequest reports rejection before closing an unfinished request stream', async () => {
  const { parseRequest } = await pipeline();
  const events = [];
  async function* body() {
    try {
      yield Buffer.alloc(25000 * 4 + 4097);
    } finally {
      events.push('close');
    }
  }
  const result = await parseRequest(body(), rejected => events.push('reject:' + rejected.status));
  assert.equal(result.status, 413);
  assert.deepEqual(events, ['reject:413', 'close']);
});

test('oversized unfinished HTTP body receives 413 instead of a connection reset', { timeout: 10000 }, async t => {
  const server = spawn(process.execPath, ['dev-server.mjs'], {
    env: { ...process.env, PORT: '0' }, stdio: ['ignore', 'pipe', 'pipe']
  });
  t.after(async () => {
    if (server.exitCode === null && server.signalCode === null) {
      const ended = once(server, 'exit');
      server.kill();
      await ended;
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
      if (match) {
        clearTimeout(timer);
        resolve(match[0]);
      }
    });
  });
  const html = await (await fetch(base)).text();
  const token = html.match(/name="codeweave-token" content="([0-9a-f]{64})"/)?.[1];
  assert.match(token ?? '', /^[0-9a-f]{64}$/);
  const status = await new Promise((resolve, reject) => {
    const req = http.request(base + '/api/grade', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CodeWeave-Token': token }
    }, res => {
      res.resume();
      res.on('error', reject);
      res.on('end', () => { resolve(res.statusCode); req.destroy(); });
    });
    req.setTimeout(3000, () => req.destroy(Error('response timed out')));
    req.on('error', reject);
    // Do not end the body: the server must reject before the client finishes uploading.
    req.write(Buffer.alloc(25000 * 4 + 4097, 32));
  });
  assert.equal(status, 413);
});

test('parseRequest preserves UTF-8 across byte chunks and resolves the declared exercise', async () => {
  const { parseRequest } = await pipeline();
  const body = Buffer.from(JSON.stringify(hello));
  const parsed = await parseRequest(Readable.from([...body].map(byte => Buffer.from([byte]))));
  assert.equal(parsed.code, hello.code);
  assert.equal(parsed.exercise, gradingExercises.get('c-hello'));
  assert.equal(parsed.submittedFiles, null);
});

test('parseRequest preserves JSON, code length, exercise and byte rejection responses', async () => {
  const { parseRequest } = await pipeline();
  assert.deepEqual(await parseRequest(Readable.from([Buffer.from('{')])), {
    status: 400, result: { ok: false, message: '잘못된 JSON입니다.' }
  });
  for (const value of [null, { ...hello, exerciseId: 'missing' }, { ...hello, code: 1 },
    { ...hello, code: 'x'.repeat(25001) }]) {
    assert.deepEqual(await parseRequest(request(value)), {
      status: 400, result: { ok: false, message: '지원하지 않는 문제 또는 코드 길이입니다.' }
    });
  }
  assert.deepEqual(await parseRequest(Readable.from([Buffer.alloc(25000 * 4 + 4097)])), {
    status: 413, result: { ok: false, message: '요청 크기가 너무 큽니다.' }
  });
});

test('parseRequest validates multi-file names before a workspace is written', async () => {
  const { parseRequest } = await pipeline();
  const code = serializeMultiFileSubmission(multiFiles, { requiredNames: multiFiles.map(f => f.name) });
  const parsed = await parseRequest(request({ code, exerciseId: 'c-multi-file' }));
  assert.deepEqual(parsed.submittedFiles, multiFiles);
  const invalid = await parseRequest(request({ code: '{}', exerciseId: 'c-multi-file' }));
  assert.equal(invalid.status, 400);
  assert.equal(invalid.result.ok, false);
});

test('writeSources preserves whole-program and function harness source boundaries', async t => {
  const { writeSources } = await pipeline();
  const dir = await workspace(t);
  const exercise = gradingExercises.get('c-clamp-function');
  const code = 'int clamp(int v,int l,int h){return v<l?l:v>h?h:v;}';
  const files = await writeSources(dir, { code, exercise, submittedFiles: null });
  assert.deepEqual(files.sources, [path.join(dir, 'submission.c'), path.join(dir, 'harness.c')]);
  assert.equal(await fs.readFile(files.sources[0], 'utf8'), code);
  assert.equal(await fs.readFile(files.sources[1], 'utf8'), exercise.harness);
  assert.equal(files.dir, dir);
  assert.equal(files.binary, path.join(dir, process.platform === 'win32' ? 'submission.exe' : 'submission'));
  const whole = await writeSources(dir, { code: hello.code, exercise: gradingExercises.get('c-hello') });
  assert.deepEqual(whole.sources, [path.join(dir, 'submission.c')]);
  assert.equal(await fs.readFile(whole.sources[0], 'utf8'), hello.code);
});

test('writeSources writes headers but compiles only submitted C translation units', async t => {
  const { writeSources } = await pipeline();
  const dir = await workspace(t);
  const files = await writeSources(dir, {
    code: '', exercise: gradingExercises.get('c-multi-file'), submittedFiles: multiFiles
  });
  assert.deepEqual(files.sources, [path.join(dir, 'main.c'), path.join(dir, 'functions.c')]);
  for (const file of multiFiles) assert.equal(await fs.readFile(path.join(dir, file.name), 'utf8'), file.content);
});

test('compile preserves fixed flags, link order, timeout and diagnostic buffer', async () => {
  const { compile } = await pipeline();
  const files = { dir: '/tmp/private path', sources: ['/tmp/private path/submission.c'], binary: '/tmp/private path/submission' };
  const output = { status: 0, stderr: '' };
  let calls = 0;
  const result = compile(files, { linkArgs: ['-lm'] }, (command, args, options) => {
    calls++;
    assert.equal(command, 'gcc');
    assert.deepEqual(args, ['-std=c11', '-Wall', '-Wextra', '-Werror', '-Wpedantic', '-O0', '-I',
      files.dir, ...files.sources, '-lm', '-o', files.binary]);
    assert.deepEqual(options, { timeout: 4500, maxBuffer: 80000, encoding: 'utf8' });
    return output;
  });
  assert.equal(calls, 1);
  assert.equal(result, output);
});

test('runCases continues after output mismatch and preserves input, args and cwd', async () => {
  const { runCases } = await pipeline();
  const files = { dir: '/private', binary: '/private/submission' };
  const exercise = { grader: 'c-stdio', cases: [
    { input: 'first\n', args: ['a'], expected: 'yes' }, { input: 'next\n', expected: 'yes' }
  ] };
  const calls = [];
  const tests = await runCases(files, exercise, async (...args) => {
    calls.push(args);
    return { status: 0, stdout: calls.length === 1 ? 'no\n' : ' yes\n' };
  });
  assert.deepEqual(calls, [
    [files.binary, ['a'], { input: 'first\n', cwd: files.dir }],
    [files.binary, undefined, { input: 'next\n', cwd: files.dir }]
  ]);
  assert.deepEqual(tests, [{ passed: false, detail: '예상: yes; 실제: no' }, { passed: true, detail: '출력 일치' }]);
});

test('runCases never passes the function case description as standard input', async () => {
  const { runCases } = await pipeline();
  const exercise = { grader: 'c-function', cases: [{ input: 'function description', args: ['0'], expected: '7' }] };
  const tests = await runCases({ dir: '/private', binary: 'binary' }, exercise, async (binary, args, options) => {
    assert.equal(options.input, '');
    assert.deepEqual(args, ['0']);
    return { status: 0, stdout: '7\n' };
  });
  assert.deepEqual(tests, [{ passed: true, detail: '출력 일치' }]);
});

test('runCases stops on every fatal result and retains all remaining cases', async t => {
  const { runCases } = await pipeline();
  for (const [name, output, detail] of [
    ['timeout', { error: { code: 'ETIMEDOUT' }, status: null }, '시간 제한 초과'],
    ['execution error', { error: { code: 'ENOBUFS' }, status: 0 }, '실행 오류'],
    ['exit', { status: 7 }, '비정상 종료 (7)'],
    ['signal', { status: null, signal: 'SIGABRT' }, '비정상 종료 (SIGABRT)']
  ]) {
    await t.test(name, async () => {
      let calls = 0;
      const tests = await runCases({ dir: '/private', binary: 'binary' }, {
        grader: 'c-stdio', cases: Array.from({ length: 3 }, () => ({ input: '', expected: '7' }))
      }, async () => { calls++; return calls === 1 ? { status: 0, stdout: '7' } : output; });
      assert.equal(calls, 2);
      assert.deepEqual(tests, [{ passed: true, detail: '출력 일치' },
        { passed: false, detail }, { passed: false, detail: '미실행' }]);
    });
  }
});

test('buildResult preserves compiler failures, diagnostic limits and full case counts', async () => {
  const { buildResult } = await pipeline();
  const exercise = { cases: [{}, {}] };
  const result = buildResult(exercise, { status: 1, stderr: 'error: missing name\n' + 'x'.repeat(4000) });
  assert.equal(result.ok, false);
  assert.equal(result.message, '0/2개 테스트 통과 · 컴파일 실패');
  assert.equal(result.compileOutput.length, 3000);
  assert.equal(result.compilerFeedback.phase, 'compile');
  assert.deepEqual(result.tests, [{ passed: false, detail: '미실행' }, { passed: false, detail: '미실행' }]);
  assert.equal(buildResult(exercise, { status: null, error: Error('gcc missing') }).compileOutput, 'gcc missing');
});

test('buildResult preserves successful and mixed runtime response shapes', async () => {
  const { buildResult } = await pipeline();
  const tests = [{ passed: true, detail: '출력 일치' }, { passed: false, detail: '미실행' }];
  assert.deepEqual(buildResult({ cases: [{}, {}] }, { status: 0, stderr: 'x'.repeat(1100) }, tests), {
    ok: false, message: '1/2개 테스트 통과', tests, compileOutput: 'x'.repeat(1000)
  });
  assert.deepEqual(buildResult({ cases: [{}] }, { status: 0, stderr: '' }, tests.slice(0, 1)), {
    ok: true, message: '1/1개 테스트 통과', tests: tests.slice(0, 1), compileOutput: ''
  });
});
