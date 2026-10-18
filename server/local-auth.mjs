import { randomBytes, timingSafeEqual } from 'node:crypto';

// One live loopback server owns this token. Never persist it in PWA caches.
export function createLocalGradeAuth(getPort) {
  if (typeof getPort !== 'function') throw new TypeError('A trusted local port provider is required');
  const token = randomBytes(32);
  function headerCount(req, name) {
    let count = 0;
    for (let i = 0; i < req.rawHeaders.length; i += 2) {
      if (req.rawHeaders[i].toLowerCase() === name) count++;
    }
    return count;
  }
  function singleHeader(req, name) {
    return headerCount(req, name) === 1 ? req.headers[name] : undefined;
  }
  function authorities() {
    const port = getPort();
    if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Local server is not listening');
    return ['127.0.0.1:' + port, 'localhost:' + port];
  }
  function hasLocalHost(req) {
    return authorities().includes(singleHeader(req, 'host'));
  }
  function authorizeGrade(req, res) {
    const reject = (status, message) => {
      res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
      res.end(JSON.stringify({ ok: false, message }));
      return false;
    };
    if (singleHeader(req, 'content-type') !== 'application/json') {
      return reject(415, 'Content-Type은 application/json이어야 합니다.');
    }
    if (!hasLocalHost(req)) return reject(403, '허용되지 않은 Host입니다.');
    const origins = authorities().map(host => 'http://' + host);
    if (headerCount(req, 'origin') > 0 && !origins.includes(singleHeader(req, 'origin'))) {
      return reject(403, '허용되지 않은 Origin입니다.');
    }
    const supplied = singleHeader(req, 'x-codeweave-token');
    if (typeof supplied !== 'string' || !/^[0-9a-f]{64}$/.test(supplied)
        || !timingSafeEqual(Buffer.from(supplied, 'hex'), token)) {
      return reject(403, '채점 토큰이 없거나 만료되었습니다. 페이지를 새로고침하세요.');
    }
    return true;
  }
  return Object.freeze({ hasLocalHost, authorizeGrade,
    tokenMeta: '  <meta name="codeweave-token" content="' + token.toString('hex') + '">\n' });
}

