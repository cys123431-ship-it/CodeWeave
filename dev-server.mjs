import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { createLocalGradeAuth } from './server/local-auth.mjs';
import { openLearningFile, parseRequestPath } from './server/static-files.mjs';
import { parseRequest, writeSources, compile, runCases, buildResult } from './server/grading-pipeline.mjs';
import { gradingAdmission } from './server/grading-admission.mjs';
import { createRequestCancellation } from './server/request-cancellation.mjs';

// IMPORTANT: trusted local development only. Compiled student programs are not sandboxed.
// This binds only to loopback and MUST NOT be put directly on a public network.
const HOST = '127.0.0.1';
const PORT = Number(process.env.PORT || 4173);
const ROOT = process.cwd();
const { tokenMeta, hasLocalHost, authorizeGrade } = createLocalGradeAuth(() => server.address().port);
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
      const page = Buffer.from(html.replace('</head>', tokenMeta + '</head>'));
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
server.listen(PORT, HOST, () => {
  console.log('CodeWeave local learning app: http://' + HOST + ':' + server.address().port +
    '\n주의: C 코드 실행은 격리되지 않은 개인 PC용 개발 기능입니다. 공용 서버로 배포하지 마세요.');
});
