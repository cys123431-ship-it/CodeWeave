import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { createLocalGradeAuth } from './local-auth.mjs';
import { openLearningFile, parseRequestPath } from './static-files.mjs';
import { parseRequest, writeSources, compile, runCases, buildResult } from './grading-pipeline.mjs';
import { gradingAdmission } from './grading-admission.mjs';
import { createRequestCancellation } from './request-cancellation.mjs';
import { createRustHttpHandler } from './rust-http.mjs';

// Trusted local development only, never a public code-execution service.
const HOST = '127.0.0.1';
export function createLearningServer({ root = process.cwd(), rustService, rustExerciseIds } = {}) {
  if (typeof root !== 'string' || !root.trim()) throw new TypeError('A trusted learning root is required');
  if (rustService !== undefined && (!rustService || typeof rustService.submit !== 'function')) {
    throw new TypeError('Rust requires an explicitly supplied trusted service');
  }
  if (rustExerciseIds !== undefined && (rustService === undefined || !Array.isArray(rustExerciseIds)
      || rustExerciseIds.length === 0 || rustExerciseIds.length > 3
      || !rustExerciseIds.includes('rust-cargo')
      || Array.from(rustExerciseIds).some(id => !['rust-cargo', 'rust-mut', 'rust-control-flow'].includes(id))
      || new Set(rustExerciseIds).size !== rustExerciseIds.length)) {
    throw new TypeError('Rust exercise announcement requires explicit known service IDs');
  }
  const announced = rustExerciseIds === undefined ? undefined : Object.freeze([...rustExerciseIds]);
  const ROOT = path.resolve(root);
  const { tokenMeta, hasLocalHost, authorizeGrade } = createLocalGradeAuth(() => server.address().port);
  const rustGrade = createRustHttpHandler({ auth: { authorizeGrade },
    enabled: rustService !== undefined, service: rustService, allowedIds: announced });
  function send(res, status, data) {
    res.writeHead(status, {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff'
    });
    res.end(JSON.stringify(data));
  }
  async function grade(req, res) {
    if (!authorizeGrade(req, res)) {
      return;
    }
    if (gradingAdmission.busy) {
      return send(res, 429, { ok: false, message: '다른 코드를 채점하고 있어요. 잠시 후 다시 시도하세요.' });
    }
    let releaseSlot;
    const lifetime = createRequestCancellation(req, res);
    try {
      const submission = await parseRequest(req, ({ status, result }) => send(res, status, result));
      if (submission.status) {
        return;
      }
      lifetime.signal.throwIfAborted();
      releaseSlot = gradingAdmission.tryAcquire();
      if (!releaseSlot) {
        return send(res, 429, { ok: false, message: '다른 코드를 채점하고 있어요. 잠시 후 다시 시도하세요.' });
      }
      const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'codeweave-'));
      let result;
      try {
        lifetime.signal.throwIfAborted();
        const workspace = await writeSources(dir, submission);
        lifetime.signal.throwIfAborted();
        const compilation = compile(workspace, submission.exercise);
        const tests = compilation.error || compilation.status !== 0
          ? undefined
          : await runCases(workspace, submission.exercise, undefined, { signal: lifetime.signal });
        result = buildResult(submission.exercise, compilation, tests);
      } finally {
        await fs.rm(dir, { force: true, recursive: true });
      }
      lifetime.signal.throwIfAborted();
      // Release the grading slot and finish cleanup before the client can resubmit.
      releaseSlot();
      return send(res, 200, result);
    } catch (error) {
      if (lifetime.signal.aborted || res.destroyed || req.aborted) return;
      return send(res, 500, { ok: false, message: '서버 오류: ' + error.message });
    } finally {
      lifetime.dispose();
      releaseSlot?.();
    }
  }
  const server = http.createServer(async (req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    const pathname = parseRequestPath(req.url);
    if (pathname === null) {
      return send(res, 400, { ok: false, message: '잘못된 경로입니다.' });
    }
    if (pathname === '/api/grade/rust') {
      return rustGrade(req, res);
    }
    if (pathname === '/api/grade') {
      return req.method === 'POST'
        ? grade(req, res)
        : send(res, 405, { ok: false, message: 'POST 요청만 가능합니다.' });
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      return send(res, 405, { ok: false, message: '허용되지 않은 요청입니다.' });
    }
    if (!hasLocalHost(req)) {
      return send(res, 403, { ok: false, message: '허용되지 않은 Host입니다.' });
    }
    let file;
    try {
      file = await openLearningFile(ROOT, pathname);
      if (!file) {
        throw Error('not public');
      }
      if (res.destroyed) {
        await file.handle.close();
        return;
      }
      if (file.contentType.startsWith('text/html')) {
        const html = await file.handle.readFile('utf8');
        await file.handle.close();
        const rustMeta = rustService === undefined ? '' : '  <meta name="codeweave-rust" content="rust-cargo">\n'
          + (announced ? '  <meta name="codeweave-rust-exercises" content="' + announced.join(' ') + '">\n' : '');
        const page = Buffer.from(html.replace('</head>', tokenMeta + rustMeta + '</head>'));
        res.writeHead(200, {
          'Content-Type': file.contentType,
          'Content-Length': page.length,
          'Cache-Control': 'no-store'
        });
        return res.end(req.method === 'HEAD' ? undefined : page);
      }
      if (req.method === 'HEAD') {
        await file.handle.close();
        res.writeHead(200, { 'Content-Type': file.contentType, 'Content-Length': file.size });
        return res.end();
      }
      const stream = file.handle.createReadStream();
      stream.on('error', () => res.destroy());
      res.on('close', () => stream.destroy());
      res.writeHead(200, { 'Content-Type': file.contentType, 'Content-Length': file.size });
      stream.pipe(res);
    } catch {
      if (file) {
        await file.handle.close().catch(() => {});
      }
      if (res.headersSent) {
        return res.destroy();
      }
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('File not found');
    }
  });
  return Object.freeze({
    address: () => server.address(),
    listen(port = 4173, ...extra) {
      if (extra.length || !Number.isInteger(port) || port < 0 || port > 65535) {
        throw new TypeError('Only a numeric local port is accepted; host overrides are forbidden');
      }
      return new Promise((resolve, reject) => {
        const failed = error => reject(error);
        server.once('error', failed);
        try {
          server.listen(port, HOST, () => {
            server.removeListener('error', failed);
            resolve(server.address());
          });
        } catch (error) {
          server.removeListener('error', failed);
          reject(error);
        }
      });
    },
    close() {
      if (!server.listening) return Promise.resolve();
      return new Promise((resolve, reject) => {
        server.close(error => error ? reject(error) : resolve());
      });
    }
  });
}

