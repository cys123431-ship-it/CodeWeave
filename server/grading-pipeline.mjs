import fs from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { gradingExercises } from './grading-exercises.mjs';
import { runSubmission } from './run-submission.mjs';
import { parseMultiFileSubmission } from '../src/multi-file.js';
import { classifyCompilerDiagnostic } from '../src/compiler-feedback.js';
import { MAX_CODE_LENGTH } from '../src/iterations.js';

// Preserve the existing UTF-16 code length and bounded UTF-8 JSON contracts.
const MAX_REQUEST_BYTES = MAX_CODE_LENGTH * 4 + 4096;

export async function parseRequest(req, onReject = () => {}) {
  function reject(status, message) {
    const rejection = { status, result: { ok: false, message } };
    onReject(rejection);
    return rejection;
  }
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_REQUEST_BYTES) {
      // Respond before leaving the iterator, matching the original HTTP handler.
      return reject(413, '요청 크기가 너무 큽니다.');
    }
    chunks.push(chunk);
  }

  let value;
  try {
    value = JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    return reject(400, '잘못된 JSON입니다.');
  }
  const { code, exerciseId } = value ?? {};
  const exercise = gradingExercises.get(exerciseId);
  if (typeof code !== 'string' || code.length > MAX_CODE_LENGTH || !exercise) {
    return reject(400, '지원하지 않는 문제 또는 코드 길이입니다.');
  }

  let submittedFiles = null;
  if (exercise.grader === 'c-multi-file') {
    try {
      submittedFiles = parseMultiFileSubmission(code, { requiredNames: exercise.requiredFiles });
    } catch (error) {
      return reject(400, error.message);
    }
  }
  return { code, exercise, submittedFiles };
}

export async function writeSources(dir, { code, exercise, submittedFiles }) {
  const binary = path.join(dir, process.platform === 'win32' ? 'submission.exe' : 'submission');
  const sources = [];
  if (exercise.grader === 'c-multi-file') {
    for (const file of submittedFiles) {
      const filename = path.join(dir, file.name);
      await fs.writeFile(filename, file.content, 'utf8');
      if (file.name.endsWith('.c')) {
        sources.push(filename);
      }
    }
  } else {
    const source = path.join(dir, 'submission.c');
    await fs.writeFile(source, code, 'utf8');
    sources.push(source);
  }
  if (exercise.grader === 'c-function') {
    const harness = path.join(dir, 'harness.c');
    await fs.writeFile(harness, exercise.harness, 'utf8');
    sources.push(harness);
  }
  return { dir, binary, sources };
}

export function compile(workspace, exercise, spawn = spawnSync) {
  const { dir, sources, binary } = workspace;
  return spawn('gcc', [
    '-std=c11', '-Wall', '-Wextra', '-Werror', '-Wpedantic', '-O0',
    '-I', dir, ...sources, ...exercise.linkArgs, '-o', binary
  ], { timeout: 4500, maxBuffer: 80_000, encoding: 'utf8' });
}

export async function runCases(workspace, exercise, run = runSubmission, { signal } = {}) {
  if (signal !== undefined && !(signal instanceof AbortSignal)) {
    throw new TypeError('Invalid case cancellation signal');
  }
  const tests = [];
  for (const tc of exercise.cases) {
    signal?.throwIfAborted();
    const out = await run(workspace.binary, tc.args, {
      input: exercise.grader === 'c-function' ? '' : tc.input,
      cwd: workspace.dir,
      ...(signal ? { abortSignal: signal } : {})
    });
    signal?.throwIfAborted();
    const actual = (out.stdout || '').trim();
    const expected = tc.expected.trim();
    const fatal = Boolean(out.error) || out.status !== 0;
    let detail;
    if (out.error?.code === 'ETIMEDOUT') {
      detail = '시간 제한 초과';
    } else if (out.error) {
      detail = '실행 오류';
    } else if (out.status !== 0) {
      detail = '비정상 종료 (' + (out.signal || out.status) + ')';
    } else if (actual === expected) {
      detail = '출력 일치';
    } else {
      detail = '예상: ' + expected + '; 실제: ' + (actual.slice(0, 100) || '(없음)');
    }
    tests.push({ passed: !fatal && actual === expected, detail });
    // Keep the declared case set visible without executing after a fatal failure.
    if (fatal) {
      tests.push(...exercise.cases.slice(tests.length).map(() => ({ passed: false, detail: '미실행' })));
      break;
    }
  }
  return tests;
}

export function buildResult(exercise, compilation, tests) {
  if (compilation.error || compilation.status !== 0) {
    const compileOutput = (compilation.stderr || compilation.error?.message || '').slice(0, 3000);
    return {
      ok: false,
      message: '0/' + exercise.cases.length + '개 테스트 통과 · 컴파일 실패',
      compileOutput,
      compilerFeedback: classifyCompilerDiagnostic({ output: compileOutput, error: compilation.error }),
      tests: exercise.cases.map(() => ({ passed: false, detail: '미실행' }))
    };
  }
  return {
    ok: tests.every(item => item.passed),
    message: tests.filter(item => item.passed).length + '/' + exercise.cases.length + '개 테스트 통과',
    tests,
    compileOutput: compilation.stderr?.slice(0, 1000)
  };
}
