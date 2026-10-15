import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { openLearningFile, parseRequestPath } from './server/static-files.mjs';
import { parseRequest, writeSources, compile, runCases, buildResult } from './server/grading-pipeline.mjs';

// IMPORTANT: trusted local development only. Compiled student programs are not sandboxed.
// This binds only to loopback and MUST NOT be put directly on a public network.
const HOST = '127.0.0.1';
const PORT = Number(process.env.PORT || 4173);
const ROOT = process.cwd();
const gradeToken = randomBytes(32);
const tokenMeta = '  <meta name="codeweave-token" content="' + gradeToken.toString('hex') + '">\n';
function send(res, status, data) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff'
  });
  res.end(JSON.stringify(data));
}
function headerCount(req, name) {
  let count = 0;
  for (let i = 0; i < req.rawHeaders.length; i += 2) {
    if (req.rawHeaders[i].toLowerCase() === name) {
      count++;
    }
  }
  return count;
}
function singleHeader(req, name) {
  return headerCount(req, name) === 1 ? req.headers[name] : undefined;
}
function localAuthorities() {
  const port = server.address().port;
  return ['127.0.0.1:' + port, 'localhost:' + port];
}
function hasLocalHost(req) {
  return localAuthorities().includes(singleHeader(req, 'host'));
}
function authorizeGrade(req, res) {
  if (singleHeader(req, 'content-type') !== 'application/json') {
    send(res, 415, { ok: false, message: 'Content-Type은 application/json이어야 합니다.' });
    return false;
  }
  if (!hasLocalHost(req)) {
    send(res, 403, { ok: false, message: '허용되지 않은 Host입니다.' });
    return false;
  }
  const origins = localAuthorities().map(host => 'http://' + host);
  if (headerCount(req, 'origin') > 0 && !origins.includes(singleHeader(req, 'origin'))) {
    send(res, 403, { ok: false, message: '허용되지 않은 Origin입니다.' });
    return false;
  }
  const token = singleHeader(req, 'x-codeweave-token');
  if (typeof token !== 'string' || !/^[0-9a-f]{64}$/.test(token) ||
      !timingSafeEqual(Buffer.from(token, 'hex'), gradeToken)) {
    send(res, 403, { ok: false, message: '채점 토큰이 없거나 만료되었습니다. 페이지를 새로고침하세요.' });
    return false;
  }
  return true;
}
let busy = false;
async function grade(req, res) {
  if (!authorizeGrade(req, res)) {
    return;
  }
  if (busy) {
    return send(res, 429, { ok: false, message: '다른 코드를 채점하고 있어요. 잠시 후 다시 시도하세요.' });
  }
  let ownsSlot = false;
  try {
    const submission = await parseRequest(req);
    if (submission.status) {
      return send(res, submission.status, submission.result);
    }
    if (busy) {
      return send(res, 429, { ok: false, message: '다른 코드를 채점하고 있어요. 잠시 후 다시 시도하세요.' });
    }
    busy = true;
    ownsSlot = true;
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'codeweave-'));
    let result;
    try {
      const workspace = await writeSources(dir, submission);
      const compilation = compile(workspace, submission.exercise);
      const tests = compilation.error || compilation.status !== 0
        ? undefined
        : await runCases(workspace, submission.exercise);
      result = buildResult(submission.exercise, compilation, tests);
    } finally {
      await fs.rm(dir, { force: true, recursive: true });
      busy = false;
      ownsSlot = false;
    }
    // Release the grading slot and finish cleanup before the client can resubmit.
    return send(res, 200, result);
  } catch (error) {
    if (ownsSlot) {
      busy = false;
    }
    return send(res, 500, { ok: false, message: '서버 오류: ' + error.message });
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
